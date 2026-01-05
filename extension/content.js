// FOLIO Content Script
// Extracts content metadata from supported platforms

// Store current video data
let currentVideoData = null
let lastVideoId = null

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const data = extractContent()
    console.log('FOLIO extracted:', data)
    sendResponse(data)
  }
  return true
})

// Initialize platform-specific observers
const hostname = window.location.hostname.replace('www.', '')
if (hostname === 'tiktok.com') {
  initTikTokObserver()
}

function extractContent() {
  const hostname = window.location.hostname.replace('www.', '')

  switch (hostname) {
    case 'youtube.com':
      return extractYouTube()
    case 'tiktok.com':
      // Always get fresh data for TikTok
      return extractTikTokCurrentVideo()
    case 'instagram.com':
      return extractInstagram()
    case 'twitter.com':
    case 'x.com':
      return extractTwitter()
    default:
      return null
  }
}

function initTikTokObserver() {
  console.log('FOLIO: TikTok observer initialized for', window.location.pathname)

  // Track last detected video for comparison
  let lastDetectedUrl = null

  // Function to check for video changes
  const checkForNewVideo = () => {
    const data = extractTikTokCurrentVideo()

    // Use URL as primary identifier, fall back to videoId
    const currentIdentifier = data?.url || data?.videoId

    if (data && currentIdentifier !== lastDetectedUrl) {
      lastDetectedUrl = currentIdentifier
      lastVideoId = data.videoId
      currentVideoData = data
      console.log('FOLIO: New TikTok video detected:')
      console.log('  Title:', data.title?.slice(0, 60))
      console.log('  ID:', data.videoId)
      console.log('  URL:', data.url)
      console.log('  Thumbnail:', data.thumbnail ? 'Yes' : 'No')

      // Notify popup of new video (if open)
      chrome.runtime.sendMessage({
        type: 'VIDEO_CHANGED',
        data: data
      }).catch(() => {
        // Popup not open, ignore
      })
    }
  }

  // Check periodically
  setInterval(checkForNewVideo, 500)

  // Also check on scroll events (with debounce)
  let scrollTimeout = null
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(checkForNewVideo, 100)
  }, { passive: true })

  // Check on URL changes (TikTok uses pushState)
  let lastUrl = window.location.href
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      console.log('FOLIO: URL changed to', lastUrl)
      setTimeout(checkForNewVideo, 300)
    }
  })
  urlObserver.observe(document.body, { childList: true, subtree: true })
}

