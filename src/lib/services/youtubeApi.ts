// YouTube Data API v3 Integration
// Fetches real performance metrics for YouTube videos

export interface YouTubeVideoStats {
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: string
  duration: string
  tags: string[]
  categoryId: string
  channelSubscribers: number | null
  channelVideoCount: number | null
}

export interface YouTubeAnalysis {
  stats: YouTubeVideoStats
  metrics: {
    // Engagement rate = (likes + comments) / views * 100
    engagementRate: number
    // Views per day since publish
    viewsPerDay: number
    // Days since published
    ageInDays: number
    // Viral velocity score based on views/day relative to channel size
    viralVelocity: number
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

export async function getYouTubeVideoStats(videoId: string): Promise<YouTubeAnalysis | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured')
    return null
  }

  try {
    // Fetch video details
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    const videoRes = await fetch(videoUrl)
    const videoData = await videoRes.json()

    if (!videoData.items || videoData.items.length === 0) {
      return null
    }

    const video = videoData.items[0]
    const stats = video.statistics
    const snippet = video.snippet
    const contentDetails = video.contentDetails

    // Fetch channel details for subscriber count
    let channelSubscribers: number | null = null
    let channelVideoCount: number | null = null

    if (snippet.channelId) {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${snippet.channelId}&key=${YOUTUBE_API_KEY}`
      const channelRes = await fetch(channelUrl)
      const channelData = await channelRes.json()

      if (channelData.items && channelData.items.length > 0) {
        const channelStats = channelData.items[0].statistics
        channelSubscribers = parseInt(channelStats.subscriberCount) || null
        channelVideoCount = parseInt(channelStats.videoCount) || null
      }
    }

    const viewCount = parseInt(stats.viewCount) || 0
    const likeCount = parseInt(stats.likeCount) || 0
    const commentCount = parseInt(stats.commentCount) || 0
    const publishedAt = snippet.publishedAt

    // Calculate metrics
    const publishDate = new Date(publishedAt)
    const now = new Date()
    const ageInDays = Math.max(1, Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24)))
    const viewsPerDay = viewCount / ageInDays
    const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0

    // Viral velocity: views per day normalized by channel size
    // Higher score = video is performing above channel average
    let viralVelocity = 0
    if (channelSubscribers && channelSubscribers > 0) {
      // Expected views per day for a channel = subscribers * 0.01 (1% see each video)
      const expectedViewsPerDay = channelSubscribers * 0.01
      viralVelocity = Math.min(100, (viewsPerDay / expectedViewsPerDay) * 50)
    } else {
      // Fallback: raw views per day scoring
      if (viewsPerDay > 100000) viralVelocity = 95
      else if (viewsPerDay > 50000) viralVelocity = 85
      else if (viewsPerDay > 10000) viralVelocity = 70
      else if (viewsPerDay > 1000) viralVelocity = 50
      else if (viewsPerDay > 100) viralVelocity = 30
      else viralVelocity = 10
    }

    return {
      stats: {
        viewCount,
        likeCount,
        commentCount,
        publishedAt,
        duration: contentDetails.duration,
        tags: snippet.tags || [],
        categoryId: snippet.categoryId,
        channelSubscribers,
        channelVideoCount,
      },
      metrics: {
        engagementRate,
        viewsPerDay,
        ageInDays,
        viralVelocity,
      },
    }
  } catch (error) {
    console.error('YouTube API error:', error)
    return null
  }
}

// Extract video ID from various YouTube URL formats
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}
