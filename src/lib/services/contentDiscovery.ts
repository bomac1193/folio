import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type {
  Platform,
  TrainingSuggestion,
  TastePatterns,
  AestheticPatterns,
  SuggestionSourceType,
} from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

interface RankedSuggestion {
  title: string
  url: string
  platform: Platform
  thumbnail: string | null
  videoId: string | null
  relevanceScore: number
  searchQuery: string
  sourceType: SuggestionSourceType
}

// Curated fallback content - diverse categories for taste training
const FALLBACK_SHORTS = [
  // Music & Artists
  { videoId: 'kTJczUoc26U', title: 'Tyler, The Creator - Making IGOR in 60 seconds', category: 'music' },
  { videoId: 'K_9tX4eHztY', title: 'How Kanye produces beats differently', category: 'music' },
  { videoId: 'qNkN2R2s3iM', title: 'Frank Ocean studio session breakdown', category: 'music' },
  { videoId: 'dM2hZRLjkiI', title: 'Why lo-fi beats are so addictive', category: 'music' },
  { videoId: 'vGJTaP6anOU', title: 'The secret chord progression every hit uses', category: 'music' },

  // Creator/Business
  { videoId: '8B_k_cU2Jzc', title: 'MrBeast reveals his video strategy', category: 'creator' },
  { videoId: 'p8kxFWvrzHs', title: 'How I got 1M followers in 6 months', category: 'creator' },
  { videoId: 'FG1Fa-t4AKQ', title: 'The thumbnail trick that doubled my views', category: 'creator' },
  { videoId: 'r4x3Aqa8r5k', title: 'Why your hooks aren\'t working', category: 'creator' },
  { videoId: 'LpDvYQuetnw', title: 'The psychology behind viral content', category: 'creator' },

  // Tech & Innovation
  { videoId: 'aircAruvnKk', title: 'But what is a neural network?', category: 'tech' },
  { videoId: 'w2RQPqQXz6I', title: 'How ChatGPT actually works in 60s', category: 'tech' },
  { videoId: 'zjkBMFhNj_g', title: 'Apple\'s design philosophy explained', category: 'tech' },
  { videoId: '5iI_qD-1bzQ', title: 'The future of AI is terrifying', category: 'tech' },
  { videoId: 'fVdmHCqJcmY', title: 'Why Silicon Valley thinks different', category: 'tech' },

  // Interviews & Commentary
  { videoId: 'cHWl0C3yYHM', title: 'Joe Rogan\'s most controversial take', category: 'interview' },
  { videoId: 'Kq4b4_sUvkk', title: 'Elon Musk explains first principles', category: 'interview' },
  { videoId: 'y7j0GS92yH0', title: 'Steve Jobs on focus and saying no', category: 'interview' },
  { videoId: 'jOALrShJQYA', title: 'Naval Ravikant on getting rich', category: 'interview' },
  { videoId: 'nJPERZDfyWc', title: 'Gary Vee\'s brutal advice for creators', category: 'interview' },

  // Reactions & Entertainment
  { videoId: '2VNqHrCOtDk', title: 'Reacting to my old cringy videos', category: 'reaction' },
  { videoId: 'VdCYw5XfNH0', title: 'Musicians react to AI-generated music', category: 'reaction' },
  { videoId: 'L5zQRqLPgIA', title: 'Millennials try Gen Z slang', category: 'reaction' },
  { videoId: 'TY6pHqKaHqo', title: 'Expert reacts to movie science', category: 'reaction' },
  { videoId: 'wJnFB-gsqQ4', title: 'Chefs review instant ramen hacks', category: 'reaction' },

  // Educational/How-to
  { videoId: 'UF8uR6Z6KLc', title: 'Steve Jobs Stanford speech highlights', category: 'educational' },
  { videoId: 'arj7oStGLkU', title: 'How to speak so people listen', category: 'educational' },
  { videoId: 'iG9CE55wbtY', title: 'Do schools kill creativity?', category: 'educational' },
  { videoId: 'Unzc731iCUY', title: 'Start with Why - Simon Sinek', category: 'educational' },
  { videoId: 'uD4izuDMUQA', title: 'The power of introverts', category: 'educational' },

  // Lifestyle & Vlogs
  { videoId: 'ky3RhFMbD2I', title: '5AM morning routine that changed my life', category: 'lifestyle' },
  { videoId: 'kXdbbrlhw3Y', title: 'Day in my life as a startup founder', category: 'lifestyle' },
  { videoId: 'BRBE3Q3RQ_E', title: 'Moving to NYC alone at 22', category: 'lifestyle' },
  { videoId: 'n3Xv_g3g-mA', title: 'I tried the monk lifestyle for 30 days', category: 'lifestyle' },
  { videoId: 'xNjI03CGkb4', title: 'Minimalist apartment tour in Tokyo', category: 'lifestyle' },

  // Documentary style
  { videoId: 'jNgP6d9HraI', title: 'The dark side of hustle culture', category: 'documentary' },
  { videoId: 'r8UhkLwAiMY', title: 'Inside the mind of a billionaire', category: 'documentary' },
  { videoId: 'OMq9he-5HUU', title: 'Why we\'re all addicted to our phones', category: 'documentary' },
  { videoId: 'Hu4Yvq-g7_Y', title: 'The algorithm is changing your brain', category: 'documentary' },
  { videoId: 'xNRJwmlRBNU', title: 'How social media destroyed attention', category: 'documentary' },

  // Comedy & Sketches
  { videoId: 'VfCYZ3pks48', title: 'POV: You\'re a startup founder', category: 'comedy' },
  { videoId: 'sIlNIVXpIns', title: 'Corporate meetings be like', category: 'comedy' },
  { videoId: 'QqffY_OYp54', title: 'When your friend becomes an influencer', category: 'comedy' },
  { videoId: 'zUQiUFZ5RDw', title: 'Gen Z explains the internet to boomers', category: 'comedy' },
  { videoId: 'fHlhMC0c634', title: 'Dating apps in 2024', category: 'comedy' },

  // Fitness & Health
  { videoId: '0L_WniNwtB0', title: 'The workout that builds muscle fastest', category: 'fitness' },
  { videoId: 'gC_L9qAHVJ8', title: 'Why you can\'t lose weight', category: 'fitness' },
  { videoId: 'oyGEVPuumtk', title: 'David Goggins on mental toughness', category: 'fitness' },
  { videoId: 'IODxDxX7oi4', title: 'Stretches to fix your posture', category: 'fitness' },
  { videoId: '2pLT-olgUJs', title: 'Sleep hacks backed by science', category: 'fitness' },

  // Finance & Business
  { videoId: 'PHe0bXAIuk0', title: 'How the rich avoid taxes legally', category: 'finance' },
  { videoId: 'SMKsolIET7E', title: 'Investing explained in 60 seconds', category: 'finance' },
  { videoId: 'cZ5mCfJTjXw', title: 'The psychology of money', category: 'finance' },
  { videoId: 'pFZfMnA_BSk', title: 'Why most businesses fail', category: 'finance' },
  { videoId: 'RJaWX3FQYB4', title: 'Side hustles that actually work', category: 'finance' },

  // Art & Design
  { videoId: 'wZZ7oFKsKzY', title: 'The design secret Apple doesn\'t share', category: 'design' },
  { videoId: 'GDpmVUEjagg', title: 'Why this logo is worth $1 billion', category: 'design' },
  { videoId: 'E1oZhEIrer4', title: 'Fonts you see everywhere explained', category: 'design' },
  { videoId: 'GNrrzDxnSHE', title: 'Color theory in 60 seconds', category: 'design' },
  { videoId: 'rvLFEh7V18A', title: 'How Pixar makes you cry', category: 'design' },
]

