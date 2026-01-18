import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractYouTubeVideoId, getYouTubeVideoStats } from '@/lib/services/youtubeApi'
import { PLATFORMS, CONTENT_TYPES, type Platform, type ContentType } from '@/lib/types'

interface VideoMetadata {
  title: string
  url: string
  platform: Platform
  contentType: ContentType
  thumbnail: string | null
  views: number | null
  likes: number | null
  comments: number | null
  engagement: number | null
  videoId: string | null
  channelSubscribers: number | null
  publishedAt: string | null
  viewsPerDay: number | null
  viralVelocity: number | null
  ageInDays: number | null
}

function detectPlatform(url: string): { platform: Platform; contentType: ContentType } | null {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('youtube.com/shorts') || urlLower.includes('youtu.be/shorts')) {
    return { platform: PLATFORMS.YOUTUBE_SHORT, contentType: CONTENT_TYPES.VIDEO }
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return { platform: PLATFORMS.YOUTUBE_LONG, contentType: CONTENT_TYPES.VIDEO }
  }
  if (urlLower.includes('tiktok.com')) {
    return { platform: PLATFORMS.TIKTOK, contentType: CONTENT_TYPES.VIDEO }
  }
  if (urlLower.includes('instagram.com/reel')) {
    return { platform: PLATFORMS.INSTAGRAM_REEL, contentType: CONTENT_TYPES.VIDEO }
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return { platform: PLATFORMS.TWITTER, contentType: CONTENT_TYPES.POST }
  }
  if (urlLower.includes('linkedin.com')) {
    return { platform: PLATFORMS.LINKEDIN, contentType: CONTENT_TYPES.POST }
  }
  if (urlLower.includes('twitch.tv')) {
    if (urlLower.includes('/clip/')) {
      return { platform: PLATFORMS.TWITCH, contentType: CONTENT_TYPES.CLIP }
    }
    if (urlLower.includes('/videos/')) {
      return { platform: PLATFORMS.TWITCH, contentType: CONTENT_TYPES.VIDEO }
    }
    return { platform: PLATFORMS.TWITCH, contentType: CONTENT_TYPES.LIVE_STREAM }
  }
  if (urlLower.includes('soundcloud.com')) {
    return { platform: PLATFORMS.SOUNDCLOUD, contentType: CONTENT_TYPES.TRACK }
  }
  if (urlLower.includes('bandcamp.com')) {
    return { platform: PLATFORMS.BANDCAMP, contentType: CONTENT_TYPES.RELEASE }
  }
  if (urlLower.includes('mixcloud.com')) {
    return { platform: PLATFORMS.MIXCLOUD, contentType: CONTENT_TYPES.MIX }
  }

  return null
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

// Instagram oEmbed - fetches title and thumbnail
async function fetchInstagramMetadata(url: string): Promise<Partial<VideoMetadata> | null> {
  try {
    // Instagram's oEmbed endpoint
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) {
      console.error('Instagram oEmbed failed:', res.status)
      return null
    }

    const data = await res.json()

    return {
      title: data.title || '',
      thumbnail: data.thumbnail_url || null,
    }
  } catch (error) {
    console.error('Instagram fetch error:', error)
    return null
  }
}

// TikTok oEmbed - fetches title and thumbnail
async function fetchTikTokMetadata(url: string): Promise<Partial<VideoMetadata> | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl)

    if (!res.ok) {
      console.error('TikTok oEmbed failed:', res.status)
      return null
    }

    const data = await res.json()

    // Extract video ID from URL
    const match = url.match(/\/video\/(\d+)/)
    const videoId = match ? match[1] : null

    return {
      title: data.title || '',
      thumbnail: data.thumbnail_url || null,
      videoId,
    }
  } catch (error) {
    console.error('TikTok fetch error:', error)
    return null
  }
}

// Twitter/X oEmbed - fetches title
async function fetchTwitterMetadata(url: string): Promise<Partial<VideoMetadata> | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl)

    if (!res.ok) {
      console.error('Twitter oEmbed failed:', res.status)
      return null
    }

    const data = await res.json()

    // Extract tweet text as title (truncated)
    const htmlContent = data.html || ''
    const textMatch = htmlContent.match(/<p[^>]*>([^<]*(?:<[^p/][^>]*>[^<]*)*)<\/p>/)
    const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    return {
      title: text.substring(0, 200) || data.author_name || '',
    }
  } catch (error) {
    console.error('Twitter fetch error:', error)
    return null
  }
}

