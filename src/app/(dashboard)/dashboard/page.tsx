import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import CollectionGrid from '@/components/CollectionGrid'
import CollectionFilters from '@/components/CollectionFilters'
import DashboardHeader from '@/components/DashboardHeader'
import { PLATFORMS, type Platform } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ platform?: string; search?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user?.id) {
    return null
  }

  // Build filter conditions
  const where: Record<string, unknown> = { userId: session.user.id }

  if (params.platform && Object.values(PLATFORMS).includes(params.platform as Platform)) {
    where.platform = params.platform
  }

  if (params.search) {
    where.title = { contains: params.search }
  }

  const collections = await prisma.collection.findMany({
    where,
    orderBy: { savedAt: 'desc' },
  })

  // Get all collections for stats (unfiltered)
  const allCollections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    select: { platform: true, performanceDNA: true },
  })

  const stats = {
    totalItems: allCollections.length,
    avgPerformance: allCollections.reduce((acc, c) => {
      const dna = c.performanceDNA ? JSON.parse(c.performanceDNA) : null
      return acc + (dna?.predictedScore || 0)
    }, 0) / (allCollections.length || 1),
    platforms: [...new Set(allCollections.map(c => c.platform))].length,
  }

  const itemCount = params.platform || params.search
    ? `${collections.length} of ${allCollections.length} items`
    : `${collections.length} items saved`

  return (
    <div className="h-full">
      {/* Header */}
      <DashboardHeader itemCount={itemCount} stats={stats} />

      {/* Filters */}
      <CollectionFilters />

      {/* Content */}
      {collections.length === 0 ? (
        params.platform || params.search ? (
          <NoResults />
        ) : (
          <EmptyState />
        )
      ) : (
        <CollectionGrid collections={collections} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-normal mb-4">Your collection is empty.</h2>
        <p className="text-sm text-[var(--folio-text-secondary)] mb-8">
          Begin by saving content that represents
          excellence in your field.
        </p>
        <div className="space-y-4">
          <p className="text-xs text-[var(--folio-text-muted)]">
            Click &quot;+ Add URL&quot; above to paste a link, or use the browser extension
          </p>
        </div>
      </div>
    </div>
  )
}

function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-normal mb-4">No items found.</h2>
        <p className="text-sm text-[var(--folio-text-secondary)]">
          Try adjusting your filters or search query.
        </p>
      </div>
    </div>
  )
}
