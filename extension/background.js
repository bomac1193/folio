// FOLIO Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('FOLIO extension installed')
})

// Handle auth token storage from web app
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_AUTH_TOKEN') {
    chrome.storage.local.set({ authToken: message.token }, () => {
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get(['authToken'], (result) => {
      sendResponse({ token: result.authToken })
    })
    return true
  }

  if (message.type === 'CLEAR_AUTH_TOKEN') {
    chrome.storage.local.remove(['authToken'], () => {
      sendResponse({ success: true })
    })
    return true
  }
})

// Update badge when collection is updated
// Also relay VIDEO_CHANGED messages to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    chrome.action.setBadgeText({ text: message.count.toString() })
    chrome.action.setBadgeBackgroundColor({ color: '#0A0A0A' })
    sendResponse({ success: true })
  }

  // Relay video change messages - popup will receive these
  if (message.type === 'VIDEO_CHANGED') {
    // Message is automatically available to popup since it's also listening
    // to chrome.runtime.onMessage
    console.log('FOLIO Background: Video changed', message.data?.title?.slice(0, 30))
  }

  return true
})
