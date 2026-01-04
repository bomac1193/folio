import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analyzeCollection } from '@/lib/services/aiAnalysis'

// POST - Analyze a collection item
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const collection = await prisma.collection.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Run analysis
    await analyzeCollection(itemId)

    // Fetch updated collection
    const updated = await prisma.collection.findUnique({
      where: { id: itemId },
    })

    return NextResponse.json({
      success: true,
      performanceDNA: updated?.performanceDNA ? JSON.parse(updated.performanceDNA) : null,
      aestheticDNA: updated?.aestheticDNA ? JSON.parse(updated.aestheticDNA) : null,
    })
  } catch (error) {
    console.error('Error analyzing collection:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
