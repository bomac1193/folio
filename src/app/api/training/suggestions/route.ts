import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  discoverContent,
  getPendingSuggestions,
  getSuggestionPairFast,
  getPendingCount,
} from '@/lib/services/contentDiscovery'

// Track ongoing discoveries to prevent duplicates
const ongoingDiscoveries = new Map<string, Promise<void>>()

// Background discovery function
async function triggerBackgroundDiscovery(userId: string): Promise<void> {
  // Skip if already discovering for this user
  if (ongoingDiscoveries.has(userId)) {
    console.log('[Suggestions] Discovery already in progress for user')
    return
  }

  const discoveryPromise = (async () => {
    try {
      console.log('[Suggestions] Starting background discovery...')
      await discoverContent(userId, 30, true) // Discover 30 with exploration
      console.log('[Suggestions] Background discovery complete')
    } catch (error) {
      console.error('[Suggestions] Background discovery error:', error)
    } finally {
      ongoingDiscoveries.delete(userId)
    }
  })()

  ongoingDiscoveries.set(userId, discoveryPromise)
}

// GET - Get training suggestions
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'pair' // 'pair' | 'list' | 'discover'

    // Check pending count and trigger background discovery if low
    const pendingCount = await getPendingCount(userId)
    console.log('[Suggestions] Pending count:', pendingCount)

    if (pendingCount < 6) {
      // Trigger background discovery (non-blocking)
      triggerBackgroundDiscovery(userId)
    }

    if (mode === 'pair') {
      // Get a pair for comparative rating (fast)
      const pair = await getSuggestionPairFast(userId)

      if (!pair) {
        // No suggestions available - wait for discovery if one is running
        const discoveryPromise = ongoingDiscoveries.get(userId)
        if (discoveryPromise) {
          console.log('[Suggestions] Waiting for ongoing discovery...')
          await discoveryPromise
          // Try again after discovery
          const retryPair = await getSuggestionPairFast(userId)
          if (retryPair) {
            return NextResponse.json({ pair: retryPair })
          }
        }

        // Still nothing - trigger immediate discovery
        console.log('[Suggestions] No pair available, forcing discovery...')
        await discoverContent(userId, 30, true)
        const finalPair = await getSuggestionPairFast(userId)

        if (finalPair) {
          return NextResponse.json({ pair: finalPair })
        }

        return NextResponse.json({
          pair: null,
          needsDiscovery: false,
          message: 'Could not find any new content. Please try again later.',
        })
      }

      return NextResponse.json({ pair })
    }

    if (mode === 'discover') {
      // Explicit discover request
      const count = parseInt(searchParams.get('count') || '30')
      const suggestions = await discoverContent(userId, count, true)
      return NextResponse.json({ suggestions })
    }

    // Default: get pending suggestions list for single rating mode
    const suggestions = await getPendingSuggestions(userId)

    if (suggestions.length === 0) {
      // Wait for discovery if running, or trigger one
      const discoveryPromise = ongoingDiscoveries.get(userId)
      if (discoveryPromise) {
        await discoveryPromise
      } else {
        await discoverContent(userId, 30, true)
      }
      const retrySuggestions = await getPendingSuggestions(userId)
      return NextResponse.json({ suggestions: retrySuggestions })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
