'use client'

import { PLATFORM_LABELS, type Platform } from '@/lib/types'

interface TasteProfileViewProps {
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
  }
  platformCounts: Record<string, number>
  dateRange: { oldest: number; newest: number } | null
}

export default function TasteProfileView({
  tasteProfile,
  platformCounts,
  dateRange,
}: TasteProfileViewProps) {
  const { performancePatterns, aestheticPatterns, voiceSignature } = tasteProfile

  return (
    <div className="p-8 max-w-4xl">
      {/* Taste Signature */}
      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
          Taste Signature
        </h2>
        <div className="card">
          {aestheticPatterns ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Dominant Tones
                </h3>
                <div className="flex flex-wrap gap-2">
                  {aestheticPatterns.dominantTones.map((tone) => (
                    <span key={tone} className="platform-badge">
                      {tone}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Style Markers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {aestheticPatterns.styleMarkers.map((marker) => (
                    <span key={marker} className="platform-badge">
                      {marker}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--folio-border)]">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                    Voice
                  </h3>
                  <p className="text-sm">{aestheticPatterns.voiceSignature}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                    Complexity
                  </h3>
                  <p className="text-sm capitalize">{aestheticPatterns.complexityPreference}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--folio-text-muted)]">
              Not enough data to generate taste signature.
            </p>
          )}
        </div>
      </section>

      {/* Performance Intelligence */}
      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
          Performance Intelligence
        </h2>
        <div className="card">
          {performancePatterns ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Top Performing Hooks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {performancePatterns.topHooks.map((hook) => (
                    <span key={hook} className="platform-badge">
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Preferred Structures
                </h3>
                <div className="flex flex-wrap gap-2">
                  {performancePatterns.preferredStructures.map((structure) => (
                    <span key={structure} className="platform-badge">
                      {structure}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Common Keywords
                </h3>
                <p className="text-sm font-data">
                  {performancePatterns.commonKeywords.slice(0, 8).join(', ')}
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--folio-border)]">
                <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-3">
                  Sentiment Profile
                </h3>
                <div className="space-y-2">
                  {Object.entries(performancePatterns.sentimentProfile)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sentiment, count]) => {
                      const total = Object.values(performancePatterns.sentimentProfile).reduce(
                        (a, b) => a + b,
                        0
                      )
                      const percentage = (count / total) * 100
                      return (
                        <div key={sentiment} className="flex items-center gap-3">
                          <span className="text-xs w-24 capitalize">{sentiment}</span>
                          <div className="flex-1 score-bar">
                            <div
                              className="score-bar-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="font-data text-xs w-12 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--folio-text-muted)]">
              Not enough data to generate performance intelligence.
            </p>
          )}
        </div>
      </section>

      {/* Voice Fingerprint */}
      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
          Voice Fingerprint
        </h2>
        <div className="card">
          {voiceSignature ? (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-2">
                  Sentence Patterns
                </h3>
                <ul className="text-sm space-y-1">
                  {voiceSignature.sentencePatterns.map((pattern) => (
                    <li key={pattern}>{pattern}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-2">
                  Vocabulary Level
                </h3>
                <p className="text-sm capitalize">{voiceSignature.vocabularyLevel}</p>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-2">
                  Rhetorical Devices
                </h3>
                <ul className="text-sm space-y-1">
                  {voiceSignature.rhetoricalDevices.map((device) => (
                    <li key={device}>{device}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--folio-text-muted)]">
              Not enough data to generate voice fingerprint.
            </p>
          )}
        </div>
      </section>

      {/* Collection Metrics */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
          Collection Metrics
        </h2>
        <div className="card">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                Total Items
              </h3>
              <p className="font-data text-2xl">{tasteProfile.itemCount}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                Platforms
              </h3>
              <p className="font-data text-2xl">{Object.keys(platformCounts).length}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                Date Range
              </h3>
              {dateRange ? (
                <p className="font-data text-sm">
                  {new Date(dateRange.oldest).toLocaleDateString()} -{' '}
                  {new Date(dateRange.newest).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-[var(--folio-text-muted)]">—</p>
              )}
            </div>
          </div>

          {/* Platform breakdown */}
          {Object.keys(platformCounts).length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--folio-border)]">
              <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-3">
                Platform Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(platformCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => {
                    const total = Object.values(platformCounts).reduce((a, b) => a + b, 0)
                    const percentage = (count / total) * 100
                    return (
                      <div key={platform} className="flex items-center gap-3">
                        <span className="text-xs w-32">
                          {PLATFORM_LABELS[platform as Platform] || platform}
                        </span>
                        <div className="flex-1 score-bar">
                          <div
                            className="score-bar-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="font-data text-xs w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="mt-6 pt-6 border-t border-[var(--folio-border)]">
            <button className="btn btn-secondary text-xs">
              Export as JSON
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
