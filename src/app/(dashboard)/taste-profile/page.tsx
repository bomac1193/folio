import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import TasteProfileTabs from '@/components/TasteProfileTabs'
import TrainingInterface from '@/components/training/TrainingInterface'

export default async function TasteProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const tasteProfile = await prisma.tasteProfile.findUnique({
    where: { userId: session.user.id },
  })

  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    select: { platform: true, savedAt: true },
  })

  // Get platform distribution
  const platformCounts = collections.reduce((acc, c) => {
    acc[c.platform] = (acc[c.platform] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get date range
  const dates = collections.map(c => c.savedAt)
  const dateRange = dates.length > 0 ? {
    oldest: Math.min(...dates.map(d => d.getTime())),
    newest: Math.max(...dates.map(d => d.getTime())),
  } : null

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
        <h1 className="text-xl font-normal">Taste Profile</h1>
        {tasteProfile && (
          <p className="text-sm text-[var(--folio-text-muted)] mt-1">
            Based on {tasteProfile.itemCount} saved items.
            Last updated {formatRelativeTime(tasteProfile.lastTrainedAt)}
          </p>
        )}
      </header>

      {/* Content with Tabs */}
      {!tasteProfile || tasteProfile.itemCount === 0 ? (
        <EmptyStateWithTraining />
      ) : (
        <TasteProfileTabs
          tasteProfile={{
            performancePatterns: tasteProfile.performancePatterns
              ? JSON.parse(tasteProfile.performancePatterns)
              : null,
            aestheticPatterns: tasteProfile.aestheticPatterns
              ? JSON.parse(tasteProfile.aestheticPatterns)
              : null,
            voiceSignature: tasteProfile.voiceSignature
              ? JSON.parse(tasteProfile.voiceSignature)
              : null,
            itemCount: tasteProfile.itemCount,
            lastTrainedAt: tasteProfile.lastTrainedAt,
            trainingRatingsCount: tasteProfile.trainingRatingsCount,
            confidenceScore: tasteProfile.confidenceScore,
          }}
          platformCounts={platformCounts}
          dateRange={dateRange}
        />
      )}
    </div>
  )
}

function EmptyStateWithTraining() {
  return (
    <div className="h-full">
      {/* Empty State Card */}
      <div className="flex flex-col items-center justify-center py-16 px-8 border-b border-[var(--folio-border)]">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-normal mb-4">No taste profile yet.</h2>
          <p className="text-sm text-[var(--folio-text-secondary)] mb-4">
            Your taste profile develops as you save content or train with the rating system below.
          </p>
          <a href="/dashboard" className="btn btn-secondary">
            Go to Collection
          </a>
        </div>
      </div>

      {/* Training Section - available even without saved items */}
      <div className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
        <h2 className="text-sm font-normal">Or start training your profile</h2>
        <p className="text-xs text-[var(--folio-text-muted)] mt-1">
          Rate content to build your taste profile without saving items.
        </p>
      </div>
      <TrainingInterface />
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US')
}
