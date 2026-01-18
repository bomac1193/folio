import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTrainingStats } from '@/lib/services/profileRefinement'

// GET - Get training statistics
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getTrainingStats(session.user.id)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching training stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
