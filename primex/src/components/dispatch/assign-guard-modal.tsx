'use client'

import { useState, useTransition } from 'react'
import { Send, CheckCircle2, X } from 'lucide-react'
import { Button, Pill, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { dispatchGuard } from '@/lib/data/actions/dispatch'
import type { Alert, Profile } from '@/lib/types'

interface AssignGuardModalProps {
  open: boolean
  onClose: () => void
  alert: Alert | null
  guards: Profile[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AssignGuardModal({ open, onClose, alert, guards }: AssignGuardModalProps) {
  const [selectedGuard, setSelectedGuard] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!alert) return null
  if (!open) return null

  const availableGuards = guards.filter((g) => g.guard_status !== 'Off-duty')
  const selectedGuardProfile = guards.find((g) => g.id === selectedGuard)

  function handleClose() {
    setSelectedGuard(null)
    setDone(false)
    onClose()
  }

  function handleDispatch() {
    if (!selectedGuard || !alert) return
    startTransition(async () => {
      await dispatchGuard(alert.id, selectedGuard)
      setDone(true)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {done ? (
          /* ── Step 2: Success ── */
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center font-sans">
            <span className="w-[60px] h-[60px] rounded-full bg-p-green-soft flex items-center justify-center">
              <CheckCircle2 size={32} className="text-p-green" strokeWidth={2} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-serif text-[26px] font-semibold text-ink">Dispatched.</h3>
              <p className="text-sm text-ink-3">
                Incident created and sent to {selectedGuardProfile?.full_name ?? 'the guard'}.
                They&apos;ll receive a push notification and email.
              </p>
            </div>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          /* ── Step 1: Select a guard ── */
          <>
            {/* Close button */}
            <div className="flex justify-end px-6 pt-5">
              <button
                type="button"
                onClick={handleClose}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-subtle transition-colors duration-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 pb-4">
              <Label>Step 1 of 2 &middot; Assign guard</Label>
              <h2 className="font-serif text-xl font-semibold text-ink mt-1">
                Dispatch a responder
              </h2>
              <p className="text-sm text-ink-3 mt-2 font-sans">
                An incident will be created and linked to: {alert.title}
              </p>
            </div>

            {/* Guard list */}
            <div className="px-6 pb-2 overflow-y-auto flex-1 font-sans">
              <div className="flex flex-col gap-2">
                {availableGuards.map((guard) => {
                  const isSelected = selectedGuard === guard.id
                  const statusTone = guard.guard_status === 'Available' ? 'green' as const : 'amber' as const

                  return (
                    <button
                      key={guard.id}
                      type="button"
                      onClick={() => setSelectedGuard(guard.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors duration-100 cursor-pointer text-left',
                        isSelected
                          ? 'border-p-blue bg-p-blue-softer'
                          : 'border-border bg-surface hover:bg-surface-subtle'
                      )}
                    >
                      {/* Avatar */}
                      <span className="w-[34px] h-[34px] rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {getInitials(guard.full_name)}
                        </span>
                      </span>

                      {/* Name + zone */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold text-ink truncate">
                          {guard.full_name}
                        </span>
                        {guard.zone && (
                          <span className="text-[11.5px] text-ink-3 truncate">
                            {guard.zone}
                          </span>
                        )}
                      </div>

                      {/* Status pill */}
                      <Pill tone={statusTone} size="sm" dot>
                        {guard.guard_status}
                      </Pill>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-bg flex-shrink-0 font-sans">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={Send}
                onClick={handleDispatch}
                disabled={!selectedGuard || isPending}
              >
                {isPending ? 'Sending...' : 'Send dispatch'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
