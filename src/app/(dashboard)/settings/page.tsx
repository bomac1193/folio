import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          collections: true,
          generatedVariants: true,
        },
      },
    },
  })

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--folio-border)] bg-white">
        <h1 className="text-xl font-normal">Settings</h1>
      </header>

      {/* Content */}
      <div className="p-8 max-w-2xl">
        {/* Account */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
            Account
          </h2>
          <div className="card">
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                  Email
                </label>
                <p className="text-sm">{user?.email}</p>
              </div>
              {user?.name && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                    Name
                  </label>
                  <p className="text-sm">{user.name}</p>
                </div>
              )}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                  Member Since
                </label>
                <p className="text-sm">
                  {user?.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
            Usage
          </h2>
          <div className="card">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                  Items Saved
                </label>
                <p className="font-data text-2xl">{user?._count.collections || 0}</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--folio-text-muted)] mb-1">
                  Variants Generated
                </label>
                <p className="font-data text-2xl">{user?._count.generatedVariants || 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
            Data
          </h2>
          <div className="card">
            <p className="text-sm text-[var(--folio-text-secondary)] mb-4">
              Export all your data including collection items, taste profile, and
              generated variants.
            </p>
            <button className="btn btn-secondary">
              Export All Data
            </button>
          </div>
        </section>

        {/* Extension */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-6">
            Browser Extension
          </h2>
          <div className="card">
            <p className="text-sm text-[var(--folio-text-secondary)] mb-4">
              Install the FOLIO browser extension to save content directly from
              YouTube, TikTok, Instagram, and Twitter.
            </p>
            <a href="#install-extension" className="btn btn-primary">
              Download Extension
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
