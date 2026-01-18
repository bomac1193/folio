'use client'

import { useState, useEffect, useCallback } from 'react'
import ComparativeRatingCard from './ComparativeRatingCard'
import SingleRatingCard from './SingleRatingCard'
import TrainingProgress from './TrainingProgress'
import TrainingStats from './TrainingStats'
import type { TrainingSuggestion, TrainingPair, TrainingStats as TrainingStatsType } from '@/lib/types'

type RatingMode = 'comparative' | 'single'
type TrainingState = 'idle' | 'training' | 'stopped'

export default function TrainingInterface() {
  const [mode, setMode] = useState<RatingMode>('comparative')
  const [trainingState, setTrainingState] = useState<TrainingState>('idle')
  const [pair, setPair] = useState<TrainingPair | null>(null)
  const [singleSuggestion, setSingleSuggestion] = useState<TrainingSuggestion | null>(null)
  const [stats, setStats] = useState<TrainingStatsType | null>(null)
  const [sessionRatings, setSessionRatings] = useState(0)
  const [sessionLikes, setSessionLikes] = useState(0)
  const [sessionDislikes, setSessionDislikes] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRating, setIsRating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading...')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/training/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const fetchPair = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setLoadingMessage('Finding content for you...')
    try {
      const res = await fetch('/api/training/suggestions?mode=pair')
      if (res.ok) {
        const data = await res.json()
        if (data.pair) {
          setPair(data.pair)
        } else if (data.message) {
          setError(data.message)
        } else {
          setError('No content available. Please try again.')
        }
      } else {
        setError('Failed to load content')
      }
    } catch (err) {
      setError('Failed to load suggestions')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSingle = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setLoadingMessage('Finding content for you...')
    try {
      const res = await fetch('/api/training/suggestions?mode=list')
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions && data.suggestions.length > 0) {
          setSingleSuggestion(data.suggestions[0])
        } else {
          setError('No content available. Please try again.')
        }
      } else {
        setError('Failed to load content')
      }
    } catch (err) {
      setError('Failed to load suggestions')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Start training button handler
  const handleStartTraining = async () => {
    setTrainingState('training')
    setSessionRatings(0)
    setSessionLikes(0)
    setSessionDislikes(0)
    if (mode === 'comparative') {
      await fetchPair()
    } else {
      await fetchSingle()
    }
  }

  // Stop training button handler
  const handleStopTraining = () => {
    setTrainingState('stopped')
  }

  // Reset to idle
  const handleResetTraining = () => {
    setTrainingState('idle')
    setSessionRatings(0)
    setSessionLikes(0)
    setSessionDislikes(0)
    setPair(null)
    setSingleSuggestion(null)
  }

  const handleComparativeRate = async (outcome: 'A_PREFERRED' | 'B_PREFERRED' | 'BOTH_LIKED' | 'NEITHER') => {
    if (!pair || isRating || trainingState !== 'training') return

    setIsRating(true)
    try {
      const res = await fetch('/api/training/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingType: 'COMPARATIVE',
          outcome,
          suggestionAId: pair.suggestionA.id,
          suggestionBId: pair.suggestionB.id,
        }),
      })

      if (res.ok) {
        setSessionRatings((prev) => prev + 1)
        // Track likes/dislikes
        if (outcome === 'A_PREFERRED' || outcome === 'B_PREFERRED') {
          setSessionLikes((prev) => prev + 1)
          setSessionDislikes((prev) => prev + 1)
        } else if (outcome === 'BOTH_LIKED') {
          setSessionLikes((prev) => prev + 2)
        } else if (outcome === 'NEITHER') {
          setSessionDislikes((prev) => prev + 2)
        }
        // Fetch stats and next pair in parallel
        fetchStats()
        await fetchPair()
      }
    } catch (err) {
      console.error('Rating failed:', err)
    } finally {
      setIsRating(false)
    }
  }

  const handleBinaryRate = async (outcome: 'LIKED' | 'DISLIKED' | 'SKIPPED') => {
    if (!singleSuggestion || isRating || trainingState !== 'training') return

    setIsRating(true)
    try {
      const res = await fetch('/api/training/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingType: 'BINARY',
          outcome,
          suggestionId: singleSuggestion.id,
        }),
      })

      if (res.ok) {
        setSessionRatings((prev) => prev + 1)
        if (outcome === 'LIKED') {
          setSessionLikes((prev) => prev + 1)
        } else if (outcome === 'DISLIKED') {
          setSessionDislikes((prev) => prev + 1)
        }
        // Fetch stats and next suggestion in parallel
        fetchStats()
        await fetchSingle()
      }
    } catch (err) {
      console.error('Rating failed:', err)
    } finally {
      setIsRating(false)
    }
  }

  const handleRefineProfile = async () => {
    setIsRefining(true)
    try {
      const res = await fetch('/api/training/refine', {
        method: 'POST',
      })

      if (res.ok) {
        await fetchStats()
      }
    } catch (err) {
      console.error('Refine failed:', err)
    } finally {
      setIsRefining(false)
    }
  }

  const handleRetry = async () => {
    if (mode === 'comparative') {
      await fetchPair()
    } else {
      await fetchSingle()
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Mode Toggle - only show when idle */}
      {trainingState === 'idle' && (
        <div className="mb-8">
          <div className="flex gap-4 border-b border-[var(--folio-border)]">
            <button
              onClick={() => setMode('comparative')}
              className={`pb-3 text-xs uppercase tracking-[0.15em] transition-colors ${
                mode === 'comparative'
                  ? 'text-[var(--folio-text-primary)] border-b-2 border-[var(--folio-text-primary)]'
                  : 'text-[var(--folio-text-muted)] hover:text-[var(--folio-text-secondary)]'
              }`}
            >
              Compare (A vs B)
            </button>
            <button
              onClick={() => setMode('single')}
              className={`pb-3 text-xs uppercase tracking-[0.15em] transition-colors ${
                mode === 'single'
                  ? 'text-[var(--folio-text-primary)] border-b-2 border-[var(--folio-text-primary)]'
                  : 'text-[var(--folio-text-muted)] hover:text-[var(--folio-text-secondary)]'
              }`}
            >
              Quick Rate
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-8">
        {/* Main content area */}
        <div className="col-span-2">
          {/* IDLE STATE - Show start button */}
          {trainingState === 'idle' && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
                Train Your Taste Profile
              </h2>
              <div className="card">
                <p className="text-sm text-[var(--folio-text-secondary)] mb-4">
                  Rate YouTube Shorts to teach the system your preferences. Your ratings update your
                  taste profile in real-time, improving content generation.
                </p>
                <p className="text-sm text-[var(--folio-text-muted)] mb-4">
                  Mode: <strong>{mode === 'comparative' ? 'Compare two videos' : 'Rate one at a time'}</strong>
                </p>
                <p className="text-xs text-[var(--folio-text-muted)] mb-6">
                  Videos are selected based on your collection and include &quot;exploration&quot; content to test your boundaries
                  and establish tones you dislike.
                </p>
                <button
                  onClick={handleStartTraining}
                  className="btn btn-primary text-xs"
                >
                  Start Training
                </button>
              </div>
            </section>
          )}

          {/* TRAINING STATE - Show rating cards */}
          {trainingState === 'training' && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)]">
                  {mode === 'comparative' ? 'Which do you prefer?' : 'Do you like this?'}
                </h2>
                <button
                  onClick={handleStopTraining}
                  className="btn btn-secondary text-xs"
                >
                  Stop Training
                </button>
              </div>

              {/* Session stats bar */}
              <div className="flex gap-6 mb-6 text-xs text-[var(--folio-text-muted)]">
                <span>Rated: <strong className="text-[var(--folio-text-primary)]">{sessionRatings}</strong></span>
                <span>Likes: <strong className="text-green-600">{sessionLikes}</strong></span>
                <span>Dislikes: <strong className="text-red-500">{sessionDislikes}</strong></span>
              </div>

              {isLoading ? (
                <div className="card">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-4 w-4 border-2 border-[var(--folio-text-muted)] border-t-transparent rounded-full"></div>
                    <p className="text-sm text-[var(--folio-text-muted)]">{loadingMessage}</p>
                  </div>
                </div>
              ) : error ? (
                <div className="card">
                  <p className="text-sm text-[var(--folio-text-muted)] mb-4">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="btn btn-secondary text-xs"
                  >
                    Try Again
                  </button>
                </div>
              ) : mode === 'comparative' && pair ? (
                <ComparativeRatingCard
                  suggestionA={pair.suggestionA}
                  suggestionB={pair.suggestionB}
                  onRate={handleComparativeRate}
                  disabled={isRating}
                />
              ) : mode === 'single' && singleSuggestion ? (
                <SingleRatingCard
                  suggestion={singleSuggestion}
                  onRate={handleBinaryRate}
                  disabled={isRating}
                />
              ) : (
                <div className="card">
                  <p className="text-sm text-[var(--folio-text-muted)]">No suggestions available</p>
                  <button
                    onClick={handleRetry}
                    className="btn btn-secondary text-xs mt-4"
                  >
                    Load Content
                  </button>
                </div>
              )}
            </section>
          )}

          {/* STOPPED STATE - Show summary and refine option */}
          {trainingState === 'stopped' && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
                Training Session Complete
              </h2>
              <div className="card mb-6">
                <h3 className="text-sm font-medium mb-4">Session Summary</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-[var(--folio-bg-secondary)] rounded">
                    <p className="text-2xl font-data">{sessionRatings}</p>
                    <p className="text-xs text-[var(--folio-text-muted)]">Total Rated</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded">
                    <p className="text-2xl font-data text-green-600">{sessionLikes}</p>
                    <p className="text-xs text-[var(--folio-text-muted)]">Likes</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded">
                    <p className="text-2xl font-data text-red-500">{sessionDislikes}</p>
                    <p className="text-xs text-[var(--folio-text-muted)]">Dislikes</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--folio-text-secondary)] mb-4">
                  Your taste profile was updated in real-time during training. Click &quot;Deep Refine&quot; to
                  recalculate patterns from all your ratings for maximum accuracy.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleRefineProfile}
                    disabled={isRefining || sessionRatings < 1}
                    className="btn btn-primary text-xs flex-1"
                  >
                    {isRefining ? 'Refining...' : 'Deep Refine Profile'}
                  </button>
                  <button
                    onClick={handleResetTraining}
                    className="btn btn-secondary text-xs"
                  >
                    Train More
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Instructions - only show when idle */}
          {trainingState === 'idle' && (
            <section className="mt-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-4">
                How Training Works
              </h2>
              <div className="card">
                <ul className="text-sm text-[var(--folio-text-secondary)] space-y-2">
                  <li>1. Videos are suggested based on your collection themes</li>
                  <li>2. &quot;Exploration&quot; videos test your boundaries to find tones you dislike</li>
                  <li>3. Each rating instantly updates your keywords, tones, and avoid list</li>
                  <li>4. Training is continuous - new content loads automatically</li>
                  <li>5. Your taste profile gets smarter with every rating</li>
                </ul>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TrainingProgress
            sessionRatings={sessionRatings}
            totalRatings={stats?.totalRatings || 0}
            confidenceScore={stats?.confidenceScore || 0}
            onRefineProfile={handleRefineProfile}
            isRefining={isRefining}
          />

          {stats && <TrainingStats stats={stats} />}
        </div>
      </div>
    </div>
  )
}
