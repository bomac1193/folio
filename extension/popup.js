// FOLIO Extension Popup

const API_BASE = 'http://localhost:3000' // Change in production

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
let note = ''

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content')

  // Check if logged in
  const authToken = await getAuthToken()

  if (!authToken) {
    showLoginState(content)
    return
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.url) {
    showUnsupportedState(content)
    return
  }

  // Check if supported platform
  const platform = detectPlatform(tab.url)

  if (!platform) {
    showUnsupportedState(content)
    return
  }

  // Extract content from page
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_CONTENT',
    })

    if (response && response.title) {
      contentData = {
        ...response,
        platform,
        url: tab.url,
      }
      showSaveState(content, contentData)
    } else {
      showUnsupportedState(content)
    }
  } catch {
    // Content script not loaded, try to extract from tab
    contentData = {
      title: tab.title || 'Untitled',
      thumbnail: null,
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
    return PLATFORMS[hostname] || null
  } catch {
    return null
  }
}

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || null)
    })
  })
}

function showLoginState(container) {
  container.innerHTML = `
    <div class="state">
      <div class="state-title">Sign in to FOLIO</div>
      <div class="state-text">
        Connect your account to save content.
      </div>
      <a href="${API_BASE}/login" target="_blank" class="state-link">
        Sign in
      </a>
    </div>
  `
}

function showUnsupportedState(container) {
  container.innerHTML = `
    <div class="state">
      <div class="state-title">Unsupported page</div>
      <div class="state-text">
        FOLIO works on YouTube, TikTok, Instagram, and Twitter.
      </div>
    </div>
  `
}

function showSaveState(container, data) {
  container.innerHTML = `
    <div class="thumbnail">
      ${
        data.thumbnail
          ? `<img src="${data.thumbnail}" alt="Thumbnail" />`
          : '<span class="thumbnail-placeholder">No thumbnail</span>'
      }
    </div>

    <div class="label">Title detected</div>
    <div class="title">${escapeHtml(data.title)}</div>

    <div class="meta">
      <span class="platform-badge">${PLATFORM_LABELS[data.platform]}</span>
      ${data.views ? `<span>${formatViews(data.views)} views</span>` : ''}
    </div>

    <div class="note-section">
      <textarea
        id="note-input"
        class="note-input"
        placeholder="Add note (optional)"
        rows="2"
      ></textarea>
    </div>

    <div id="error" class="error" style="display: none;"></div>

    <button id="save-btn" class="btn">
      Save to Collection
    </button>
  `

  // Event listeners
  document.getElementById('note-input').addEventListener('input', (e) => {
    note = e.target.value
  })

  document.getElementById('save-btn').addEventListener('click', handleSave)
}

function showSuccessState(container) {
  container.innerHTML = `
    <div class="state success">
      <div class="state-title">Saved to collection</div>
      <div class="state-text">
        AI analysis will run in the background.
      </div>
      <a href="${API_BASE}/dashboard" target="_blank" class="state-link">
        View in FOLIO
      </a>
    </div>
  `
}

async function handleSave() {
  const btn = document.getElementById('save-btn')
  const errorEl = document.getElementById('error')

  btn.disabled = true
  btn.textContent = 'Saving...'
  errorEl.style.display = 'none'

  try {
    const authToken = await getAuthToken()

    const response = await fetch(`${API_BASE}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: contentData.title,
        url: contentData.url,
        platform: contentData.platform,
        thumbnail: contentData.thumbnail,
        views: contentData.views,
        engagement: contentData.engagement,
        notes: note || null,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save')
    }

    const collection = await response.json()

    // Trigger analysis in background
    fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ itemId: collection.id }),
    }).catch(() => {
      // Ignore analysis errors
    })

    showSuccessState(document.getElementById('content'))
  } catch (error) {
    btn.disabled = false
    btn.textContent = 'Save to Collection'
    errorEl.textContent = error.message
    errorEl.style.display = 'block'
  }
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
