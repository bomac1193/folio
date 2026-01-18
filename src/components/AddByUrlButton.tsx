'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, type Platform, type ContentType } from '@/lib/types'

interface VideoMetadata {
  title: string
  url: string
  platform: Platform
  contentType: ContentType
  thumbnail: string | null
  views: number | null
  likes: number | null
  comments: number | null
  engagement: number | null
  videoId: string | null
  channelSubscribers: number | null
  publishedAt: string | null
  viewsPerDay: number | null
  viralVelocity: number | null
  ageInDays: number | null
}

export default function AddByUrlButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setUrl('')
    setError('')
    setMetadata(null)
    setTitle('')
    setNotes('')
    setLoading(false)
    setSaving(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    reset()
  }

  const handleFetchMetadata = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError('')
    setMetadata(null)

    try {
      const res = await fetch('/api/collections/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch metadata')
        return
      }

      setMetadata(data)
      setTitle(data.title || '')
    } catch {
      setError('Failed to fetch metadata')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!metadata) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || metadata.title || 'Untitled',
          url: metadata.url,
          platform: metadata.platform,
          contentType: metadata.contentType,
          thumbnail: metadata.thumbnail,
          views: metadata.views,
          engagement: metadata.engagement,
          notes: notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }

      // Trigger analysis in background
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: data.id }),
      }).catch(() => {})

      handleClose()
      router.refresh()
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !metadata && !loading) {
      handleFetchMetadata()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs bg-[var(--folio-black)] text-white px-4 py-1.5 hover:bg-[var(--folio-black)]/90 transition-colors"
      >
        + Add URL
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-white w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-normal">Add by URL</h2>
                <button
                  onClick={handleClose}
                  className="text-[var(--folio-text-muted)] hover:text-[var(--folio-black)] text-xl"
                >
                  &times;
                </button>
              </div>

              {!metadata ? (
                // URL Input Step
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                    Video URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste YouTube, TikTok, Instagram, or Twitter URL..."
                    className="w-full px-3 py-2 border border-[var(--folio-border)] text-sm focus:outline-none focus:border-[var(--folio-black)]"
                    autoFocus
                  />
                  <p className="text-xs text-[var(--folio-text-muted)] mt-2">
                    Supports YouTube, TikTok, Instagram Reels, Twitter/X, Twitch, SoundCloud, Bandcamp, Mixcloud
                  </p>

                  {error && (
                    <p className="text-sm text-red-600 mt-4">{error}</p>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleFetchMetadata}
                      disabled={loading || !url.trim()}
                      className="btn btn-primary flex-1"
                    >
                      {loading ? 'Fetching...' : 'Fetch'}
                    </button>
                    <button
                      onClick={handleClose}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Preview & Save Step
                <div>
                  {/* Thumbnail */}
                  {metadata.thumbnail && (
                    <div className="aspect-video bg-[var(--folio-offwhite)] mb-4 overflow-hidden">
                      <img
                        src={metadata.thumbnail}
                        alt={title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Editable Title */}
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title..."
                      className="w-full px-3 py-2 border border-[var(--folio-border)] text-sm focus:outline-none focus:border-[var(--folio-black)]"
                    />
                  </div>

                  {/* Platform & Type */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                        Platform
                      </label>
                      <span className="platform-badge">
                        {PLATFORM_LABELS[metadata.platform] || metadata.platform}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                        Type
                      </label>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700">
                        {CONTENT_TYPE_LABELS[metadata.contentType] || metadata.contentType}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  {(metadata.views || metadata.likes || metadata.comments) && (
                    <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-[var(--folio-offwhite)]">
                      {metadata.views !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Views
                          </label>
                          <span className="text-sm font-medium">
                            {metadata.views.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {metadata.likes !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Likes
                          </label>
                          <span className="text-sm font-medium">
                            {metadata.likes.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {metadata.comments !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Comments
                          </label>
                          <span className="text-sm font-medium">
                            {metadata.comments.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {metadata.engagement !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Engagement
                          </label>
                          <span className="text-sm font-medium">
                            {metadata.engagement.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {metadata.viralVelocity !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Viral Score
                          </label>
                          <span className="text-sm font-medium">
                            {Math.round(metadata.viralVelocity)}
                          </span>
                        </div>
                      )}
                      {metadata.ageInDays !== null && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
                            Age
                          </label>
                          <span className="text-sm font-medium">
                            {metadata.ageInDays}d
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL */}
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                      URL
                    </label>
                    <p className="text-xs text-[var(--folio-text-secondary)] truncate">
                      {metadata.url}
                    </p>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-[var(--folio-border)] text-sm focus:outline-none focus:border-[var(--folio-black)] resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn btn-primary flex-1"
                    >
                      {saving ? 'Saving...' : 'Save & Analyze'}
                    </button>
                    <button
                      onClick={() => {
                        setMetadata(null)
                        setError('')
                      }}
                      className="btn btn-secondary"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
