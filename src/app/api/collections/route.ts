import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLATFORMS, type Platform } from '@/lib/types'

// GET - List user's collection
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new collection item
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, url, platform, thumbnail, views, engagement, notes, tags } = body

    if (!title || !platform) {
      return NextResponse.json(
        { error: 'Title and platform are required' },
        { status: 400 }
      )
    }

    if (!Object.values(PLATFORMS).includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    const collection = await prisma.collection.create({
      data: {
        userId: session.user.id,
        title,
        url: url || null,
        platform,
        thumbnail: thumbnail || null,
        views: views ? parseInt(views) : null,
        engagement: engagement ? parseFloat(engagement) : null,
        notes: notes || null,
        tags: Array.isArray(tags) ? tags.join(',') : null,
      },
    })

    // Trigger AI analysis in background (we'll implement this later)
    // analyzeCollection(collection.id)

    return NextResponse.json(collection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
