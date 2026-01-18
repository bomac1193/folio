import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { refineProfile } from '@/lib/services/profileRefinement'

// POST - Refine taste profile based on ratings
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await refineProfile(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Not enough ratings to refine profile. Need at least 5 ratings.',
          confidenceScore: result.confidenceScore,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      confidenceScore: result.confidenceScore,
      patternsUpdated: result.patternsUpdated,
    })
  } catch (error) {
    console.error('Error refining profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
