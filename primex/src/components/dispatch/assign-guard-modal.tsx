'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { Button, Pill, Modal, ModalHeader, ModalBody, ModalFooter, SuccessState } from '@/components/ui'
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
    <Modal open={open} onClose={handleClose}>
      {done ? (
        /* ── Step 2: Success ── */
        <SuccessState
          title="Dispatched."
          sub={
            <>
              Incident created and sent to {selectedGuardProfile?.full_name ?? 'the guard'}.
              They&apos;ll receive a push notification and email.
            </>
          }
          onDone={handleClose}
        />
      ) : (
        /* ── Step 1: Select a guard ── */
        <>
          <ModalHeader
            eyebrow="Step 1 of 2 · Assign guard"
            title="Dispatch a responder"
            sub={`An incident will be created and linked to: ${alert.title}`}
            onClose={handleClose}
          />

          <ModalBody>
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
          </ModalBody>

          <ModalFooter>
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
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}
