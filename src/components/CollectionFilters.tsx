'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/types'

export default function CollectionFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPlatform = searchParams.get('platform') || 'all'
  const currentSearch = searchParams.get('search') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="px-8 py-4 border-b border-[var(--folio-border)] bg-white">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search collection..."
            defaultValue={currentSearch}
            onChange={(e) => {
              // Debounce search
              const value = e.target.value
              setTimeout(() => updateFilter('search', value), 300)
            }}
            className="w-full"
          />
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateFilter('platform', 'all')}
            className={`
              px-3 py-1.5 text-xs uppercase tracking-wider transition-colors
              ${currentPlatform === 'all'
                ? 'bg-[var(--folio-black)] text-white'
                : 'bg-[var(--folio-offwhite)] text-[var(--folio-text-secondary)] hover:bg-[var(--folio-border)]'
              }
            `}
          >
            All
          </button>
          {Object.entries(PLATFORMS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => updateFilter('platform', value)}
              className={`
                px-3 py-1.5 text-xs uppercase tracking-wider transition-colors
                ${currentPlatform === value
                  ? 'bg-[var(--folio-black)] text-white'
                  : 'bg-[var(--folio-offwhite)] text-[var(--folio-text-secondary)] hover:bg-[var(--folio-border)]'
                }
              `}
            >
              {PLATFORM_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