function extractTikTokCurrentVideo() {
  // Find the currently playing/visible video
  const videos = document.querySelectorAll('video')
  let currentVideo = null
  let currentContainer = null

  // First priority: find the video that's most centered in viewport
  // (Don't prioritize playing videos since they pause when popup is focused)
  let bestVideo = null
  let bestScore = -1

  for (const video of videos) {
    const rect = video.getBoundingClientRect()
    const windowHeight = window.innerHeight

    // Skip videos that are too small or not visible
    if (rect.height < 100) continue

    // Calculate how centered the video is (higher = better)
    const videoCenter = rect.top + rect.height / 2
    const viewportCenter = windowHeight / 2
    const centerOffset = Math.abs(videoCenter - viewportCenter)
    const centerScore = Math.max(0, 1 - (centerOffset / (windowHeight / 2)))

    // Calculate visibility (how much of the video is on screen)
    const visibility = getVisibilityPercentage(video)

    // Small bonus for playing videos, but not essential
    const playingBonus = !video.paused ? 0.1 : 0

    // Videos must be at least 50% visible to be considered
    if (visibility > 0.5) {
      // Heavily weight center position - the most centered video wins
      const score = (centerScore * 2) + visibility + playingBonus
      if (score > bestScore) {
        bestScore = score
        bestVideo = video
      }
    }
  }

  currentVideo = bestVideo
  if (currentVideo) {
    currentContainer = findVideoContainer(currentVideo)
  }

  // Extract video URL/ID from the page or container
  let videoUrl = window.location.href
  let videoId = null

  // On For You page, URL often contains current video ID
  const urlVideoMatch = videoUrl.match(/\/video\/(\d+)/)
  if (urlVideoMatch) {
    videoId = urlVideoMatch[1]
  }

  // Try to find video link in container as backup
  if (!videoId && currentContainer) {
    const link = currentContainer.querySelector('a[href*="/video/"]')
    if (link) {
      videoUrl = link.href
      const match = videoUrl.match(/\/video\/(\d+)/)
      if (match) {
        videoId = match[1]
      }
    }
  }

  // Try data attributes that TikTok sometimes uses
  if (!videoId && currentContainer) {
    const dataId = currentContainer.getAttribute('data-video-id') ||
                   currentContainer.querySelector('[data-video-id]')?.getAttribute('data-video-id')
    if (dataId) {
      videoId = dataId
    }
  }

  // Get thumbnail - try multiple methods for TikTok
  let thumbnail = null

  // Method 1: Video poster attribute (most reliable)
  if (currentVideo?.poster) {
    thumbnail = currentVideo.poster
  }

  // Method 2: Look for image in the video container (TikTok CDN images)
  if (!thumbnail && currentContainer) {
    const img = currentContainer.querySelector('img[src*="tiktokcdn"], img[src*="muscdn"], img[src*="tiktok"]')
    if (img && img.src) {
      thumbnail = img.src
    }
  }

  // Method 3: og:image meta tag
  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      thumbnail = ogImage.getAttribute('content')
    }
  }

  // Method 4: Any sizeable image in the container
  if (!thumbnail && currentContainer) {
    const imgs = currentContainer.querySelectorAll('img')
    for (const img of imgs) {
      // Look for images that are large enough to be thumbnails
      if (img.src && !img.src.includes('avatar') && !img.src.includes('profile')) {
        const width = img.width || img.naturalWidth || 0
        const height = img.height || img.naturalHeight || 0
        if (width > 50 || height > 50) {
          thumbnail = img.src
          break
        }
      }
    }
  }

  // Method 5: Capture frame from video (works even when paused if video has data)
  if (!thumbnail && currentVideo && currentVideo.readyState >= 2) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = currentVideo.videoWidth || 720
      canvas.height = currentVideo.videoHeight || 1280
      const ctx = canvas.getContext('2d')
      ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height)
      thumbnail = canvas.toDataURL('image/jpeg', 0.8)
    } catch (e) {
      // Cross-origin or other error, skip
    }
  }

  // Get title/description
  let title = ''

  // Try to find description in the video container
  if (currentContainer) {
    // Look for description text
    const descSelectors = [
      '[data-e2e="video-desc"]',
      '[data-e2e="browse-video-desc"]',
      '[class*="tiktok"][class*="DivContainer"] span[class*="SpanText"]',
      '[class*="video-meta-caption"]',
      '[class*="DivVideoInfoContainer"]',
    ]

    for (const selector of descSelectors) {
      const el = currentContainer.querySelector(selector)
      if (el && el.textContent.trim().length > 3) {
        title = el.textContent.trim()
        break
      }
    }

    // Try finding any span/div with substantial text
    if (!title) {
      const textEls = currentContainer.querySelectorAll('span, div')
      for (const el of textEls) {
        const text = el.textContent.trim()
        // Look for text that looks like a description (has hashtags or is long enough)
        if (text.length > 20 || text.includes('#')) {
          // Make sure it's not just numbers (like view counts)
          if (!/^\d+[KMB]?$/.test(text) && !text.match(/^\d+:\d+$/)) {
            title = text
            break
          }
        }
      }
    }
  }

  // Fallback to meta or document title
  if (!title) {
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      title = ogTitle.getAttribute('content') || ''
    }
  }

  if (!title) {
    title = document.title
      .replace(' | TikTok', '')
      .replace('TikTok - ', '')
      .replace(' - TikTok', '')
      .split(' | ')[0]
      .trim()
  }

  // Get username
  let username = ''
  if (currentContainer) {
    const usernameEl = currentContainer.querySelector('[data-e2e="video-author-uniqueid"], [class*="author"], a[href^="/@"]')
    if (usernameEl) {
      username = usernameEl.textContent.trim().replace('@', '')
    }
  }

  // Get view count
  let views = null
  if (currentContainer) {
    const viewsEl = currentContainer.querySelector('[data-e2e="video-views"], [class*="play-count"], [class*="view"]')
    if (viewsEl) {
      views = parseViews(viewsEl.textContent)
    }
  }

  // Get likes
  let likes = null
  if (currentContainer) {
    const likesEl = currentContainer.querySelector('[data-e2e="like-count"], [data-e2e="browse-like-count"]')
    if (likesEl) {
      likes = parseViews(likesEl.textContent)
    }
  }

  // Add username to title if we have it and it's not already there
  if (username && title && !title.includes(username)) {
    title = `@${username}: ${title}`
  }

  return {
    title: title.slice(0, 500) || 'TikTok Video',
    thumbnail,
    views,
    engagement: views && likes ? (likes / views) * 100 : null,
    platform: 'TIKTOK',
    videoId,
    url: videoUrl,
  }
}

