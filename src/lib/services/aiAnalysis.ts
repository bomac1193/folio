import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type { PerformanceDNA, AestheticDNA, AnalysisResult } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const ANALYSIS_PROMPT = `You are an expert content analyst specializing in viral content mechanics and aesthetic analysis. Analyze the following content title/hook and provide a detailed breakdown.

Content Title: "{title}"
Platform: {platform}
Views: {views}
Engagement Rate: {engagement}%

Provide your analysis in the following JSON format exactly:

{
  "performanceDNA": {
    "hooks": ["list of hook types used, e.g., curiosity gap, emotional trigger, social proof, controversy, etc."],
    "structure": "describe the structural pattern (e.g., question-based, statement, how-to, listicle, etc.)",
    "length": {characterCount},
    "keywords": ["key words/phrases that drive engagement"],
    "sentiment": "overall sentiment/tone (e.g., controversial, inspiring, informative, etc.)",
    "predictedScore": {0-100 score predicting viral potential}
  },
  "aestheticDNA": {
    "tone": ["list of tonal qualities, e.g., direct, casual, confident, urgent, etc."],
    "voice": "describe the voice style (e.g., second-person, conspiratorial, authoritative, etc.)",
    "complexity": "vocabulary/concept complexity level (simple, moderate, sophisticated)",
    "style": ["stylistic markers, e.g., provocative, insider knowledge, relatable, etc."],
    "tasteScore": {0-100 score for aesthetic quality and distinctiveness}
  }
}

Return ONLY the JSON object, no additional text.`

export async function analyzeContent(
  title: string,
  platform: string,
  views?: number | null,
  engagement?: number | null
): Promise<AnalysisResult> {
  const prompt = ANALYSIS_PROMPT
    .replace('{title}', title)
    .replace('{platform}', platform)
    .replace('{views}', views?.toString() || 'Unknown')
    .replace('{engagement}', engagement?.toFixed(1) || 'Unknown')
    .replace('{characterCount}', title.length.toString())

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const analysis = JSON.parse(responseText) as AnalysisResult
    return analysis
  } catch {
    // Return default analysis if parsing fails
    return {
      performanceDNA: {
        hooks: ['unknown'],
        structure: 'unknown',
        length: title.length,
        keywords: [],
        sentiment: 'neutral',
        predictedScore: 50,
      },
      aestheticDNA: {
        tone: ['neutral'],
        voice: 'unknown',
        complexity: 'moderate',
        style: ['standard'],
        tasteScore: 50,
      },
    }
  }
}

export async function analyzeCollection(collectionId: string): Promise<void> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const analysis = await analyzeContent(
    collection.title,
    collection.platform,
    collection.views,
    collection.engagement
  )

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      performanceDNA: JSON.stringify(analysis.performanceDNA),
      aestheticDNA: JSON.stringify(analysis.aestheticDNA),
    },
  })

  // Update taste profile
  await updateTasteProfile(collection.userId)
}

export async function updateTasteProfile(userId: string): Promise<void> {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      performanceDNA: { not: null },
      aestheticDNA: { not: null },
    },
  })

  if (collections.length === 0) return

  // Aggregate patterns
  const allHooks: string[] = []
  const allTones: string[] = []
  const allStyles: string[] = []
  const allKeywords: string[] = []
  const structures: Record<string, number> = {}

  for (const collection of collections) {
    const perfDNA: PerformanceDNA = JSON.parse(collection.performanceDNA!)
    const aesthDNA: AestheticDNA = JSON.parse(collection.aestheticDNA!)

    allHooks.push(...perfDNA.hooks)
    allTones.push(...aesthDNA.tone)
    allStyles.push(...aesthDNA.style)
    allKeywords.push(...perfDNA.keywords)
    structures[perfDNA.structure] = (structures[perfDNA.structure] || 0) + 1
  }

  // Count frequencies and get top items
  const hookFreq = countFrequency(allHooks)
  const toneFreq = countFrequency(allTones)
  const styleFreq = countFrequency(allStyles)
  const keywordFreq = countFrequency(allKeywords)

  const performancePatterns = {
    topHooks: getTopItems(hookFreq, 5),
    preferredStructures: Object.entries(structures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s),
    commonKeywords: getTopItems(keywordFreq, 10),
    sentimentProfile: collections.reduce((acc, c) => {
      const dna: PerformanceDNA = JSON.parse(c.performanceDNA!)
      acc[dna.sentiment] = (acc[dna.sentiment] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  const aestheticPatterns = {
    dominantTones: getTopItems(toneFreq, 5),
    voiceSignature: getMostCommon(
      collections.map((c) => JSON.parse(c.aestheticDNA!).voice)
    ),
    complexityPreference: getMostCommon(
      collections.map((c) => JSON.parse(c.aestheticDNA!).complexity)
    ),
    styleMarkers: getTopItems(styleFreq, 5),
  }

  const voiceSignature = {
    sentencePatterns: getTopItems(hookFreq, 3),
    vocabularyLevel: aestheticPatterns.complexityPreference,
    rhetoricalDevices: getTopItems(styleFreq, 3),
  }

  await prisma.tasteProfile.upsert({
    where: { userId },
    create: {
      userId,
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      voiceSignature: JSON.stringify(voiceSignature),
      itemCount: collections.length,
      lastTrainedAt: new Date(),
    },
    update: {
      performancePatterns: JSON.stringify(performancePatterns),
      aestheticPatterns: JSON.stringify(aestheticPatterns),
      voiceSignature: JSON.stringify(voiceSignature),
      itemCount: collections.length,
      lastTrainedAt: new Date(),
    },
  })
}

function countFrequency(items: string[]): Record<string, number> {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function getTopItems(freq: Record<string, number>, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item)
}

function getMostCommon(items: string[]): string {
  const freq = countFrequency(items)
  return getTopItems(freq, 1)[0] || 'unknown'
}
