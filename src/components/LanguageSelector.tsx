'use client'

import { useState, useEffect } from 'react'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
]

const STORAGE_KEY = 'folio-preferred-language'

export function usePreferredLanguage() {
  const [language, setLanguageState] = useState<string>('en')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setLanguageState(stored)
    }
    setIsLoaded(true)
  }, [])

  const setLanguage = (lang: string) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return { language, setLanguage, isLoaded }
}

export function getLanguageName(code: string): string {
  return LANGUAGES.find(l => l.code === code)?.name || code
}

interface LanguageSelectorProps {
  value: string
  onChange: (lang: string) => void
  compact?: boolean
}

export default function LanguageSelector({ value, onChange, compact = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLang = LANGUAGES.find(l => l.code === value) || LANGUAGES[0]

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs px-3 py-1.5 border border-[var(--folio-border)] hover:border-[var(--folio-black)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span>{selectedLang.name}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-[var(--folio-border)] shadow-lg max-h-64 overflow-y-auto min-w-[160px]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onChange(lang.code)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--folio-offwhite)] ${
                    value === lang.code ? 'bg-[var(--folio-offwhite)] font-medium' : ''
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[var(--folio-text-secondary)] mb-2">
        Output Language
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[var(--folio-border)] text-sm focus:outline-none focus:border-[var(--folio-black)] bg-white"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Export languages for other components
export { LANGUAGES }