/**
 * Get fallback content instantly without API calls
 */
function getFallbackSuggestions(): RankedSuggestion[] {
  // Shuffle and return diverse content
  const shuffled = [...FALLBACK_SHORTS].sort(() => Math.random() - 0.5)

  return shuffled.map(item => ({
    title: item.title,
    url: `https://youtube.com/shorts/${item.videoId}`,
    platform: 'YOUTUBE_SHORT' as Platform,
    thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
    videoId: item.videoId,
    relevanceScore: item.category === 'music' || item.category === 'creator' ? 0.7 : 0.5,
    searchQuery: 'curated',
    sourceType: (item.category === 'reaction' || item.category === 'comedy' ? 'EXPLORATION' : 'SIMILAR') as SuggestionSourceType,
  }))
}

/**
 * Main discovery function - uses fallback for speed, YouTube API as enhancement
 */
export async function discoverContent(
  userId: string,
  count: number = 20,
  includeExploration: boolean = true
): Promise<TrainingSuggestion[]> {
  console.log('[ContentDiscovery] Starting discovery for user:', userId)

  // Get existing URLs to filter out
  const existingUrls = await getExistingUrls(userId)

  // Start with fallback content (instant)
  let allResults = getFallbackSuggestions()
    .filter(r => !existingUrls.has(r.url))

  console.log('[ContentDiscovery] Fallback results after filtering:', allResults.length)

  // If we have enough from fallback, use that
  if (allResults.length >= count) {
    allResults = allResults.slice(0, count)
  } else if (YOUTUBE_API_KEY) {
    // Try YouTube API to supplement (but don't block on it)
    try {
      const ytResults = await searchYouTubeShorts('viral shorts trending')
      if (ytResults.length > 0) {
        const newResults = ytResults
          .map(r => ({
            title: r.title,
            url: `https://youtube.com/shorts/${r.videoId}`,
            platform: 'YOUTUBE_SHORT' as Platform,
            thumbnail: r.thumbnail,
            videoId: r.videoId,
            relevanceScore: 0.6,
            searchQuery: 'youtube-api',
            sourceType: 'TRENDING' as SuggestionSourceType,
          }))
          .filter(r => !existingUrls.has(r.url))

        allResults = [...allResults, ...newResults]
        console.log('[ContentDiscovery] Added YouTube results:', newResults.length)
      }
    } catch (error) {
      console.log('[ContentDiscovery] YouTube API failed, using fallback only')
    }
  }

  // Shuffle to add variety
  allResults = allResults.sort(() => Math.random() - 0.5).slice(0, count)

  // Save suggestions to database
  const suggestions: TrainingSuggestion[] = []
  for (const result of allResults) {
    try {
      const suggestion = await prisma.trainingSuggestion.create({
        data: {
          userId,
          title: result.title,
          url: result.url,
          platform: result.platform,
          thumbnail: result.thumbnail,
          videoId: result.videoId,
          relevanceScore: result.relevanceScore,
          searchQuery: result.searchQuery,
          sourceType: result.sourceType,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      suggestions.push(mapToSuggestion(suggestion))
    } catch (error) {
      // Skip duplicates
      console.log('[ContentDiscovery] Skipping duplicate:', result.url)
    }
  }

  console.log('[ContentDiscovery] Created suggestions:', suggestions.length)
  return suggestions
}

/**
 * Search YouTube Shorts - non-blocking, returns empty on failure
 */
async function searchYouTubeShorts(query: string): Promise<{ videoId: string; title: string; thumbnail: string }[]> {
  if (!YOUTUBE_API_KEY) {
    return []
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const searchQuery = query.includes('shorts') ? query : `${query} #shorts`
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=10&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      return []
    }

    const data = await res.json()
    if (!data.items) {
      return []
    }

    return data.items.map((item: {
      id: { videoId: string }
      snippet: { title: string; thumbnails: { medium?: { url: string } } }
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
    }))
  } catch (error) {
    return []
  }
}

async function getExistingUrls(userId: string): Promise<Set<string>> {
  const [collections, suggestions] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      select: { url: true },
    }),
    prisma.trainingSuggestion.findMany({
      where: { userId },
      select: { url: true },
    }),
  ])

  const urls = new Set<string>()
  collections.forEach((c) => c.url && urls.add(c.url))
  suggestions.forEach((s) => urls.add(s.url))
  return urls
}

