'use client'

import { useState, useEffect, useCallback } from 'react'
import CollectionCard from './CollectionCard'
import VideoPlayerModal from './VideoPlayerModal'
import { usePreferredLanguage, getLanguageName } from './LanguageSelector'
import type { Collection } from '@prisma/client'

const TRANSLATIONS_STORAGE_KEY = 'folio-translations'
const SHOW_TRANSLATED_KEY = 'folio-show-translated'

interface StoredTranslations {
  language: string
  translations: Record<string, string>
}

interface CollectionGridProps {
  collections: Collection[]
}

// Helper to get initial state from localStorage (runs once)
function getInitialTranslations(): { translations: Record<string, string>; showTranslated: boolean; language: string | null } {
  if (typeof window === 'undefined') {
    return { translations: {}, showTranslated: false, language: null }
  }

  try {
    const stored = localStorage.getItem(TRANSLATIONS_STORAGE_KEY)
    const showStored = localStorage.getItem(SHOW_TRANSLATED_KEY)
    const langStored = localStorage.getItem('folio-preferred-language')

    let translations: Record<string, string> = {}
    let storedLang: string | null = null

    if (stored) {
      const parsed: StoredTranslations = JSON.parse(stored)
      translations = parsed.translations
      storedLang = parsed.language
    }

    return {
      translations,
      showTranslated: showStored === 'true',
      language: storedLang,
    }
  } catch (e) {
    return { translations: {}, showTranslated: false, language: null }
  }
}

export default function CollectionGrid({ collections }: CollectionGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Collection | null>(null)
  const { language, isLoaded } = usePreferredLanguage()

  // Initialize from localStorage synchronously to avoid flash
  const [initialState] = useState(() => getInitialTranslations())
  const [translations, setTranslations] = useState<Record<string, string>>(initialState.translations)
  const [translating, setTranslating] = useState(false)
  const [showTranslated, setShowTranslated] = useState(initialState.showTranslated)
  const [translationsReady, setTranslationsReady] = useState(false)

  // Validate translations match current language after hydration
  useEffect(() => {
    if (!isLoaded) return

    try {
      const stored = localStorage.getItem(TRANSLATIONS_STORAGE_KEY)
      if (stored) {
        const parsed: StoredTranslations = JSON.parse(stored)
        if (parsed.language === language) {
          setTranslations(parsed.translations)
          const showStored = localStorage.getItem(SHOW_TRANSLATED_KEY)
          setShowTranslated(showStored === 'true')
        } else {
          // Language mismatch, clear translations
          setTranslations({})
          setShowTranslated(false)
        }
      }
    } catch (e) {
      // Ignore
    }
    setTranslationsReady(true)
  }, [language, isLoaded])

  // Save translations to localStorage whenever they change
  const saveTranslations = useCallback((newTranslations: Record<string, string>, lang: string) => {
    try {
      const data: StoredTranslations = {
        language: lang,
        translations: newTranslations,
      }
      localStorage.setItem(TRANSLATIONS_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save translations:', e)
    }
  }, [])

  // Save show translated state
  const saveShowTranslated = useCallback((show: boolean) => {
    localStorage.setItem(SHOW_TRANSLATED_KEY, show.toString())
  }, [])

  // Translate all titles when language changes and user enables translation
  const translateAll = useCallback(async () => {
    if (collections.length === 0) return

    setTranslating(true)
    try {
      const titles = collections.map(c => c.title)
      const res = await fetch('/api/translate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: titles,
          targetLanguage: getLanguageName(language),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newTranslations: Record<string, string> = {}
        collections.forEach((c, i) => {
          if (data.translations[i]) {
            newTranslations[c.id] = data.translations[i]
          }
        })
        setTranslations(newTranslations)
        setShowTranslated(true)
        saveTranslations(newTranslations, language)
        saveShowTranslated(true)
      }
    } catch (error) {
      console.error('Translation failed:', error)
    } finally {
      setTranslating(false)
    }
  }, [language, collections, saveTranslations, saveShowTranslated])

  // Handle show/hide toggle
  const handleToggleTranslated = useCallback(() => {
    const newValue = !showTranslated
    setShowTranslated(newValue)
    saveShowTranslated(newValue)
  }, [showTranslated, saveShowTranslated])

  // Don't render until we've checked localStorage to avoid flash of original titles
  // Always show skeleton on first render (both server and client) for consistent hydration
  if (!translationsReady) {
    return (
      <div className="p-8">
        <div className="collection-grid border border-[var(--folio-border)]">
          {collections.map((collection) => (
            <div key={collection.id} className="card p-0 animate-pulse">
              <div className="aspect-video bg-[var(--folio-offwhite)]" />
              <div className="p-4">
                <div className="h-4 bg-[var(--folio-offwhite)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[var(--folio-offwhite)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Translation controls */}
      {isLoaded && collections.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={translateAll}
            disabled={translating}
            className="text-xs px-4 py-2 border border-[var(--folio-border)] hover:border-[var(--folio-black)] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {translating ? 'Translating...' : `Translate all to ${getLanguageName(language)}`}
          </button>
          {Object.keys(translations).length > 0 && (
            <button
              onClick={handleToggleTranslated}
              className="text-xs text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)]"
            >
              {showTranslated ? 'Show original' : 'Show translated'}
            </button>
          )}
        </div>
      )}

      <div className="collection-grid border border-[var(--folio-border)]">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onPlay={() => setSelectedVideo(collection)}
            translatedTitle={showTranslated ? translations[collection.id] : undefined}
            targetLanguage={language}
          />
        ))}
      </div>

      {/* Video player modal */}
      {selectedVideo && (
        <VideoPlayerModal
          collection={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}
