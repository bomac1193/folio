import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type {
  TrainingOutcome,
  TrainedPatterns,
  PerformanceDNA,
  AestheticDNA,
  Platform,
} from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface AnalyzedContent {
  tones: string[]
  keywords: string[]
  hooks: string[]
  styles: string[]
}

/**
 * Use Claude to analyze a video title and extract taste signals
 */
async function analyzeContentForTaste(title: string): Promise<AnalyzedContent> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Analyze this video title and extract taste signals:

Title: "${title}"

Return JSON with:
- tones: Array of 1-3 emotional/stylistic tones (e.g., "energetic", "nostalgic", "edgy", "wholesome", "dramatic", "chill", "intense", "playful", "sincere", "ironic")
- keywords: Array of 1-4 topic keywords (specific themes, subjects, genres)
- hooks: Array of 1-2 hook patterns if identifiable (e.g., "curiosity gap", "challenge", "transformation", "controversy", "how-to")
- styles: Array of 1-2 content styles (e.g., "educational", "entertainment", "vlog", "cinematic", "raw", "polished", "lo-fi", "high-production")

Return ONLY valid JSON, no explanation.`
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        tones: parsed.tones || [],
        keywords: parsed.keywords || [],
        hooks: parsed.hooks || [],
        styles: parsed.styles || [],
      }
    }
  } catch (error) {
    console.error('[AnalyzeContent] Error:', error)
  }

  // Fallback: extract basic keywords from title
  const words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)

  return {
    tones: [],
    keywords: words,
    hooks: [],
    styles: [],
  }
}

/**
 * Record a rating and incrementally update the taste profile
 */
export async function recordRating(
  userId: string,
  ratingType: 'COMPARATIVE' | 'BINARY',
  outcome: TrainingOutcome,
  suggestionAId?: string,
  suggestionBId?: string,
  suggestionId?: string,
  responseTimeMs?: number
): Promise<void> {
  // Create the rating
  await prisma.trainingRating.create({
    data: {
      userId,
      ratingType,
      outcome,
      suggestionAId: suggestionAId || null,
      suggestionBId: suggestionBId || null,
      suggestionId: suggestionId || null,
      responseTimeMs: responseTimeMs || null,
    },
  })

  // Mark suggestions as rated
  const suggestionIds = [suggestionAId, suggestionBId, suggestionId].filter(Boolean) as string[]
  if (suggestionIds.length > 0) {
    await prisma.trainingSuggestion.updateMany({
      where: { id: { in: suggestionIds } },
      data: { status: 'RATED' },
    })
  }

  // Get the suggestions to analyze
  const suggestions = await prisma.trainingSuggestion.findMany({
    where: { id: { in: suggestionIds } },
  })

  // Determine liked and disliked suggestions based on outcome
  let likedSuggestions: typeof suggestions = []
  let dislikedSuggestions: typeof suggestions = []

  if (ratingType === 'COMPARATIVE') {
    const suggestionA = suggestions.find(s => s.id === suggestionAId)
    const suggestionB = suggestions.find(s => s.id === suggestionBId)

    if (outcome === 'A_PREFERRED') {
      if (suggestionA) likedSuggestions.push(suggestionA)
      if (suggestionB) dislikedSuggestions.push(suggestionB)
    } else if (outcome === 'B_PREFERRED') {
      if (suggestionB) likedSuggestions.push(suggestionB)
      if (suggestionA) dislikedSuggestions.push(suggestionA)
    } else if (outcome === 'BOTH_LIKED') {
      likedSuggestions = suggestions
    } else if (outcome === 'NEITHER') {
      dislikedSuggestions = suggestions
    }
  } else if (ratingType === 'BINARY') {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      if (outcome === 'LIKED') {
        likedSuggestions.push(suggestion)
      } else if (outcome === 'DISLIKED') {
        dislikedSuggestions.push(suggestion)
      }
    }
  }

  // Analyze suggestions and update profile incrementally
  await incrementalProfileUpdate(userId, likedSuggestions, dislikedSuggestions)
}

/**
 * Incrementally update profile after each rating
 */
async function incrementalProfileUpdate(
  userId: string,
  likedSuggestions: { title: string; platform: string }[],
  dislikedSuggestions: { title: string; platform: string }[]
): Promise<void> {
  // Analyze liked and disliked content
  const likedAnalyses: AnalyzedContent[] = []
  const dislikedAnalyses: AnalyzedContent[] = []

  for (const suggestion of likedSuggestions) {
    const analysis = await analyzeContentForTaste(suggestion.title)
    likedAnalyses.push(analysis)
  }

  for (const suggestion of dislikedSuggestions) {
    const analysis = await analyzeContentForTaste(suggestion.title)
    dislikedAnalyses.push(analysis)
  }

  // Get existing profile
  const existingProfile = await prisma.tasteProfile.findUnique({
    where: { userId },
  })

  let performancePatterns = existingProfile?.performancePatterns
    ? JSON.parse(existingProfile.performancePatterns)
    : { topHooks: [], preferredStructures: [], commonKeywords: [], sentimentProfile: {} }

  let aestheticPatterns = existingProfile?.aestheticPatterns
    ? JSON.parse(existingProfile.aestheticPatterns)
    : { dominantTones: [], voiceSignature: '', complexityPreference: '', styleMarkers: [], avoidTones: [] }

  // Ensure avoidTones exists
  if (!aestheticPatterns.avoidTones) {
    aestheticPatterns.avoidTones = []
  }

  // Add liked patterns
  for (const analysis of likedAnalyses) {
    // Add tones (reinforced)
    for (const tone of analysis.tones) {
      if (!aestheticPatterns.dominantTones.includes(tone)) {
        aestheticPatterns.dominantTones.push(tone)
      }
      // Remove from avoidTones if present (user changed their mind)
      aestheticPatterns.avoidTones = aestheticPatterns.avoidTones.filter((t: string) => t !== tone)
    }

    // Add keywords
    for (const keyword of analysis.keywords) {
      if (!performancePatterns.commonKeywords.includes(keyword)) {
        performancePatterns.commonKeywords.push(keyword)
      }
    }

    // Add hooks
    for (const hook of analysis.hooks) {
      if (!performancePatterns.topHooks.includes(hook)) {
        performancePatterns.topHooks.push(hook)
      }
    }

    // Add styles
    for (const style of analysis.styles) {
      if (!aestheticPatterns.styleMarkers.includes(style)) {
        aestheticPatterns.styleMarkers.push(style)
      }
    }
  }

  // Add disliked patterns to avoidTones and remove from liked
  for (const analysis of dislikedAnalyses) {
    // Add tones to avoidTones
    for (const tone of analysis.tones) {
      if (!aestheticPatterns.avoidTones.includes(tone)) {
        aestheticPatterns.avoidTones.push(tone)
      }
      // Remove from dominantTones if user dislikes it
      aestheticPatterns.dominantTones = aestheticPatterns.dominantTones.filter((t: string) => t !== tone)
    }

    // Remove disliked keywords
    for (const keyword of analysis.keywords) {
      performancePatterns.commonKeywords = performancePatterns.commonKeywords.filter((k: string) => k !== keyword)
    }

    // Remove disliked hooks
    for (const hook of analysis.hooks) {
      performancePatterns.topHooks = performancePatterns.topHooks.filter((h: string) => h !== hook)
    }

    // Remove disliked styles
    for (const style of analysis.styles) {
      aestheticPatterns.styleMarkers = aestheticPatterns.styleMarkers.filter((s: string) => s !== style)
    }
  }

  // Trim arrays to reasonable sizes
  aestheticPatterns.dominantTones = aestheticPatterns.dominantTones.slice(0, 12)
  aestheticPatterns.avoidTones = aestheticPatterns.avoidTones.slice(0, 12)
  aestheticPatterns.styleMarkers = aestheticPatterns.styleMarkers.slice(0, 10)
  performancePatterns.commonKeywords = performancePatterns.commonKeywords.slice(0, 20)
  performancePatterns.topHooks = performancePatterns.topHooks.slice(0, 12)

  // Calculate confidence score based on total ratings
  const ratingCount = (existingProfile?.trainingRatingsCount || 0) + 1
  const confidenceScore = Math.min(0.95, Math.log10(ratingCount + 1) / 2)

  // Update profile
  await prisma.tasteProfile.upsert({
    where: { userId },
    create: {
      userId,
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      trainingRatingsCount: 1,
      lastTrainingAt: new Date(),
      confidenceScore,
    },
    update: {
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      trainingRatingsCount: { increment: 1 },
      lastTrainingAt: new Date(),
      confidenceScore,
    },
  })

  console.log('[IncrementalUpdate] Updated profile:', {
    dominantTones: aestheticPatterns.dominantTones.length,
    avoidTones: aestheticPatterns.avoidTones.length,
    keywords: performancePatterns.commonKeywords.length,
  })
}

/**
 * Full profile refinement - recalculates everything from all ratings
 */
export async function refineProfile(userId: string): Promise<{
  success: boolean
  confidenceScore: number
  patternsUpdated: boolean
}> {
  // Get all ratings for this user
  const ratings = await prisma.trainingRating.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (ratings.length < 3) {
    return {
      success: false,
      confidenceScore: 0,
      patternsUpdated: false,
    }
  }

  // Get suggestions for liked and disliked content
  const likedIds = new Set<string>()
  const dislikedIds = new Set<string>()

  for (const rating of ratings) {
    if (rating.ratingType === 'COMPARATIVE') {
      if (rating.outcome === 'A_PREFERRED' && rating.suggestionAId) {
        likedIds.add(rating.suggestionAId)
        if (rating.suggestionBId) dislikedIds.add(rating.suggestionBId)
      } else if (rating.outcome === 'B_PREFERRED' && rating.suggestionBId) {
        likedIds.add(rating.suggestionBId)
        if (rating.suggestionAId) dislikedIds.add(rating.suggestionAId)
      } else if (rating.outcome === 'BOTH_LIKED') {
        if (rating.suggestionAId) likedIds.add(rating.suggestionAId)
        if (rating.suggestionBId) likedIds.add(rating.suggestionBId)
      } else if (rating.outcome === 'NEITHER') {
        if (rating.suggestionAId) dislikedIds.add(rating.suggestionAId)
        if (rating.suggestionBId) dislikedIds.add(rating.suggestionBId)
      }
    } else if (rating.ratingType === 'BINARY' && rating.suggestionId) {
      if (rating.outcome === 'LIKED') {
        likedIds.add(rating.suggestionId)
      } else if (rating.outcome === 'DISLIKED') {
        dislikedIds.add(rating.suggestionId)
      }
    }
  }

  // Fetch the suggestions
  const likedSuggestions = await prisma.trainingSuggestion.findMany({
    where: { id: { in: Array.from(likedIds) } },
  })

  const dislikedSuggestions = await prisma.trainingSuggestion.findMany({
    where: { id: { in: Array.from(dislikedIds) } },
  })

  // Analyze all suggestions with Claude (batch for efficiency)
  console.log('[RefineProfile] Analyzing', likedSuggestions.length, 'liked and', dislikedSuggestions.length, 'disliked')

  const allLikedTones: string[] = []
  const allDislikedTones: string[] = []
  const allLikedKeywords: string[] = []
  const allDislikedKeywords: string[] = []
  const allLikedHooks: string[] = []
  const allLikedStyles: string[] = []

  // Analyze liked suggestions
  for (const suggestion of likedSuggestions) {
    const analysis = await analyzeContentForTaste(suggestion.title)
    allLikedTones.push(...analysis.tones)
    allLikedKeywords.push(...analysis.keywords)
    allLikedHooks.push(...analysis.hooks)
    allLikedStyles.push(...analysis.styles)
  }

  // Analyze disliked suggestions
  for (const suggestion of dislikedSuggestions) {
    const analysis = await analyzeContentForTaste(suggestion.title)
    allDislikedTones.push(...analysis.tones)
    allDislikedKeywords.push(...analysis.keywords)
  }

  // Calculate dominant tones (appear in liked but not disliked)
  const likedToneFreq = getFrequencyMap(allLikedTones)
  const dislikedToneSet = new Set(allDislikedTones)
  const dominantTones = Array.from(likedToneFreq.entries())
    .filter(([tone]) => !dislikedToneSet.has(tone))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tone]) => tone)

  // Calculate avoid tones (appear in disliked but not liked)
  const dislikedToneFreq = getFrequencyMap(allDislikedTones)
  const likedToneSet = new Set(allLikedTones)
  const avoidTones = Array.from(dislikedToneFreq.entries())
    .filter(([tone]) => !likedToneSet.has(tone))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tone]) => tone)

  // Calculate keywords
  const likedKeywordFreq = getFrequencyMap(allLikedKeywords)
  const dislikedKeywordSet = new Set(allDislikedKeywords)
  const commonKeywords = Array.from(likedKeywordFreq.entries())
    .filter(([kw]) => !dislikedKeywordSet.has(kw))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([kw]) => kw)

  // Calculate hooks and styles
  const topHooks = getTopByFrequency(allLikedHooks, 10)
  const styleMarkers = getTopByFrequency(allLikedStyles, 8)

  // Build patterns
  const performancePatterns = {
    topHooks,
    preferredStructures: [],
    commonKeywords,
    sentimentProfile: {},
  }

  const aestheticPatterns = {
    dominantTones,
    avoidTones,
    voiceSignature: '',
    complexityPreference: '',
    styleMarkers,
  }

  // Build trained preferences
  const trainedPreferences: TrainedPatterns = {
    reinforcedHooks: topHooks,
    reinforcedTones: dominantTones,
    reinforcedStyles: styleMarkers,
    avoidHooks: [],
    avoidTones,
    avoidStyles: [],
    preferredPlatforms: [],
  }

  // Calculate confidence score
  const confidenceScore = Math.min(0.95, Math.log10(ratings.length + 1) / 2)

  // Update taste profile
  await prisma.tasteProfile.upsert({
    where: { userId },
    create: {
      userId,
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      trainedPreferences: JSON.stringify(trainedPreferences),
      trainingRatingsCount: ratings.length,
      lastTrainingAt: new Date(),
      confidenceScore,
    },
    update: {
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      trainedPreferences: JSON.stringify(trainedPreferences),
      trainingRatingsCount: ratings.length,
      lastTrainingAt: new Date(),
      confidenceScore,
    },
  })

  console.log('[RefineProfile] Complete:', {
    dominantTones: dominantTones.length,
    avoidTones: avoidTones.length,
    keywords: commonKeywords.length,
    confidence: confidenceScore,
  })

  return {
    success: true,
    confidenceScore,
    patternsUpdated: true,
  }
}

function getFrequencyMap(items: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const item of items) {
    freq.set(item, (freq.get(item) || 0) + 1)
  }
  return freq
}

function getTopByFrequency<T>(items: T[], limit: number): T[] {
  const freq = new Map<T, number>()
  for (const item of items) {
    freq.set(item, (freq.get(item) || 0) + 1)
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item)
}

export async function getTrainingStats(userId: string): Promise<{
  totalRatings: number
  comparativeRatings: number
  binaryRatings: number
  confidenceScore: number
  lastTrainingAt: Date | null
  pendingSuggestions: number
}> {
  const [profile, pendingCount, ratings] = await Promise.all([
    prisma.tasteProfile.findUnique({
      where: { userId },
      select: {
        trainingRatingsCount: true,
        confidenceScore: true,
        lastTrainingAt: true,
      },
    }),
    prisma.trainingSuggestion.count({
      where: { userId, status: 'PENDING' },
    }),
    prisma.trainingRating.groupBy({
      by: ['ratingType'],
      where: { userId },
      _count: true,
    }),
  ])

  const comparativeRatings =
    ratings.find((r) => r.ratingType === 'COMPARATIVE')?._count || 0
  const binaryRatings = ratings.find((r) => r.ratingType === 'BINARY')?._count || 0

  return {
    totalRatings: profile?.trainingRatingsCount || 0,
    comparativeRatings,
    binaryRatings,
    confidenceScore: profile?.confidenceScore || 0,
    lastTrainingAt: profile?.lastTrainingAt || null,
    pendingSuggestions: pendingCount,
  }
}
