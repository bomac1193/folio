// Platform enum
export const PLATFORMS = {
  TIKTOK: 'TIKTOK',
  YOUTUBE_SHORT: 'YOUTUBE_SHORT',
  INSTAGRAM_REEL: 'INSTAGRAM_REEL',
  YOUTUBE_LONG: 'YOUTUBE_LONG',
  TWITTER: 'TWITTER',
  LINKEDIN: 'LINKEDIN',
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
}
