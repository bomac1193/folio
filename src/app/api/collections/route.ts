import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLATFORMS, type Platform } from '@/lib/types'
import { getYouTubeVideoStats, extractYouTubeVideoId } from '@/lib/services/youtubeApi'

// CORS headers for extension - must return specific origin when credentials: include
function getCorsHeaders(request?: Request) {
  const origin = request?.headers.get('origin') || 'http://localhost:3003'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// OPTIONS - Handle preflight
export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) })
}

// GET - List user's collection
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(request) })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: session.user.id }

    if (platform && Object.values(PLATFORMS).includes(platform as Platform)) {
      where.platform = platform
    }

    if (search) {
      where.title = { contains: search }
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy: { savedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          items: true,
        },
      }),
      prisma.collection.count({ where }),
    ])

    return NextResponse.json({
      collections,
      total,
      limit,
      offset,
    }, { headers: getCorsHeaders(request) })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}

// POST - Create new collection item
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(request) })
    }

    const body = await request.json()
    const { title, url, platform, contentType, thumbnail, views, engagement, notes, tags } = body

    if (!title || !platform) {
      return NextResponse.json(
        { error: 'Title and platform are required' },
        { status: 400, headers: getCorsHeaders(request) }
      )
    }

    if (!Object.values(PLATFORMS).includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400, headers: getCorsHeaders(request) }
      )
    }

    // Extract video ID for API lookups
    let videoId: string | null = null
    let initialMetrics: {
      views?: number
      likes?: number
      comments?: number
      engagement?: number
      viewsPerDay?: number
      viralVelocity?: number
      channelSubscribers?: number
      publishedAt?: Date
      ageInDays?: number
    } = {}

    // For YouTube, fetch real metrics from API
    if ((platform === 'YOUTUBE_LONG' || platform === 'YOUTUBE_SHORT') && url) {
      videoId = extractYouTubeVideoId(url)

      if (videoId) {
        const ytAnalysis = await getYouTubeVideoStats(videoId)

        if (ytAnalysis) {
          initialMetrics = {
            views: ytAnalysis.stats.viewCount,
            likes: ytAnalysis.stats.likeCount,
            comments: ytAnalysis.stats.commentCount,
            engagement: ytAnalysis.metrics.engagementRate,
            viewsPerDay: ytAnalysis.metrics.viewsPerDay,
            viralVelocity: ytAnalysis.metrics.viralVelocity,
            channelSubscribers: ytAnalysis.stats.channelSubscribers || undefined,
            publishedAt: new Date(ytAnalysis.stats.publishedAt),
            ageInDays: ytAnalysis.metrics.ageInDays,
          }
        }
      }
    }

    const collection = await prisma.collection.create({
      data: {
        userId: session.user.id,
        title,
        url: url || null,
        videoId,
        platform,
        contentType: contentType || null,
        thumbnail: thumbnail || null,
        // Use API metrics if available, otherwise use passed values
        views: initialMetrics.views ?? (views ? parseInt(views) : null),
        likes: initialMetrics.likes ?? null,
        comments: initialMetrics.comments ?? null,
        engagement: initialMetrics.engagement ?? (engagement ? parseFloat(engagement) : null),
        // Store as initial metrics for tracking growth
        initialViews: initialMetrics.views ?? (views ? parseInt(views) : null),
        initialLikes: initialMetrics.likes ?? null,
        initialComments: initialMetrics.comments ?? null,
        // Performance metrics
        viewsPerDay: initialMetrics.viewsPerDay ?? null,
        viralVelocity: initialMetrics.viralVelocity ?? null,
        channelSubscribers: initialMetrics.channelSubscribers ?? null,
        publishedAt: initialMetrics.publishedAt ?? null,
        ageInDays: initialMetrics.ageInDays ?? null,
        // Tracking
        lastCheckedAt: initialMetrics.views ? new Date() : null,
        checkCount: initialMetrics.views ? 1 : 0,
        // User annotations
        notes: notes || null,
        tags: Array.isArray(tags) ? tags.join(',') : null,
      },
    })

    return NextResponse.json(collection, { status: 201, headers: getCorsHeaders(request) })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}
