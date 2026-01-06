// FOLIO Content Script
// Extracts content metadata and provides hover overlay for quick save

const API_BASE = 'http://localhost:3003'

// Store current video data
let currentVideoData = null
let lastVideoId = null
let overlayVisible = false
let currentOverlay = null
let hoverTimeout = null

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const data = extractContent()
    console.log('FOLIO extracted:', data)
    sendResponse(data)
  }
  return true
})

// Initialize based on platform
const hostname = window.location.hostname.replace('www.', '')

// Inject styles
injectStyles()

// Initialize platform-specific features
if (hostname === 'tiktok.com') {
  initTikTokObserver()
  initTikTokFixedOverlay() // Use fixed overlay for TikTok For You page
  initHoverOverlay('tiktok')
} else if (hostname === 'youtube.com') {
  initHoverOverlay('youtube')
  initYouTubeShortsOverlay() // Fixed overlay for Shorts
} else if (hostname === 'instagram.com') {
  initHoverOverlay('instagram')
} else if (hostname === 'twitter.com' || hostname === 'x.com') {
  initHoverOverlay('twitter')
} else if (hostname === 'twitch.tv') {
  initMusicPlatformOverlay('twitch')
} else if (hostname === 'soundcloud.com') {
  initMusicPlatformOverlay('soundcloud')
} else if (hostname.includes('bandcamp.com')) {
  initMusicPlatformOverlay('bandcamp')
} else if (hostname === 'mixcloud.com') {
  initMusicPlatformOverlay('mixcloud')
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    .folio-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
      pointer-events: auto;
    }

    .folio-save-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(10, 10, 10, 0.9);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s ease;
      backdrop-filter: blur(8px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .folio-save-btn:hover {
      background: rgba(10, 10, 10, 1);
      transform: scale(1.02);
    }

    .folio-save-btn.saved {
      background: rgba(45, 58, 46, 0.95);
    }

    .folio-save-btn.saving {
      opacity: 0.7;
      cursor: wait;
    }

    .folio-logo {
      font-size: 10px;
      letter-spacing: 2px;
      opacity: 0.8;
    }

    .folio-expanded {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      width: 280px;
      background: rgba(250, 250, 248, 0.98);
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      overflow: hidden;
      backdrop-filter: blur(12px);
    }

    .folio-expanded-thumb {
      width: 100%;
      height: 140px;
      background: #f5f5f0;
      object-fit: cover;
    }

    .folio-expanded-content {
      padding: 12px;
    }

    .folio-expanded-title {
      font-size: 12px;
      color: #0a0a0a;
      line-height: 1.4;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .folio-expanded-meta {
      display: flex;
      gap: 12px;
      font-size: 10px;
      color: #6b6b6b;
      margin-bottom: 12px;
      font-family: 'Consolas', monospace;
    }

    .folio-expanded-actions {
      display: flex;
      gap: 8px;
    }

    .folio-action-btn {
      flex: 1;
      padding: 8px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .folio-action-primary {
      background: #0a0a0a;
      color: white;
    }

    .folio-action-primary:hover {
      background: #2a2a2a;
    }

    .folio-action-secondary {
      background: #f5f5f0;
      color: #0a0a0a;
      border: 1px solid #e5e5e0;
    }

    .folio-action-secondary:hover {
      background: #e5e5e0;
    }

    .folio-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: rgba(10, 10, 10, 0.95);
      color: white;
      font-size: 12px;
      border-radius: 4px;
      z-index: 999999;
      animation: folio-slide-up 0.3s ease;
      backdrop-filter: blur(8px);
    }

    .folio-toast.success {
      background: rgba(45, 58, 46, 0.95);
    }

    .folio-toast.error {
      background: rgba(139, 58, 58, 0.95);
    }

    @keyframes folio-slide-up {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
  document.head.appendChild(style)
}

// Fixed overlay for YouTube Shorts
function initYouTubeShortsOverlay() {
  console.log('FOLIO: YouTube Shorts overlay initialized')

  let overlay = null

  const createOverlay = () => {
    if (overlay) return

    overlay = document.createElement('div')
    overlay.id = 'folio-shorts-fixed'
    overlay.innerHTML = `
      <button class="folio-save-btn" id="folio-shorts-save">
        <span class="folio-logo">FOLIO</span> Save
      </button>
    `
    overlay.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    `
    document.body.appendChild(overlay)

    const saveBtn = overlay.querySelector('#folio-shorts-save')
    saveBtn.addEventListener('click', () => {
      const data = extractYouTube()
      if (!data || !data.title) {
        showToast('Could not detect video', 'error')
        return
      }

      const params = new URLSearchParams({
        title: data.title || '',
        url: data.url || window.location.href,
        platform: data.platform || 'YOUTUBE_SHORT',
        contentType: 'VIDEO',
        ...(data.thumbnail && { thumbnail: data.thumbnail }),
        ...(data.views && { views: data.views.toString() }),
      })

      window.open(`${API_BASE}/save?${params.toString()}`, '_blank')
      saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> ✓ Opened'
      setTimeout(() => {
        saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> Save'
      }, 2000)
    })
  }

  const removeOverlay = () => {
    if (overlay) {
      overlay.remove()
      overlay = null
    }
  }

  // Check if on Shorts page and show/hide overlay
  const checkForShorts = () => {
    const isShorts = window.location.pathname.includes('/shorts/')
    if (isShorts) {
      createOverlay()
    } else {
      removeOverlay()
    }
  }

  // Initial check
  checkForShorts()

  // Watch for URL changes (YouTube is SPA)
  let lastUrl = window.location.href
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      checkForShorts()
    }
  })
  urlObserver.observe(document.body, { childList: true, subtree: true })

  // Also check on popstate
  window.addEventListener('popstate', checkForShorts)
}

// Fixed overlay for music platforms (Twitch, SoundCloud, Bandcamp, Mixcloud)
function initMusicPlatformOverlay(platform) {
  console.log('FOLIO: Music platform overlay initialized for', platform)

  const overlay = document.createElement('div')
  overlay.id = `folio-${platform}-fixed`
  overlay.innerHTML = `
    <button class="folio-save-btn" id="folio-${platform}-save">
      <span class="folio-logo">FOLIO</span> Save
    </button>
  `
  overlay.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  `
  document.body.appendChild(overlay)

  const saveBtn = overlay.querySelector(`#folio-${platform}-save`)
  saveBtn.addEventListener('click', () => {
    let data
    switch (platform) {
      case 'twitch':
        data = extractTwitch()
        break
      case 'soundcloud':
        data = extractSoundCloud()
        break
      case 'bandcamp':
        data = extractBandcamp()
        break
      case 'mixcloud':
        data = extractMixcloud()
        break
      default:
        data = null
    }

    if (!data || !data.title) {
      showToast('Could not detect content', 'error')
      return
    }

    // Determine content type based on platform
    let contentType = data.contentType || 'VIDEO'
    if (platform === 'twitch') {
      contentType = data.isLive ? 'LIVE_STREAM' : (data.url?.includes('/clip/') ? 'CLIP' : 'VIDEO')
    } else if (platform === 'soundcloud') {
      contentType = 'TRACK'
    } else if (platform === 'bandcamp') {
      contentType = 'RELEASE'
    } else if (platform === 'mixcloud') {
      contentType = 'MIX'
    }

    const params = new URLSearchParams({
      title: data.title || '',
      url: data.url || window.location.href,
      platform: data.platform || platform.toUpperCase(),
      contentType,
      ...(data.thumbnail && { thumbnail: data.thumbnail }),
      ...(data.views && { views: data.views.toString() }),
    })

    window.open(`${API_BASE}/save?${params.toString()}`, '_blank')
    saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> ✓ Opened'
    setTimeout(() => {
      saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> Save'
    }, 2000)
  })
}

// Fixed overlay for TikTok that updates as user scrolls
function initTikTokFixedOverlay() {
  console.log('FOLIO: TikTok fixed overlay initialized')

  // Create fixed overlay in corner
  const overlay = document.createElement('div')
  overlay.id = 'folio-tiktok-fixed'
  overlay.innerHTML = `
    <button class="folio-save-btn" id="folio-tiktok-save">
      <span class="folio-logo">FOLIO</span> Save
    </button>
  `
  overlay.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  `
  document.body.appendChild(overlay)

  const saveBtn = overlay.querySelector('#folio-tiktok-save')

  saveBtn.addEventListener('click', () => {
    const data = extractTikTokCurrentVideo()
    if (!data || !data.title) {
      showToast('Could not detect video', 'error')
      return
    }

    const params = new URLSearchParams({
      title: data.title || '',
      url: data.url || window.location.href,
      platform: data.platform || 'TIKTOK',
      contentType: 'VIDEO',
      ...(data.thumbnail && { thumbnail: data.thumbnail }),
      ...(data.views && { views: data.views.toString() }),
    })

    window.open(`${API_BASE}/save?${params.toString()}`, '_blank')
    saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> ✓ Opened'
    setTimeout(() => {
      saveBtn.innerHTML = '<span class="folio-logo">FOLIO</span> Save'
    }, 2000)
  })
}

function initHoverOverlay(platform) {
  console.log('FOLIO: Hover overlay initialized for', platform)

  // Track which elements have overlays
  const overlayedElements = new WeakSet()

  // Function to add overlay to video elements
  const addOverlayToVideos = () => {
    let videoContainers = []

    if (platform === 'youtube') {
      // YouTube: target video thumbnails, player, and Shorts
      videoContainers = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, #movie_player, ytd-reel-video-renderer, ytd-shorts-video-renderer, #shorts-player')
    } else if (platform === 'tiktok') {
      // TikTok: target video containers
      videoContainers = document.querySelectorAll('[data-e2e="recommend-list-item-container"], [class*="DivItemContainer"], [class*="video-feed-item"]')
      // Also get the main video player area
      const mainPlayer = document.querySelector('[class*="DivVideoWrapper"]')
      if (mainPlayer) videoContainers = [...videoContainers, mainPlayer]
    } else if (platform === 'instagram') {
      videoContainers = document.querySelectorAll('article, [role="presentation"]')
    } else if (platform === 'twitter') {
      videoContainers = document.querySelectorAll('[data-testid="tweet"], [data-testid="tweetPhoto"]')
    }

    videoContainers.forEach(container => {
      if (overlayedElements.has(container)) return
      if (!container.querySelector('video, img[src*="ytimg"], img[src*="thumbnail"]')) return

      overlayedElements.add(container)

      // Make container relative for overlay positioning
      const computedStyle = window.getComputedStyle(container)
      if (computedStyle.position === 'static') {
        container.style.position = 'relative'
      }

      // Create overlay button
      const overlay = createOverlayButton(container, platform)

      // Show on hover
      container.addEventListener('mouseenter', () => {
        overlay.style.opacity = '1'
        overlay.style.pointerEvents = 'auto'
      })

      container.addEventListener('mouseleave', (e) => {
        // Don't hide if mouse moved to expanded panel
        if (e.relatedTarget && overlay.contains(e.relatedTarget)) return
        if (!overlay.querySelector('.folio-expanded')) {
          overlay.style.opacity = '0'
          overlay.style.pointerEvents = 'none'
        }
      })
    })
  }

  // Initial scan
  setTimeout(addOverlayToVideos, 1000)

  // Watch for new videos (infinite scroll)
  const observer = new MutationObserver(() => {
    addOverlayToVideos()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function createOverlayButton(container, platform) {
  const overlay = document.createElement('div')
  overlay.className = 'folio-overlay'
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'
  overlay.style.transition = 'opacity 0.2s ease'

  const btn = document.createElement('button')
  btn.className = 'folio-save-btn'
  btn.innerHTML = '<span class="folio-logo">FOLIO</span> Save'

  let expanded = null

  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()

    // Toggle expanded view
    if (expanded) {
      expanded.remove()
      expanded = null
      overlay.style.opacity = '1'
      return
    }

    // Extract data for this specific container
    const data = extractFromContainer(container, platform)

    expanded = document.createElement('div')
    expanded.className = 'folio-expanded'

    expanded.innerHTML = `
      ${data.thumbnail ? `<img class="folio-expanded-thumb" src="${data.thumbnail}" alt="Thumbnail" />` : '<div class="folio-expanded-thumb"></div>'}
      <div class="folio-expanded-content">
        <div class="folio-expanded-title">${escapeHtml(data.title || 'Untitled')}</div>
        <div class="folio-expanded-meta">
          <span>${data.platform}</span>
          ${data.views ? `<span>${formatViews(data.views)} views</span>` : ''}
        </div>
        <div class="folio-expanded-actions">
          <button class="folio-action-btn folio-action-primary" data-action="save">Save to Collection</button>
          <button class="folio-action-btn folio-action-secondary" data-action="close">✕</button>
        </div>
      </div>
    `

    overlay.appendChild(expanded)

    // Handle actions - open save page (avoids CORS/auth issues with direct API calls)
    expanded.querySelector('[data-action="save"]').addEventListener('click', () => {
      // Determine content type based on platform and URL
      let contentType = 'VIDEO'
      const platformLower = data.platform?.toLowerCase() || ''
      if (platformLower === 'twitch') {
        contentType = data.isLive ? 'LIVE_STREAM' : (data.url?.includes('/clip/') ? 'CLIP' : 'VIDEO')
      } else if (platformLower === 'soundcloud') {
        contentType = 'TRACK'
      } else if (platformLower === 'bandcamp') {
        contentType = 'RELEASE'
      } else if (platformLower === 'mixcloud') {
        contentType = 'MIX'
      }

      const params = new URLSearchParams({
        title: data.title || '',
        url: data.url || window.location.href,
        platform: data.platform || '',
        contentType,
        ...(data.thumbnail && { thumbnail: data.thumbnail }),
        ...(data.views && { views: data.views.toString() }),
      })

      // Open save page in new tab
      window.open(`${API_BASE}/save?${params.toString()}`, '_blank')

      btn.classList.add('saved')
      btn.innerHTML = '<span class="folio-logo">FOLIO</span> ✓ Opened'
      expanded.remove()
      expanded = null
    })

    expanded.querySelector('[data-action="close"]').addEventListener('click', () => {
      expanded.remove()
      expanded = null
    })

    // Close when clicking outside
    const closeOnClickOutside = (e) => {
      if (!overlay.contains(e.target)) {
        if (expanded) {
          expanded.remove()
          expanded = null
        }
        document.removeEventListener('click', closeOnClickOutside)
      }
    }
    setTimeout(() => document.addEventListener('click', closeOnClickOutside), 100)
  })

  overlay.appendChild(btn)
  container.appendChild(overlay)

  return overlay
}

function extractFromContainer(container, platform) {
  if (platform === 'tiktok') {
    return extractTikTokFromContainer(container)
  } else if (platform === 'youtube') {
    return extractYouTubeFromContainer(container)
  } else if (platform === 'instagram') {
    return extractInstagram()
  } else if (platform === 'twitter') {
    return extractTwitter()
  }
  return { title: 'Unknown', platform: platform.toUpperCase() }
}

function extractTikTokFromContainer(container) {
  // On TikTok For You page, always get the currently visible video
  // because the container content changes as user scrolls
  const isForYouPage = window.location.pathname === '/foryou' ||
                       window.location.pathname === '/' ||
                       window.location.pathname.startsWith('/@')

  if (isForYouPage) {
    // Use the global current video extraction instead
    return extractTikTokCurrentVideo()
  }

  // For other pages, try container-specific extraction
  let videoUrl = window.location.href
  let videoId = null

  const link = container.querySelector('a[href*="/video/"]')
  if (link) {
    videoUrl = link.href
    const match = videoUrl.match(/\/video\/(\d+)/)
    if (match) videoId = match[1]
  }

  if (!videoId) {
    const urlMatch = window.location.href.match(/\/video\/(\d+)/)
    if (urlMatch) videoId = urlMatch[1]
  }

  let title = ''
  const descEl = container.querySelector('[data-e2e="video-desc"], [data-e2e="browse-video-desc"]')
  if (descEl) {
    title = descEl.textContent.trim()
  }

  if (!title) {
    const textEls = container.querySelectorAll('span, div')
    for (const el of textEls) {
      const text = el.textContent.trim()
      if ((text.length > 20 || text.includes('#')) && !/^\d+[KMB]?$/.test(text)) {
        title = text
        break
      }
    }
  }

  let username = ''
  const usernameEl = container.querySelector('a[href^="/@"]')
  if (usernameEl) {
    username = usernameEl.textContent.trim().replace('@', '')
  }

  if (username && title && !title.includes(username)) {
    title = `@${username}: ${title}`
  }

  let thumbnail = null
  const video = container.querySelector('video')
  if (video?.poster) thumbnail = video.poster

  if (!thumbnail) {
    const img = container.querySelector('img[src*="tiktokcdn"], img[src*="muscdn"]')
    if (img) thumbnail = img.src
  }

  if (!thumbnail && video && video.readyState >= 2) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 720
      canvas.height = video.videoHeight || 1280
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      thumbnail = canvas.toDataURL('image/jpeg', 0.8)
    } catch (e) {}
  }

  let views = null
  const viewsEl = container.querySelector('[data-e2e="video-views"], [class*="play-count"]')
  if (viewsEl) views = parseViews(viewsEl.textContent)

  return {
    title: title.slice(0, 500) || 'TikTok Video',
    thumbnail,
    views,
    platform: 'TIKTOK',
    videoId,
    url: videoUrl,
  }
}

function extractYouTubeFromContainer(container) {
  // Check if this is the main player or a thumbnail
  const isMainPlayer = container.id === 'movie_player' || container.closest('#movie_player')

  if (isMainPlayer) {
    return extractYouTube()
  }

  // Extract from thumbnail/list item
  let videoUrl = ''
  let videoId = null
  let title = ''
  let thumbnail = null

  const link = container.querySelector('a#thumbnail, a[href*="watch?v="], a[href*="/shorts/"]')
  if (link) {
    videoUrl = link.href
    const match = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/) || videoUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
    if (match) videoId = match[1]
  }

  const titleEl = container.querySelector('#video-title, #title, [id*="video-title"]')
  if (titleEl) {
    title = titleEl.textContent.trim()
  }

  if (videoId) {
    thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  // Get views from metadata
  let views = null
  const metaEl = container.querySelector('#metadata-line span, .ytd-video-meta-block span')
  if (metaEl) {
    views = parseViews(metaEl.textContent)
  }

  const isShort = videoUrl.includes('/shorts/')

  return {
    title: title || 'YouTube Video',
    thumbnail,
    views,
    platform: isShort ? 'YOUTUBE_SHORT' : 'YOUTUBE_LONG',
    videoId,
    url: videoUrl || window.location.href,
  }
}

async function saveToFolio(data) {
  try {
    const res = await fetch(`${API_BASE}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: data.title,
        url: data.url,
        platform: data.platform,
        thumbnail: data.thumbnail,
        views: data.views,
      }),
    })

    return res.ok
  } catch (e) {
    console.error('FOLIO save error:', e)
    return false
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `folio-toast ${type}`
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatViews(views) {
  if (typeof views !== 'number') return views
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M'
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K'
  return views.toString()
}

// ============================================
// Original functions for popup compatibility
// ============================================

function extractContent() {
  const hostname = window.location.hostname.replace('www.', '')

  switch (hostname) {
    case 'youtube.com':
      return extractYouTube()
    case 'tiktok.com':
      return extractTikTokCurrentVideo()
    case 'instagram.com':
      return extractInstagram()
    case 'twitter.com':
    case 'x.com':
      return extractTwitter()
    case 'twitch.tv':
      return extractTwitch()
    case 'soundcloud.com':
      return extractSoundCloud()
    case 'mixcloud.com':
      return extractMixcloud()
    default:
      // Check for bandcamp subdomains (artist.bandcamp.com)
      if (hostname.includes('bandcamp.com')) {
        return extractBandcamp()
      }
      return null
  }
}

function initTikTokObserver() {
  console.log('FOLIO: TikTok observer initialized for', window.location.pathname)

  let lastDetectedUrl = null

  const checkForNewVideo = () => {
    const data = extractTikTokCurrentVideo()
    const currentIdentifier = data?.url || data?.videoId

    if (data && currentIdentifier !== lastDetectedUrl) {
      lastDetectedUrl = currentIdentifier
      lastVideoId = data.videoId
      currentVideoData = data
      console.log('FOLIO: New TikTok video detected:', data.title?.slice(0, 60))

      chrome.runtime.sendMessage({
        type: 'VIDEO_CHANGED',
        data: data
      }).catch(() => {})
    }
  }

  setInterval(checkForNewVideo, 500)

  let scrollTimeout = null
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(checkForNewVideo, 100)
  }, { passive: true })

  let lastUrl = window.location.href
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      setTimeout(checkForNewVideo, 300)
    }
  })
  urlObserver.observe(document.body, { childList: true, subtree: true })
}

