import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type {
  Platform,
  TrainingSuggestion,
  TastePatterns,
  AestheticPatterns,
  PerformanceDNA,
  AestheticDNA,
  SuggestionSourceType,
} from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

interface YouTubeSearchResult {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
}

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

interface SmartQuery {
  query: string
  sourceType: SuggestionSourceType
  rationale: string
}

/**
 * Use Claude to analyze user's collection and generate smart search queries
 */
async function generateSmartQueries(
  collectionTitles: string[],
  performancePatterns: TastePatterns | null,
  aestheticPatterns: AestheticPatterns | null,
  includeExploration: boolean = true
): Promise<SmartQuery[]> {
  if (collectionTitles.length === 0) {
    // Fallback queries if no collection
    return [
      { query: 'viral short form content tips', sourceType: 'TRENDING', rationale: 'Generic trending' },
      { query: 'creative video editing shorts', sourceType: 'EXPLORATION', rationale: 'Exploration' },
    ]
  }

  const prompt = `Analyze this user's video collection and taste profile to generate YouTube Shorts search queries.

## User's Collection (recent video titles):
${collectionTitles.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Current Taste Profile:
- Top Hooks: ${performancePatterns?.topHooks?.slice(0, 5).join(', ') || 'Not established'}
- Keywords: ${performancePatterns?.commonKeywords?.slice(0, 8).join(', ') || 'Not established'}
- Dominant Tones: ${aestheticPatterns?.dominantTones?.slice(0, 5).join(', ') || 'Not established'}
- Style Markers: ${aestheticPatterns?.styleMarkers?.slice(0, 5).join(', ') || 'Not established'}

## Task:
Generate 8 YouTube Shorts search queries:

1. **SIMILAR queries (4)**: Find content similar to what they've collected. Extract specific themes, creators, niches, or styles from their collection. Be SPECIFIC - use actual terms, creator styles, or niche topics from their collection.

2. **EXPLORATION queries (${includeExploration ? '4' : '0'})**: Find content that tests their boundaries. These should be:
   - Different tones than their current dominantTones (to test if they like other tones)
   - Adjacent niches they might not have explored
   - Contrasting styles to establish what they DON'T like
   ${includeExploration ? 'This helps establish taste boundaries and "avoid tones".' : 'Skip exploration queries.'}

Return as JSON array:
[
  {"query": "specific search terms", "sourceType": "SIMILAR" | "EXPLORATION", "rationale": "why this query"}
]

Be specific! Not "music videos" but "lo-fi hip hop beats shorts" or "jazz piano improvisation shorts". Extract actual themes from their collection.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const queries = JSON.parse(jsonMatch[0]) as SmartQuery[]
      console.log('[SmartQueries] Generated:', queries.map(q => q.query))
      return queries
    }
  } catch (error) {
    console.error('[SmartQueries] Claude error:', error)
  }

  // Fallback: extract keywords from titles
  const keywords = extractKeywordsFromTitles(collectionTitles)
  return keywords.slice(0, 4).map(k => ({
    query: `${k} shorts`,
    sourceType: 'SIMILAR' as SuggestionSourceType,
    rationale: 'Extracted from collection',
  }))
}

/**
 * Main discovery function - uses Claude for smart suggestions
 */
export async function discoverContent(
  userId: string,
  count: number = 20,
  includeExploration: boolean = true
): Promise<TrainingSuggestion[]> {
  console.log('[ContentDiscovery] Starting smart discovery for user:', userId)

  // Get user's taste profile and ALL collections for analysis
  const [tasteProfile, collections] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      take: 50, // Get more for better analysis
      select: { title: true, platform: true, tags: true, performanceDNA: true, aestheticDNA: true },
    }),
  ])

  const collectionTitles = collections.map(c => c.title)

  // Parse taste patterns
  let performancePatterns: TastePatterns | null = null
  let aestheticPatterns: AestheticPatterns | null = null

  if (tasteProfile?.performancePatterns) {
    try {
      performancePatterns = JSON.parse(tasteProfile.performancePatterns)
    } catch (e) {
      console.log('[ContentDiscovery] Error parsing performance patterns')
    }
  }

  if (tasteProfile?.aestheticPatterns) {
    try {
      aestheticPatterns = JSON.parse(tasteProfile.aestheticPatterns)
    } catch (e) {
      console.log('[ContentDiscovery] Error parsing aesthetic patterns')
    }
  }

  // Generate smart queries using Claude
  const smartQueries = await generateSmartQueries(
    collectionTitles,
    performancePatterns,
    aestheticPatterns,
    includeExploration
  )

  console.log('[ContentDiscovery] Smart queries:', smartQueries.length)

  // Fetch content from YouTube Shorts
  const allResults: RankedSuggestion[] = []

  for (const sq of smartQueries) {
    try {
      // Search YouTube Shorts specifically
      const ytResults = await searchYouTubeShorts(sq.query)
      console.log(`[ContentDiscovery] Query "${sq.query}" (${sq.sourceType}) returned ${ytResults.length} results`)

      allResults.push(
        ...ytResults.map((r) => ({
          title: r.title,
          url: `https://youtube.com/shorts/${r.videoId}`,
          platform: 'YOUTUBE_SHORT' as Platform,
          thumbnail: r.thumbnail,
          videoId: r.videoId,
          relevanceScore: sq.sourceType === 'SIMILAR' ? 0.8 : 0.5, // Lower score for exploration
          searchQuery: sq.query,
          sourceType: sq.sourceType,
        }))
      )
    } catch (error) {
      console.error(`[ContentDiscovery] Error searching for "${sq.query}":`, error)
    }
  }

  console.log('[ContentDiscovery] Total results before filtering:', allResults.length)

  // Filter out already-rated or saved content
  const existingUrls = await getExistingUrls(userId)
  const newResults = allResults.filter((r) => !existingUrls.has(r.url))

  console.log('[ContentDiscovery] Results after filtering existing:', newResults.length)

  if (newResults.length === 0) {
    console.log('[ContentDiscovery] No new results, trying broader search')
    // Try a broader search
    const broaderResults = await searchYouTubeShorts('trending viral shorts 2024')
    for (const r of broaderResults) {
      const url = `https://youtube.com/shorts/${r.videoId}`
      if (!existingUrls.has(url)) {
        newResults.push({
          title: r.title,
          url,
          platform: 'YOUTUBE_SHORT' as Platform,
          thumbnail: r.thumbnail,
          videoId: r.videoId,
          relevanceScore: 0.3,
          searchQuery: 'trending fallback',
          sourceType: 'TRENDING',
        })
      }
    }
  }

  // Shuffle to mix similar and exploration
  const shuffled = newResults.sort(() => Math.random() - 0.5)

  // Save suggestions to database
  const suggestions: TrainingSuggestion[] = []
  for (const result of shuffled.slice(0, count)) {
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
      // Might fail on duplicate URL - skip
      console.log('[ContentDiscovery] Skipping duplicate:', result.url)
    }
  }

  console.log('[ContentDiscovery] Created suggestions:', suggestions.length)
  return suggestions
}

