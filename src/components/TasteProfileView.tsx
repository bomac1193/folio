'use client'

import { useState } from 'react'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

interface TasteProfileViewProps {
  tasteProfile: {
    performancePatterns: {
      topHooks: string[]
      preferredStructures: string[]
      commonKeywords: string[]
      sentimentProfile: Record<string, number>
      formats?: Record<string, number>
      niches?: string[]
      targetAudiences?: string[]
    } | null
    aestheticPatterns: {
      dominantTones: string[]
      avoidTones?: string[]
      voiceSignature: string
      complexityPreference: string
      styleMarkers: string[]
      emotionalTriggers?: string[]
      pacing?: string
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
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null)

  const handleRebuildProfile = async () => {
    setIsRebuilding(true)
    setRebuildStatus('Analyzing collection items...')

    try {
      const res = await fetch('/api/taste-profile/rebuild', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setRebuildStatus(`Analyzed ${data.itemsAnalyzed} items. Refreshing...`)
        // Reload the page to show new data
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        const error = await res.json()
        setRebuildStatus(`Error: ${error.error}`)
      }
    } catch (error) {
      setRebuildStatus('Failed to rebuild profile')
    } finally {
      setIsRebuilding(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Rebuild Profile Banner */}
      <section className="mb-8">
        <div className="card bg-[var(--folio-bg-secondary)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium mb-1">Rebuild Profile from Collection</h3>
              <p className="text-xs text-[var(--folio-text-muted)]">
                Re-analyze all {tasteProfile.itemCount} items to update keywords, sentiments, formats, and niches
              </p>
            </div>
            <button
              onClick={handleRebuildProfile}
              disabled={isRebuilding}
              className="btn btn-primary text-xs"
            >
              {isRebuilding ? 'Rebuilding...' : 'Rebuild Profile'}
            </button>
          </div>
          {rebuildStatus && (
            <p className="mt-3 text-xs text-[var(--folio-text-muted)]">{rebuildStatus}</p>
          )}
        </div>
      </section>

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
                  {aestheticPatterns.dominantTones.length > 0 ? (
                    aestheticPatterns.dominantTones.map((tone) => (
                      <span key={tone} className="platform-badge">
                        {tone}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--folio-text-muted)]">Rebuild to analyze tones</span>
                  )}
                </div>
              </div>
              {aestheticPatterns.avoidTones && aestheticPatterns.avoidTones.length > 0 && (
                <div>
                  <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                    Tones to Avoid
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aestheticPatterns.avoidTones.map((tone) => (
                      <span key={tone} className="platform-badge bg-red-500/10 text-red-400 border-red-500/20">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {aestheticPatterns.emotionalTriggers && aestheticPatterns.emotionalTriggers.length > 0 && (
                <div>
                  <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                    Emotional Triggers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aestheticPatterns.emotionalTriggers.map((trigger) => (
                      <span key={trigger} className="platform-badge bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Style Markers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {aestheticPatterns.styleMarkers.length > 0 ? (
                    aestheticPatterns.styleMarkers.map((marker) => (
                      <span key={marker} className="platform-badge">
                        {marker}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--folio-text-muted)]">Rebuild to analyze styles</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-[var(--folio-border)]">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                    Voice
                  </h3>
                  <p className="text-sm">{aestheticPatterns.voiceSignature || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                    Complexity
                  </h3>
                  <p className="text-sm capitalize">{aestheticPatterns.complexityPreference || 'Unknown'}</p>
                </div>
                {aestheticPatterns.pacing && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                      Pacing
                    </h3>
                    <p className="text-sm capitalize">{aestheticPatterns.pacing}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--folio-text-muted)]">
              Click &quot;Rebuild Profile&quot; to analyze your collection.
            </p>
          )}
        </div>
      </section>

      {/* Content Formats & Niches */}
      {performancePatterns && (performancePatterns.formats || performancePatterns.niches) && (
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
            Content Formats & Niches
          </h2>
          <div className="card">
            <div className="space-y-6">
              {performancePatterns.formats && Object.keys(performancePatterns.formats).length > 0 && (
                <div>
                  <h3 className="text-sm text-[var(--folio-text-secondary)] mb-3">
                    Preferred Formats
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(performancePatterns.formats)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([format, count]) => {
                        const total = Object.values(performancePatterns.formats!).reduce((a, b) => a + b, 0)
                        const percentage = (count / total) * 100
                        return (
                          <div key={format} className="flex items-center gap-3">
                            <span className="text-xs w-32 capitalize">{format.replace(/-/g, ' ')}</span>
                            <div className="flex-1 score-bar">
                              <div
                                className="score-bar-fill bg-blue-500"
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
              )}
              {performancePatterns.niches && performancePatterns.niches.length > 0 && (
                <div className="pt-4 border-t border-[var(--folio-border)]">
                  <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                    Your Niches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {performancePatterns.niches.map((niche) => (
                      <span key={niche} className="platform-badge bg-green-500/10 text-green-400 border-green-500/20">
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {performancePatterns.targetAudiences && performancePatterns.targetAudiences.length > 0 && (
                <div className="pt-4 border-t border-[var(--folio-border)]">
                  <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                    Target Audiences
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {performancePatterns.targetAudiences.map((audience) => (
                      <span key={audience} className="platform-badge">
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
                  {performancePatterns.topHooks.length > 0 ? (
                    performancePatterns.topHooks.map((hook) => (
                      <span key={hook} className="platform-badge">
                        {hook}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--folio-text-muted)]">Rebuild to analyze hooks</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Preferred Structures
                </h3>
                <div className="flex flex-wrap gap-2">
                  {performancePatterns.preferredStructures.length > 0 ? (
                    performancePatterns.preferredStructures.map((structure) => (
                      <span key={structure} className="platform-badge">
                        {structure}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--folio-text-muted)]">Rebuild to analyze structures</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm text-[var(--folio-text-secondary)] mb-2">
                  Common Keywords
                </h3>
                {performancePatterns.commonKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {performancePatterns.commonKeywords.slice(0, 15).map((keyword) => (
                      <span key={keyword} className="text-xs px-2 py-1 bg-[var(--folio-bg-secondary)] rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[var(--folio-text-muted)]">Rebuild to extract keywords</span>
                )}
              </div>
              {Object.keys(performancePatterns.sentimentProfile).length > 0 && (
                <div className="pt-4 border-t border-[var(--folio-border)]">
                  <h3 className="text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-3">
                    Sentiment Profile
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(performancePatterns.sentimentProfile)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([sentiment, count]) => {
                        const total = Object.values(performancePatterns.sentimentProfile).reduce(
                          (a, b) => a + b,
                          0
                        )
                        const percentage = (count / total) * 100
                        return (
                          <div key={sentiment} className="flex items-center gap-3">
                            <span className="text-xs w-28 capitalize">{sentiment}</span>
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
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--folio-text-muted)]">
              Click &quot;Rebuild Profile&quot; to analyze your collection.
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
              Click &quot;Rebuild Profile&quot; to analyze your collection.
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
                  {new Date(dateRange.oldest).toLocaleDateString('en-US')} -{' '}
                  {new Date(dateRange.newest).toLocaleDateString('en-US')}
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
