import Link from "next/link"
import { Shield } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-ink mb-3">404</h1>
        <p className="text-ink-3 mb-8">This page doesn't exist.</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-p-blue text-white rounded-lg text-sm font-medium hover:bg-p-blue-hover transition-colors"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-surface border border-border text-ink rounded-lg text-sm font-medium hover:bg-surface-subtle transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
