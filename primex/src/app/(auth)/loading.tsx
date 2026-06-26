export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-pulse max-w-[1000px] w-full mx-10">
        <div className="grid grid-cols-2 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-14">
            <div className="h-8 bg-surface-subtle rounded w-48 mb-8" />
            <div className="h-10 bg-surface-subtle rounded w-64 mb-4" />
            <div className="h-4 bg-surface-subtle rounded w-80 mb-8" />
            <div className="space-y-4">
              <div className="h-10 bg-surface-subtle rounded" />
              <div className="h-10 bg-surface-subtle rounded" />
              <div className="h-12 bg-surface-subtle rounded mt-6" />
            </div>
          </div>
          <div className="bg-navy" />
        </div>
      </div>
    </div>
  )
}
