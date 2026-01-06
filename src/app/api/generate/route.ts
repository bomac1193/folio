import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateVariants, randomizeHooks } from '@/lib/services/generator'
import { PLATFORMS, type Platform } from '@/lib/types'

// POST - Generate title variants or randomize hooks
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, platform, referenceItems, count, mode } = await request.json()

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      )
    }

    if (!Object.values(PLATFORMS).includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    let variants

    // Randomize mode - generate new hooks from references + taste profile
    if (mode === 'randomize') {
      variants = await randomizeHooks(
        session.user.id,
        platform as Platform,
        count || 10,
        referenceItems
      )
    } else {
      // Standard mode - generate variants for a topic
      if (!topic) {
        return NextResponse.json(
          { error: 'Topic is required for generate mode' },
          { status: 400 }
        )
      }

      variants = await generateVariants(
        session.user.id,
        topic,
        platform as Platform,
        count || 10,
        referenceItems
      )
    }

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Error generating variants:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
