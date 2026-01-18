import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type { PerformanceDNA, AestheticDNA } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface CollectionItem {
  id: string
  title: string
  platform: string
  views: number | null
  engagement: number | null
  performanceDNA: string | null
  aestheticDNA: string | null
}

interface DetailedAnalysis {
  performanceDNA: PerformanceDNA & {
    format: string
    niche: string
    targetAudience: string
  }
  aestheticDNA: AestheticDNA & {
    emotionalTriggers: string[]
    pacing: string
  }
}

interface AggregatedProfile {
  performancePatterns: {
    topHooks: string[]
    preferredStructures: string[]
    commonKeywords: string[]
    sentimentProfile: Record<string, number>
    formats: Record<string, number>
    niches: string[]
    targetAudiences: string[]
  }
  aestheticPatterns: {
    dominantTones: string[]
    avoidTones: string[]
    voiceSignature: string
    complexityPreference: string
    styleMarkers: string[]
    emotionalTriggers: string[]
    pacing: string
  }
  voiceSignature: {
    sentencePatterns: string[]
    vocabularyLevel: string
    rhetoricalDevices: string[]
  }
}

/**
 * Analyze a single collection item in detail
 */
async function analyzeCollectionItem(item: CollectionItem): Promise<DetailedAnalysis> {
  const prompt = `Analyze this video/content title for a creator's taste profile analysis:

Title: "${item.title}"
Platform: ${item.platform}
Views: ${item.views || 'Unknown'}
Engagement: ${item.engagement ? item.engagement.toFixed(1) + '%' : 'Unknown'}

Provide detailed analysis in JSON format:

{
  "performanceDNA": {
    "hooks": ["specific hook types: curiosity gap, controversy, social proof, fear of missing out, transformation promise, insider secret, challenge, emotional trigger, etc."],
    "structure": "structure type: question, statement, how-to, listicle, story, comparison, revelation, etc.",
    "length": ${item.title.length},
    "keywords": ["specific topic keywords - be precise, extract actual subjects/themes"],
    "sentiment": "specific sentiment: controversial, inspiring, educational, entertaining, provocative, nostalgic, urgent, calm, etc.",
    "predictedScore": 50,
    "format": "content format: interview, reaction video, tutorial, vlog, documentary, commentary, podcast clip, music video, sketch, review, behind-the-scenes, news, challenge, etc.",
    "niche": "specific niche: tech reviews, gaming, beauty, fitness, finance, comedy, music production, fashion, food, travel, self-improvement, etc.",
    "targetAudience": "target demographic: gen-z, millennials, professionals, students, enthusiasts, beginners, experts, etc."
  },
  "aestheticDNA": {
    "tone": ["specific tones: edgy, wholesome, sarcastic, sincere, aggressive, chill, chaotic, polished, raw, mysterious, playful, serious, etc."],
    "voice": "voice style: conversational, authoritative, conspiratorial, friendly, provocative, educational, entertaining, etc.",
    "complexity": "simple, moderate, or sophisticated",
    "style": ["style markers: clickbait, authentic, polished, lo-fi, high-energy, minimalist, maximalist, meme-influenced, etc."],
    "tasteScore": 50,
    "emotionalTriggers": ["emotions it targets: curiosity, fear, excitement, nostalgia, anger, joy, surprise, etc."],
    "pacing": "fast, medium, or slow"
  }
}

Be SPECIFIC and PRECISE. Extract actual themes, not generic descriptions. Return ONLY valid JSON.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as DetailedAnalysis
    }
  } catch (error) {
    console.error('[CollectionAnalyzer] Error analyzing item:', item.title, error)
  }

  // Fallback
  return {
    performanceDNA: {
      hooks: ['unknown'],
      structure: 'unknown',
      length: item.title.length,
      keywords: extractBasicKeywords(item.title),
      sentiment: 'neutral',
      predictedScore: 50,
      format: 'unknown',
      niche: 'unknown',
      targetAudience: 'general',
    },
    aestheticDNA: {
      tone: ['neutral'],
      voice: 'unknown',
      complexity: 'moderate',
      style: ['standard'],
      tasteScore: 50,
      emotionalTriggers: [],
      pacing: 'medium',
    },
  }
}

function extractBasicKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'this', 'that', 'what', 'how', 'why', 'when', 'where', 'who',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'i', 'you', 'we',
  ])

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5)
}

/**
 * Rebuild the entire taste profile from collection with thorough analysis
 */
export async function rebuildTasteProfile(userId: string): Promise<{
  itemsAnalyzed: number
  profile: AggregatedProfile
}> {
  console.log('[CollectionAnalyzer] Starting full rebuild for user:', userId)

  // Get all collection items
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  })

  if (collections.length === 0) {
    throw new Error('No collection items to analyze')
  }

  console.log('[CollectionAnalyzer] Found', collections.length, 'items to analyze')

  // Analyze each item (with rate limiting)
  const analyses: DetailedAnalysis[] = []

  for (let i = 0; i < collections.length; i++) {
    const item = collections[i]
    console.log(`[CollectionAnalyzer] Analyzing ${i + 1}/${collections.length}: ${item.title.slice(0, 50)}...`)

    const analysis = await analyzeCollectionItem(item)
    analyses.push(analysis)

    // Update the collection item with new analysis
    await prisma.collection.update({
      where: { id: item.id },
      data: {
        performanceDNA: JSON.stringify(analysis.performanceDNA),
        aestheticDNA: JSON.stringify(analysis.aestheticDNA),
      },
    })

    // Small delay to avoid rate limits
    if (i < collections.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Aggregate all analyses into profile
  const profile = aggregateAnalyses(analyses)

  // Save to database
  await prisma.tasteProfile.upsert({
    where: { userId },
    create: {
      userId,
      performancePatterns: JSON.stringify(profile.performancePatterns),
      aestheticPatterns: JSON.stringify(profile.aestheticPatterns),
      voiceSignature: JSON.stringify(profile.voiceSignature),
      itemCount: collections.length,
      lastTrainedAt: new Date(),
    },
    update: {
      performancePatterns: JSON.stringify(profile.performancePatterns),
      aestheticPatterns: JSON.stringify(profile.aestheticPatterns),
      voiceSignature: JSON.stringify(profile.voiceSignature),
      itemCount: collections.length,
      lastTrainedAt: new Date(),
    },
  })

  console.log('[CollectionAnalyzer] Rebuild complete:', {
    items: collections.length,
    keywords: profile.performancePatterns.commonKeywords.length,
    sentiments: Object.keys(profile.performancePatterns.sentimentProfile).length,
    formats: Object.keys(profile.performancePatterns.formats).length,
  })

  return {
    itemsAnalyzed: collections.length,
    profile,
  }
}

function aggregateAnalyses(analyses: DetailedAnalysis[]): AggregatedProfile {
  // Collect all values
  const allHooks: string[] = []
  const allTones: string[] = []
  const allStyles: string[] = []
  const allKeywords: string[] = []
  const allEmotionalTriggers: string[] = []
  const structures: string[] = []
  const sentiments: string[] = []
  const formats: string[] = []
  const niches: string[] = []
  const audiences: string[] = []
  const voices: string[] = []
  const complexities: string[] = []
  const pacings: string[] = []

  for (const analysis of analyses) {
    const perf = analysis.performanceDNA
    const aesth = analysis.aestheticDNA

    allHooks.push(...perf.hooks)
    allKeywords.push(...perf.keywords)
    structures.push(perf.structure)
    sentiments.push(perf.sentiment)
    formats.push(perf.format)
    niches.push(perf.niche)
    audiences.push(perf.targetAudience)

    allTones.push(...aesth.tone)
    allStyles.push(...aesth.style)
    allEmotionalTriggers.push(...aesth.emotionalTriggers)
    voices.push(aesth.voice)
    complexities.push(aesth.complexity)
    pacings.push(aesth.pacing)
  }

  // Count frequencies
  const hookFreq = countFrequency(allHooks)
  const toneFreq = countFrequency(allTones)
  const styleFreq = countFrequency(allStyles)
  const keywordFreq = countFrequency(allKeywords)
  const sentimentFreq = countFrequency(sentiments)
  const formatFreq = countFrequency(formats)
  const nicheFreq = countFrequency(niches)
  const triggerFreq = countFrequency(allEmotionalTriggers)

  return {
    performancePatterns: {
      topHooks: getTopItems(hookFreq, 10),
      preferredStructures: getTopItems(countFrequency(structures), 5),
      commonKeywords: getTopItems(keywordFreq, 20),
      sentimentProfile: sentimentFreq,
      formats: formatFreq,
      niches: getTopItems(nicheFreq, 5),
      targetAudiences: getTopItems(countFrequency(audiences), 3),
    },
    aestheticPatterns: {
      dominantTones: getTopItems(toneFreq, 10),
      avoidTones: [], // Will be populated from training
      voiceSignature: getMostCommon(voices),
      complexityPreference: getMostCommon(complexities),
      styleMarkers: getTopItems(styleFreq, 8),
      emotionalTriggers: getTopItems(triggerFreq, 6),
      pacing: getMostCommon(pacings),
    },
    voiceSignature: {
      sentencePatterns: getTopItems(hookFreq, 5),
      vocabularyLevel: getMostCommon(complexities),
      rhetoricalDevices: getTopItems(styleFreq, 5),
    },
  }
}

function countFrequency(items: string[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const item of items) {
    if (item && item !== 'unknown') {
      freq[item] = (freq[item] || 0) + 1
    }
  }
  return freq
}

function getTopItems(freq: Record<string, number>, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item)
}

function getMostCommon(items: string[]): string {
  const freq = countFrequency(items)
  const top = getTopItems(freq, 1)
  return top[0] || 'unknown'
}

/**
 * Quick analysis summary of collection
 */
export async function getCollectionSummary(userId: string): Promise<{
  totalItems: number
  analyzedItems: number
  needsRebuild: boolean
}> {
  const [total, analyzed] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({
      where: {
        userId,
        performanceDNA: { not: null },
        aestheticDNA: { not: null },
      },
    }),
  ])

  return {
    totalItems: total,
    analyzedItems: analyzed,
    needsRebuild: analyzed < total || analyzed === 0,
  }
}
