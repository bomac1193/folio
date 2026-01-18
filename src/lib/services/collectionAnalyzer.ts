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

// Keyword-based analysis patterns (no API required)
const SENTIMENT_PATTERNS: Record<string, string[]> = {
  'controversial': ['controversial', 'debate', 'unpopular opinion', 'hot take', 'truth about', 'exposed', 'drama', 'beef', 'vs', 'battle'],
  'inspiring': ['inspiring', 'motivation', 'success', 'journey', 'transformation', 'story', 'changed my life', 'dream', 'achieve', 'mindset'],
  'educational': ['how to', 'tutorial', 'learn', 'explained', 'guide', 'tips', 'secrets', 'masterclass', 'breakdown', 'analysis'],
  'entertaining': ['funny', 'hilarious', 'comedy', 'prank', 'challenge', 'try', 'react', 'fail', 'best', 'worst', 'insane'],
  'provocative': ['why you', 'stop', 'never', 'wrong', 'mistake', 'lie', 'scam', 'fraud', 'manipulate', 'toxic'],
  'nostalgic': ['remember', 'throwback', 'old school', 'classic', 'vintage', 'retro', 'back in', '90s', '2000s', 'childhood'],
  'urgent': ['now', 'today', 'immediately', 'before it\'s too late', 'breaking', 'just happened', 'update', 'announcement'],
  'mysterious': ['secret', 'hidden', 'unknown', 'mystery', 'revealed', 'untold', 'dark side', 'conspiracy', 'truth'],
  'aspirational': ['luxury', 'rich', 'millionaire', 'billionaire', 'lifestyle', 'day in the life', 'routine', 'morning', 'productive'],
  'raw': ['real', 'honest', 'raw', 'unfiltered', 'behind the scenes', 'truth', 'authentic', 'no bs', 'straight up'],
}

const FORMAT_PATTERNS: Record<string, string[]> = {
  'interview': ['interview', 'talks', 'speaks', 'conversation', 'podcast', 'q&a', 'asks', 'meets'],
  'reaction': ['react', 'reacts', 'reacting', 'reaction', 'responds', 'watches', 'first time'],
  'tutorial': ['how to', 'tutorial', 'guide', 'learn', 'step by step', 'diy', 'make', 'create'],
  'commentary': ['commentary', 'analysis', 'breakdown', 'explains', 'why', 'the problem with', 'thoughts on'],
  'vlog': ['vlog', 'day in', 'routine', 'life of', 'week in', 'behind the scenes', 'grwm'],
  'review': ['review', 'honest', 'rating', 'worth it', 'should you', 'buying', 'testing'],
  'documentary': ['documentary', 'story of', 'rise of', 'fall of', 'history', 'explained', 'deep dive'],
  'sketch': ['skit', 'sketch', 'pov', 'when you', 'be like', 'types of', 'as a'],
  'music': ['music', 'song', 'beat', 'remix', 'cover', 'producer', 'studio', 'making', 'producing'],
  'news': ['breaking', 'news', 'update', 'announced', 'official', 'confirmed', 'happening'],
  'challenge': ['challenge', 'trying', 'attempted', 'i tried', 'for 24 hours', 'for a week', 'experiment'],
  'list': ['top', 'best', 'worst', 'ranking', 'tier list', 'things', 'reasons', 'ways'],
}

const NICHE_PATTERNS: Record<string, string[]> = {
  'music production': ['beat', 'producer', 'studio', 'sample', 'mix', 'master', 'daw', 'synth', 'drum', 'melody'],
  'content creation': ['youtube', 'tiktok', 'viral', 'algorithm', 'views', 'subscribers', 'content', 'creator', 'influencer'],
  'tech': ['tech', 'ai', 'app', 'software', 'coding', 'startup', 'silicon valley', 'gadget', 'iphone', 'android'],
  'business': ['business', 'entrepreneur', 'startup', 'money', 'income', 'passive', 'invest', 'stock', 'crypto', 'wealth'],
  'fitness': ['workout', 'gym', 'exercise', 'muscle', 'weight', 'diet', 'nutrition', 'health', 'body', 'training'],
  'gaming': ['game', 'gaming', 'play', 'stream', 'esports', 'xbox', 'playstation', 'pc', 'mobile'],
  'fashion': ['fashion', 'style', 'outfit', 'clothing', 'brand', 'streetwear', 'designer', 'fit', 'drip'],
  'comedy': ['funny', 'comedy', 'joke', 'laugh', 'humor', 'meme', 'parody', 'satire'],
  'self-improvement': ['mindset', 'productivity', 'habits', 'discipline', 'growth', 'success', 'motivation', 'goals'],
  'hip-hop culture': ['rap', 'hip hop', 'rapper', 'freestyle', 'bars', 'flow', 'kanye', 'drake', 'kendrick', 'tyler'],
}

