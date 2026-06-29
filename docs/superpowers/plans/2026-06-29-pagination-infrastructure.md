# Pagination Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable server-side pagination infrastructure — shared types, query-layer helpers, DataTable pagination UI, and a URL-based pagination hook — so all list views can be paginated without breaking existing callers.

**Architecture:** Query functions gain optional `pagination` param via TypeScript overloads — no pagination returns `T[]` (backward compatible), with pagination returns `PaginatedResult<T>`. Supabase `.range()` with `{ count: 'exact' }` handles server-side slicing. DataTable gets an optional footer bar. A `usePagination` hook reads/writes `?page=` in the URL.

**Tech Stack:** Next.js 16 (App Router), Supabase JS v2 (.range, count), TypeScript, Tailwind CSS v4

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/data/pagination.ts` | `PaginationParams`, `PaginatedResult<T>`, `applyPagination()` helper |
| `src/lib/data/alerts.ts` | Add overload with pagination support |
| `src/lib/data/incidents.ts` | Add overload with pagination support |
| `src/lib/data/sites.ts` | Add overload with pagination support |
| `src/lib/data/cameras.ts` | Add overload with pagination support |
| `src/lib/data/companies.ts` | Add overload with pagination support |
| `src/lib/data/guards.ts` | Add overload with pagination support |
| `src/lib/data/profiles.ts` | Add overload to `getTeamMembers` with pagination support |
| `src/lib/data/reports.ts` | Add overload with pagination support |
| `src/lib/data/activity.ts` | Add overload with pagination support |
| `src/lib/hooks/use-pagination.ts` | `usePagination(searchParams)` hook — reads `?page=` from URL |
| `src/components/ui/data-table.tsx` | Add optional `pagination` prop with prev/next/page indicator |
| `src/components/ui/index.ts` | No change needed (DataTable already exported) |

---

## Chunk 1: Shared Types, Helper, and Pagination Hook

### Task 1: Create pagination types and helper

**Files:**
- Create: `src/lib/data/pagination.ts`

- [ ] **Step 1: Create the pagination module**

```typescript
// src/lib/data/pagination.ts

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Apply pagination to a Supabase query builder.
 * Call BEFORE .order() has been applied — this adds .range().
 * The query must have been created with .select('*', { count: 'exact' }).
 */
export function applyPagination<Q extends { range: (from: number, to: number) => Q }>(
  query: Q,
  pagination: PaginationParams
): Q {
  const from = (pagination.page - 1) * pagination.pageSize
  const to = from + pagination.pageSize - 1
  return query.range(from, to)
}

/**
 * Wrap raw Supabase response into a PaginatedResult.
 */
export function toPaginatedResult<T>(
  data: T[],
  count: number | null,
  pagination: PaginationParams
): PaginatedResult<T> {
  const total = count ?? data.length
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/pagination.ts
git commit -m "feat(pagination): add PaginationParams, PaginatedResult types and helpers"
```

---

### Task 2: Create the usePagination hook

**Files:**
- Create: `src/lib/hooks/use-pagination.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/use-pagination.ts
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface UsePaginationOptions {
  defaultPageSize?: number
}

interface UsePaginationReturn {
  page: number
  pageSize: number
  setPage: (page: number) => void
}

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { defaultPageSize = 25 } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.max(1, Number(searchParams.get('pageSize')) || defaultPageSize)

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(newPage))
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`)
    },
    [router, pathname, searchParams]
  )

  return { page, pageSize, setPage }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-pagination.ts
git commit -m "feat(pagination): add usePagination hook for URL-based page state"
```

---

## Chunk 2: DataTable Pagination UI

### Task 3: Extend DataTable with pagination controls

**Files:**
- Modify: `src/components/ui/data-table.tsx`

- [ ] **Step 1: Add pagination prop and footer bar**

Replace the entire file with:

