export interface FormattedVideoInfo {
  type: 'youtube' | 'vimeo' | 'html5';
  embedUrl: string;
  originalUrl: string;
  sourceLabel: string;
  isIframe: boolean;
}

/**
 * Parses and formats any video URL (YouTube, Vimeo, direct MP4/WebM, or Data URI)
 * into a safe, responsive embeddable or playable format.
 */
export const formatVideoDetails = (url: string | undefined): FormattedVideoInfo => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      type: 'html5',
      embedUrl: '',
      originalUrl: '',
      sourceLabel: 'لا يوجد فيديو',
      isIframe: false
    };
  }

  const cleanUrl = url.trim();

  // YouTube URLs (Standard watch, youtu.be, shorts, embed)
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
      originalUrl: cleanUrl,
      sourceLabel: 'يوتيوب (YouTube)',
      isIframe: true
    };
  }

  // Vimeo URLs
  const vimeoMatch = cleanUrl.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      originalUrl: cleanUrl,
      sourceLabel: 'فيميو (Vimeo)',
      isIframe: true
    };
  }

  // Direct MP4 / WebM / Local Data URI
  const isDataUri = cleanUrl.startsWith('data:video/');
  return {
    type: 'html5',
    embedUrl: cleanUrl,
    originalUrl: cleanUrl,
    sourceLabel: isDataUri ? 'ملف فيديو مرفوع' : 'رابط فيديو مباشر (MP4)',
    isIframe: false
  };
};
