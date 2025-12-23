/**
 * Utility to extract transcripts from YouTube videos
 */

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

/**
 * Extract video ID from YouTube URL
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID&feature=share
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert transcript items to plain text
 */
export function transcriptToText(transcript: TranscriptItem[]): string {
  return transcript.map((item) => item.text).join(' ');
}

