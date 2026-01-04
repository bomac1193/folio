import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateVariants } from '@/lib/services/generator'
import { PLATFORMS, type Platform } from '@/lib/types'

// POST - Generate title variants
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, platform, referenceItems, count } = await request.json()

    if (!topic || !platform) {
      return NextResponse.json(
        { error: 'Topic and platform are required' },
        { status: 400 }
      )
    }

    if (!Object.values(PLATFORMS).includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    const variants = await generateVariants(
      session.user.id,
      topic,
      platform as Platform,
      count || 10,
      referenceItems
    )

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Error generating variants:', error)
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    )
  }
}
