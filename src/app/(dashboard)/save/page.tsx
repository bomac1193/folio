'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

export default function SavePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const title = searchParams.get('title') || ''
  const url = searchParams.get('url') || ''
  const platform = searchParams.get('platform') as Platform || 'YOUTUBE_LONG'
  const thumbnail = searchParams.get('thumbnail') || ''
  const views = searchParams.get('views') || ''
  const notes = searchParams.get('notes') || ''

  useEffect(() => {
    if (!title) {
      router.push('/dashboard')
    }
  }, [title, router])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url,
          platform,
          thumbnail: thumbnail || null,
          views: views ? parseInt(views) : null,
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

      setSaved(true)

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl mb-2">Saved to Collection</h1>
          <p className="text-sm text-[var(--folio-text-muted)]">
            AI analysis running in background...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-xl font-normal">Save to Collection</h1>
          <p className="text-sm text-[var(--folio-text-muted)] mt-1">
            From browser extension
          </p>
        </header>

        <div className="card">
          {/* Thumbnail */}
          {thumbnail && (
            <div className="aspect-video bg-[var(--folio-offwhite)] mb-6 overflow-hidden">
              <img
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
              Title
            </label>
            <p className="text-sm">{title}</p>
          </div>

          {/* Platform & URL */}
          <div className="flex gap-8 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                Platform
              </label>
              <span className="platform-badge">
                {PLATFORM_LABELS[platform] || platform}
              </span>
            </div>
            {views && (
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                  Views
                </label>
                <p className="text-sm font-data">{parseInt(views).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* URL */}
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
              URL
            </label>
            <p className="text-xs text-[var(--folio-text-secondary)] truncate">
              {url}
            </p>
          </div>

          {/* Notes */}
          {notes && (
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-2">
                Note
              </label>
              <p className="text-sm">{notes}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Saving...' : 'Save & Analyze'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
