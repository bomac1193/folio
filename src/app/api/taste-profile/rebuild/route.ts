import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rebuildTasteProfile, getCollectionSummary } from '@/lib/services/collectionAnalyzer'

// GET - Check if rebuild is needed
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getCollectionSummary(session.user.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error checking rebuild status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Trigger full rebuild
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Rebuild API] Starting rebuild for user:', session.user.id)

    const result = await rebuildTasteProfile(session.user.id)

    return NextResponse.json({
      success: true,
      itemsAnalyzed: result.itemsAnalyzed,
      profile: {
        keywords: result.profile.performancePatterns.commonKeywords,
        sentiments: Object.keys(result.profile.performancePatterns.sentimentProfile),
        formats: Object.keys(result.profile.performancePatterns.formats),
        niches: result.profile.performancePatterns.niches,
        tones: result.profile.aestheticPatterns.dominantTones,
      },
    })
  } catch (error) {
    console.error('Error rebuilding profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
