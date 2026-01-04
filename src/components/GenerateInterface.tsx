'use client'

import { useState } from 'react'
import { PLATFORMS, PLATFORM_LABELS, type Platform, type GeneratedVariant } from '@/lib/types'

interface GenerateInterfaceProps {
  collections: {
    id: string
    title: string
    platform: string
    thumbnail: string | null
  }[]
  hasTasteProfile: boolean
}

export default function GenerateInterface({
  collections,
  hasTasteProfile,
}: GenerateInterfaceProps) {
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<Platform>('YOUTUBE_LONG')
  const [selectedReferences, setSelectedReferences] = useState<string[]>([])
  const [variants, setVariants] = useState<GeneratedVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platform,
          referenceItems: selectedReferences.length > 0 ? selectedReferences : undefined,
          count: 10,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Generation failed')
        return
      }

      setVariants(data.variants)
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleReference = (id: string) => {
    setSelectedReferences((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex h-[calc(100vh-89px)]">
      {/* Left Column - Input */}
      <div className="w-1/2 border-r border-[var(--folio-border)] p-8 overflow-auto">
        <div className="max-w-md space-y-8">
          {/* Topic Input */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-secondary)] mb-2">
              Topic / Concept
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Why most filmmakers fail in their first year"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Platform Selector */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-secondary)] mb-2">
              Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PLATFORMS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(value)}
                  className={`
                    px-4 py-3 text-sm text-left border
                    ${platform === value
                      ? 'border-[var(--folio-black)] bg-[var(--folio-offwhite)]'
                      : 'border-[var(--folio-border)] hover:border-[var(--folio-black)]'
                    }
                  `}
                >
                  {PLATFORM_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Items */}
          {collections.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-secondary)] mb-2">
                Reference Items (Optional)
              </label>
              <p className="text-xs text-[var(--folio-text-muted)] mb-3">
                Select items from your collection to influence generation
              </p>
              <div className="max-h-48 overflow-auto border border-[var(--folio-border)]">
                {collections.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleReference(item.id)}
                    className={`
                      w-full px-4 py-3 text-left text-sm border-b border-[var(--folio-border)] last:border-b-0
                      ${selectedReferences.includes(item.id)
                        ? 'bg-[var(--folio-offwhite)]'
                        : 'hover:bg-[var(--folio-offwhite)]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`
                          w-4 h-4 border flex items-center justify-center
                          ${selectedReferences.includes(item.id)
                            ? 'bg-[var(--folio-black)] border-[var(--folio-black)]'
                            : 'border-[var(--folio-border)]'
                          }
                        `}
                      >
                        {selectedReferences.includes(item.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Taste Profile Warning */}
          {!hasTasteProfile && (
            <div className="p-4 bg-[var(--folio-offwhite)] border border-[var(--folio-border)]">
              <p className="text-sm text-[var(--folio-text-secondary)]">
                No taste profile detected. Generation will use general best
                practices. Save and analyze more content to develop your
                personal taste signature.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="btn btn-primary w-full"
          >
            {loading ? 'Generating...' : 'Generate Variants'}
          </button>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="w-1/2 p-8 overflow-auto bg-white">
        {variants.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[var(--folio-text-muted)]">
              Generated variants will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm uppercase tracking-widest text-[var(--folio-text-muted)]">
                {variants.length} Variants Generated
              </h2>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-sm text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)]"
              >
                Regenerate
              </button>
            </div>

            {variants.map((variant, index) => (
              <VariantCard key={index} variant={variant} index={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VariantCard({
  variant,
  index,
}: {
  variant: GeneratedVariant
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const alignmentScore = (variant.performanceScore + variant.tasteScore) / 2

  return (
    <div className="card p-0">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="font-data text-xs text-[var(--folio-text-muted)]">
            {String(index).padStart(2, '0')}
          </span>
          <div className="flex-1">
            <p className="text-sm leading-relaxed mb-4">{variant.text}</p>

            {/* Score bars */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--folio-text-muted)] w-20 uppercase tracking-wider">
                  Perform
                </span>
                <div className="flex-1 score-bar">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${variant.performanceScore}%` }}
                  />
                </div>
                <span className="font-data text-xs w-8 text-right">
                  {variant.performanceScore.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--folio-text-muted)] w-20 uppercase tracking-wider">
                  Taste
                </span>
                <div className="flex-1 score-bar">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${variant.tasteScore}%` }}
                  />
                </div>
                <span className="font-data text-xs w-8 text-right">
                  {variant.tasteScore.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--folio-border)]">
                <span className="text-xs text-[var(--folio-text-muted)] w-20 uppercase tracking-wider">
                  Align
                </span>
                <div className="flex-1 score-bar">
                  <div
                    className="score-bar-fill bg-[var(--folio-accent)]"
                    style={{ width: `${alignmentScore}%` }}
                  />
                </div>
                <span className="font-data text-xs w-8 text-right">
                  {alignmentScore.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable rationale */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs text-[var(--folio-text-muted)] border-t border-[var(--folio-border)] hover:bg-[var(--folio-offwhite)] text-left"
      >
        {expanded ? 'Hide rationale' : 'Show rationale'}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-xs text-[var(--folio-text-secondary)] space-y-2">
          <div>
            <span className="uppercase tracking-wider text-[var(--folio-text-muted)]">
              Performance:{' '}
            </span>
            {variant.performanceRationale}
          </div>
          <div>
            <span className="uppercase tracking-wider text-[var(--folio-text-muted)]">
              Taste:{' '}
            </span>
            {variant.tasteRationale}
          </div>
        </div>
      )}
    </div>
  )
}
