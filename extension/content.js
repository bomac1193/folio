// FOLIO Content Script
// Extracts content metadata from supported platforms

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const data = extractContent()
    sendResponse(data)
  }
  return true
})

function extractContent() {
  const hostname = window.location.hostname.replace('www.', '')

  switch (hostname) {
    case 'youtube.com':
      return extractYouTube()
    case 'tiktok.com':
      return extractTikTok()
    case 'instagram.com':
      return extractInstagram()
    case 'twitter.com':
    case 'x.com':
      return extractTwitter()
    default:
      return null
  }
}

function extractYouTube() {
  // Check if on a video page
  if (!window.location.pathname.includes('/watch') && !window.location.pathname.includes('/shorts')) {
    return null
  }

  const isShort = window.location.pathname.includes('/shorts')

  // Title
  const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')
  const title = titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '').trim()

  // Thumbnail (from video ID)
  const videoId = new URLSearchParams(window.location.search).get('v') ||
    window.location.pathname.split('/shorts/')[1]
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null

  // Views
  const viewsEl = document.querySelector('.ytd-video-view-count-renderer, [class*="view-count"]')
  const viewsText = viewsEl?.textContent || ''
  const views = parseViews(viewsText)

  return {
    title,
    thumbnail,
    views,
    engagement: null,
    platform: isShort ? 'YOUTUBE_SHORT' : 'YOUTUBE_LONG',
  }
}

function extractTikTok() {
  // Title/description
  const descEl = document.querySelector('[data-e2e="browse-video-desc"], .tiktok-1ejylhp-DivContainer')
  const title = descEl?.textContent?.trim() || document.title.replace(' | TikTok', '').trim()

  // Thumbnail
  const videoEl = document.querySelector('video')
  const thumbnail = videoEl?.poster || null

  // Views
  const viewsEl = document.querySelector('[data-e2e="video-views"], .video-count')
  const views = viewsEl ? parseViews(viewsEl.textContent) : null

  // Engagement (likes + comments)
  const likesEl = document.querySelector('[data-e2e="like-count"]')
  const likes = likesEl ? parseViews(likesEl.textContent) : 0

  return {
    title,
    thumbnail,
    views,
    engagement: views && likes ? (likes / views) * 100 : null,
  }
}

function extractInstagram() {
  // Check if on a reel/post page
  if (!window.location.pathname.includes('/reel') && !window.location.pathname.includes('/p/')) {
    return null
  }

  // Title (caption)
  const captionEl = document.querySelector('[class*="Caption"], h1')
  const title = captionEl?.textContent?.trim() || document.title.replace(' | Instagram', '').trim()

  // Thumbnail
  const imgEl = document.querySelector('video, img[src*="cdninstagram"]')
  const thumbnail = imgEl?.poster || imgEl?.src || null

  // Views/likes
  const viewsEl = document.querySelector('[class*="viewCount"], [class*="LikeCount"]')
  const views = viewsEl ? parseViews(viewsEl.textContent) : null

  return {
    title: title.slice(0, 200), // Instagram captions can be long
    thumbnail,
    views,
    engagement: null,
  }
}

function extractTwitter() {
  // Get tweet text
  const tweetEl = document.querySelector('[data-testid="tweetText"]')
  const title = tweetEl?.textContent?.trim() || ''

  // Media
  const imgEl = document.querySelector('[data-testid="tweetPhoto"] img, video')
  const thumbnail = imgEl?.src || imgEl?.poster || null

  // Engagement metrics
  const metricsEls = document.querySelectorAll('[data-testid$="count"]')
  let views = null

  metricsEls.forEach((el) => {
    const text = el.textContent
    if (text.includes('K') || text.includes('M') || /^\d/.test(text)) {
      const parsed = parseViews(text)
      if (parsed && (!views || parsed > views)) {
        views = parsed
      }
    }
  })

  return {
    title: title.slice(0, 280),
    thumbnail,
    views,
    engagement: null,
  }
}

function parseViews(text) {
  if (!text) return null

  const cleaned = text.toLowerCase().replace(/[,\s]/g, '')
  const match = cleaned.match(/([\d.]+)([kmb]?)/)

  if (!match) return null

  let num = parseFloat(match[1])
  const suffix = match[2]

  switch (suffix) {
    case 'k':
      num *= 1000
      break
    case 'm':
      num *= 1000000
      break
    case 'b':
      num *= 1000000000
      break
  }

  return Math.round(num)
}
