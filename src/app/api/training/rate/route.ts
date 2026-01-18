import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { recordRating } from '@/lib/services/profileRefinement'
import type { TrainingOutcome } from '@/lib/types'

// POST - Submit a rating
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      ratingType,
      outcome,
      suggestionAId,
      suggestionBId,
      suggestionId,
      responseTimeMs,
    } = body

    // Validate required fields
    if (!ratingType || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: ratingType and outcome' },
        { status: 400 }
      )
    }

    // Validate rating type
    if (!['COMPARATIVE', 'BINARY'].includes(ratingType)) {
      return NextResponse.json(
        { error: 'Invalid ratingType. Must be COMPARATIVE or BINARY' },
        { status: 400 }
      )
    }

    // Validate outcome
    const validOutcomes = [
      'A_PREFERRED',
      'B_PREFERRED',
      'BOTH_LIKED',
      'NEITHER',
      'LIKED',
      'DISLIKED',
      'SKIPPED',
    ]
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate suggestion IDs based on rating type
    if (ratingType === 'COMPARATIVE' && (!suggestionAId || !suggestionBId)) {
      return NextResponse.json(
        { error: 'Comparative ratings require suggestionAId and suggestionBId' },
        { status: 400 }
      )
    }

    if (ratingType === 'BINARY' && !suggestionId) {
      return NextResponse.json(
        { error: 'Binary ratings require suggestionId' },
        { status: 400 }
      )
    }

    await recordRating(
      session.user.id,
      ratingType as 'COMPARATIVE' | 'BINARY',
      outcome as TrainingOutcome,
      suggestionAId,
      suggestionBId,
      suggestionId,
      responseTimeMs
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
