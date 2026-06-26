'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { PageStrip } from '@/components/layout/page-strip'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        {/* Mobile hamburger + page strip row */}
        <div className="flex items-center flex-shrink-0">
          <button
            type="button"
            className="lg:hidden flex items-center justify-center p-3 text-ink-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <PageStrip />
          </div>
        </div>
        <main className="flex-1 bg-bg overflow-auto">{children}</main>
      </div>
    </div>
  )
}