function findVideoContainer(video) {
  // Walk up the DOM to find a container that likely holds video info
  let el = video.parentElement
  let depth = 0
  const maxDepth = 15

  while (el && depth < maxDepth) {
    // Check for various TikTok container patterns
    const hasVideoDesc = el.querySelector('[data-e2e="video-desc"]') ||
                         el.querySelector('[data-e2e="browse-video-desc"]')
    const hasLikeCount = el.querySelector('[data-e2e="like-count"]') ||
                         el.querySelector('[data-e2e="browse-like-count"]')
    const hasVideoLink = el.querySelector('a[href*="/video/"]')
    const hasUserLink = el.querySelector('a[href^="/@"]')
    const hasInfoContainer = el.querySelector('[class*="DivVideoInfoContainer"]') ||
                            el.querySelector('[class*="DivContentContainer"]')

    // For You page specific: look for the main video item container
    const isMainContainer = el.getAttribute('data-e2e') === 'recommend-list-item-container' ||
                           el.classList.contains('swiper-slide') ||
                           el.querySelector('[data-e2e="recommend-list-item-container"]')

    if (hasVideoDesc || hasLikeCount || hasVideoLink || hasInfoContainer || isMainContainer) {
      return el
    }

    // Also check if element contains substantial metadata (username + text)
    if (hasUserLink && el.textContent.length > 50) {
      return el
    }

    el = el.parentElement
    depth++
  }

  // Fallback: return a larger parent that likely contains the video card
  el = video.parentElement
  for (let i = 0; i < 8 && el; i++) {
    el = el.parentElement
  }
  return el
}

function isElementInViewport(el) {
  const rect = el.getBoundingClientRect()
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth

  return (
    rect.top < windowHeight &&
    rect.bottom > 0 &&
    rect.left < windowWidth &&
    rect.right > 0 &&
    rect.height > 100
  )
}

function getVisibilityPercentage(el) {
  const rect = el.getBoundingClientRect()
  const windowHeight = window.innerHeight

  if (rect.bottom < 0 || rect.top > windowHeight) return 0

  const visibleTop = Math.max(0, rect.top)
  const visibleBottom = Math.min(windowHeight, rect.bottom)
  const visibleHeight = visibleBottom - visibleTop

  return visibleHeight / rect.height
}

function extractYouTube() {
  const url = window.location.href
  const isShort = url.includes('/shorts/')

  let videoId = null
  if (isShort) {
    const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
    videoId = match ? match[1] : null
  } else {
    const urlParams = new URLSearchParams(window.location.search)
    videoId = urlParams.get('v')
  }

  let title = ''
  const titleSelectors = [
    'h1.ytd-video-primary-info-renderer',
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.ytd-watch-metadata',
    '#title h1',
    '[itemprop="name"]'
  ]

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      title = el.textContent.trim()
      break
    }
  }

  if (!title) {
    title = document.title.replace(' - YouTube', '').trim()
  }

  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null

  let views = null
  const viewSelectors = [
    '#count .ytd-video-view-count-renderer',
    '.ytd-video-view-count-renderer',
    '[itemprop="interactionCount"]'
  ]

  for (const selector of viewSelectors) {
    const el = document.querySelector(selector)
    if (el) {
      views = parseViews(el.textContent || el.getAttribute('content'))
      if (views) break
    }
  }

  return {
    title,
    thumbnail,
    views,
    engagement: null,
    platform: isShort ? 'YOUTUBE_SHORT' : 'YOUTUBE_LONG',
  }
}

function extractInstagram() {
  let title = ''
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    title = ogTitle.getAttribute('content') || ''
  }

  if (!title) {
    title = document.title.replace(' | Instagram', '').trim()
  }

  let thumbnail = null
  const metaImage = document.querySelector('meta[property="og:image"]')
  if (metaImage) {
    thumbnail = metaImage.getAttribute('content')
  }

  if (!thumbnail) {
    const video = document.querySelector('video')
    if (video && video.poster) {
      thumbnail = video.poster
    }
  }

  return {
    title: title.slice(0, 300),
    thumbnail,
    views: null,
    engagement: null,
    platform: 'INSTAGRAM_REEL',
  }
}

function extractTwitter() {
  let title = ''
  const tweetEl = document.querySelector('[data-testid="tweetText"]')
  if (tweetEl) {
    title = tweetEl.textContent.trim()
  }

  if (!title) {
    title = document.title.replace(' / X', '').replace(' / Twitter', '').trim()
  }

  let thumbnail = null
  const imgEl = document.querySelector('[data-testid="tweetPhoto"] img')
  if (imgEl) {
    thumbnail = imgEl.src
  }

  if (!thumbnail) {
    const videoEl = document.querySelector('video')
    if (videoEl && videoEl.poster) {
      thumbnail = videoEl.poster
    }
  }

  if (!thumbnail) {
    const metaImage = document.querySelector('meta[property="og:image"]')
    if (metaImage) {
      thumbnail = metaImage.getAttribute('content')
    }
  }

  return {
    title: title.slice(0, 280),
    thumbnail,
    views: null,
    engagement: null,
    platform: 'TWITTER',
  }
}

function parseViews(text) {
  if (!text) return null

  const cleaned = text.toLowerCase().replace(/[,\s]/g, '').replace('views', '').replace('view', '')
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

console.log('FOLIO content script loaded for:', window.location.hostname)
