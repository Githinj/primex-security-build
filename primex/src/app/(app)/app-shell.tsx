'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { PageStrip } from '@/components/layout/page-strip'
import { useProfile } from '@/components/providers/profile-provider'

// Roles whose page renders its own in-page nav (their SPA), so the global
// sidebar is suppressed to avoid a redundant/empty second sidebar.
const SELF_NAV_ROLES = ['dispatcher', 'company_manager', 'guard', 'client']

// The shell is `h-dvh`, not `h-screen`: `100vh` on mobile measures the viewport
// with the browser chrome retracted, so the last rows of a table and the
// pagination strip sit behind the URL bar. The outer element is
// `overflow-hidden` and only `main` scrolls, so there is nothing to scroll to
// reach them. `100dvh` tracks the visible viewport instead.

interface AppShellProps {
  children: React.ReactNode
  navCounts?: Record<string, number>
}

export function AppShell({ children, navCounts }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const profile = useProfile()
  const hideGlobalNav = SELF_NAV_ROLES.includes(profile?.role ?? '')

  if (hideGlobalNav) {
    return <div className="flex h-dvh overflow-hidden">{children}</div>
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:flex w-60 flex-shrink-0">
        <Sidebar navCounts={navCounts} />
      </div>

      {/* Mobile sidebar — overlay when open */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'flex' : 'hidden'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-navy/50"
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar panel */}
        <div className="relative z-10 w-60 flex-shrink-0">
          <Sidebar onClose={() => setSidebarOpen(false)} navCounts={navCounts} />
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Navbar: hamburger (mobile) + page strip */}
        <PageStrip
          menuButton={
            <button
              type="button"
              className="lg:hidden flex items-center justify-center p-1.5 -ml-1 rounded-lg hover:bg-surface-subtle transition-colors text-ink-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          }
        />
        <main className="flex-1 bg-bg overflow-auto">{children}</main>
      </div>
    </div>
  )
}
