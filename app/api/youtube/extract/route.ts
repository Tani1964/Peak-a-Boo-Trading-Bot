import connectDB from '@/lib/mongodb';
import { extractStrategiesFromTranscript } from '@/lib/strategy-extractor';
import { extractVideoId } from '@/lib/youtube-transcript';
import { fetchTranscriptDirect } from '@/lib/youtube-transcript-direct';
import { YouTubeStrategy } from '@/models/YouTubeStrategy';
import { NextRequest, NextResponse } from 'next/server';
import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from 'youtube-transcript';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video URL is required',
        },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid YouTube URL. Please provide a valid YouTube video URL.',
        },
        { status: 400 }
      );
    }

    // Check if we've already processed this video
    const existing = await YouTubeStrategy.findOne({ videoId });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Video already processed',
        data: existing,
        cached: true,
      });
    }

    // Helper function to extract available languages from error message
    const extractAvailableLanguages = (errorMessage: string): string[] => {
      // Look for "Available languages: en" or similar patterns
      // Try multiple patterns to catch different formats
      const patterns = [
        /Available languages:\s*([^\n.]+)/i,
        /available languages:\s*([^\n.]+)/i,
        /Available language:\s*([^\n.]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = errorMessage.match(pattern);
        if (match && match[1]) {
          // Split by comma and clean up
          const langs = match[1]
            .split(',')
            .map((lang) => lang.trim())
            .filter((lang) => lang.length > 0);
          if (langs.length > 0) {
            console.log(`Extracted languages using pattern: ${langs.join(', ')}`);
            return langs;
          }
        }
      }
      return [];
    };

    // Fetch transcript from YouTube - try multiple languages
    let transcriptText = '';
    // Start with 'en' first since it's the most common
    const languagesToTry = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU'];
    let lastError: Error | null = null;
    let availableLanguages: string[] = [];

    // First, try direct YouTube API method (more reliable)
    try {
      console.log(`Attempting to fetch transcript using direct YouTube API`);
      transcriptText = await fetchTranscriptDirect(videoId);
      if (transcriptText && transcriptText.trim().length > 0) {
        console.log(`✅ Successfully fetched transcript using direct API, length: ${transcriptText.length}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`Direct API method failed: ${errorMsg}`);
      // Continue to fallback methods
    }

    // Fallback: Try 'en' using youtube-transcript package
    if (!transcriptText || transcriptText.trim().length === 0) {
      try {
        console.log(`Attempting to fetch transcript in 'en' using youtube-transcript package`);
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        transcriptText = transcriptItems.map((item) => item.text).join(' ');
        if (transcriptText && transcriptText.trim().length > 0) {
          console.log(`✅ Successfully fetched transcript in 'en', length: ${transcriptText.length}`);
        }
      } catch (error) {
        console.log(`Failed to fetch transcript in 'en':`, error);
        
        // Check if error tells us about available languages
        if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
          const errorMessage = error.message || String(error);
          availableLanguages = extractAvailableLanguages(errorMessage);
          
          // Also try to get from error object if available
          try {
            const errorObj = error as { availableLangs?: string[] };
            if (errorObj.availableLangs && Array.isArray(errorObj.availableLangs)) {
              availableLanguages = [...new Set([...availableLanguages, ...errorObj.availableLangs])];
            }
          } catch {
            // Ignore if we can't access it
          }
          
          if (availableLanguages.length > 0) {
            console.log(`✅ Found available languages from error: ${availableLanguages.join(', ')}`);
            
            // Try available languages immediately - these are guaranteed to work!
            for (const lang of availableLanguages) {
              try {
                console.log(`🔄 Attempting to fetch transcript in available language: ${lang}`);
                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
                transcriptText = transcriptItems.map((item) => item.text).join(' ');
                if (transcriptText && transcriptText.trim().length > 0) {
                  console.log(`✅ Successfully fetched transcript in ${lang}, length: ${transcriptText.length}`);
                  break;
                } else {
                  console.log(`⚠️ Got empty transcript for ${lang}, trying next...`);
                }
              } catch (langError) {
                console.log(`❌ Failed to fetch transcript in ${lang}:`, langError);
                const langErrorMessage = langError instanceof Error ? langError.message : String(langError);
                console.log(`Error details: ${langErrorMessage}`);
                lastError = langError instanceof Error ? langError : new Error(String(langError));
                continue;
              }
            }
          } else {
            console.log(`⚠️ No available languages found in error message`);
          }
        } else {
          // Not a language error, store it
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }
    }

    // If still no transcript, try without language specification
    if (!transcriptText || transcriptText.trim().length === 0) {
      try {
        console.log(`Attempting to fetch transcript without language specification`);
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        transcriptText = transcriptItems.map((item) => item.text).join(' ');
        if (transcriptText && transcriptText.trim().length > 0) {
          console.log(`Successfully fetched transcript without language spec, length: ${transcriptText.length}`);
        }
      } catch (error) {
        console.log(`Failed to fetch transcript without language spec:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const langs = extractAvailableLanguages(errorMessage);
        if (langs.length > 0) {
          availableLanguages = [...new Set([...availableLanguages, ...langs])];
          console.log(`Found additional available languages: ${availableLanguages.join(', ')}`);
          
          // Try the newly found languages
          for (const lang of langs) {
            if (transcriptText && transcriptText.trim().length > 0) break;
            try {
              console.log(`Trying available language from error: ${lang}`);
              const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
              transcriptText = transcriptItems.map((item) => item.text).join(' ');
              if (transcriptText && transcriptText.trim().length > 0) {
                console.log(`Successfully fetched transcript in ${lang}`);
                break;
              }
            } catch {
              continue;
            }
          }
        }
        if (!lastError) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }
    }

    // If still no transcript, try our list of common languages (but skip if we already know available languages)
    // Only try other languages if we don't have available languages yet
    if (!transcriptText || transcriptText.trim().length === 0) {
      // If we already know available languages, try them first before trying other languages
      if (availableLanguages.length > 0) {
        console.log(`Retrying with known available languages: ${availableLanguages.join(', ')}`);
        for (const lang of availableLanguages) {
          if (transcriptText && transcriptText.trim().length > 0) break;
          try {
            console.log(`🔄 Retrying with available language: ${lang}`);
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
            transcriptText = transcriptItems.map((item) => item.text).join(' ');
            if (transcriptText && transcriptText.trim().length > 0) {
              console.log(`✅ Successfully fetched transcript in ${lang}, length: ${transcriptText.length}`);
              break;
            }
          } catch (langError) {
            console.log(`❌ Failed to fetch transcript in ${lang}:`, langError);
            continue;
          }
        }
      }
      
      // Only try fallback languages if we still don't have transcript AND we don't know available languages
      if ((!transcriptText || transcriptText.trim().length === 0) && availableLanguages.length === 0) {
        console.log(`Trying fallback languages: ${languagesToTry.join(', ')}`);
        for (const lang of languagesToTry) {
          if (transcriptText && transcriptText.trim().length > 0) break;
          try {
            console.log(`Attempting to fetch transcript for video ${videoId} in language: ${lang}`);
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
              lang: lang,
            });
            transcriptText = transcriptItems.map((item) => item.text).join(' ');

            if (transcriptText && transcriptText.trim().length > 0) {
              console.log(`✅ Successfully fetched transcript in ${lang}, length: ${transcriptText.length}`);
              break;
            }
          } catch (error) {
            console.log(`Failed to fetch transcript in ${lang}:`, error);
            
            // Check if this error tells us about available languages
            if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
              const errorMessage = error.message || String(error);
              const langs = extractAvailableLanguages(errorMessage);
              
              // Also try error object
              try {
                const errorObj = error as { availableLangs?: string[] };
                if (errorObj.availableLangs && Array.isArray(errorObj.availableLangs)) {
                  langs.push(...errorObj.availableLangs);
                }
              } catch {
                // Ignore
              }
              
              if (langs.length > 0) {
                availableLanguages = [...new Set([...availableLanguages, ...langs])];
                console.log(`Found available languages: ${availableLanguages.join(', ')}`);
                
                // Try the available languages immediately and break out of the loop
                for (const availLang of availableLanguages) {
                  if (transcriptText && transcriptText.trim().length > 0) break;
                  try {
                    console.log(`🔄 Trying available language: ${availLang}`);
                    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: availLang });
                    transcriptText = transcriptItems.map((item) => item.text).join(' ');
                    if (transcriptText && transcriptText.trim().length > 0) {
                      console.log(`✅ Successfully fetched transcript in ${availLang}`);
                      break;
                    }
                  } catch {
                    continue;
                  }
                }
                // Break out of languagesToTry loop since we found available languages
                break;
              }
            }
            
            lastError = error instanceof Error ? error : new Error(String(error));
            // Continue to next language
            continue;
          }
        }
      }
    }

    // If still no transcript, return helpful error with specific information
    if (!transcriptText || transcriptText.trim().length === 0) {
      const errorMessage = lastError?.message || 'Unknown error';
      console.error(`Failed to fetch transcript for video ${videoId}. Last error: ${errorMessage}`);
      
      let specificError = '';
      if (lastError instanceof YoutubeTranscriptDisabledError) {
        specificError = 'Captions are disabled for this video by the creator.';
      } else if (lastError instanceof YoutubeTranscriptNotAvailableError) {
        specificError = 'No transcript is available for this video.';
      } else if (lastError instanceof YoutubeTranscriptNotAvailableLanguageError) {
        specificError = `The requested language is not available.${availableLanguages.length > 0 ? ` Available languages: ${availableLanguages.join(', ')}` : ''}`;
      }
      
      return NextResponse.json(
        {
          success: false,
          error: specificError || `No transcript available for this video. Possible reasons:
- The video may not have captions/subtitles enabled
- The video may be too new (transcripts can take 24-48 hours to generate)
- The video may have captions disabled by the creator
- The video may be age-restricted or private

Try a different video or check if the video has captions enabled on YouTube.`,
          details: errorMessage,
          videoId,
          availableLanguages: availableLanguages.length > 0 ? availableLanguages : undefined,
        },
        { status: 400 }
      );
    }

    // Extract trading strategies from transcript
    const extractedStrategies = extractStrategiesFromTranscript(transcriptText);

    // Try to get video metadata (optional)
    let videoTitle: string | undefined;
    let videoChannel: string | undefined;

    try {
      // You can enhance this by using youtube-dl or similar to get metadata
      // For now, we'll just store what we have
    } catch (error) {
      console.warn('Could not fetch video metadata:', error);
    }

    // Save to database
    const strategyDoc = new YouTubeStrategy({
      videoId,
      videoUrl,
      videoTitle,
      videoChannel,
      transcript: transcriptText,
      extractedStrategies,
      extractedAt: new Date(),
      processed: true,
    });

    await strategyDoc.save();

    return NextResponse.json({
      success: true,
      message: 'Strategy extracted successfully',
      data: {
        videoId,
        videoUrl,
        strategiesCount: extractedStrategies.length,
        strategies: extractedStrategies,
        transcriptLength: transcriptText.length,
      },
    });
  } catch (error) {
    console.error('Error extracting YouTube strategy:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to extract strategy';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve extracted strategies
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const query: { videoId?: string } = {};
    if (videoId) {
      query.videoId = videoId;
    }

    const strategies = await YouTubeStrategy.find(query)
      .sort({ extractedAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-transcript'); // Exclude full transcript for list view

    const total = await YouTubeStrategy.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: strategies,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching YouTube strategies:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch strategies';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}