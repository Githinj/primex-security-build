'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { PageStrip } from '@/components/layout/page-strip'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <PageStrip />
        <main className="flex-1 bg-bg overflow-auto">{children}</main>
      </div>
    </div>
  )
}
