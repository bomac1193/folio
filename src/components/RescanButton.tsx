'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RescanButton() {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ updated: number; total: number } | null>(null)

  const handleRescan = async () => {
    setScanning(true)
    setResult(null)

    try {
      const res = await fetch('/api/collections/rescan', {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ updated: data.updated, total: data.total })
        router.refresh()
      }
    } catch {
      // Ignore errors
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-[var(--folio-text-muted)]">
          Updated {result.updated}/{result.total}
        </span>
      )}
      <button
        onClick={handleRescan}
        disabled={scanning}
        className="text-xs text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)] border border-[var(--folio-border)] px-3 py-1.5 hover:border-[var(--folio-black)] transition-colors"
      >
        {scanning ? 'Scanning...' : 'Rescan Metadata'}
      </button>
    </div>
  )
}
