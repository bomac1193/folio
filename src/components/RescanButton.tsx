'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RescanButton() {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<{ updated: number; total: number; type: string } | null>(null)

  const handleRescan = async () => {
    setScanning(true)
    setResult(null)

    try {
      const res = await fetch('/api/collections/rescan', {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ updated: data.updated, total: data.total, type: 'thumbnails' })
        router.refresh()
      }
    } catch {
      // Ignore errors
    } finally {
      setScanning(false)
    }
  }

  const handleRefreshMetrics = async () => {
    setRefreshing(true)
    setResult(null)

    try {
      const res = await fetch('/api/collections/refresh-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ updated: data.updated, total: data.total, type: 'metrics' })
        router.refresh()
      }
    } catch {
      // Ignore errors
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-[var(--folio-text-muted)]">
          {result.type === 'metrics' ? 'Metrics' : 'Thumbnails'}: {result.updated}/{result.total}
        </span>
      )}
      <button
        onClick={handleRefreshMetrics}
        disabled={refreshing || scanning}
        className="text-xs text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)] border border-[var(--folio-border)] px-3 py-1.5 hover:border-[var(--folio-black)] transition-colors"
      >
        {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
      </button>
      <button
        onClick={handleRescan}
        disabled={scanning || refreshing}
        className="text-xs text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)] border border-[var(--folio-border)] px-3 py-1.5 hover:border-[var(--folio-black)] transition-colors"
      >
        {scanning ? 'Scanning...' : 'Rescan Thumbnails'}
      </button>
    </div>
  )
}
