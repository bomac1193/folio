'use client'

import type { TrainingStats as TrainingStatsType } from '@/lib/types'

interface TrainingStatsProps {
  stats: TrainingStatsType
}

export default function TrainingStats({ stats }: TrainingStatsProps) {
  const confidencePercentage = Math.round(stats.confidenceScore * 100)

  return (
    <div className="card">
      <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
        Training Statistics
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-[var(--folio-border)]">
          <span className="text-sm text-[var(--folio-text-secondary)]">Total Ratings</span>
          <span className="font-data">{stats.totalRatings}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--folio-border)]">
          <span className="text-sm text-[var(--folio-text-secondary)]">Comparative</span>
          <span className="font-data">{stats.comparativeRatings}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--folio-border)]">
          <span className="text-sm text-[var(--folio-text-secondary)]">Binary</span>
          <span className="font-data">{stats.binaryRatings}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--folio-border)]">
          <span className="text-sm text-[var(--folio-text-secondary)]">Pending Suggestions</span>
          <span className="font-data">{stats.pendingSuggestions}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-[var(--folio-text-secondary)]">Profile Confidence</span>
          <span className="font-data">{confidencePercentage}%</span>
        </div>
      </div>

      {stats.lastTrainingAt && (
        <p className="text-xs text-[var(--folio-text-muted)] mt-4 pt-4 border-t border-[var(--folio-border)]">
          Last trained: {new Date(stats.lastTrainingAt).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  )
}
