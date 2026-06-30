'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { PageStrip } from '@/components/layout/page-strip'
import { useProfile } from '@/components/providers/profile-provider'

const SELF_NAV_ROLES = ['dispatcher', 'company_manager', 'guard']

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const profile = useProfile()
  const hideGlobalNav = SELF_NAV_ROLES.includes(profile?.role ?? '')

  if (hideGlobalNav) {
    return <div className="flex h-screen overflow-hidden">{children}</div>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:flex w-60 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar — overlay when open */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'flex' : 'hidden'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar panel */}
        <div className="relative z-10 w-60 flex-shrink-0">
          <Sidebar onClose={() => setSidebarOpen(false)} />
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