function extractTikTokCurrentVideo() {
  const videos = document.querySelectorAll('video')
  let currentVideo = null
  let currentContainer = null
  let bestVideo = null
  let bestScore = -1

  for (const video of videos) {
    const rect = video.getBoundingClientRect()
    const windowHeight = window.innerHeight

    if (rect.height < 100) continue

    const videoCenter = rect.top + rect.height / 2
    const viewportCenter = windowHeight / 2
    const centerOffset = Math.abs(videoCenter - viewportCenter)
    const centerScore = Math.max(0, 1 - (centerOffset / (windowHeight / 2)))
    const visibility = getVisibilityPercentage(video)
    const playingBonus = !video.paused ? 0.1 : 0

    if (visibility > 0.5) {
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

  let videoUrl = window.location.href
  let videoId = null

  const urlVideoMatch = videoUrl.match(/\/video\/(\d+)/)
  if (urlVideoMatch) videoId = urlVideoMatch[1]

  if (!videoId && currentContainer) {
    const link = currentContainer.querySelector('a[href*="/video/"]')
    if (link) {
      videoUrl = link.href
      const match = videoUrl.match(/\/video\/(\d+)/)
      if (match) videoId = match[1]
    }
  }

  let thumbnail = null
  if (currentVideo?.poster) thumbnail = currentVideo.poster

  if (!thumbnail && currentContainer) {
    const img = currentContainer.querySelector('img[src*="tiktokcdn"], img[src*="muscdn"], img[src*="tiktok"]')
    if (img) thumbnail = img.src
  }

  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) thumbnail = ogImage.getAttribute('content')
  }

  if (!thumbnail && currentVideo && currentVideo.readyState >= 2) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = currentVideo.videoWidth || 720
      canvas.height = currentVideo.videoHeight || 1280
      canvas.getContext('2d').drawImage(currentVideo, 0, 0, canvas.width, canvas.height)
      thumbnail = canvas.toDataURL('image/jpeg', 0.8)
    } catch (e) {}
  }

  let title = ''
  if (currentContainer) {
    const descSelectors = ['[data-e2e="video-desc"]', '[data-e2e="browse-video-desc"]']
    for (const selector of descSelectors) {
      const el = currentContainer.querySelector(selector)
      if (el && el.textContent.trim().length > 3) {
        title = el.textContent.trim()
        break
      }
    }

    if (!title) {
      const textEls = currentContainer.querySelectorAll('span, div')
      for (const el of textEls) {
        const text = el.textContent.trim()
        if ((text.length > 20 || text.includes('#')) && !/^\d+[KMB]?$/.test(text)) {
          title = text
          break
        }
      }
    }
  }

  if (!title) {
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) title = ogTitle.getAttribute('content') || ''
  }

  if (!title) {
    title = document.title.replace(' | TikTok', '').replace('TikTok - ', '').split(' | ')[0].trim()
  }

  let username = ''
  if (currentContainer) {
    const usernameEl = currentContainer.querySelector('a[href^="/@"]')
    if (usernameEl) username = usernameEl.textContent.trim().replace('@', '')
  }

  if (username && title && !title.includes(username)) {
    title = `@${username}: ${title}`
  }

  let views = null
  if (currentContainer) {
    const viewsEl = currentContainer.querySelector('[data-e2e="video-views"]')
    if (viewsEl) views = parseViews(viewsEl.textContent)
  }

  let likes = null
  if (currentContainer) {
    const likesEl = currentContainer.querySelector('[data-e2e="like-count"]')
    if (likesEl) likes = parseViews(likesEl.textContent)
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
  let el = video.parentElement
  let depth = 0

  while (el && depth < 15) {
    const hasVideoDesc = el.querySelector('[data-e2e="video-desc"]')
    const hasLikeCount = el.querySelector('[data-e2e="like-count"]')
    const hasVideoLink = el.querySelector('a[href*="/video/"]')
    const hasUserLink = el.querySelector('a[href^="/@"]')

    if (hasVideoDesc || hasLikeCount || hasVideoLink) return el
    if (hasUserLink && el.textContent.length > 50) return el

    el = el.parentElement
    depth++
  }

  el = video.parentElement
  for (let i = 0; i < 8 && el; i++) el = el.parentElement
  return el
}

