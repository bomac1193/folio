'use client'

import { useEffect, useCallback } from 'react'
import type { Collection } from '@prisma/client'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

interface VideoPlayerModalProps {
  collection: Collection
  onClose: () => void
}

export default function VideoPlayerModal({ collection, onClose }: VideoPlayerModalProps) {
  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const embedUrl = getEmbedUrl(collection)
  const canEmbed = !!embedUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white text-2xl bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        ×
      </button>

      {/* Main content */}
      <div className="w-full max-w-5xl mx-4 flex flex-col lg:flex-row gap-6">
        {/* Video player */}
        <div className="flex-1">
          {canEmbed ? (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="eager"
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center">
              {collection.thumbnail && (
                <img
                  src={collection.thumbnail}
                  alt={collection.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              )}
              <div className="relative z-10 text-center p-8">
                <p className="text-white/60 text-sm mb-4">
                  {PLATFORM_LABELS[collection.platform as Platform]} videos cannot be embedded
                </p>
                <a
                  href={collection.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
                >
                  Watch on {PLATFORM_LABELS[collection.platform as Platform]}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Video info sidebar */}
        <div className="lg:w-80 text-white">
          <div className="bg-white/5 rounded-lg p-5">
            {/* Platform badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 bg-white/10 rounded uppercase tracking-wider">
                {PLATFORM_LABELS[collection.platform as Platform]}
              </span>
              {collection.contentType && collection.contentType !== 'VIDEO' && (
                <span className="text-xs px-2 py-1 bg-white/10 rounded uppercase tracking-wider">
                  {collection.contentType}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg font-medium mb-4 leading-snug">
              {collection.title}
            </h2>

            {/* Stats */}
            <div className="space-y-2 text-sm">
              {collection.views && (
                <div className="flex justify-between">
                  <span className="text-white/50">Views</span>
                  <span className="font-mono">{collection.views.toLocaleString()}</span>
                </div>
              )}
              {collection.likes && (
                <div className="flex justify-between">
                  <span className="text-white/50">Likes</span>
                  <span className="font-mono">{collection.likes.toLocaleString()}</span>
                </div>
              )}
              {collection.engagement && (
                <div className="flex justify-between">
                  <span className="text-white/50">Engagement</span>
                  <span className="font-mono">{collection.engagement.toFixed(2)}%</span>
                </div>
              )}
              {collection.viralVelocity && (
                <div className="flex justify-between">
                  <span className="text-white/50">Viral Score</span>
                  <span className="font-mono">{Math.round(collection.viralVelocity)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {collection.notes && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-white/80">{collection.notes}</p>
              </div>
            )}

            {/* Open original link */}
            <div className="mt-6">
              <a
                href={collection.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm transition-colors"
              >
                Open Original
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Click backdrop to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}

function getEmbedUrl(collection: Collection): string | null {
  const { platform, url, videoId } = collection

  if (!url) return null

  switch (platform) {
    case 'YOUTUBE_LONG':
    case 'YOUTUBE_SHORT': {
      // Extract video ID if not stored
      let vid = videoId
      if (!vid) {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        vid = match?.[1] || null
      }
      if (vid) {
        // Use youtube-nocookie for privacy and faster loading
        return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`
      }
      return null
    }

    case 'TIKTOK': {
      // TikTok embed - extract video ID
      let vid = videoId
      if (!vid) {
        const match = url.match(/\/video\/(\d+)/)
        vid = match?.[1] || null
      }
      if (vid) {
        return `https://www.tiktok.com/embed/v2/${vid}`
      }
      return null
    }

    case 'TWITCH': {
      // Twitch supports clip and video embeds
      if (url.includes('/clip/')) {
        const match = url.match(/\/clip\/([a-zA-Z0-9_-]+)/)
        if (match) {
          return `https://clips.twitch.tv/embed?clip=${match[1]}&parent=${window.location.hostname}`
        }
      } else if (url.includes('/videos/')) {
        const match = url.match(/\/videos\/(\d+)/)
        if (match) {
          return `https://player.twitch.tv/?video=${match[1]}&parent=${window.location.hostname}&autoplay=true`
        }
      } else {
        // Live channel
        const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
        if (match) {
          return `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}&autoplay=true`
        }
      }
      return null
    }

    case 'SOUNDCLOUD': {
      // SoundCloud embed via widget
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=true`
    }

    case 'MIXCLOUD': {
      // Mixcloud embed
      const path = url.replace('https://www.mixcloud.com', '').replace('https://mixcloud.com', '')
      if (path) {
        return `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(path)}&autoplay=1`
      }
      return null
    }

    // These platforms don't support easy embedding
    case 'INSTAGRAM_REEL':
    case 'TWITTER':
    case 'LINKEDIN':
    case 'BANDCAMP':
    default:
      return null
  }
}
