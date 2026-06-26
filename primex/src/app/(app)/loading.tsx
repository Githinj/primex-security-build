export default function Loading() {
  return (
    <div className="px-9 py-8 animate-pulse">
      {/* Title skeleton */}
      <div className="mb-7">
        <div className="h-9 bg-surface-subtle rounded-lg w-64 mb-2" />
        <div className="h-4 bg-surface-subtle rounded w-96" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5">
            <div className="h-3 bg-surface-subtle rounded w-20 mb-4" />
            <div className="h-10 bg-surface-subtle rounded w-16 mb-3" />
            <div className="h-5 bg-surface-subtle rounded w-24" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-surface border border-border rounded-xl">
        <div className="p-5 border-b border-border">
          <div className="h-5 bg-surface-subtle rounded w-48" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-6 px-5 py-4 border-b border-border last:border-0">
            <div className="h-4 bg-surface-subtle rounded flex-1" />
            <div className="h-4 bg-surface-subtle rounded w-24" />
            <div className="h-4 bg-surface-subtle rounded w-20" />
            <div className="h-4 bg-surface-subtle rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