function getVisibilityPercentage(el) {
  const rect = el.getBoundingClientRect()
  const windowHeight = window.innerHeight

  if (rect.bottom < 0 || rect.top > windowHeight) return 0

  const visibleTop = Math.max(0, rect.top)
  const visibleBottom = Math.min(windowHeight, rect.bottom)
  return (visibleBottom - visibleTop) / rect.height
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
  const titleSelectors = ['h1.ytd-video-primary-info-renderer', 'h1.ytd-watch-metadata', '#title h1']
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      title = el.textContent.trim()
      break
    }
  }
  if (!title) title = document.title.replace(' - YouTube', '').trim()

  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null

  let views = null
  const viewEl = document.querySelector('.ytd-video-view-count-renderer')
  if (viewEl) views = parseViews(viewEl.textContent)

  return {
    title,
    thumbnail,
    views,
    engagement: null,
    platform: isShort ? 'YOUTUBE_SHORT' : 'YOUTUBE_LONG',
    videoId,
    url,
  }
}

function extractInstagram() {
  let title = ''
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) title = ogTitle.getAttribute('content') || ''
  if (!title) title = document.title.replace(' | Instagram', '').trim()

  let thumbnail = null
  const metaImage = document.querySelector('meta[property="og:image"]')
  if (metaImage) thumbnail = metaImage.getAttribute('content')

  return {
    title: title.slice(0, 300),
    thumbnail,
    views: null,
    engagement: null,
    platform: 'INSTAGRAM_REEL',
    url: window.location.href,
  }
}

