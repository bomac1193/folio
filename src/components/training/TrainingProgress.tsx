'use client'

interface TrainingProgressProps {
  sessionRatings: number
  totalRatings: number
  confidenceScore: number
  onRefineProfile: () => void
  isRefining?: boolean
}

export default function TrainingProgress({
  sessionRatings,
  totalRatings,
  confidenceScore,
  onRefineProfile,
  isRefining = false,
}: TrainingProgressProps) {
  const confidencePercentage = Math.round(confidenceScore * 100)
  const canRefine = totalRatings >= 5

  return (
    <div className="card">
      <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-4">
        Training Progress
      </h3>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-xs text-[var(--folio-text-muted)] mb-1">This Session</p>
          <p className="font-data text-2xl">{sessionRatings}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--folio-text-muted)] mb-1">Total Ratings</p>
          <p className="font-data text-2xl">{totalRatings}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--folio-text-muted)] mb-1">Confidence</p>
          <p className="font-data text-2xl">{confidencePercentage}%</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[var(--folio-text-muted)] mb-2">
          <span>Profile Confidence</span>
          <span>{confidencePercentage}%</span>
        </div>
        <div className="score-bar">
          <div
            className="score-bar-fill"
            style={{ width: `${confidencePercentage}%` }}
          />
        </div>
      </div>

      <button
        onClick={onRefineProfile}
        disabled={!canRefine || isRefining}
        className={`btn w-full text-xs ${
          canRefine ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
        }`}
      >
        {isRefining ? 'Refining...' : canRefine ? 'Refine Profile' : `Need ${5 - totalRatings} more ratings`}
      </button>
    </div>
  )
}
