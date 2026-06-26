"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-9 py-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-p-red-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-p-red" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-ink-3 mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