```typescript
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps {
  columns: string[];
  rows: React.ReactNode[][];
  pagination?: DataTablePagination;
}

export function DataTable({ columns, rows, pagination }: DataTableProps) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm font-sans">
          <thead>
            <tr className="bg-bg">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[10.5px] text-ink-3 font-semibold tracking-wider uppercase whitespace-nowrap ${
                    i === columns.length - 1 ? "text-right" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-ink-3 text-sm"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-border hover:bg-surface-subtle transition-colors duration-100"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-5 py-3.5 text-ink-2 ${
                        ci === row.length - 1 ? "text-right" : "text-left"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-ink-3 font-sans">
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd primex && npx next lint --quiet`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/data-table.tsx
git commit -m "feat(pagination): extend DataTable with optional pagination footer"
```

---

## Chunk 3: Add Pagination to Query Functions

All query functions follow the same pattern. Each gets:
1. A TypeScript overload so callers without `pagination` still get `T[]`
2. When `pagination` is passed, uses `.select('*', { count: 'exact' })` + `.range()` and returns `PaginatedResult<T>`

### Task 4: Add pagination to getAlerts

**Files:**
- Modify: `src/lib/data/alerts.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Alert } from '@/lib/types'

export async function getAlerts(siteId?: string): Promise<Alert[]>
export async function getAlerts(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Alert>>
export async function getAlerts(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  let query = supabase.from('alerts').select('*').order('created_at', { ascending: false })
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getAlertById(id: string): Promise<Alert | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Verify lint passes**

Run: `cd primex && npx next lint --quiet`
Expected: No errors (existing callers still use the first overload)

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/alerts.ts
git commit -m "feat(pagination): add pagination overload to getAlerts"
```

---

### Task 5: Add pagination to getIncidents

**Files:**
- Modify: `src/lib/data/incidents.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Incident } from '@/lib/types'

export async function getIncidents(siteId?: string): Promise<Incident[]>
export async function getIncidents(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Incident>>
export async function getIncidents(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  let query = supabase.from('incidents').select('*').order('started_at', { ascending: false })
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/incidents.ts
git commit -m "feat(pagination): add pagination overload to getIncidents"
```

---

### Task 6: Add pagination to getCameras

**Files:**
- Modify: `src/lib/data/cameras.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Camera } from '@/lib/types'

export async function getCameras(siteId?: string): Promise<Camera[]>
export async function getCameras(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Camera>>
export async function getCameras(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('cameras')
      .select('*', { count: 'exact' })
      .order('name')
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  let query = supabase.from('cameras').select('*').order('name')
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCameraById(id: string): Promise<Camera | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cameras')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/cameras.ts
git commit -m "feat(pagination): add pagination overload to getCameras"
```

---

### Task 7: Add pagination to getSites

**Files:**
- Modify: `src/lib/data/sites.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Site } from '@/lib/types'

function mapSite(s: any): Site {
  return {
    id: s.id,
    company_id: s.company_id,
    name: s.name,
    type: s.type,
    address: s.address,
    risk: s.risk,
    status: s.status,
    cameras: s.cameras[0]?.count ?? 0,
  }
}

export async function getSites(companyId?: string): Promise<Site[]>
export async function getSites(companyId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Site>>
export async function getSites(companyId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('sites')
      .select('*, cameras(count)', { count: 'exact' })
      .order('name')
    if (companyId) query = query.eq('company_id', companyId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapSite), count, pagination)
  }

  let query = supabase
    .from('sites')
    .select('*, cameras(count)')
    .order('name')
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapSite)
}

export async function getSiteById(id: string): Promise<Site | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*, cameras(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return mapSite(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/sites.ts
git commit -m "feat(pagination): add pagination overload to getSites"
```

---

### Task 8: Add pagination to getCompanies

**Files:**
- Modify: `src/lib/data/companies.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Company } from '@/lib/types'

function mapCompany(c: any): Company {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    sites: c.sites[0]?.count ?? 0,
    users: c.profiles[0]?.count ?? 0,
  }
}

export async function getCompanies(): Promise<Company[]>
export async function getCompanies(pagination: PaginationParams): Promise<PaginatedResult<Company>>
export async function getCompanies(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('companies')
      .select('*, sites(count), profiles(count)', { count: 'exact' })
      .order('name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapCompany), count, pagination)
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .order('name')
  if (error) throw error
  return (data ?? []).map(mapCompany)
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return mapCompany(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/companies.ts
git commit -m "feat(pagination): add pagination overload to getCompanies"
```

---

### Task 9: Add pagination to getGuards

**Files:**
- Modify: `src/lib/data/guards.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Profile } from '@/lib/types'

export async function getGuards(): Promise<Profile[]>
export async function getGuards(pagination: PaginationParams): Promise<PaginatedResult<Profile>>
export async function getGuards(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'guard')
      .order('full_name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guard')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function getGuardById(id: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'guard')
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/guards.ts
git commit -m "feat(pagination): add pagination overload to getGuards"
```

---

### Task 10: Add pagination to getTeamMembers

**Files:**
- Modify: `src/lib/data/profiles.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Profile } from '@/lib/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function getTeamMembers(): Promise<Profile[]>
export async function getTeamMembers(pagination: PaginationParams): Promise<PaginatedResult<Profile>>
export async function getTeamMembers(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('full_name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  if (error) throw error
  return data ?? []
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/profiles.ts
git commit -m "feat(pagination): add pagination overload to getTeamMembers"
```

---

### Task 11: Add pagination to getReports

**Files:**
- Modify: `src/lib/data/reports.ts`

- [ ] **Step 1: Add pagination overload**

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Report } from '@/lib/types'

function mapReport(r: any): Report {
  return {
    id: r.id,
    name: r.name,
    company_id: r.company_id,
    company_name: r.companies?.name ?? '',
    date: r.date,
    type: r.type,
    incident_count: r.incidents,
    size: r.size,
  }
}

export async function getReports(companyId?: string): Promise<Report[]>
export async function getReports(companyId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Report>>
export async function getReports(companyId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('reports')
      .select('*, companies(name)', { count: 'exact' })
      .order('date', { ascending: false })
    if (companyId) query = query.eq('company_id', companyId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapReport), count, pagination)
  }

  let query = supabase
    .from('reports')
    .select('*, companies(name)')
    .order('date', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapReport)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/reports.ts
git commit -m "feat(pagination): add pagination overload to getReports"
```

---

### Task 12: Add pagination to getActivity

**Files:**
- Modify: `src/lib/data/activity.ts`

- [ ] **Step 1: Add pagination overload**

`getActivity` already has a `limit` param. Add a separate pagination overload that ignores the old `limit` param when pagination is used.

Replace the file with:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { ActivityItem } from '@/lib/types'

function mapActivity(a: any): ActivityItem {
  return {
    id: a.id,
    who: a.profiles?.full_name ?? 'System',
    action: a.action,
    target: a.target,
    created_at: a.created_at,
    icon: a.icon,
    tone: a.tone,
  }
}

export async function getActivity(limit?: number): Promise<ActivityItem[]>
export async function getActivity(limit: number | undefined, pagination: PaginationParams): Promise<PaginatedResult<ActivityItem>>
export async function getActivity(limit = 20, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('activity_log')
      .select('*, profiles:actor_id(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapActivity), count, pagination)
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*, profiles:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(mapActivity)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/activity.ts
git commit -m "feat(pagination): add pagination overload to getActivity"
```

---

## Chunk 4: Final Verification

### Task 13: Full build verification

- [ ] **Step 1: Run lint**

Run: `cd primex && npx next lint --quiet`
Expected: No errors or warnings

- [ ] **Step 2: Run a production build to confirm type safety**

Run: `cd primex && npx next build`
Expected: Build succeeds — all existing callers still use the non-paginated overloads and return `T[]`

- [ ] **Step 3: Manually verify in browser**

Open http://localhost:3000 and navigate through:
- `/dashboard` — should load normally (no pagination yet, same as before)
- `/alerts` — should load normally
- `/dispatcher` — should load normally

All pages should render identically to before since no consumer is using the new pagination param yet.

- [ ] **Step 4: Final commit with any fixes**

If any type errors or lint issues were found and fixed:

```bash
git add -A
git commit -m "fix(pagination): resolve build issues from pagination infrastructure"
```

- [ ] **Step 5: Update Linear issue SEC-101 to Done**

Mark SEC-101 as complete. The infrastructure is now ready for SEC-102, SEC-103, and SEC-104 to wire pagination into individual pages.

---

## Summary of What This Delivers

| Component | What it does |
|-----------|-------------|
| `PaginationParams` | `{ page, pageSize }` — input to any query |
| `PaginatedResult<T>` | `{ data, total, page, pageSize, totalPages }` — output from paginated queries |
| `applyPagination()` | Applies `.range()` to any Supabase query builder |
| `toPaginatedResult()` | Wraps raw Supabase response into `PaginatedResult<T>` |
| `usePagination()` | Client hook — reads `?page=` from URL, returns `{ page, pageSize, setPage }` |
| `DataTable` pagination prop | Optional `{ page, pageSize, total, onPageChange }` — renders prev/next footer |
| 9 query functions | All have a new overload: pass `PaginationParams` to get `PaginatedResult<T>` |

All existing callers are **unchanged** — they continue to use the non-paginated overload and receive `T[]`.
