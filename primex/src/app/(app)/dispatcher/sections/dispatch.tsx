'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { User } from 'lucide-react'
import { PageTitle, Pill } from '@/components/ui'
import { IncidentCard } from '@/components/incidents/incident-card'
import { updateIncidentStatus, assignGuard } from '@/lib/data/actions/incidents'
import { severityTone } from '@/lib/utils'
import type { Incident, IncidentStatus, Site, Profile } from '@/lib/types'

interface DispatchBoardProps {
  incidents: Incident[]
  sites: Site[]
  guards: Profile[]
}

interface Column {
  key: string
  label: string
  statuses: IncidentStatus[]
  dotColor: string
  targetStatus: IncidentStatus
}

const columns: Column[] = [
  { key: 'open', label: 'Open', statuses: ['Open'], dotColor: 'bg-p-red', targetStatus: 'Open' },
  { key: 'dispatched', label: 'Dispatched', statuses: ['Dispatched'], dotColor: 'bg-p-amber', targetStatus: 'Dispatched' },
  { key: 'in-progress', label: 'In Progress', statuses: ['In Progress'], dotColor: 'bg-p-blue', targetStatus: 'In Progress' },
  { key: 'resolved', label: 'Resolved', statuses: ['Resolved', 'Closed'], dotColor: 'bg-p-green', targetStatus: 'Resolved' },
]

// ─── Draggable Incident Card ────────────────────────────

function DraggableIncident({
  incident,
  site,
  guard,
}: {
  incident: Incident
  site: Site | undefined
  guard: Profile | undefined
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `incident-${incident.id}`,
    data: { type: 'incident', incident },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <IncidentCard
        incident={incident}
        site={site}
        guard={guard}
        variant="compact"
      />
    </div>
  )
}

// ─── Draggable Guard Card ───────────────────────────────