const TONE_PATTERNS: Record<string, string[]> = {
  'edgy': ['edgy', 'dark', 'controversial', 'raw', 'brutal', 'savage', 'no filter'],
  'chill': ['chill', 'relaxing', 'calm', 'peaceful', 'vibe', 'aesthetic', 'cozy', 'lo-fi'],
  'energetic': ['hype', 'energy', 'insane', 'crazy', 'wild', 'lit', 'fire', 'epic'],
  'sincere': ['honest', 'real', 'genuine', 'authentic', 'true', 'heartfelt', 'vulnerable'],
  'playful': ['fun', 'playful', 'silly', 'goofy', 'cute', 'wholesome'],
  'confident': ['confident', 'bold', 'fearless', 'boss', 'king', 'queen', 'goat'],
  'sarcastic': ['sarcastic', 'ironic', 'satire', 'parody', 'mocking'],
  'intense': ['intense', 'serious', 'deep', 'heavy', 'profound', 'powerful'],
  'nostalgic': ['nostalgic', 'throwback', 'classic', 'old school', 'remember'],
  'provocative': ['provocative', 'controversial', 'polarizing', 'shocking', 'exposed'],
}

const HOOK_PATTERNS: Record<string, string[]> = {
  'curiosity gap': ['why', 'how', 'what', 'secret', 'hidden', 'revealed', 'truth'],
  'controversy': ['controversial', 'unpopular', 'hot take', 'debate', 'vs'],
  'transformation': ['before', 'after', 'changed', 'transformation', 'journey', 'became'],
  'challenge': ['challenge', 'tried', 'attempting', 'experiment', 'test'],
  'social proof': ['million', 'viral', 'everyone', 'famous', 'celebrity', 'legend'],
  'fear of missing out': ['need to', 'have to', 'must', 'before it\'s too late', 'don\'t miss'],
  'insider knowledge': ['secret', 'they don\'t want you to know', 'hidden', 'insider', 'industry'],
  'emotional trigger': ['emotional', 'cried', 'shocked', 'unbelievable', 'heartbreaking'],
  'how-to promise': ['how to', 'step by step', 'guide', 'tutorial', 'learn'],
  'number list': ['top', 'best', 'worst', '10', '5', '3', 'ranking'],
}

/**
 * Analyze content using keyword patterns (no API required)
 */
function analyzeWithPatterns(title: string): DetailedAnalysis {
  const titleLower = title.toLowerCase()

  // Find matching sentiments
  const sentiments: string[] = []
  for (const [sentiment, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      sentiments.push(sentiment)
    }
  }

  // Find matching formats
  const formats: string[] = []
  for (const [format, patterns] of Object.entries(FORMAT_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      formats.push(format)
    }
  }

  // Find matching niches
  const niches: string[] = []
  for (const [niche, patterns] of Object.entries(NICHE_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      niches.push(niche)
    }
  }

  // Find matching tones
  const tones: string[] = []
  for (const [tone, patterns] of Object.entries(TONE_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      tones.push(tone)
    }
  }

  // Find matching hooks
  const hooks: string[] = []
  for (const [hook, patterns] of Object.entries(HOOK_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      hooks.push(hook)
    }
  }

  // Extract keywords from title
  const keywords = extractKeywords(title)

  // Determine structure
  let structure = 'statement'
  if (titleLower.includes('?')) structure = 'question'
  else if (titleLower.startsWith('how')) structure = 'how-to'
  else if (/^\d+|top \d+|best \d+/i.test(titleLower)) structure = 'listicle'
  else if (titleLower.includes('vs') || titleLower.includes(' or ')) structure = 'comparison'

  // Determine complexity
  const wordCount = title.split(/\s+/).length
  const avgWordLength = title.replace(/\s+/g, '').length / wordCount
  let complexity = 'moderate'
  if (avgWordLength < 5 && wordCount < 8) complexity = 'simple'
  else if (avgWordLength > 6 || wordCount > 12) complexity = 'sophisticated'

  // Determine pacing (based on title energy)
  let pacing = 'medium'
  if (titleLower.match(/!!|insane|crazy|wild|hype|urgent|now|breaking/)) pacing = 'fast'
  else if (titleLower.match(/chill|relax|calm|peaceful|slow|deep/)) pacing = 'slow'

  // Determine target audience
  let audience = 'general'
  if (titleLower.match(/beginner|learn|how to|guide|intro/)) audience = 'beginners'
  else if (titleLower.match(/advanced|pro|expert|masterclass|deep dive/)) audience = 'experts'
  else if (titleLower.match(/gen z|millennial|young|teen/)) audience = 'gen-z'
  else if (titleLower.match(/creator|youtuber|influencer/)) audience = 'creators'

  return {
    performanceDNA: {
      hooks: hooks.length > 0 ? hooks : ['direct statement'],
      structure,
      length: title.length,
      keywords,
      sentiment: sentiments[0] || 'informative',
      predictedScore: 50,
      format: formats[0] || 'content',
      niche: niches[0] || 'general',
      targetAudience: audience,
    },
    aestheticDNA: {
      tone: tones.length > 0 ? tones : ['neutral'],
      voice: 'conversational',
      complexity,
      style: formats.length > 0 ? formats.slice(0, 2) : ['standard'],
      tasteScore: 50,
      emotionalTriggers: sentiments.slice(0, 3),
      pacing,
    },
  }
}