export async function getPendingSuggestions(userId: string): Promise<TrainingSuggestion[]> {
  const suggestions = await prisma.trainingSuggestion.findMany({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { relevanceScore: 'desc' },
    take: 20,
  })

  return suggestions.map(mapToSuggestion)
}

export async function getPendingCount(userId: string): Promise<number> {
  return prisma.trainingSuggestion.count({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })
}

export async function getSuggestionPairFast(
  userId: string
): Promise<{ suggestionA: TrainingSuggestion; suggestionB: TrainingSuggestion } | null> {
  const suggestions = await prisma.trainingSuggestion.findMany({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (suggestions.length < 2) {
    return null
  }

  // Pick two random suggestions for variety
  const shuffled = suggestions.sort(() => Math.random() - 0.5)

  return {
    suggestionA: mapToSuggestion(shuffled[0]),
    suggestionB: mapToSuggestion(shuffled[1]),
  }
}

export async function getSuggestionPair(
  userId: string
): Promise<{ suggestionA: TrainingSuggestion; suggestionB: TrainingSuggestion } | null> {
  // First try fast path
  const fastResult = await getSuggestionPairFast(userId)
  if (fastResult) return fastResult

  // Discover more content
  console.log('[getSuggestionPair] Not enough suggestions, discovering more...')
  const newSuggestions = await discoverContent(userId, 20, true)

  if (newSuggestions.length < 2) {
    console.log('[getSuggestionPair] Still not enough after discovery')
    return null
  }

  return {
    suggestionA: newSuggestions[0],
    suggestionB: newSuggestions[1],
  }
}

function mapToSuggestion(dbSuggestion: {
  id: string
  userId: string
  title: string
  url: string
  platform: string
  thumbnail: string | null
  videoId: string | null
  performanceDNA: string | null
  aestheticDNA: string | null
  relevanceScore: number
  searchQuery: string | null
  sourceType: string | null
  status: string
  createdAt: Date
  expiresAt: Date | null
}): TrainingSuggestion {
  return {
    id: dbSuggestion.id,
    userId: dbSuggestion.userId,
    title: dbSuggestion.title,
    url: dbSuggestion.url,
    platform: dbSuggestion.platform as Platform,
    thumbnail: dbSuggestion.thumbnail,
    videoId: dbSuggestion.videoId,
    performanceDNA: dbSuggestion.performanceDNA
      ? JSON.parse(dbSuggestion.performanceDNA)
      : null,
    aestheticDNA: dbSuggestion.aestheticDNA ? JSON.parse(dbSuggestion.aestheticDNA) : null,
    relevanceScore: dbSuggestion.relevanceScore,
    searchQuery: dbSuggestion.searchQuery,
    sourceType: dbSuggestion.sourceType as SuggestionSourceType | null,
    status: dbSuggestion.status as 'PENDING' | 'RATED' | 'SKIPPED',
    createdAt: dbSuggestion.createdAt,
    expiresAt: dbSuggestion.expiresAt,
  }
}
