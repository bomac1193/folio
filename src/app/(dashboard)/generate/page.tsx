import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GenerateInterface from '@/components/GenerateInterface'

export default async function GeneratePage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  // Get user's collection for reference selection
  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      platform: true,
      thumbnail: true,
    },
  })

  // Get taste profile status
  const tasteProfile = await prisma.tasteProfile.findUnique({
    where: { userId: session.user.id },
    select: { itemCount: true },
  })

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
        <h1 className="text-xl font-normal">Generate</h1>
        <p className="text-sm text-[var(--folio-text-muted)] mt-1">
          Create variants that align with your taste profile.
        </p>
      </header>

      {/* Content */}
      <GenerateInterface
        collections={collections}
        hasTasteProfile={(tasteProfile?.itemCount || 0) > 0}
      />
    </div>
  )
}
