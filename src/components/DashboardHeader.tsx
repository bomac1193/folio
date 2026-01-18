'use client'

import { useEffect, useState } from 'react'
import AddByUrlButton from './AddByUrlButton'
import RescanButton from './RescanButton'
import CollectionStats from './CollectionStats'
import LanguageSelector, { usePreferredLanguage } from './LanguageSelector'

interface DashboardHeaderProps {
  itemCount: string
  stats: {
    totalItems: number
    avgPerformance: number
    platforms: number
  }
  onLanguageChange?: (lang: string) => void
}

export default function DashboardHeader({ itemCount, stats, onLanguageChange }: DashboardHeaderProps) {
  const { language, setLanguage, isLoaded } = usePreferredLanguage()
  const [showLanguageToast, setShowLanguageToast] = useState(false)

  useEffect(() => {
    if (isLoaded && onLanguageChange) {
      onLanguageChange(language)
    }
  }, [language, isLoaded, onLanguageChange])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    onLanguageChange?.(lang)
    setShowLanguageToast(true)
    setTimeout(() => setShowLanguageToast(false), 2000)
  }

  return (
    <header className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-normal">Collection</h1>
          <p className="text-sm text-[var(--folio-text-muted)] mt-1">
            {itemCount}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isLoaded && (
            <LanguageSelector
              value={language}
              onChange={handleLanguageChange}
              compact
            />
          )}
          <AddByUrlButton />
          <RescanButton />
          <CollectionStats stats={stats} />
        </div>
      </div>

      {/* Language change toast */}
      {showLanguageToast && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-[var(--folio-black)] text-white text-sm rounded shadow-lg z-50 animate-fade-in">
          Titles will be translated to {language === 'en' ? 'English' : language}
        </div>
      )}
    </header>
  )
}
