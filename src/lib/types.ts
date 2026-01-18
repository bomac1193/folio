// Platform enum
export const PLATFORMS = {
  TIKTOK: 'TIKTOK',
  YOUTUBE_SHORT: 'YOUTUBE_SHORT',
  INSTAGRAM_REEL: 'INSTAGRAM_REEL',
  YOUTUBE_LONG: 'YOUTUBE_LONG',
  TWITTER: 'TWITTER',
  LINKEDIN: 'LINKEDIN',
  TWITCH: 'TWITCH',
  SOUNDCLOUD: 'SOUNDCLOUD',
  BANDCAMP: 'BANDCAMP',
  MIXCLOUD: 'MIXCLOUD',
} as const

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS]

// Item type enum
export const ITEM_TYPES = {
  TITLE: 'TITLE',
  HOOK: 'HOOK',
  THUMBNAIL: 'THUMBNAIL',
  DESCRIPTION: 'DESCRIPTION',
} as const

export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES]

// Content type enum (live vs recorded content)
export const CONTENT_TYPES = {
  VIDEO: 'VIDEO',
  LIVE_STREAM: 'LIVE_STREAM',
  CLIP: 'CLIP',
  TRACK: 'TRACK',
  MIX: 'MIX',
  RELEASE: 'RELEASE',
  POST: 'POST',
} as const

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES]

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  VIDEO: 'Video',
  LIVE_STREAM: 'Live',
  CLIP: 'Clip',
  TRACK: 'Track',
  MIX: 'Mix',
  RELEASE: 'Release',
  POST: 'Post',
}

// Performance DNA structure
export interface PerformanceDNA {
  hooks: string[]
  structure: string
  length: number
  keywords: string[]
  sentiment: string
  predictedScore: number
}

// Aesthetic DNA structure
export interface AestheticDNA {
  tone: string[]
  voice: string
  complexity: string
  style: string[]
  tasteScore: number
}

// Collection with parsed DNA
export interface CollectionWithDNA {
  id: string
  userId: string
  title: string
  url: string | null
  platform: Platform
  thumbnail: string | null
  savedAt: Date
  views: number | null
  engagement: number | null
  performanceDNA: PerformanceDNA | null
  aestheticDNA: AestheticDNA | null
  notes: string | null
  tags: string[]
}

// Taste profile patterns
export interface TastePatterns {
  topHooks: string[]
  preferredStructures: string[]
  commonKeywords: string[]
  sentimentProfile: Record<string, number>
}

export interface AestheticPatterns {
  dominantTones: string[]
  voiceSignature: string
  complexityPreference: string
  styleMarkers: string[]
}

export interface VoiceSignature {
  sentencePatterns: string[]
  vocabularyLevel: string
  rhetoricalDevices: string[]
}

// Generated variant
export interface GeneratedVariant {
  text: string
  performanceScore: number
  tasteScore: number
  performanceRationale: string
  tasteRationale: string
}

// API response types
export interface AnalysisResult {
  performanceDNA: PerformanceDNA
  aestheticDNA: AestheticDNA
}

export interface GenerationResult {
  variants: GeneratedVariant[]
}

// Platform display info
export const PLATFORM_LABELS: Record<Platform, string> = {
  TIKTOK: 'TikTok',
  YOUTUBE_SHORT: 'YouTube Short',
  INSTAGRAM_REEL: 'Instagram Reel',
  YOUTUBE_LONG: 'YouTube',
  TWITTER: 'Twitter/X',
  LINKEDIN: 'LinkedIn',
  TWITCH: 'Twitch',
  SOUNDCLOUD: 'SoundCloud',
  BANDCAMP: 'Bandcamp',
  MIXCLOUD: 'Mixcloud',
}

// Training types
export type TrainingRatingType = 'COMPARATIVE' | 'BINARY'

export type TrainingOutcome =
  | 'A_PREFERRED'
  | 'B_PREFERRED'
  | 'BOTH_LIKED'
  | 'NEITHER'
  | 'LIKED'
  | 'DISLIKED'
  | 'SKIPPED'

export type SuggestionStatus = 'PENDING' | 'RATED' | 'SKIPPED'

export type SuggestionSourceType = 'SIMILAR' | 'TRENDING' | 'RANDOM' | 'EXPLORATION'

export interface TrainingSuggestion {
  id: string
  userId: string
  title: string
  url: string
  platform: Platform
  thumbnail: string | null
  videoId: string | null
  performanceDNA: PerformanceDNA | null
  aestheticDNA: AestheticDNA | null
  relevanceScore: number
  searchQuery: string | null
  sourceType: SuggestionSourceType | null
  status: SuggestionStatus
  createdAt: Date
  expiresAt: Date | null
}

export interface TrainingRating {
  id: string
  userId: string
  ratingType: TrainingRatingType
  suggestionAId: string | null
  suggestionBId: string | null
  suggestionId: string | null
  outcome: TrainingOutcome
  responseTimeMs: number | null
  createdAt: Date
}

export interface TrainingPair {
  suggestionA: TrainingSuggestion
  suggestionB: TrainingSuggestion
}

export interface TrainingStats {
  totalRatings: number
  comparativeRatings: number
  binaryRatings: number
  confidenceScore: number
  lastTrainingAt: Date | null
  pendingSuggestions: number
}

export interface TrainedPatterns {
  reinforcedHooks: string[]
  reinforcedTones: string[]
  reinforcedStyles: string[]
  avoidHooks: string[]
  avoidTones: string[]
  avoidStyles: string[]
  preferredPlatforms: Platform[]
}
