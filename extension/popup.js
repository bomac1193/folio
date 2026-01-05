// FOLIO Extension Popup

const API_BASE = 'http://localhost:3000'

// Platform detection
const PLATFORMS = {
  'youtube.com': 'YOUTUBE_LONG',
  'tiktok.com': 'TIKTOK',
  'instagram.com': 'INSTAGRAM_REEL',
  'twitter.com': 'TWITTER',
  'x.com': 'TWITTER',
}

const PLATFORM_LABELS = {
  YOUTUBE_LONG: 'YouTube',
  YOUTUBE_SHORT: 'YouTube Short',
  TIKTOK: 'TikTok',
  INSTAGRAM_REEL: 'Instagram',
  TWITTER: 'Twitter/X',
}

// State
let contentData = null
let currentTabId = null
let pollInterval = null
let lastVideoIdentifier = null

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content')

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.url) {
    showUnsupportedState(content)
    return
  }

  currentTabId = tab.id

  // Check if supported platform
  const platform = detectPlatform(tab.url)

  if (!platform) {
    showUnsupportedState(content)
    return
  }

  // Get YouTube thumbnail from URL as fallback
  const ytThumbnail = platform.includes('YOUTUBE') ? getYouTubeThumbnail(tab.url) : null

  // Extract content from page
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_CONTENT',
    })

    if (response && response.title) {
      contentData = {
        ...response,
        platform: response.platform || platform,
        url: response.url || tab.url,
        thumbnail: response.thumbnail || ytThumbnail,
        videoId: response.videoId || null,
      }
      lastVideoIdentifier = response.url || response.videoId
      showSaveState(content, contentData)

      // Start polling for TikTok to get real-time updates
      if (platform === 'TIKTOK') {
        startPolling(tab.id, content)
      }
    } else {
      // Fallback to tab title
      contentData = {
        title: cleanTitle(tab.title, platform),
        thumbnail: ytThumbnail,
        views: null,
        engagement: null,
        platform,
        url: tab.url,
      }
      showSaveState(content, contentData)
    }
  } catch {
    // Content script not loaded, use tab info
    contentData = {
      title: cleanTitle(tab.title, platform),
      thumbnail: ytThumbnail,
      views: null,
      engagement: null,
      platform,
      url: tab.url,
    }
    showSaveState(content, contentData)
  }
})

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')

    // Check for YouTube Shorts
    if (hostname === 'youtube.com' && url.includes('/shorts/')) {
      return 'YOUTUBE_SHORT'
    }

    return PLATFORMS[hostname] || null
  } catch {
    return null
  }
}

function cleanTitle(title, platform) {
  if (!title) return 'Untitled'

  // Remove platform suffixes
  return title
    .replace(' - YouTube', '')
    .replace(' | TikTok', '')
    .replace(' • Instagram', '')
    .replace(' / X', '')
    .replace(' / Twitter', '')
    .trim()
}

function getYouTubeThumbnail(url) {
  try {
    // Handle shorts
    if (url.includes('/shorts/')) {
      const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
      }
    }
    // Handle regular videos
    const urlObj = new URL(url)
    const videoId = urlObj.searchParams.get('v')
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
  } catch {}
  return null
}

function showUnsupportedState(container) {
  container.innerHTML = `
    <div class="state">
      <div class="state-title">Unsupported page</div>
      <div class="state-text">
        FOLIO works on YouTube, TikTok, Instagram, and Twitter/X.
      </div>
    </div>
  `
}

function showSaveState(container, data, isUpdate = false) {
  const isTikTok = data.platform === 'TIKTOK'
  const existingNote = document.getElementById('note-input')?.value || ''

  container.innerHTML = `
    <div class="thumbnail ${isUpdate ? 'content-updated' : ''}">
      ${
        data.thumbnail
          ? `<img src="${data.thumbnail}" alt="Thumbnail" />`
          : '<span class="thumbnail-placeholder">No thumbnail</span>'
      }
    </div>

    <div class="label" style="display: flex; align-items: center;">
      <span>Title detected</span>
      ${isTikTok ? '<span class="live-indicator"><span class="live-dot"></span>LIVE</span>' : ''}
    </div>
    <div class="title ${isUpdate ? 'content-updated' : ''}">${escapeHtml(data.title)}</div>

    <div class="meta">
      <span class="platform-badge">${PLATFORM_LABELS[data.platform] || data.platform}</span>
      ${data.views ? `<span>${formatViews(data.views)} views</span>` : ''}
      ${data.videoId ? `<span class="video-id">ID: ${data.videoId.slice(-8)}</span>` : ''}
    </div>

    <div class="note-section">
      <textarea
        id="note-input"
        class="note-input"
        placeholder="Add note (optional)"
        rows="2"
      >${existingNote}</textarea>
    </div>

    <button id="save-btn" class="btn">
      Save to Collection
    </button>

    <div class="hint">${isTikTok ? 'Scroll to change video - ' : ''}Opens FOLIO to complete save</div>
  `

  // Event listener for save
  document.getElementById('save-btn').addEventListener('click', () => {
    const noteValue = document.getElementById('note-input').value
    handleSave(noteValue)
  })
}

function handleSave(note) {
  // Build URL with content data
  const params = new URLSearchParams({
    title: contentData.title,
    url: contentData.url,
    platform: contentData.platform,
    ...(contentData.thumbnail && { thumbnail: contentData.thumbnail }),
    ...(contentData.views && { views: contentData.views.toString() }),
    ...(note && { notes: note }),
  })

  // Open save page in new tab
  chrome.tabs.create({
    url: `${API_BASE}/save?${params.toString()}`
  })

  // Close popup
  window.close()
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M'
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K'
  }
  return views.toString()
}

// Poll content script for video changes (TikTok)
function startPolling(tabId, container) {
  // Clear any existing interval
  if (pollInterval) {
    clearInterval(pollInterval)
  }

  console.log('FOLIO Popup: Starting poll for tab', tabId)

  pollInterval = setInterval(async () => {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_CONTENT',
      })

      if (response && response.title) {
        const newIdentifier = response.url || response.videoId

        // Check if video changed
        if (newIdentifier && newIdentifier !== lastVideoIdentifier) {
          console.log('FOLIO Popup: Video changed!', response.title?.slice(0, 40))
          lastVideoIdentifier = newIdentifier
          contentData = {
            ...response,
            platform: response.platform || 'TIKTOK',
            url: response.url,
            thumbnail: response.thumbnail,
            videoId: response.videoId,
          }
          showSaveState(container, contentData, true)
        }
      }
    } catch (e) {
      // Tab closed or content script not responding
      console.log('FOLIO Popup: Poll error, stopping', e.message)
      stopPolling()
    }
  }, 300) // Poll every 300ms for responsiveness
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Stop polling when popup closes
window.addEventListener('unload', stopPolling)
