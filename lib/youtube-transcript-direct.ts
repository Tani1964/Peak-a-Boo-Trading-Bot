/**
 * Direct YouTube transcript fetching using YouTube's internal API
 * This is more reliable than the youtube-transcript package
 */

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

/**
 * Fetch transcript directly from YouTube's API
 */
export async function fetchTranscriptDirect(videoId: string): Promise<string> {
  try {
    // Method 1: Try YouTube's transcript API endpoint with JSON3 format
    const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3`;
    
    const response = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      },
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      // Check if response is JSON
      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        try {
          const data = await response.json();
          
          // Parse the JSON3 format
          interface TranscriptEvent {
            segs?: Array<{ utf8?: string }>;
          }
          interface TranscriptData {
            events?: TranscriptEvent[];
          }
          const transcriptData = data as TranscriptData;
          if (transcriptData.events) {
            const transcriptText = transcriptData.events
              .map((event: TranscriptEvent) => {
                if (event.segs) {
                  return event.segs.map((seg) => seg.utf8 || '').join('');
                }
                return '';
              })
              .filter((text: string) => text.trim().length > 0)
              .join(' ');
            
            if (transcriptText.trim().length > 0) {
              return transcriptText;
            }
          }
        } catch {
          // Not valid JSON, continue to next method
          console.log('JSON parse failed, trying XML format');
        }
      } else {
        // Response is not JSON (probably HTML), skip this method
        console.log('Response is not JSON, content-type:', contentType);
      }
    }

    // Method 2: Try XML format (more reliable)
    const xmlUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`;
    const xmlResponse = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/xml,application/xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      },
    });

    if (xmlResponse.ok) {
      const xmlText = await xmlResponse.text();
      
      // Check if we got HTML instead of XML
      if (xmlText.trim().startsWith('<!DOCTYPE') || xmlText.trim().startsWith('<html')) {
        console.log('Received HTML instead of XML, skipping');
      } else {
        // Parse XML
        const textMatches = xmlText.match(/<text[^>]*>([^<]+)<\/text>/g);
        if (textMatches) {
          const transcriptText = textMatches
            .map((match) => {
              const textMatch = match.match(/<text[^>]*>([^<]+)<\/text>/);
              return textMatch ? textMatch[1] : '';
            })
            .filter((text) => text.trim().length > 0)
            .join(' ');
          
          if (transcriptText.trim().length > 0) {
            return transcriptText;
          }
        }
      }
    }

    // Method 3: Try to get video page and extract transcript info
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (pageResponse.ok) {
      const pageHtml = await pageResponse.text();
      
      // Look for caption tracks in the page
      const captionTracksMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionTracksMatch) {
        try {
          const captionTracks = JSON.parse(captionTracksMatch[1]);
          if (captionTracks && captionTracks.length > 0) {
            // Try the first available caption track
            const baseUrl = captionTracks[0].baseUrl;
            if (baseUrl) {
              const captionResponse = await fetch(baseUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              });
              
              if (captionResponse.ok) {
                const captionXml = await captionResponse.text();
                const textMatches = captionXml.match(/<text[^>]*>([^<]+)<\/text>/g);
                if (textMatches) {
                  const transcriptText = textMatches
                    .map((match) => {
                      const textMatch = match.match(/<text[^>]*>([^<]+)<\/text>/);
                      return textMatch ? textMatch[1] : '';
                    })
                    .filter((text) => text.trim().length > 0)
                    .join(' ');
                  
                  if (transcriptText.trim().length > 0) {
                    return transcriptText;
                  }
                }
              }
            }
          }
        } catch {
          // JSON parse failed, continue
        }
      }
    }

    // If all methods failed, throw error
    throw new Error('No transcript available using direct API methods');
  } catch (error) {
    // Don't throw here, let the caller handle it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Direct API fetch error:', errorMessage);
    throw new Error(`Failed to fetch transcript: ${errorMessage}`);
  }
}