function extractTwitter() {
  let title = ''
  const tweetEl = document.querySelector('[data-testid="tweetText"]')
  if (tweetEl) title = tweetEl.textContent.trim()
  if (!title) title = document.title.replace(' / X', '').trim()

  let thumbnail = null
  const imgEl = document.querySelector('[data-testid="tweetPhoto"] img')
  if (imgEl) thumbnail = imgEl.src

  return {
    title: title.slice(0, 280),
    thumbnail,
    views: null,
    engagement: null,
    platform: 'TWITTER',
    url: window.location.href,
  }
}

function extractTwitch() {
  const url = window.location.href
  const isClip = url.includes('/clip/')
  const isVOD = url.includes('/videos/')
  const isLive = !isClip && !isVOD

  let title = ''
  // Try different title selectors for clips, VODs, and live streams
  const titleSelectors = [
    // Live stream titles (2024+ Twitch UI)
    '[data-a-target="stream-title"]',
    'h2[data-a-target="stream-title"]',
    'p[data-a-target="stream-title"]',
    '[class*="CoreText"][class*="stream-info"]',
    // Channel info area
    '.channel-info-content [data-a-target="stream-title"]',
    // Clip titles
    'h2[data-a-target="clip-title"]',
    '[data-test-selector="clip-title"]',
    // VOD titles
    '[data-a-target="video-title"]',
    'h2.tw-title',
    // Fallback - any prominent heading
    '[class*="stream-info"] h1',
    '[class*="stream-info"] h2',
  ]

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      title = el.textContent.trim()
      break
    }
  }

  if (!title) {
    title = document.title.replace(' - Twitch', '').trim()
  }

  // Get channel/streamer name
  let channel = ''
  const channelSelectors = [
    // Live stream channel name
    '[data-a-target="player-info-title"]',
    'h1[data-a-target="channel-header-name"]',
    '.channel-info-content h1',
    '[class*="CoreText"][class*="channel-header"]',
    // From the page header
    '[data-a-target="user-display-name"]',
    // Clip/VOD channel
    '[data-a-target="clip-channel-name"]',
  ]

  for (const selector of channelSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      channel = el.textContent.trim()
      break
    }
  }

  // Extract channel from URL if needed
  if (!channel) {
    const pathMatch = url.match(/twitch\.tv\/([^\/\?]+)/)
    if (pathMatch && !['videos', 'clip', 'directory', 'search', 'settings'].includes(pathMatch[1])) {
      channel = pathMatch[1]
    }
  }

  // Get game/category being streamed
  let game = ''
  const gameSelectors = [
    '[data-a-target="stream-game-link"]',
    '[class*="stream-info"] a[href*="/directory/game/"]',
    '[class*="CoreText"] a[data-a-target*="game"]',
  ]

  for (const selector of gameSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      game = el.textContent.trim()
      break
    }
  }

  // Build title with channel and game
  if (channel && title && !title.toLowerCase().includes(channel.toLowerCase())) {
    title = `${channel}: ${title}`
  }
  if (game && !title.includes(game)) {
    title = `${title} [${game}]`
  }

  // Get thumbnail - try video preview first for live streams
  let thumbnail = null

  if (isLive) {
    // Try to get live preview image
    const previewEl = document.querySelector('video')
    if (previewEl) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = previewEl.videoWidth || 1280
        canvas.height = previewEl.videoHeight || 720
        canvas.getContext('2d').drawImage(previewEl, 0, 0, canvas.width, canvas.height)
        thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      } catch (e) {
        // CORS might block this
      }
    }
  }

  // Fallback to og:image
  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) thumbnail = ogImage.getAttribute('content')
  }

  // Get live viewer count
  let views = null
  const viewerSelectors = [
    '[data-a-target="animated-channel-viewers-count"]',
    '[class*="ScAnimatedNumber"]',
    '[aria-label*="viewer"]',
  ]

  for (const selector of viewerSelectors) {
    const el = document.querySelector(selector)
    if (el && el.textContent.trim()) {
      views = parseViews(el.textContent)
      if (views) break
    }
  }

  // Determine if currently live
  const isCurrentlyLive = document.querySelector('[data-a-target="animated-channel-viewers-count"]') ||
                          document.querySelector('[class*="live-indicator"]') ||
                          document.querySelector('[aria-label*="Live"]')

  return {
    title: title.slice(0, 500) || 'Twitch Stream',
    thumbnail,
    views,
    engagement: null,
    platform: 'TWITCH',
    url,
    isLive: !!isCurrentlyLive,
  }
}

