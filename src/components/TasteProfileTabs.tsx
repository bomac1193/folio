'use client'

import { useState } from 'react'
import TasteProfileView from './TasteProfileView'
import TrainingInterface from './training/TrainingInterface'
import type { Platform } from '@/lib/types'

type TabId = 'overview' | 'train'

interface TasteProfileTabsProps {
  tasteProfile: {
    performancePatterns: {
      topHooks: string[]
      preferredStructures: string[]
      commonKeywords: string[]
      sentimentProfile: Record<string, number>
    } | null
    aestheticPatterns: {
      dominantTones: string[]
      voiceSignature: string
      complexityPreference: string
      styleMarkers: string[]
    } | null
    voiceSignature: {
      sentencePatterns: string[]
      vocabularyLevel: string
      rhetoricalDevices: string[]
    } | null
    itemCount: number
    lastTrainedAt: Date
    trainingRatingsCount?: number
    confidenceScore?: number
  }
  platformCounts: Record<string, number>
  dateRange: { oldest: number; newest: number } | null
}

export default function TasteProfileTabs({
  tasteProfile,
  platformCounts,
  dateRange,
}: TasteProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="px-8 border-b border-[var(--folio-border)] bg-white">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 text-xs uppercase tracking-[0.15em] transition-colors border-b-2 -mb-[1px] ${
              activeTab === 'overview'
                ? 'text-[var(--folio-text-primary)] border-[var(--folio-text-primary)]'
                : 'text-[var(--folio-text-muted)] border-transparent hover:text-[var(--folio-text-secondary)]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('train')}
            className={`py-4 text-xs uppercase tracking-[0.15em] transition-colors border-b-2 -mb-[1px] ${
              activeTab === 'train'
                ? 'text-[var(--folio-text-primary)] border-[var(--folio-text-primary)]'
                : 'text-[var(--folio-text-muted)] border-transparent hover:text-[var(--folio-text-secondary)]'
            }`}
          >
            Train
            {tasteProfile.trainingRatingsCount ? (
              <span className="ml-2 text-[10px] text-[var(--folio-text-muted)]">
                ({tasteProfile.trainingRatingsCount})
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <TasteProfileView
          tasteProfile={tasteProfile}
          platformCounts={platformCounts}
          dateRange={dateRange}
        />
      ) : (
        <TrainingInterface />
      )}
    </div>
  )
}
