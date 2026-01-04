import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import CollectionGrid from '@/components/CollectionGrid'
import CollectionStats from '@/components/CollectionStats'
import CollectionFilters from '@/components/CollectionFilters'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: 'desc' },
  })

  const stats = {
    totalItems: collections.length,
    avgPerformance: collections.reduce((acc, c) => {
      const dna = c.performanceDNA ? JSON.parse(c.performanceDNA) : null
      return acc + (dna?.predictedScore || 0)
    }, 0) / (collections.length || 1),
    platforms: [...new Set(collections.map(c => c.platform))].length,
  }

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-normal">Collection</h1>
            <p className="text-sm text-[var(--folio-text-muted)] mt-1">
              {collections.length} items saved
            </p>
          </div>
          <CollectionStats stats={stats} />
        </div>
      </header>

      {/* Filters */}
      <CollectionFilters />

      {/* Content */}
      {collections.length === 0 ? (
        <EmptyState />
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
          <a
            href="#install-extension"
            className="btn btn-primary"
          >
            Install extension
          </a>
          <p className="text-xs text-[var(--folio-text-muted)]">
            Or add items manually via API
          </p>
        </div>
      </div>
    </div>
  )
}