function extractSoundCloud() {
  let title = ''

  // Track title
  const titleEl = document.querySelector('.soundTitle__title span') ||
                  document.querySelector('[class*="soundTitle"] span') ||
                  document.querySelector('.playbackSoundBadge__titleLink')
  if (titleEl) title = titleEl.textContent.trim()

  // Artist name
  let artist = ''
  const artistEl = document.querySelector('.soundTitle__username') ||
                   document.querySelector('[class*="soundTitle__username"]') ||
                   document.querySelector('.playbackSoundBadge__lightLink')
  if (artistEl) artist = artistEl.textContent.trim()

  if (artist && title && !title.includes(artist)) {
    title = `${artist} - ${title}`
  }

  if (!title) {
    title = document.title.replace(' | Listen online for free on SoundCloud', '').trim()
  }

  // Thumbnail - SoundCloud artwork
  let thumbnail = null
  const artworkEl = document.querySelector('.image__full') ||
                    document.querySelector('.sc-artwork span') ||
                    document.querySelector('[class*="artwork"] span')
  if (artworkEl) {
    const style = artworkEl.getAttribute('style') || ''
    const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/)
    if (urlMatch) thumbnail = urlMatch[1]
  }

  // Fallback to og:image
  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) thumbnail = ogImage.getAttribute('content')
  }

  // Play count
  let views = null
  const playCountEl = document.querySelector('.sc-ministats-plays') ||
                      document.querySelector('[class*="playCount"]')
  if (playCountEl) views = parseViews(playCountEl.textContent)

  return {
    title: title.slice(0, 500) || 'SoundCloud Track',
    thumbnail,
    views,
    engagement: null,
    platform: 'SOUNDCLOUD',
    url: window.location.href,
  }
}

