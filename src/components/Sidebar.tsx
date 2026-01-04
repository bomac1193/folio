'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Collection' },
  { href: '/taste-profile', label: 'Taste Profile' },
  { href: '/generate', label: 'Generate' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-[var(--folio-border)] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[var(--folio-border)]">
        <Link href="/dashboard" className="text-sm tracking-[0.3em] font-normal">
          FOLIO
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    block px-6 py-3 text-sm
                    transition-colors duration-150
                    ${
                      isActive
                        ? 'bg-[var(--folio-offwhite)] text-[var(--folio-black)] border-l-2 border-[var(--folio-black)]'
                        : 'text-[var(--folio-text-secondary)] hover:text-[var(--folio-black)] hover:bg-[var(--folio-offwhite)]'
                    }
                  `}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="px-6 py-6 border-t border-[var(--folio-border)]">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-sm text-[var(--folio-text-muted)] hover:text-[var(--folio-black)] transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
