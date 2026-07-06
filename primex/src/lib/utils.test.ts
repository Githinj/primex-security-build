import { describe, it, expect } from 'vitest'
import { severityTone, incidentTone, cameraTone, cn } from './utils'

describe('severityTone', () => {
  it('maps each severity to a tone', () => {
    expect(severityTone('Critical')).toBe('red')
    expect(severityTone('Warning')).toBe('amber')
    expect(severityTone('Info')).toBe('blue')
  })
})

describe('incidentTone', () => {
  it('greens resolved/closed', () => {
    expect(incidentTone('Resolved')).toBe('green')
    expect(incidentTone('Closed')).toBe('green')
  })
  it('ambers active states', () => {
    expect(incidentTone('In Progress')).toBe('amber')
    expect(incidentTone('Dispatched')).toBe('amber')
  })
  it('greys everything else', () => {
    expect(incidentTone('Open')).toBe('gray')
  })
})

describe('cameraTone', () => {
  it('maps statuses to tones', () => {
    expect(cameraTone('Online')).toBe('green')
    expect(cameraTone('Offline')).toBe('red')
    expect(cameraTone('Maintenance')).toBe('amber')
    expect(cameraTone('Unknown')).toBe('gray')
  })
})

describe('cn', () => {
  it('joins truthy classes and drops falsey ones', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
    expect(cn()).toBe('')
  })
})