function DraggableGuard({ guard }: { guard: Profile }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guard-${guard.id}`,
    data: { type: 'guard', guard },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }

  const statusTone = guard.guard_status === 'Available' ? 'green' : guard.guard_status === 'On Incident' ? 'amber' : 'gray'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center gap-2.5 min-w-[160px]"
    >
      <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
        <User size={13} className="text-white/60" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold text-ink truncate font-sans">{guard.full_name}</span>
        <Pill tone={statusTone} size="sm">{guard.guard_status ?? 'Unknown'}</Pill>
      </div>
    </div>
  )
}

// ─── Droppable Column ───────────────────────────────────

function DroppableColumn({
  column,
  children,
  isOver,
}: {
  column: Column
  children: React.ReactNode
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${column.key}`,
    data: { type: 'column', column },
  })

  return (
    <div ref={setNodeRef} className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor} flex-shrink-0`} />
        <span className="text-sm font-semibold text-ink font-sans">{column.label}</span>
      </div>

      {/* Column body */}
      <div
        className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors duration-150 ${
          isOver ? 'bg-p-blue-soft/50 border-2 border-dashed border-p-blue/30' : 'border-2 border-dashed border-transparent'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Main Dispatch Board ────────────────────────────────

export function DispatchBoard({ incidents: initialIncidents, sites, guards }: DispatchBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [incidents, setIncidents] = useState(initialIncidents)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'incident' | 'guard' | null>(null)
  const [overColumnKey, setOverColumnKey] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const availableGuards = guards.filter((g) => g.guard_status === 'Available')

  function handleDragStart(event: DragStartEvent) {
    const { type } = event.active.data.current as { type: string }
    setActiveId(event.active.id as string)
    setActiveType(type as 'incident' | 'guard')
  }

  function handleDragOver(event: any) {
    const overId = event.over?.id as string | undefined
    if (overId?.startsWith('column-')) {
      setOverColumnKey(overId.replace('column-', ''))
    } else if (overId?.startsWith('incident-')) {
      // Hovering over an incident — find its column
      const incidentId = overId.replace('incident-', '')
      const inc = incidents.find((i) => i.id === incidentId)
      if (inc) {
        const col = columns.find((c) => c.statuses.includes(inc.status))
        if (col) setOverColumnKey(col.key)
      }
    } else {
      setOverColumnKey(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setActiveType(null)
    setOverColumnKey(null)

    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as { type: string; incident?: Incident; guard?: Profile }
    const overId = over.id as string

    // ── Incident dropped on a column → update status ──
    if (activeData.type === 'incident' && overId.startsWith('column-')) {
      const columnKey = overId.replace('column-', '')
      const column = columns.find((c) => c.key === columnKey)
      const incident = activeData.incident!

      if (!column || column.statuses.includes(incident.status)) return

      // Optimistic update
      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? { ...i, status: column.targetStatus } : i))
      )

      startTransition(async () => {
        try {
          await updateIncidentStatus(incident.id, column.targetStatus)
          router.refresh()
        } catch (err) {
          console.error('Failed to update status:', err)
          // Rollback
          setIncidents((prev) =>
            prev.map((i) => (i.id === incident.id ? { ...i, status: incident.status } : i))
          )
        }
      })
    }

    // ── Guard dropped on an incident → assign guard ──
    if (activeData.type === 'guard' && overId.startsWith('incident-')) {
      const incidentId = overId.replace('incident-', '')
      const guard = activeData.guard!
      const incident = incidents.find((i) => i.id === incidentId)

      if (!incident) return

      // Optimistic update
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incidentId ? { ...i, guard_id: guard.id, status: 'Dispatched' } : i
        )
      )

      startTransition(async () => {
        try {
          await assignGuard(incidentId, guard.id)
          router.refresh()
        } catch (err) {
          console.error('Failed to assign guard:', err)
          // Rollback
          setIncidents((prev) =>
            prev.map((i) =>
              i.id === incidentId ? { ...i, guard_id: incident.guard_id, status: incident.status } : i
            )
          )
        }
      })
    }
  }

  // Find active incident/guard for DragOverlay
  const activeIncident = activeType === 'incident' && activeId
    ? incidents.find((i) => `incident-${i.id}` === activeId)
    : null
  const activeGuard = activeType === 'guard' && activeId
    ? guards.find((g) => `guard-${g.id}` === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <PageTitle
          title="Dispatch board"
          sub="Drag incidents between columns to update status. Drag a guard onto an incident to assign."
        />

        {/* Kanban columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const items = incidents.filter((i) => col.statuses.includes(i.status))
            const isOver = overColumnKey === col.key

            return (
              <DroppableColumn key={col.key} column={col} isOver={isOver}>
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-[100px] text-sm text-ink-4 font-sans">
                    No incidents
                  </div>
                ) : (
                  items.map((incident) => {
                    const site = sites.find((s) => s.id === incident.site_id)
                    const guard = incident.guard_id
                      ? guards.find((g) => g.id === incident.guard_id)
                      : undefined

                    return (
                      <DraggableIncident
                        key={incident.id}
                        incident={incident}
                        site={site}
                        guard={guard}
                      />
                    )
                  })
                )}
              </DroppableColumn>
            )
          })}
        </div>

        {/* Guard roster */}
        {availableGuards.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="flex items-center gap-2 px-1">
              <User size={14} strokeWidth={2} className="text-ink-3" />
              <span className="text-sm font-semibold text-ink font-sans">Available guards</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-subtle text-ink-3 leading-none">
                {availableGuards.length}
              </span>
              <span className="text-xs text-ink-4 font-sans ml-2">Drag onto an incident to assign</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {availableGuards.map((guard) => (
                <DraggableGuard key={guard.id} guard={guard} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag overlay — visual preview while dragging */}
      <DragOverlay>
        {activeIncident && (
          <div className="opacity-90 rotate-2 scale-105">
            <IncidentCard
              incident={activeIncident}
              site={sites.find((s) => s.id === activeIncident.site_id)}
              guard={
                activeIncident.guard_id
                  ? guards.find((g) => g.id === activeIncident.guard_id)
                  : undefined
              }
              variant="compact"
            />
          </div>
        )}
        {activeGuard && (
          <div className="opacity-90 rotate-2 scale-105 bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center gap-2.5 min-w-[160px]">
            <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-white/60" />
            </div>
            <span className="text-xs font-semibold text-ink font-sans">{activeGuard.full_name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
