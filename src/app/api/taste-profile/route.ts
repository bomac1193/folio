import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Get user's taste profile
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasteProfile = await prisma.tasteProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!tasteProfile) {
      return NextResponse.json({
        performancePatterns: null,
        aestheticPatterns: null,
        voiceSignature: null,
        itemCount: 0,
        lastTrainedAt: null,
      })
    }

    return NextResponse.json({
      performancePatterns: tasteProfile.performancePatterns
        ? JSON.parse(tasteProfile.performancePatterns)
        : null,
      aestheticPatterns: tasteProfile.aestheticPatterns
        ? JSON.parse(tasteProfile.aestheticPatterns)
        : null,
      voiceSignature: tasteProfile.voiceSignature
        ? JSON.parse(tasteProfile.voiceSignature)
        : null,
      itemCount: tasteProfile.itemCount,
      lastTrainedAt: tasteProfile.lastTrainedAt,
    })
  } catch (error) {
    console.error('Error fetching taste profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
