import { describe, it, expect } from 'vitest'
import { applyPagination, toPaginatedResult } from './pagination'

describe('applyPagination', () => {
  it('computes the zero-based inclusive range for a page', () => {
    const calls: [number, number][] = []
    const query = { range: (from: number, to: number) => { calls.push([from, to]); return 'ranged' } }

    expect(applyPagination(query, { page: 1, pageSize: 25 })).toBe('ranged')
    expect(calls[0]).toEqual([0, 24])

    applyPagination(query, { page: 3, pageSize: 10 })
    expect(calls[1]).toEqual([20, 29])
  })
})

describe('toPaginatedResult', () => {
  it('uses the exact count and derives totalPages', () => {
    const res = toPaginatedResult([1, 2, 3], 47, { page: 2, pageSize: 25 })
    expect(res).toEqual({ data: [1, 2, 3], total: 47, page: 2, pageSize: 25, totalPages: 2 })
  })

  it('falls back to data length when count is null', () => {
    const res = toPaginatedResult(['a', 'b'], null, { page: 1, pageSize: 25 })
    expect(res.total).toBe(2)
    expect(res.totalPages).toBe(1)
  })
})