function extractBandcamp() {
  let title = ''

  // Track or album title
  const titleEl = document.querySelector('.trackTitle') ||
                  document.querySelector('#name-section h2.trackTitle') ||
                  document.querySelector('h2.trackTitle')
  if (titleEl) title = titleEl.textContent.trim()

  // Artist name
  let artist = ''
  const artistEl = document.querySelector('#name-section h3 span a') ||
                   document.querySelector('[itemprop="byArtist"] a') ||
                   document.querySelector('.tralbumData a')
  if (artistEl) artist = artistEl.textContent.trim()

  if (artist && title && !title.includes(artist)) {
    title = `${artist} - ${title}`
  }

  if (!title) {
    title = document.title.replace(' | ', ' - ').trim()
  }

  // Album art
  let thumbnail = null
  const artworkEl = document.querySelector('#tralbumArt img') ||
                    document.querySelector('.popupImage') ||
                    document.querySelector('[itemprop="image"]')
  if (artworkEl) thumbnail = artworkEl.src || artworkEl.getAttribute('href')

  // Fallback to og:image
  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) thumbnail = ogImage.getAttribute('content')
  }

  return {
    title: title.slice(0, 500) || 'Bandcamp Release',
    thumbnail,
    views: null,
    engagement: null,
    platform: 'BANDCAMP',
    url: window.location.href,
  }
}

