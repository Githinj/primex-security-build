'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Field,
  TextInput,
  TextArea,
  InfoBox,
} from '@/components/ui'
import { reportClientIssue } from '@/lib/data/actions/portal'

interface ReportIssueModalProps {
  open: boolean
  onClose: () => void
  siteId: string
}

export function ReportIssueModal({ open, onClose, siteId }: ReportIssueModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, startSave] = useTransition()

  function handleClose() {
    setTitle('')
    setDescription('')
    setError(null)
    setDone(false)
    onClose()
  }

  function handleSubmit() {
    setError(null)
    if (!title.trim()) {
      setError('Please describe the issue.')
      return
    }
    startSave(async () => {
      const res = await reportClientIssue({ siteId, title, description })
      if (!res.success) {
        setError(res.error ?? "Couldn't submit your report.")
        return
      }
      setDone(true)
    })
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {done ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center font-sans">
          <span className="w-14 h-14 rounded-full bg-p-green-soft flex items-center justify-center">
            <CheckCircle2 size={32} className="text-p-green" strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-serif text-2xl font-semibold text-ink">Report received</h3>
            <p className="text-sm text-ink-3">
              Our dispatch team has been notified and will look into it. You can track
              progress under Incident log.
            </p>
          </div>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <>
          <ModalHeader
            title="Report an issue"
            sub="Tell us what's happening and our dispatch team will follow up."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="What's the issue?" required>
                <TextInput
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="e.g. Suspicious person near the loading dock"
                />
              </Field>
              <Field label="More detail" hint="Optional — anything that helps us respond.">
                <TextArea
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="Describe what you saw, when, and where…"
                />
              </Field>
              {error && <InfoBox tone="amber">{error}</InfoBox>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit report'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}
