import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractYouTubeVideoId } from '@/lib/services/youtubeApi'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

// POST - Refresh metrics for all collections (FAST - parallel batch processing)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const collectionId = body.collectionId as string | undefined

    // Get collections to update
    const where = collectionId
      ? { id: collectionId, userId: session.user.id }
      : { userId: session.user.id }

    const collections = await prisma.collection.findMany({ where })

    // Filter YouTube videos and extract video IDs
    const youtubeCollections = collections.filter(
      c => (c.platform === 'YOUTUBE_LONG' || c.platform === 'YOUTUBE_SHORT')
    )

    const videoIdMap = new Map<string, typeof collections[0][]>()

    for (const collection of youtubeCollections) {
      const videoId = collection.videoId || (collection.url ? extractYouTubeVideoId(collection.url) : null)
      if (videoId) {
        if (!videoIdMap.has(videoId)) {
          videoIdMap.set(videoId, [])
        }
        videoIdMap.get(videoId)!.push(collection)
      }
    }

    const videoIds = Array.from(videoIdMap.keys())

    if (videoIds.length === 0 || !YOUTUBE_API_KEY) {
      return NextResponse.json({
        total: collections.length,
        updated: 0,
        errors: 0,
        message: videoIds.length === 0 ? 'No YouTube videos to update' : 'YouTube API key not configured',
      })
    }

    // Batch fetch all YouTube stats in ONE API call (up to 50 videos)
    const batchSize = 50
    const allStats = new Map<string, YouTubeStats>()

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize)
      const stats = await batchFetchYouTubeStats(batch)
      stats.forEach((v, k) => allStats.set(k, v))
    }

    // Parallel database updates
    const updatePromises: Promise<void>[] = []
    let updated = 0
    let errors = 0

    for (const [videoId, stats] of allStats) {
      const collectionsForVideo = videoIdMap.get(videoId) || []

      for (const collection of collectionsForVideo) {
        const isFirstCheck = !collection.initialViews

        updatePromises.push(
          prisma.collection.update({
            where: { id: collection.id },
            data: {
              videoId,
              initialViews: isFirstCheck ? stats.viewCount : collection.initialViews,
              initialLikes: isFirstCheck ? stats.likeCount : collection.initialLikes,
              initialComments: isFirstCheck ? stats.commentCount : collection.initialComments,
              views: stats.viewCount,
              likes: stats.likeCount,
              comments: stats.commentCount,
              engagement: stats.engagementRate,
              viewsPerDay: stats.viewsPerDay,
              viralVelocity: stats.viralVelocity,
              ageInDays: stats.ageInDays,
              channelSubscribers: stats.channelSubscribers,
              publishedAt: stats.publishedAt,
              growthRate: collection.initialViews && collection.initialViews > 0
                ? ((stats.viewCount - collection.initialViews) / collection.initialViews) * 100
                : null,
              lastCheckedAt: new Date(),
              checkCount: (collection.checkCount || 0) + 1,
            },
          }).then(() => { updated++ }).catch(() => { errors++ })
        )
      }
    }

    // Execute all updates in parallel
    await Promise.all(updatePromises)

    return NextResponse.json({
      total: collections.length,
      updated,
      errors,
      youtubeVideos: videoIds.length,
    })
  } catch (error) {
    console.error('Refresh metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh metrics' },
      { status: 500 }
    )
  }
}

interface YouTubeStats {
  viewCount: number
  likeCount: number
  commentCount: number
  engagementRate: number
  viewsPerDay: number
  viralVelocity: number
  ageInDays: number
  channelSubscribers: number | null
  publishedAt: Date
}

// Batch fetch YouTube stats for multiple videos in ONE API call
async function batchFetchYouTubeStats(videoIds: string[]): Promise<Map<string, YouTubeStats>> {
  const results = new Map<string, YouTubeStats>()

  if (!YOUTUBE_API_KEY || videoIds.length === 0) return results

  try {
    // Single API call for up to 50 videos
    const idsParam = videoIds.join(',')
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${idsParam}&key=${YOUTUBE_API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    if (!data.items) return results

    // Collect unique channel IDs for subscriber counts
    const channelIds = new Set<string>()
    for (const item of data.items) {
      if (item.snippet?.channelId) {
        channelIds.add(item.snippet.channelId)
      }
    }

    // Batch fetch channel stats
    const channelStats = await batchFetchChannelStats(Array.from(channelIds))

    // Process each video
    for (const item of data.items) {
      const videoId = item.id
      const stats = item.statistics
      const snippet = item.snippet

      const viewCount = parseInt(stats.viewCount) || 0
      const likeCount = parseInt(stats.likeCount) || 0
      const commentCount = parseInt(stats.commentCount) || 0

      const publishedAt = new Date(snippet.publishedAt)
      const now = new Date()
      const ageInDays = Math.max(1, Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)))
      const viewsPerDay = viewCount / ageInDays
      const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0

      const channelSubscribers = channelStats.get(snippet.channelId) || null

      // Calculate viral velocity
      let viralVelocity = 0
      if (channelSubscribers && channelSubscribers > 0) {
        const expectedViewsPerDay = channelSubscribers * 0.01
        viralVelocity = Math.min(100, (viewsPerDay / expectedViewsPerDay) * 50)
      } else {
        if (viewsPerDay > 100000) viralVelocity = 95
        else if (viewsPerDay > 50000) viralVelocity = 85
        else if (viewsPerDay > 10000) viralVelocity = 70
        else if (viewsPerDay > 1000) viralVelocity = 50
        else if (viewsPerDay > 100) viralVelocity = 30
        else viralVelocity = 10
      }

      results.set(videoId, {
        viewCount,
        likeCount,
        commentCount,
        engagementRate,
        viewsPerDay,
        viralVelocity,
        ageInDays,
        channelSubscribers,
        publishedAt,
      })
    }
  } catch (error) {
    console.error('Batch YouTube fetch error:', error)
  }

  return results
}

// Batch fetch channel subscriber counts
async function batchFetchChannelStats(channelIds: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>()

  if (!YOUTUBE_API_KEY || channelIds.length === 0) return results

  try {
    const idsParam = channelIds.join(',')
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${idsParam}&key=${YOUTUBE_API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.items) {
      for (const item of data.items) {
        const subs = parseInt(item.statistics?.subscriberCount) || 0
        results.set(item.id, subs)
      }
    }
  } catch (error) {
    console.error('Batch channel fetch error:', error)
  }

  return results
}
