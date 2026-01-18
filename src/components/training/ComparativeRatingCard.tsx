'use client'

import type { TrainingSuggestion } from '@/lib/types'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

interface ComparativeRatingCardProps {
  suggestionA: TrainingSuggestion
  suggestionB: TrainingSuggestion
  onRate: (outcome: 'A_PREFERRED' | 'B_PREFERRED' | 'BOTH_LIKED' | 'NEITHER') => void
  disabled?: boolean
}

export default function ComparativeRatingCard({
  suggestionA,
  suggestionB,
  onRate,
  disabled = false,
}: ComparativeRatingCardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Suggestion A */}
        <div className="card">
          {suggestionA.thumbnail && (
            <div className="aspect-video mb-4 overflow-hidden rounded bg-[var(--folio-bg-secondary)]">
              <img
                src={suggestionA.thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-sm mb-2 line-clamp-2">{suggestionA.title}</h3>
          <span className="platform-badge text-xs">
            {PLATFORM_LABELS[suggestionA.platform as Platform] || suggestionA.platform}
          </span>
          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--folio-border)]">
            <button
              onClick={() => onRate('A_PREFERRED')}
              disabled={disabled}
              className="btn btn-primary flex-1 text-xs"
            >
              Like This
            </button>
          </div>
        </div>

        {/* Suggestion B */}
        <div className="card">
          {suggestionB.thumbnail && (
            <div className="aspect-video mb-4 overflow-hidden rounded bg-[var(--folio-bg-secondary)]">
              <img
                src={suggestionB.thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-sm mb-2 line-clamp-2">{suggestionB.title}</h3>
          <span className="platform-badge text-xs">
            {PLATFORM_LABELS[suggestionB.platform as Platform] || suggestionB.platform}
          </span>
          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--folio-border)]">
            <button
              onClick={() => onRate('B_PREFERRED')}
              disabled={disabled}
              className="btn btn-primary flex-1 text-xs"
            >
              Like This
            </button>
          </div>
        </div>
      </div>

      {/* Bottom options */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => onRate('BOTH_LIKED')}
          disabled={disabled}
          className="btn btn-secondary text-xs text-green-600 hover:bg-green-500/10"
        >
          Like Both
        </button>
        <button
          onClick={() => onRate('NEITHER')}
          disabled={disabled}
          className="btn btn-secondary text-xs text-red-500 hover:bg-red-500/10"
        >
          Dislike Both
        </button>
      </div>
    </div>
  )
}
