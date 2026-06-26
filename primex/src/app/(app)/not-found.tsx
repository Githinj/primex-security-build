import Link from "next/link"
import { Shield } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-9 py-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-p-blue-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield size={28} className="text-p-blue" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">
          Page not found
        </h2>
        <p className="text-sm text-ink-3 mb-6 leading-relaxed">
          The page you're looking for doesn't exist or you don't have access.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-p-blue text-white rounded-lg text-sm font-medium hover:bg-p-blue-hover transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