function extractMixcloud() {
  let title = ''

  // Show/mix title
  const titleEl = document.querySelector('[class*="PlayerSliderComponent"] span') ||
                  document.querySelector('.cloudcast-title') ||
                  document.querySelector('h1[class*="title"]')
  if (titleEl) title = titleEl.textContent.trim()

  // DJ/uploader name
  let dj = ''
  const djEl = document.querySelector('[class*="PlayerSliderComponent"] a') ||
               document.querySelector('.cloudcast-owner-link') ||
               document.querySelector('[class*="owner"]')
  if (djEl) dj = djEl.textContent.trim()

  if (dj && title && !title.includes(dj)) {
    title = `${dj} - ${title}`
  }

  if (!title) {
    title = document.title.replace(' | Mixcloud', '').trim()
  }

  // Artwork
  let thumbnail = null
  const artworkEl = document.querySelector('[class*="PlayerSliderComponent"] img') ||
                    document.querySelector('.cloudcast-artwork img')
  if (artworkEl) thumbnail = artworkEl.src

  // Fallback to og:image
  if (!thumbnail) {
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) thumbnail = ogImage.getAttribute('content')
  }

  // Play count
  let views = null
  const playEl = document.querySelector('[class*="play-count"]') ||
                 document.querySelector('.stat-plays')
  if (playEl) views = parseViews(playEl.textContent)

  return {
    title: title.slice(0, 500) || 'Mixcloud Show',
    thumbnail,
    views,
    engagement: null,
    platform: 'MIXCLOUD',
    url: window.location.href,
  }
}

function parseViews(text) {
  if (!text) return null
  const cleaned = text.toLowerCase().replace(/[,\s]/g, '').replace('views', '').replace('view', '')
  const match = cleaned.match(/([\d.]+)([kmb]?)/)
  if (!match) return null

  let num = parseFloat(match[1])
  const suffix = match[2]

  if (suffix === 'k') num *= 1000
  else if (suffix === 'm') num *= 1000000
  else if (suffix === 'b') num *= 1000000000

  return Math.round(num)
}

console.log('FOLIO content script loaded with hover overlay for:', window.location.hostname)