async function fetchYouTubeMetadata(videoId: string): Promise<Partial<VideoMetadata> | null> {
  // Use the shared getYouTubeVideoStats for full stats
  const ytAnalysis = await getYouTubeVideoStats(videoId)

  // Also fetch the title and thumbnail (snippet) which getYouTubeVideoStats already does internally
  // but we need to get the title separately
  if (!YOUTUBE_API_KEY) {
    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
    }
  }

  try {
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(videoUrl)
    const data = await res.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const video = data.items[0]
    const snippet = video.snippet

    return {
      title: snippet.title,
      thumbnail: snippet.thumbnails?.maxres?.url ||
                 snippet.thumbnails?.high?.url ||
                 snippet.thumbnails?.medium?.url ||
                 `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
      // Include all the stats from ytAnalysis
      views: ytAnalysis?.stats.viewCount ?? null,
      likes: ytAnalysis?.stats.likeCount ?? null,
      comments: ytAnalysis?.stats.commentCount ?? null,
      engagement: ytAnalysis?.metrics.engagementRate ?? null,
      channelSubscribers: ytAnalysis?.stats.channelSubscribers ?? null,
      publishedAt: ytAnalysis?.stats.publishedAt ?? null,
      viewsPerDay: ytAnalysis?.metrics.viewsPerDay ?? null,
      viralVelocity: ytAnalysis?.metrics.viralVelocity ?? null,
      ageInDays: ytAnalysis?.metrics.ageInDays ?? null,
    }
  } catch (error) {
    console.error('YouTube API error:', error)
    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
    }
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Detect platform
    const detected = detectPlatform(url)
    if (!detected) {
      return NextResponse.json({
        error: 'Unsupported platform. Supported: YouTube, TikTok, Instagram, Twitter, Twitch, SoundCloud, Bandcamp, Mixcloud'
      }, { status: 400 })
    }

    const { platform, contentType } = detected

    const metadata: VideoMetadata = {
      title: '',
      url,
      platform,
      contentType,
      thumbnail: null,
      views: null,
      likes: null,
      comments: null,
      engagement: null,
      videoId: null,
      channelSubscribers: null,
      publishedAt: null,
      viewsPerDay: null,
      viralVelocity: null,
      ageInDays: null,
    }

    // Fetch platform-specific metadata
    if (platform === PLATFORMS.YOUTUBE_LONG || platform === PLATFORMS.YOUTUBE_SHORT) {
      const videoId = extractYouTubeVideoId(url)
      if (videoId) {
        const ytData = await fetchYouTubeMetadata(videoId)
        if (ytData) {
          metadata.title = ytData.title || ''
          metadata.thumbnail = ytData.thumbnail || null
          metadata.views = ytData.views ?? null
          metadata.likes = ytData.likes ?? null
          metadata.comments = ytData.comments ?? null
          metadata.engagement = ytData.engagement ?? null
          metadata.videoId = ytData.videoId || null
          metadata.channelSubscribers = ytData.channelSubscribers ?? null
          metadata.publishedAt = ytData.publishedAt ?? null
          metadata.viewsPerDay = ytData.viewsPerDay ?? null
          metadata.viralVelocity = ytData.viralVelocity ?? null
          metadata.ageInDays = ytData.ageInDays ?? null
        }
      }
    } else if (platform === PLATFORMS.TIKTOK) {
      const tiktokData = await fetchTikTokMetadata(url)
      if (tiktokData) {
        metadata.title = tiktokData.title || ''
        metadata.thumbnail = tiktokData.thumbnail || null
        metadata.videoId = tiktokData.videoId || null
      }
    } else if (platform === PLATFORMS.INSTAGRAM_REEL) {
      const igData = await fetchInstagramMetadata(url)
      if (igData) {
        metadata.title = igData.title || ''
        metadata.thumbnail = igData.thumbnail || null
      }
    } else if (platform === PLATFORMS.TWITTER) {
      const twitterData = await fetchTwitterMetadata(url)
      if (twitterData) {
        metadata.title = twitterData.title || ''
      }
    }

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Fetch metadata error:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
