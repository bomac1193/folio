import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type ProfileSourceMode = 'collection' | 'training' | 'all'

// GET - Fetch taste profile data by source mode
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mode = (searchParams.get('mode') || 'all') as ProfileSourceMode

    const profile = await prisma.tasteProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({
        mode,
        performancePatterns: null,
        aestheticPatterns: null,
        voiceSignature: null,
        itemCount: 0,
        trainingRatingsCount: 0,
      })
    }

    let performancePatterns = null
    let aestheticPatterns = null
    let voiceSignature = null
    let sourceLabel = ''

    switch (mode) {
      case 'collection':
        performancePatterns = profile.collectionPerformance
          ? JSON.parse(profile.collectionPerformance)
          : null
        aestheticPatterns = profile.collectionAesthetic
          ? JSON.parse(profile.collectionAesthetic)
          : null
        voiceSignature = profile.collectionVoice
          ? JSON.parse(profile.collectionVoice)
          : null
        sourceLabel = `Based on ${profile.itemCount} saved items`
        break

      case 'training':
        performancePatterns = profile.trainingPerformance
          ? JSON.parse(profile.trainingPerformance)
          : null
        aestheticPatterns = profile.trainingAesthetic
          ? JSON.parse(profile.trainingAesthetic)
          : null
        voiceSignature = null // Training doesn't have voice signature
        sourceLabel = `Based on ${profile.trainingRatingsCount} training ratings`
        break

      case 'all':
      default:
        performancePatterns = profile.performancePatterns
          ? JSON.parse(profile.performancePatterns)
          : null
        aestheticPatterns = profile.aestheticPatterns
          ? JSON.parse(profile.aestheticPatterns)
          : null
        voiceSignature = profile.voiceSignature
          ? JSON.parse(profile.voiceSignature)
          : null
        sourceLabel = `Combined from ${profile.itemCount} items + ${profile.trainingRatingsCount} ratings`
        break
    }

    return NextResponse.json({
      mode,
      performancePatterns,
      aestheticPatterns,
      voiceSignature,
      itemCount: profile.itemCount,
      trainingRatingsCount: profile.trainingRatingsCount,
      confidenceScore: profile.confidenceScore,
      lastTrainedAt: profile.lastTrainedAt,
      lastTrainingAt: profile.lastTrainingAt,
      sourceLabel,
    })
  } catch (error) {
    console.error('Error fetching profile by source:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
