import { describe, it, expect } from 'vitest'
import {
  guardStatusToIncidentStatus,
  guardStageValue,
  mapIncidentToGuard,
} from './guard-lifecycle'

describe('guardStatusToIncidentStatus', () => {
  it('collapses the three active stages to In Progress', () => {
    expect(guardStatusToIncidentStatus('accepted')).toBe('In Progress')
    expect(guardStatusToIncidentStatus('enroute')).toBe('In Progress')
    expect(guardStatusToIncidentStatus('arrived')).toBe('In Progress')
  })
  it('maps the terminal states', () => {
    expect(guardStatusToIncidentStatus('assigned')).toBe('Dispatched')
    expect(guardStatusToIncidentStatus('resolved')).toBe('Resolved')
  })
})

describe('guardStageValue', () => {
  it('labels the fine-grained stages', () => {
    expect(guardStageValue('accepted')).toBe('Accepted')
    expect(guardStageValue('enroute')).toBe('En Route')
    expect(guardStageValue('arrived')).toBe('Arrived')
  })
  it('is null when the incident status alone is enough', () => {
    expect(guardStageValue('assigned')).toBeNull()
    expect(guardStageValue('resolved')).toBeNull()
  })
})

describe('mapIncidentToGuard', () => {
  it('restores the fine-grained stage from guard_stage (round-trip)', () => {
    // In Progress + a stage should round-trip back to that guard status.
    for (const gs of ['accepted', 'enroute', 'arrived'] as const) {
      const incident = { status: guardStatusToIncidentStatus(gs), guard_stage: guardStageValue(gs) }
      expect(mapIncidentToGuard(incident)).toBe(gs)
    }
  })

  it('defaults In Progress with no stage to accepted', () => {
    expect(mapIncidentToGuard({ status: 'In Progress', guard_stage: null })).toBe('accepted')
  })

  it('maps dispatched/resolved/closed', () => {
    expect(mapIncidentToGuard({ status: 'Dispatched', guard_stage: null })).toBe('assigned')
    expect(mapIncidentToGuard({ status: 'Resolved', guard_stage: null })).toBe('resolved')
    expect(mapIncidentToGuard({ status: 'Closed', guard_stage: null })).toBe('resolved')
  })
})
