'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Collection } from '@prisma/client'
import { PLATFORM_LABELS, type Platform, type PerformanceDNA, type AestheticDNA } from '@/lib/types'

interface CollectionCardProps {
  collection: Collection
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const performanceDNA: PerformanceDNA | null = collection.performanceDNA
    ? JSON.parse(collection.performanceDNA)
    : null
  const aestheticDNA: AestheticDNA | null = collection.aestheticDNA
    ? JSON.parse(collection.aestheticDNA)
    : null

  // Use real viral velocity if available, otherwise fall back to AI prediction
  const performanceScore = collection.viralVelocity ?? performanceDNA?.predictedScore ?? 0
  const tasteScore = aestheticDNA?.tasteScore ?? 0

  // Check if we have real API data
  const hasRealData = collection.viralVelocity !== null

  return (
    <div
      className="card p-0 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[var(--folio-offwhite)]">
        {collection.thumbnail ? (
          <Image
            src={collection.thumbnail}
            alt={collection.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-[var(--folio-text-muted)] uppercase tracking-wider">
              No thumbnail
            </span>
          </div>
        )}

        {/* Platform badge */}
        <div className="absolute top-3 left-3">
          <span className="platform-badge">
            {PLATFORM_LABELS[collection.platform as Platform]}
          </span>
        </div>

        {/* Hover overlay with metrics and DNA summary */}
        {isHovered && (hasRealData || performanceDNA || aestheticDNA) && (
          <div className="absolute inset-0 bg-[var(--folio-black)]/90 p-4 flex flex-col justify-end">
            <div className="text-white text-xs space-y-2">
              {/* Real metrics from API */}
              {hasRealData && (
                <>
                  <div className="flex justify-between">
                    <span className="text-white/60 uppercase tracking-wider">Views/Day</span>
                    <span className="font-data">{formatViews(collection.viewsPerDay ?? 0)}</span>
                  </div>
                  {collection.growthRate != null && (
                    <div className="flex justify-between">
                      <span className="text-white/60 uppercase tracking-wider">Growth</span>
                      <span className={`font-data ${collection.growthRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {collection.growthRate > 0 ? '+' : ''}{(collection.growthRate ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {collection.channelSubscribers && (
                    <div className="flex justify-between">
                      <span className="text-white/60 uppercase tracking-wider">Channel</span>
                      <span className="font-data">{formatViews(collection.channelSubscribers)} subs</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 my-2" />
                </>
              )}
              {/* AI analysis */}
              {performanceDNA && (
                <div>
                  <span className="text-white/60 uppercase tracking-wider">Hooks:</span>{' '}
                  {performanceDNA.hooks.slice(0, 2).join(', ')}
                </div>
              )}
              {aestheticDNA && (
                <div>
                  <span className="text-white/60 uppercase tracking-wider">Tone:</span>{' '}
                  {aestheticDNA.tone.slice(0, 2).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-normal leading-snug mb-3 line-clamp-2">
          {collection.title}
        </h3>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs text-[var(--folio-text-muted)]">
          {collection.views && (
            <span className="font-data">
              {formatViews(collection.views)} views
            </span>
          )}
          {collection.likes && (
            <span className="font-data">
              {formatViews(collection.likes)} likes
            </span>
          )}
          {collection.engagement && (
            <span className="font-data">
              {collection.engagement.toFixed(1)}% eng
            </span>
          )}
          {hasRealData && (
            <span className="text-green-600 text-[10px] uppercase tracking-wider">
              Live
            </span>
          )}
        </div>

        {/* Score bars */}
        {(performanceScore > 0 || tasteScore > 0) && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--folio-text-muted)] w-20 uppercase tracking-wider" title={hasRealData ? 'Based on real API data' : 'AI prediction'}>
                {hasRealData ? 'Viral' : 'Perform'}
              </span>
              <div className="flex-1 score-bar">
                <div
                  className={`score-bar-fill ${hasRealData ? 'bg-green-600' : ''}`}
                  style={{ width: `${Math.min(performanceScore, 100)}%` }}
                />
              </div>
              <span className="font-data text-xs w-8 text-right">
                {performanceScore.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--folio-text-muted)] w-20 uppercase tracking-wider">
                Taste
              </span>
              <div className="flex-1 score-bar">
                <div
                  className="score-bar-fill"
                  style={{ width: `${tasteScore}%` }}
                />
              </div>
              <span className="font-data text-xs w-8 text-right">
                {tasteScore.toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M'
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K'
  }
  return views.toString()
}
