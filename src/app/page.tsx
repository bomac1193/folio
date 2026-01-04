import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--folio-bg)]">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-[var(--folio-border)]">
        <div className="text-lg tracking-[0.3em] font-normal">FOLIO</div>
        <div className="flex items-center gap-8">
          <Link
            href="/login"
            className="text-sm text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)]"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary text-sm py-2 px-6">
            Begin
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-8 py-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl tracking-[0.15em] font-normal mb-8">
            FOLIO
          </h1>
          <p className="text-xl md:text-2xl text-[var(--folio-text-secondary)] font-light mb-4">
            Your taste, compounded.
          </p>
          <p className="text-base text-[var(--folio-text-muted)] max-w-xl mx-auto leading-relaxed">
            The first platform for developing creative judgment
            as a trainable, scalable asset.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-8">
        <hr className="divider" />
      </div>

      {/* Three Pillars */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="grid md:grid-cols-3 gap-16">
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-4">
              01 / Collect
            </h3>
            <h2 className="text-xl mb-4">Save what works</h2>
            <p className="text-sm text-[var(--folio-text-secondary)] leading-relaxed">
              Curate high-performing content from across the web. One-click
              saving captures titles, thumbnails, and performance metrics
              automatically.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-4">
              02 / Analyze
            </h3>
            <h2 className="text-xl mb-4">Understand why</h2>
            <p className="text-sm text-[var(--folio-text-secondary)] leading-relaxed">
              AI decomposes each saved item into performance DNA and aesthetic
              DNA. Over time, patterns emerge that define your creative
              signature.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--folio-text-muted)] mb-4">
              03 / Synthesize
            </h3>
            <h2 className="text-xl mb-4">Generate new work</h2>
            <p className="text-sm text-[var(--folio-text-secondary)] leading-relaxed">
              Create variants that score high on both performance and personal
              taste. Your trained aesthetic becomes a generative resource.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-8">
        <hr className="divider" />
      </div>

      {/* Positioning Statement */}
      <section className="max-w-3xl mx-auto px-8 py-24 text-center">
        <p className="text-lg text-[var(--folio-text-secondary)] leading-relaxed mb-8">
          In an AI-dominated content landscape, human value shifts from
          creation to curation. FOLIO treats taste as intellectual property.
        </p>
        <p className="text-sm text-[var(--folio-text-muted)] uppercase tracking-widest">
          Taste Architecture
        </p>
      </section>

      {/* CTA Section */}
      <section className="max-w-xl mx-auto px-8 py-24 text-center">
        <Link href="/signup" className="btn btn-primary">
          Begin
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--folio-border)] px-8 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="text-xs text-[var(--folio-text-muted)] tracking-widest">
            FOLIO
          </div>
          <div className="text-xs text-[var(--folio-text-muted)]">
            Creative Intelligence Infrastructure
          </div>
        </div>
      </footer>
    </div>
  )
}
