import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Rescan all collections to update thumbnails
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
    })

    let updated = 0

    for (const collection of collections) {
      const thumbnail = extractThumbnail(collection.url, collection.platform)

      if (thumbnail && thumbnail !== collection.thumbnail) {
        await prisma.collection.update({
          where: { id: collection.id },
          data: { thumbnail },
        })
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      total: collections.length,
      updated
    })
  } catch (error) {
    console.error('Rescan error:', error)
    return NextResponse.json(
      { error: 'Rescan failed' },
      { status: 500 }
    )
  }
}

function extractThumbnail(url: string | null, platform: string): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)

    // YouTube
    if (platform === 'YOUTUBE_LONG' || platform === 'YOUTUBE_SHORT') {
      // Handle shorts
      if (url.includes('/shorts/')) {
        const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
        if (match) {
          return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
        }
      }
      // Handle regular videos
      const videoId = urlObj.searchParams.get('v')
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    }

    // TikTok - can't generate thumbnail from URL alone
    // Instagram - can't generate thumbnail from URL alone
    // Twitter - can't generate thumbnail from URL alone

  } catch {}

  return null
}