function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'this', 'that', 'what', 'how', 'why', 'when', 'where', 'who',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'i', 'you', 'we',
    'it', 'he', 'she', 'they', 'them', 'just', 'like', 'get', 'got',
  ])

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 6)
}

/**
 * Try Claude API first, fall back to pattern matching
 */
async function analyzeCollectionItem(item: CollectionItem): Promise<DetailedAnalysis> {
  // Try Claude API first
  try {
    const prompt = `Analyze this video title for taste profiling. Title: "${item.title}"

Return JSON:
{
  "performanceDNA": {
    "hooks": ["hook types used"],
    "structure": "structure type",
    "length": ${item.title.length},
    "keywords": ["topic keywords"],
    "sentiment": "sentiment type",
    "predictedScore": 50,
    "format": "content format (interview/reaction/tutorial/vlog/commentary/review/documentary/sketch/music/news/challenge/list)",
    "niche": "specific niche",
    "targetAudience": "target demographic"
  },
  "aestheticDNA": {
    "tone": ["tonal qualities"],
    "voice": "voice style",
    "complexity": "simple/moderate/sophisticated",
    "style": ["style markers"],
    "tasteScore": 50,
    "emotionalTriggers": ["emotions targeted"],
    "pacing": "fast/medium/slow"
  }
}

Return ONLY valid JSON.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as DetailedAnalysis
    }
  } catch (error) {
    // API failed, use pattern matching
    console.log('[CollectionAnalyzer] API unavailable, using pattern matching for:', item.title.slice(0, 40))
  }

  // Fallback to pattern-based analysis
  return analyzeWithPatterns(item.title)
}

/**
 * Rebuild the entire taste profile from collection
 */
export async function rebuildTasteProfile(userId: string): Promise<{
  itemsAnalyzed: number
  profile: AggregatedProfile
}> {
  console.log('[CollectionAnalyzer] Starting rebuild for user:', userId)

  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  })

  if (collections.length === 0) {
    throw new Error('No collection items to analyze')
  }

  console.log('[CollectionAnalyzer] Found', collections.length, 'items')

  const analyses: DetailedAnalysis[] = []

  for (let i = 0; i < collections.length; i++) {
    const item = collections[i]
    console.log(`[CollectionAnalyzer] Analyzing ${i + 1}/${collections.length}: ${item.title.slice(0, 40)}...`)

    const analysis = await analyzeCollectionItem(item)
    analyses.push(analysis)

    // Update collection item
    await prisma.collection.update({
      where: { id: item.id },
      data: {
        performanceDNA: JSON.stringify(analysis.performanceDNA),
        aestheticDNA: JSON.stringify(analysis.aestheticDNA),
      },
    })

    // Small delay between API calls (if API is being used)
    if (i < collections.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const profile = aggregateAnalyses(analyses)

  // Get existing training data to merge
  const existingProfile = await prisma.tasteProfile.findUnique({
    where: { userId },
    select: {
      trainingPerformance: true,
      trainingAesthetic: true,
    },
  })

  // Parse training data if it exists
  const trainingPerf = existingProfile?.trainingPerformance
    ? JSON.parse(existingProfile.trainingPerformance)
    : null
  const trainingAesth = existingProfile?.trainingAesthetic
    ? JSON.parse(existingProfile.trainingAesthetic)
    : null

  // Merge collection and training patterns for the combined view
  const mergedPerformance = mergePerformancePatterns(profile.performancePatterns, trainingPerf)
  const mergedAesthetic = mergeAestheticPatterns(profile.aestheticPatterns, trainingAesth)

  await prisma.tasteProfile.upsert({
    where: { userId },
    create: {
      userId,
      // Collection-specific fields
      collectionPerformance: JSON.stringify(profile.performancePatterns),
      collectionAesthetic: JSON.stringify(profile.aestheticPatterns),
      collectionVoice: JSON.stringify(profile.voiceSignature),
      // Combined/merged fields
      performancePatterns: JSON.stringify(mergedPerformance),
      aestheticPatterns: JSON.stringify(mergedAesthetic),
      voiceSignature: JSON.stringify(profile.voiceSignature),
      itemCount: collections.length,
      lastTrainedAt: new Date(),
    },
    update: {
      // Collection-specific fields
      collectionPerformance: JSON.stringify(profile.performancePatterns),
      collectionAesthetic: JSON.stringify(profile.aestheticPatterns),
      collectionVoice: JSON.stringify(profile.voiceSignature),
      // Combined/merged fields
      performancePatterns: JSON.stringify(mergedPerformance),
      aestheticPatterns: JSON.stringify(mergedAesthetic),
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
      avoidTones: [],
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
    if (item && item !== 'unknown' && item !== 'general' && item !== 'content') {
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
  return top[0] || 'moderate'
}

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

/**
 * Merge performance patterns from collection and training
 */
function mergePerformancePatterns(
  collection: AggregatedProfile['performancePatterns'] | null,
  training: AggregatedProfile['performancePatterns'] | null
): AggregatedProfile['performancePatterns'] {
  if (!collection && !training) {
    return {
      topHooks: [],
      preferredStructures: [],
      commonKeywords: [],
      sentimentProfile: {},
      formats: {},
      niches: [],
      targetAudiences: [],
    }
  }
  if (!collection) return training!
  if (!training) return collection

  // Merge arrays with deduplication, prioritizing training data
  const mergedHooks = [...new Set([...training.topHooks, ...collection.topHooks])].slice(0, 10)
  const mergedStructures = [...new Set([...training.preferredStructures, ...collection.preferredStructures])].slice(0, 10)
  const mergedKeywords = [...new Set([...training.commonKeywords, ...collection.commonKeywords])].slice(0, 20)
  const mergedNiches = [...new Set([...training.niches, ...collection.niches])].slice(0, 8)
  const mergedAudiences = [...new Set([...training.targetAudiences, ...collection.targetAudiences])].slice(0, 5)

  // Merge sentiment profiles (add counts)
  const mergedSentiments: Record<string, number> = { ...collection.sentimentProfile }
  for (const [sentiment, count] of Object.entries(training.sentimentProfile)) {
    mergedSentiments[sentiment] = (mergedSentiments[sentiment] || 0) + count
  }

  // Merge formats (add counts)
  const mergedFormats: Record<string, number> = { ...collection.formats }
  for (const [format, count] of Object.entries(training.formats || {})) {
    mergedFormats[format] = (mergedFormats[format] || 0) + count
  }

  return {
    topHooks: mergedHooks,
    preferredStructures: mergedStructures,
    commonKeywords: mergedKeywords,
    sentimentProfile: mergedSentiments,
    formats: mergedFormats,
    niches: mergedNiches,
    targetAudiences: mergedAudiences,
  }
}

/**
 * Merge aesthetic patterns from collection and training
 */
function mergeAestheticPatterns(
  collection: AggregatedProfile['aestheticPatterns'] | null,
  training: AggregatedProfile['aestheticPatterns'] | null
): AggregatedProfile['aestheticPatterns'] {
  if (!collection && !training) {
    return {
      dominantTones: [],
      avoidTones: [],
      voiceSignature: '',
      complexityPreference: '',
      styleMarkers: [],
      emotionalTriggers: [],
      pacing: '',
    }
  }
  if (!collection) return training!
  if (!training) return collection

  // Merge arrays with deduplication, prioritizing training data
  const mergedTones = [...new Set([...training.dominantTones, ...collection.dominantTones])].slice(0, 8)
  const mergedAvoidTones = [...new Set([...training.avoidTones, ...collection.avoidTones])].slice(0, 8)
  const mergedStyles = [...new Set([...training.styleMarkers, ...collection.styleMarkers])].slice(0, 8)
  const mergedTriggers = [...new Set([
    ...(training.emotionalTriggers || []),
    ...(collection.emotionalTriggers || [])
  ])].slice(0, 8)

  return {
    dominantTones: mergedTones,
    avoidTones: mergedAvoidTones,
    voiceSignature: training.voiceSignature || collection.voiceSignature,
    complexityPreference: training.complexityPreference || collection.complexityPreference,
    styleMarkers: mergedStyles,
    emotionalTriggers: mergedTriggers,
    pacing: training.pacing || collection.pacing,
  }
}
