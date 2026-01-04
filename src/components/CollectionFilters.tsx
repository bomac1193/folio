'use client'

import { useState } from 'react'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/types'

export default function CollectionFilters() {
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState<string>('all')

  return (
    <div className="px-8 py-4 border-b border-[var(--folio-border)] bg-white">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlatform('all')}
            className={`
              px-3 py-1.5 text-xs uppercase tracking-wider
              ${platform === 'all'
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
              onClick={() => setPlatform(value)}
              className={`
                px-3 py-1.5 text-xs uppercase tracking-wider
                ${platform === value
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
