'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Collection } from '@prisma/client'
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, type Platform, type ContentType, type PerformanceDNA, type AestheticDNA } from '@/lib/types'

interface CollectionCardProps {
  collection: Collection
  onPlay?: () => void
  translatedTitle?: string
  targetLanguage?: string
}

export default function CollectionCard({ collection, onPlay, translatedTitle, targetLanguage }: CollectionCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger play if clicking delete button
    if ((e.target as HTMLElement).closest('button')) return
    onPlay?.()
  }

  return (
    <div
      className="card p-0 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
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

        {/* Platform & Content Type badges */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <span className="platform-badge">
            {PLATFORM_LABELS[collection.platform as Platform]}
          </span>
          {collection.contentType && collection.contentType !== 'VIDEO' && (
            <span className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${
              collection.contentType === 'LIVE_STREAM' ? 'bg-red-500 text-white' :
              collection.contentType === 'CLIP' ? 'bg-purple-500 text-white' :
              collection.contentType === 'TRACK' ? 'bg-orange-500 text-white' :
              collection.contentType === 'MIX' ? 'bg-blue-500 text-white' :
              collection.contentType === 'RELEASE' ? 'bg-green-500 text-white' :
              collection.contentType === 'POST' ? 'bg-gray-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {CONTENT_TYPE_LABELS[collection.contentType as ContentType] || collection.contentType}
            </span>
          )}
        </div>

        {/* Play button overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Hover overlay with metrics and DNA summary */}
        {isHovered && (hasRealData || performanceDNA || aestheticDNA) && (
          <div className="absolute inset-0 bg-[var(--folio-black)]/90 p-4 pt-12 flex flex-col justify-end pointer-events-none">
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

        {/* Delete button - rendered after overlay so it's on top */}
        {isHovered && (
          <button
            onClick={handleDelete}
            onMouseLeave={() => setShowConfirm(false)}
            disabled={isDeleting}
            className={`absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center text-white text-sm font-medium transition-all ${
              showConfirm
                ? 'bg-red-600 hover:bg-red-700 rounded px-2 w-auto'
                : 'bg-black/60 hover:bg-red-600 rounded-full'
            }`}
          >
            {isDeleting ? '...' : showConfirm ? 'Delete?' : '×'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-normal leading-snug mb-3 line-clamp-2">
          {translatedTitle || collection.title}
        </h3>
        {translatedTitle && (
          <p className="text-xs text-[var(--folio-text-muted)] mb-2 line-clamp-1 italic">
            Original: {collection.title}
          </p>
        )}

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