/**
 * Search YouTube Shorts specifically
 */
async function searchYouTubeShorts(query: string): Promise<YouTubeSearchResult[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube] API key not configured')
    return []
  }

  try {
    // Use videoDuration=short to get Shorts
    // Also add #shorts to query to prioritize actual Shorts
    const searchQuery = query.includes('shorts') ? query : `${query} #shorts`
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=10&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`

    const res = await fetch(url)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[YouTube] API error:', res.status, errorText)
      return []
    }

    const data = await res.json()

    if (!data.items) {
      console.log('[YouTube] No items in response')
      return []
    }

    return data.items.map((item: {
      id: { videoId: string }
      snippet: { title: string; thumbnails: { medium?: { url: string } }; channelTitle: string }
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || null,
      channelTitle: item.snippet.channelTitle,
    }))
  } catch (error) {
    console.error('[YouTube] Search error:', error)
    return []
  }
}

function extractKeywordsFromTitles(titles: string[]): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'how', 'why',
    'when', 'where', 'if', 'then', 'so', 'just', 'like', 'get', 'got',
    'official', 'video', 'music', 'full', 'new', 'best', 'top',
  ])

  const wordFreq = new Map<string, number>()

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
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

/**
 * Get pending count for checking if we need more
 */
export async function getPendingCount(userId: string): Promise<number> {
  return prisma.trainingSuggestion.count({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })
}

/**
 * Fast version - only returns existing suggestions, no discovery
 */
export async function getSuggestionPairFast(
  userId: string
): Promise<{ suggestionA: TrainingSuggestion; suggestionB: TrainingSuggestion } | null> {
  const suggestions = await prisma.trainingSuggestion.findMany({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' }, // Most recent first
    take: 10,
  })

  if (suggestions.length < 2) {
    return null
  }

  // Pick two suggestions - try to mix SIMILAR and EXPLORATION for boundary testing
  const similar = suggestions.filter(s => s.sourceType === 'SIMILAR')
  const exploration = suggestions.filter(s => s.sourceType === 'EXPLORATION')

  let suggestionA, suggestionB

  if (similar.length > 0 && exploration.length > 0) {
    // Mix similar with exploration for better boundary testing
    suggestionA = similar[Math.floor(Math.random() * similar.length)]
    suggestionB = exploration[Math.floor(Math.random() * exploration.length)]
  } else {
    // Random selection
    suggestionA = suggestions[0]
    suggestionB = suggestions.length > 2
      ? suggestions[Math.floor(Math.random() * (suggestions.length - 1)) + 1]
      : suggestions[1]
  }

  return {
    suggestionA: mapToSuggestion(suggestionA),
    suggestionB: mapToSuggestion(suggestionB),
  }
}

/**
 * Full version - discovers content if needed
 */
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
