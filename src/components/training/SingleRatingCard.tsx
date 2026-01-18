'use client'

import type { TrainingSuggestion } from '@/lib/types'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

interface SingleRatingCardProps {
  suggestion: TrainingSuggestion
  onRate: (outcome: 'LIKED' | 'DISLIKED' | 'SKIPPED') => void
  disabled?: boolean
}

export default function SingleRatingCard({
  suggestion,
  onRate,
  disabled = false,
}: SingleRatingCardProps) {
  return (
    <div className="card max-w-md mx-auto">
      {suggestion.thumbnail && (
        <div className="aspect-video mb-4 overflow-hidden rounded bg-[var(--folio-bg-secondary)]">
          <img
            src={suggestion.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h3 className="text-sm mb-2 line-clamp-2">{suggestion.title}</h3>
      <span className="platform-badge text-xs mb-4 inline-block">
        {PLATFORM_LABELS[suggestion.platform as Platform] || suggestion.platform}
      </span>

      <div className="flex gap-3 pt-4 border-t border-[var(--folio-border)]">
        <button
          onClick={() => onRate('DISLIKED')}
          disabled={disabled}
          className="btn btn-secondary flex-1 text-xs text-red-500 hover:bg-red-500/10"
        >
          Dislike
        </button>
        <button
          onClick={() => onRate('SKIPPED')}
          disabled={disabled}
          className="btn btn-secondary flex-1 text-xs"
        >
          Skip
        </button>
        <button
          onClick={() => onRate('LIKED')}
          disabled={disabled}
          className="btn btn-primary flex-1 text-xs"
        >
          Like
        </button>
      </div>
    </div>
  )
}
