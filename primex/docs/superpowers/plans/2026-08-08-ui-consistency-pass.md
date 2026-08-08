# UI Consistency Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the reinvented-primitive drift found in the design-system audit (duplicated pagination, tone maps, modal, toggle, breadcrumb, page/section headings, and inconsistent container spacing) by extending `src/components/ui/` and migrating every identified call site onto it.

**Architecture:** Pure presentation refactor inside a Next.js 15 App Router app. No new dependencies, no token/palette changes, no new routes. Work happens in two layers: (1) extend `src/components/ui/` with a few new/hardened primitives, (2) migrate call sites across the 5 role dashboards (`dashboard`, `dispatcher`, `guard`, `manager`, `portal`) onto them.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS v4, `lucide-react` icons.

## Global Constraints

- No changes to Tailwind tokens/palette (`p-blue`, `ink`, `surface`, `border`, etc.) — spec Section 5.
- No changes to `Card`'s API — its `className` overrides are additive layout, not a problem — spec Section 5.
- No visual redesign — colors, radii, shadows, fonts stay as-is. This is a consistency refactor, not a restyle — spec Section 5.
- `opengraph-image.tsx`'s hex-literal duplication is a known exception (edge runtime, can't use Tailwind classes) — not touched.
- Path alias `@/*` maps to `./src/*`. Design-system barrel is `@/components/ui` (`src/components/ui/index.ts`).
- Icons come from `lucide-react` exclusively.
- No new test tooling — per the approved spec (Section 6), this refactor changes markup/classes only, not logic, so verification is `tsc`, `lint`, the existing E2E suite, and a manual visual pass, not new unit tests.

Spec: `primex/docs/superpowers/specs/2026-08-08-ui-consistency-design.md`

---

## Task 1: `Pagination` primitive + `DataTable` refactor

**Files:**
- Create: `src/components/ui/pagination.tsx`
- Modify: `src/components/ui/data-table.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces: `Pagination({ page, pageSize, total, onPageChange, itemLabel? })` — a self-contained row with a "X–Y of Z `<itemLabel>`" label (default `itemLabel = "results"`) on the left and Previous/Next controls on the right (controls hidden when `Math.ceil(total / pageSize) <= 1`). No outer border/padding — callers wrap it themselves, matching how `DataTable` already wraps its own footer.

- [ ] **Step 1: Create the `Pagination` component**

```tsx
// src/components/ui/pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "results",
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-3 font-sans tabular-nums">
        {total === 0
          ? `0 ${itemLabel}`
          : `${(page - 1) * pageSize + 1}–${Math.min(
              page * pageSize,
              total
            )} of ${total}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Refactor `DataTable` to use it**

In `src/components/ui/data-table.tsx`, replace the file's imports and pagination footer.

Old imports (lines 1–4):
```tsx
"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
```

New imports:
```tsx
"use client";

import type { ReactNode } from "react";
import { Pagination } from "./pagination";
```

Old footer (lines 75–111):
```tsx
      {pagination && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {pagination.total === 0
              ? "0 results"
              : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )} of ${pagination.total}`}
          </span>
          {totalPages > 1 && (
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
          )}
        </div>
      )}
```

New footer:
```tsx
      {pagination && (
        <div className="px-5 py-3 border-t border-border">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
```

Also remove the now-unused `totalPages` local (originally computed at the top of the component):
```tsx
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;
```
Delete this block entirely — `Pagination` now computes it internally.

- [ ] **Step 3: Export `Pagination` from the barrel**

In `src/components/ui/index.ts`, add after the `DataTable` export line:
```ts
export { Pagination } from "./pagination";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in `data-table.tsx`, `pagination.tsx`, or `index.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/pagination.tsx src/components/ui/data-table.tsx src/components/ui/index.ts
git commit -m "feat(ui): extract Pagination primitive, use it in DataTable"
```

---

## Task 2: Export `Pill`'s tone map, migrate the 3 duplicated tone lookups

**Files:**
- Modify: `src/components/ui/pill.tsx`
- Modify: `src/app/(app)/dispatcher/sections/activity.tsx`
- Modify: `src/app/(app)/audit/audit-client.tsx`
- Modify: `src/app/(app)/portal/sections/home.tsx`

**Interfaces:**
- Produces: `getToneClasses(tone: Tone): { fg: string; bg: string }` exported from `src/components/ui/pill.tsx`, and the `Tone` type itself exported for callers that want to type their own tone values.

- [ ] **Step 1: Export the tone map and its type from `pill.tsx`**

Old (lines 1–13):
```tsx
"use client";

type Tone = "red" | "amber" | "green" | "blue" | "gray" | "navy";
type Size = "sm" | "md";

const toneClasses: Record<Tone, { fg: string; bg: string }> = {
  red:   { fg: "text-p-red",   bg: "bg-p-red-soft" },
  amber: { fg: "text-p-amber", bg: "bg-p-amber-soft" },
  green: { fg: "text-p-green", bg: "bg-p-green-soft" },
  blue:  { fg: "text-p-blue",  bg: "bg-p-blue-soft" },
  gray:  { fg: "text-p-gray",  bg: "bg-p-gray-soft" },
  navy:  { fg: "text-white",   bg: "bg-navy" },
};
```

New:
```tsx
"use client";

export type Tone = "red" | "amber" | "green" | "blue" | "gray" | "navy";
type Size = "sm" | "md";

const toneClasses: Record<Tone, { fg: string; bg: string }> = {
  red:   { fg: "text-p-red",   bg: "bg-p-red-soft" },
  amber: { fg: "text-p-amber", bg: "bg-p-amber-soft" },
  green: { fg: "text-p-green", bg: "bg-p-green-soft" },
  blue:  { fg: "text-p-blue",  bg: "bg-p-blue-soft" },
  gray:  { fg: "text-p-gray",  bg: "bg-p-gray-soft" },
  navy:  { fg: "text-white",   bg: "bg-navy" },
};

export function getToneClasses(tone: Tone): { fg: string; bg: string } {
  return toneClasses[tone];
}
```

- [ ] **Step 2: Export it from the barrel**

In `src/components/ui/index.ts`, change:
```ts
export { Pill } from "./pill";
```
to:
```ts
export { Pill, getToneClasses, type Tone } from "./pill";
```

- [ ] **Step 3: Migrate `dispatcher/sections/activity.tsx`**

Old (lines 15, 33–39, 82–86):
```tsx
import { PageTitle, Card } from '@/components/ui'
```
```tsx
const toneBg: Record<string, string> = {
  red: 'bg-p-red-soft text-p-red',
  amber: 'bg-p-amber-soft text-p-amber',
  green: 'bg-p-green-soft text-p-green',
  blue: 'bg-p-blue-soft text-p-blue',
  gray: 'bg-p-gray-soft text-p-gray',
}
```
```tsx
              const Icon = iconMap[item.icon] ?? Bell
              const toneClass = toneBg[item.tone] ?? toneBg.gray

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Icon */}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClass}`}
                  >
```

New:
```tsx
import { PageTitle, Card, getToneClasses } from '@/components/ui'
```
Delete the `toneBg` object entirely. Replace the icon block:
```tsx
              const Icon = iconMap[item.icon] ?? Bell
              const { fg, bg } = getToneClasses(item.tone)

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Icon */}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}
                  >
```
And update the icon's own color to use `fg` instead of being colorless — the `<Icon>` right below currently has no color class (it inherited from a parent), so add `className={fg}` to it:
```tsx
                    <Icon size={15} strokeWidth={2} className={fg} />
```

- [ ] **Step 4: Migrate `audit-client.tsx`**

Old (lines 25–31, 109–135):
```tsx
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
} from "@/components/ui";
```
```tsx
function ActivityIcon({ iconName, tone }: { iconName: string; tone: ActivityItem["tone"] }) {
  const Icon = ICON_MAP[iconName] ?? Activity;

  const bgMap: Record<ActivityItem["tone"], string> = {
    red: "bg-p-red-soft",
    amber: "bg-p-amber-soft",
    green: "bg-p-green-soft",
    blue: "bg-p-blue-soft",
    gray: "bg-p-gray-soft",
  };

  const fgMap: Record<ActivityItem["tone"], string> = {
    red: "text-p-red",
    amber: "text-p-amber",
    green: "text-p-green",
    blue: "text-p-blue",
    gray: "text-p-gray",
  };

  return (
    <span
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bgMap[tone]}`}
    >
      <Icon size={16} strokeWidth={2} className={fgMap[tone]} />
    </span>
  );
}
```

New:
```tsx
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
  getToneClasses,
} from "@/components/ui";
```
```tsx
function ActivityIcon({ iconName, tone }: { iconName: string; tone: ActivityItem["tone"] }) {
  const Icon = ICON_MAP[iconName] ?? Activity;
  const { fg, bg } = getToneClasses(tone);

  return (
    <span
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}
    >
      <Icon size={16} strokeWidth={2} className={fg} />
    </span>
  );
}
```

- [ ] **Step 5: Migrate `portal/sections/home.tsx`**

Old (lines 13, 133–139, 233–235):
```tsx
import { PageTitle, Card, StatCard, Button, KV } from '@/components/ui'
```
```tsx
  const toneCircleColors: Record<string, string> = {
    red: 'bg-p-red-soft text-p-red',
    amber: 'bg-p-amber-soft text-p-amber',
    green: 'bg-p-green-soft text-p-green',
    blue: 'bg-p-blue-soft text-p-blue',
    gray: 'bg-p-gray-soft text-p-gray',
  }
```
```tsx
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    toneCircleColors[event.tone] ?? toneCircleColors.gray
                  }`}
                >
```

New:
```tsx
import { PageTitle, Card, StatCard, Button, KV, getToneClasses } from '@/components/ui'
```
Delete the `toneCircleColors` object entirely. Replace the div:
```tsx
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    getToneClasses(event.tone).bg
                  } ${getToneClasses(event.tone).fg}`}
                >
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. `ActivityItem["tone"]` (`'red' | 'amber' | 'green' | 'blue' | 'gray'`, confirmed in `src/lib/types/index.ts:209`) is a strict subset of `Tone`, so it's directly assignable — no cast needed.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/pill.tsx src/components/ui/index.ts src/app/\(app\)/dispatcher/sections/activity.tsx src/app/\(app\)/audit/audit-client.tsx src/app/\(app\)/portal/sections/home.tsx
git commit -m "refactor(ui): export Pill's tone map, dedupe 3 local copies"
```

---

## Task 3: `SectionHeader` primitive + migrate drifted headings

**Files:**
- Create: `src/components/ui/section-header.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/app/(app)/companies/[id]/company-detail-client.tsx`
- Modify: `src/app/(app)/dashboard/dashboard-client.tsx`
- Modify: `src/app/(app)/manager/sections/dashboard.tsx`
- Modify: `src/app/(app)/dispatcher/sections/queue.tsx`
- Modify: `src/app/(app)/manager/sections/reports.tsx`
- Modify: `src/app/(app)/reports/reports-client.tsx`
- Modify: `src/app/(app)/portal/sections/home.tsx`
- Modify: `src/app/(app)/portal/sections/help.tsx`

**Note on scope:** `portal/sections/alerts.tsx:77` (`alert.title` as a per-row card heading inside a list) is intentionally **excluded** — it's dynamic per-item content, not a static section heading, so it doesn't share `SectionHeader`'s semantic role.

**Interfaces:**
- Produces: `SectionHeader({ title, eyebrow?, sub?, actions? })` where `title` and `sub` are `React.ReactNode` (not just `string`) so callers can embed inline elements (e.g. a `LiveDot` or a trailing count span) exactly as the originals did.

- [ ] **Step 1: Create `SectionHeader`**

```tsx
// src/components/ui/section-header.tsx
"use client";

import { Label } from "./label";

interface SectionHeaderProps {
  title: React.ReactNode;
  eyebrow?: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, eyebrow, sub, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        {eyebrow && <Label>{eyebrow}</Label>}
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        {sub && <p className="text-ink-3 text-xs font-sans">{sub}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Export it from the barrel**

In `src/components/ui/index.ts`, add after the `PageTitle` export line:
```ts
export { SectionHeader } from "./section-header";
```

- [ ] **Step 3: Migrate `companies/[id]/company-detail-client.tsx`** (3 headings)

Add `SectionHeader` to the import (currently `{ Card, Pill, DataTable, Button, StatCard, KV }` — the `Button` import is removed in Task 4, so for now just add `SectionHeader`):
```tsx
import {
  Card,
  Pill,
  DataTable,
  Button,
  StatCard,
  KV,
  SectionHeader,
} from "@/components/ui";
```

"Company details" — old:
```tsx
        <Card>
          <div className="flex flex-col gap-1 mb-4">
            <h3 className="font-serif text-lg font-semibold text-ink">Company details</h3>
          </div>
          <div className="flex flex-col gap-3">
```
new:
```tsx
        <Card>
          <div className="mb-4">
            <SectionHeader title="Company details" />
          </div>
          <div className="flex flex-col gap-3">
```

"Sites" — old:
```tsx
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-serif text-lg font-semibold text-ink">Sites</h3>
              <p className="text-ink-3 text-xs font-sans">
                {companySites.length} site{companySites.length !== 1 ? "s" : ""} under this company
              </p>
            </div>
          </div>
```
new:
```tsx
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title="Sites"
              sub={`${companySites.length} site${companySites.length !== 1 ? "s" : ""} under this company`}
            />
          </div>
```

"Team members" — old:
```tsx
        <div className="px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-serif text-lg font-semibold text-ink">Team members</h3>
            <p className="text-ink-3 text-xs font-sans">
              Primex staff and client users with access to this company
            </p>
          </div>
        </div>
```
new:
```tsx
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader
            title="Team members"
            sub="Primex staff and client users with access to this company"
          />
        </div>
```

- [ ] **Step 4: Migrate `dashboard/dashboard-client.tsx`** (3 headings)

Add `SectionHeader` to the `@/components/ui` import list (alongside `PageTitle, StatCard, Card, Pill, DataTable, Button, LiveDot, FilterPills`).

"Recent active incidents" — old:
```tsx
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-serif text-xl font-semibold text-ink">
                Recent active incidents
              </h2>
              <p className="text-ink-3 text-xs font-sans">Live · all companies</p>
            </div>
            <Button variant="link" size="sm" icon={ArrowRight} onClick={() => router.push("/incidents")}>
              View all
            </Button>
          </div>
```
new:
```tsx
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title="Recent active incidents"
              sub="Live · all companies"
              actions={
                <Button variant="link" size="sm" icon={ArrowRight} onClick={() => router.push("/incidents")}>
                  View all
                </Button>
              }
            />
          </div>
```

"Critical alerts" — old:
```tsx
          <div className="px-[22px] py-4 border-b border-border">
            <div className="flex flex-col gap-0.5">
              <h2 className="inline-flex items-center gap-2.5 font-serif text-[20px] font-bold text-ink">
                <LiveDot color="red" />
                Critical alerts
              </h2>
              <p className="text-[12.5px] text-ink-3 font-sans">Need review now</p>
            </div>
          </div>
```
new:
```tsx
          <div className="px-[22px] py-4 border-b border-border">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2.5">
                  <LiveDot color="red" />
                  Critical alerts
                </span>
              }
              sub="Need review now"
            />
          </div>
```

"Camera status by company" — old:
```tsx
        <div className="px-[22px] py-4 border-b border-border flex flex-col gap-1">
          <h2 className="font-serif text-[20px] font-bold text-ink">
            Camera status by company
          </h2>
          <p className="text-[12.5px] text-ink-3 font-sans">
            Online · Offline · Maintenance · Unknown
          </p>
        </div>
```
new:
```tsx
        <div className="px-[22px] py-4 border-b border-border">
          <SectionHeader
            title="Camera status by company"
            sub="Online · Offline · Maintenance · Unknown"
          />
        </div>
```

- [ ] **Step 5: Migrate `manager/sections/dashboard.tsx`** (2 headings)

Add `SectionHeader` to the `@/components/ui` import (alongside `PageTitle, StatCard, Card, Pill, DataTable`).

"Recent incidents" — old:
```tsx
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Recent incidents
            </h2>
            <p className="text-[12.5px] text-ink-3">
              Last {recentIncidents.length} incidents for {company.name}
            </p>
          </div>
```
new:
```tsx
          <div className="px-6 pt-5 pb-0">
            <SectionHeader
              title="Recent incidents"
              sub={`Last ${recentIncidents.length} incidents for ${company.name}`}
            />
          </div>
```

"Avg response time" — old:
```tsx
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Avg response time
            </h2>
            <p className="text-[12.5px] text-ink-3">All time</p>
          </div>
```
new:
```tsx
          <div className="mb-6">
            <SectionHeader title="Avg response time" sub="All time" />
          </div>
```

- [ ] **Step 6: Migrate `dispatcher/sections/queue.tsx`** (1 heading, with eyebrow)

Old import (line 14):
```tsx
import { Button, Pill, Label, Card, LiveDot, KV } from '@/components/ui'
```
New (drop `Label` — it was only used for this heading; add `SectionHeader`):
```tsx
import { Button, Pill, Card, LiveDot, KV, SectionHeader } from '@/components/ui'
```

Old (lines 93–107):
```tsx
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label>Live queue</Label>
              <h2 className="font-serif text-xl font-semibold text-ink">
                Alerts{' '}
                <span className="text-ink-3 font-sans text-sm font-normal">
                  ({filtered.length})
                </span>
              </h2>
            </div>
            <Button variant="primary" size="sm" icon={Bell} onClick={() => setCreateAlertOpen(true)}>
              Create alert
            </Button>
          </div>
```
New:
```tsx
          <SectionHeader
            eyebrow="Live queue"
            title={
              <>
                Alerts{' '}
                <span className="text-ink-3 font-sans text-sm font-normal">
                  ({filtered.length})
                </span>
              </>
            }
            actions={
              <Button variant="primary" size="sm" icon={Bell} onClick={() => setCreateAlertOpen(true)}>
                Create alert
              </Button>
            }
          />
```

- [ ] **Step 7: Migrate `manager/sections/reports.tsx`** (1 heading)

Add `SectionHeader` to the `@/components/ui` import (alongside `PageTitle, StatCard, Card, Pill, DataTable, Button`).

Old (lines 183–192):
```tsx
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Recent reports
            </h2>
            <p className="text-ink-3 text-xs font-sans">
              Sorted by date
            </p>
          </div>
        </div>
```
New:
```tsx
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader title="Recent reports" sub="Sorted by date" />
        </div>
```

- [ ] **Step 8: Migrate `reports/reports-client.tsx`** (3 headings)

Add `SectionHeader` to the `@/components/ui` import (alongside `PageTitle, StatCard, Card, Pill, DataTable, Button`).

"Incidents over time" — old:
```tsx
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Incidents over time
            </h2>
            <p className="text-[12.5px] text-ink-3">
              Last 6 months &middot; all companies
            </p>
          </div>
```
new:
```tsx
          <div className="px-6 pt-5 pb-0">
            <SectionHeader title="Incidents over time" sub="Last 6 months · all companies" />
          </div>
```

"Top incident types" — old:
```tsx
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Top incident types
            </h2>
            <p className="text-[12.5px] text-ink-3">Apr 2026</p>
          </div>
```
new:
```tsx
          <div className="px-6 pt-5 pb-0">
            <SectionHeader title="Top incident types" sub="Apr 2026" />
          </div>
```

"Recent reports" — old:
```tsx
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-xl font-semibold text-ink">Recent reports</h2>
            <p className="text-ink-3 text-xs font-sans">All companies - sorted by date</p>
          </div>
        </div>
```
new:
```tsx
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader title="Recent reports" sub="All companies - sorted by date" />
        </div>
```

- [ ] **Step 9: Migrate `portal/sections/home.tsx`** (3 headings)

Add `SectionHeader` to the import (alongside `PageTitle, Card, StatCard, Button, KV` — `getToneClasses` was already added in Task 2):
```tsx
import { PageTitle, Card, StatCard, Button, KV, getToneClasses, SectionHeader } from '@/components/ui'
```

"What happened recently" — old:
```tsx
        <Card>
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">
            What happened recently
          </h3>
          <div className="flex flex-col gap-4">
```
new:
```tsx
        <Card>
          <div className="mb-4">
            <SectionHeader title="What happened recently" />
          </div>
          <div className="flex flex-col gap-4">
```

"Need help?" — old:
```tsx
          <Card>
            <h3 className="font-serif text-lg font-semibold text-ink mb-3">
              Need help?
            </h3>
            <p className="text-sm text-ink-3 font-sans mb-4">
```
new:
```tsx
          <Card>
            <div className="mb-3">
              <SectionHeader title="Need help?" />
            </div>
            <p className="text-sm text-ink-3 font-sans mb-4">
```

"This month" — old:
```tsx
          <Card>
            <h3 className="font-serif text-lg font-semibold text-ink mb-3">
              This month
            </h3>
            <div className="flex flex-col gap-2.5">
```
new:
```tsx
          <Card>
            <div className="mb-3">
              <SectionHeader title="This month" />
            </div>
            <div className="flex flex-col gap-2.5">
```

- [ ] **Step 10: Migrate `portal/sections/help.tsx`** (3 headings)

Add `SectionHeader` to the import (alongside `PageTitle, Card, Button`).

Each of the 3 cards has the same shape — old:
```tsx
              <h3 className="font-serif text-[22px] font-semibold text-ink leading-snug">
                Call dispatch
              </h3>
```
new:
```tsx
              <SectionHeader title="Call dispatch" />
```
Repeat for `Report an incident` and `Email support` (same before/after shape, different title text).

- [ ] **Step 11: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Check specifically that removing `Label`/`Button` from an import list didn't leave it referenced elsewhere in that file (only `dispatcher/sections/queue.tsx` drops `Label` in this task — `Button` stays there since it's still used for other buttons in the file).

- [ ] **Step 12: Commit**

```bash
git add src/components/ui/section-header.tsx src/components/ui/index.ts \
  src/app/\(app\)/companies/\[id\]/company-detail-client.tsx \
  src/app/\(app\)/dashboard/dashboard-client.tsx \
  src/app/\(app\)/manager/sections/dashboard.tsx \
  src/app/\(app\)/dispatcher/sections/queue.tsx \
  src/app/\(app\)/manager/sections/reports.tsx \
  src/app/\(app\)/reports/reports-client.tsx \
  src/app/\(app\)/portal/sections/home.tsx \
  src/app/\(app\)/portal/sections/help.tsx
git commit -m "feat(ui): add SectionHeader, migrate 16 drifted card/section headings"
```

---

## Task 4: Extend `Breadcrumb` for navigation, migrate ad-hoc back-links

**Files:**
- Modify: `src/components/ui/breadcrumb.tsx`
- Modify: `src/app/(app)/sites/[id]/site-detail-client.tsx`
- Modify: `src/app/(app)/alerts/[id]/alert-detail-client.tsx`
- Modify: `src/app/(app)/cameras/[id]/camera-detail-client.tsx`
- Modify: `src/app/(app)/companies/[id]/company-detail-client.tsx`
- Modify: `src/app/(app)/guard/guard-client.tsx`

**Why `Breadcrumb` needs a small API change first:** today `Breadcrumb` only renders static labels — non-last items get hover styling but there's no `onClick`, so they aren't actually clickable (its one existing caller, `incident-detail-client.tsx`, doesn't need them to be). Every "Back to X" link being migrated *does* navigate on click, so migrating them onto `Breadcrumb` as-is would silently break navigation. `Breadcrumb` needs an optional per-item click handler, kept backward-compatible with plain `string[]` (used by `page-strip.tsx` and unchanged by this task).

**Interfaces:**
- Produces: `Breadcrumb({ items: (string | { label: string; onClick?: () => void })[] })`. Existing plain-string callers are unaffected.

- [ ] **Step 1: Extend `Breadcrumb`**

Old (`src/components/ui/breadcrumb.tsx`, full file):
```tsx
"use client";

import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  items: string[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 font-sans text-xs sm:text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={13} className="text-ink-4 flex-shrink-0" strokeWidth={2} />
            )}
            <span
              className={
                isLast
                  ? "text-ink font-semibold"
                  : "text-ink-3 hover:text-ink-2 cursor-pointer transition-colors duration-100"
              }
            >
              {item}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
```

New:
```tsx
"use client";

import { ChevronRight } from "lucide-react";

type BreadcrumbItem = string | { label: string; onClick?: () => void };

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 font-sans text-xs sm:text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const label = typeof item === "string" ? item : item.label;
        const onClick = typeof item === "string" ? undefined : item.onClick;

        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={13} className="text-ink-4 flex-shrink-0" strokeWidth={2} />
            )}
            {!isLast && onClick ? (
              <button
                type="button"
                onClick={onClick}
                className="text-ink-3 hover:text-ink-2 cursor-pointer transition-colors duration-100"
              >
                {label}
              </button>
            ) : (
              <span
                className={
                  isLast
                    ? "text-ink font-semibold"
                    : "text-ink-3 hover:text-ink-2 cursor-pointer transition-colors duration-100"
                }
              >
                {label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Migrate `sites/[id]/site-detail-client.tsx`**

Old import (line 5):
```tsx
import { Card, Pill, Button, Label } from "@/components/ui";
```
New:
```tsx
import { Card, Pill, Button, Label, Breadcrumb } from "@/components/ui";
```
Old import (line 5, lucide-react):
```tsx
import { MapPin, Settings, ArrowLeft, Camera } from "lucide-react";
```
New (drop `ArrowLeft` — unused after this migration):
```tsx
import { MapPin, Settings, Camera } from "lucide-react";
```

Old (lines 52–60):
```tsx
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/sites")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Sites
      </button>
```
New:
```tsx
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Sites", onClick: () => router.push("/sites") }, site.name]} />
```

- [ ] **Step 3: Migrate `alerts/[id]/alert-detail-client.tsx`**

Old import (line 6):
```tsx
import { Card, Pill, Button, KV } from "@/components/ui";
```
New:
```tsx
import { Card, Pill, Button, KV, Breadcrumb } from "@/components/ui";
```
Old import (line 5):
```tsx
import { MapPin, Camera, ArrowLeft, AlertTriangle, X } from "lucide-react";
```
New:
```tsx
import { MapPin, Camera, AlertTriangle, X } from "lucide-react";
```

Old (lines 60–68):
```tsx
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/alerts")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Alerts
      </button>
```
New:
```tsx
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Alerts", onClick: () => router.push("/alerts") }, alert.title]} />
```

- [ ] **Step 4: Migrate `cameras/[id]/camera-detail-client.tsx`**

Old import (line 6):
```tsx
import { Card, KV, Button, Label, Pill } from "@/components/ui";
```
New:
```tsx
import { Card, KV, Button, Label, Pill, Breadcrumb } from "@/components/ui";
```
Old import (line 5):
```tsx
import { ArrowLeft, Trash2 } from "lucide-react";
```
New:
```tsx
import { Trash2 } from "lucide-react";
```

Old (lines 56–64):
```tsx
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/cameras")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Cameras
      </button>
```
New:
```tsx
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Cameras", onClick: () => router.push("/cameras") }, camera.name]} />
```

- [ ] **Step 5: Migrate `companies/[id]/company-detail-client.tsx`**

This file has no `useRouter` today (its old back-link used `history.back()`) and no longer needs `Button` or `ArrowLeft` after this change (both were only used for the back-link — `Button` is not referenced anywhere else in this file).

Old imports (lines 1–21):
```tsx
"use client";

import {
  MapPin,
  Users,
  Briefcase,
  Camera,
  Building,
  ArrowLeft,
} from "lucide-react";

import {
  Card,
  Pill,
  DataTable,
  Button,
  StatCard,
  KV,
} from "@/components/ui";
```
New:
```tsx
"use client";

import { useRouter } from "next/navigation";

import {
  MapPin,
  Users,
  Briefcase,
  Camera,
  Building,
} from "lucide-react";

import {
  Card,
  Pill,
  DataTable,
  StatCard,
  KV,
  SectionHeader,
  Breadcrumb,
} from "@/components/ui";
```
(`SectionHeader` was already added in Task 3, Step 3 — this replaces that import block with the final version including `Breadcrumb` and dropping `Button`.)

Add the router instance inside the component (right after the `export function CompanyDetailClient({ ... }) {` line, before the derived-data comments):
```tsx
export function CompanyDetailClient({ company, sites, cameras, team }: CompanyDetailClientProps) {
  const router = useRouter();

  // Derived data
```

Old (lines 143–153):
```tsx
      {/* Back nav */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => history.back()}
        >
          Back to companies
        </Button>
      </div>
```
New:
```tsx
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Companies", onClick: () => router.push("/companies") }, company.name]} />
```

- [ ] **Step 6: Migrate `guard/guard-client.tsx`'s two back-links**

Old import (line 5):
```tsx
import { Button, Pill, Label, LiveDot } from '@/components/ui'
```
New:
```tsx
import { Button, Pill, Label, LiveDot, Breadcrumb } from '@/components/ui'
```
Old import (lines 16–25, lucide-react):
```tsx
import {
  MapPin,
  ArrowLeft,
  Check,
  Navigation,
  CheckCircle2,
  Upload,
  Phone,
  LogOut,
} from 'lucide-react'
```
New:
```tsx
import {
  MapPin,
  Check,
  Navigation,
  CheckCircle2,
  Upload,
  Phone,
  LogOut,
} from 'lucide-react'
```

Resolved-state back button — old (lines 345–351):
```tsx
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[12.5px] text-ink-2 font-sans mb-5 cursor-pointer hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </button>
```
new:
```tsx
        <div className="mb-5">
          <Breadcrumb items={[{ label: "Assignments", onClick: onBack }, incident.title]} />
        </div>
```

Active-state back button — old (lines 376–382):
```tsx
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[12.5px] text-ink-2 font-sans mb-5 cursor-pointer hover:text-ink transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </button>
```
new:
```tsx
      <div className="mb-5">
        <Breadcrumb items={[{ label: "Assignments", onClick: onBack }, incident.title]} />
      </div>
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm `page-strip.tsx`'s `<Breadcrumb items={crumbs} />` (where `crumbs: string[]`) still type-checks against the new `BreadcrumbItem[]` prop type — it should, since `string` is one arm of the `BreadcrumbItem` union.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/breadcrumb.tsx \
  src/app/\(app\)/sites/\[id\]/site-detail-client.tsx \
  src/app/\(app\)/alerts/\[id\]/alert-detail-client.tsx \
  src/app/\(app\)/cameras/\[id\]/camera-detail-client.tsx \
  src/app/\(app\)/companies/\[id\]/company-detail-client.tsx \
  src/app/\(app\)/guard/guard-client.tsx
git commit -m "feat(ui): make Breadcrumb items clickable, migrate 5 ad-hoc back-links"
```

---

## Task 5: `PageTitle` compact variant + migrate 2 oversized/undersized headings

**Files:**
- Modify: `src/components/ui/page-title.tsx`
- Modify: `src/app/(app)/guard/guard-client.tsx`
- Modify: `src/app/(app)/dispatcher/sections/queue.tsx`

**Interfaces:**
- Produces: `PageTitle({ title, sub?, actions?, phaseTag?, size? })` where `size` defaults to `"default"` (`text-2xl sm:text-4xl font-semibold`, unchanged) and `"compact"` renders a fixed `text-2xl font-semibold` (no responsive scale-up — appropriate for guard's phone-only view, which never renders at `sm+`).

- [ ] **Step 1: Add the `size` prop to `PageTitle`**

Old (full file, `src/components/ui/page-title.tsx`):
```tsx
"use client";

import { PhaseTag } from "./phase-tag";

interface PageTitleProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  phaseTag?: string;
}

export function PageTitle({ title, sub, actions, phaseTag }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-ink leading-tight">
              {title}
            </h1>
            {phaseTag && <PhaseTag>{phaseTag}</PhaseTag>}
          </div>
          {sub && <p className="text-ink-3 text-xs sm:text-sm">{sub}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
```

New:
```tsx
"use client";

import { PhaseTag } from "./phase-tag";

type PageTitleSize = "default" | "compact";

interface PageTitleProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  phaseTag?: string;
  size?: PageTitleSize;
}

const titleSizeClasses: Record<PageTitleSize, string> = {
  default: "text-2xl sm:text-4xl font-semibold",
  compact: "text-2xl font-semibold",
};

export function PageTitle({ title, sub, actions, phaseTag, size = "default" }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`font-serif ${titleSizeClasses[size]} text-ink leading-tight`}>
              {title}
            </h1>
            {phaseTag && <PhaseTag>{phaseTag}</PhaseTag>}
          </div>
          {sub && <p className="text-ink-3 text-xs sm:text-sm">{sub}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Migrate guard's greeting `<h1>`**

Old import (line 5):
```tsx
import { Button, Pill, Label, LiveDot, Breadcrumb } from '@/components/ui'
```
New:
```tsx
import { Button, Pill, Label, LiveDot, Breadcrumb, PageTitle } from '@/components/ui'
```

Old (lines 204–211):
```tsx
      {/* Greeting */}
      <h1 className="font-serif text-[26px] font-bold text-ink leading-tight mb-6">
        Hi {firstName}
        <span className="font-serif text-[26px] italic font-normal text-ink-3">
          {' '}
          &middot; {incidents.length} assignment{incidents.length !== 1 ? 's' : ''}
        </span>
      </h1>
```
New:
```tsx
      {/* Greeting */}
      <div className="mb-6">
        <PageTitle
          size="compact"
          title={`Hi ${firstName}`}
          sub={`${incidents.length} assignment${incidents.length !== 1 ? 's' : ''}`}
        />
      </div>
```

- [ ] **Step 3: Migrate dispatcher queue's alert-detail title**

Add `PageTitle` to the `@/components/ui` import (alongside `Button, Pill, Card, LiveDot, KV, SectionHeader` from Task 3, Step 6).

Old (lines 208–211):
```tsx
              {/* Title */}
              <h1 className="font-serif text-[32px] font-semibold text-ink leading-tight">
                {selected.title}
              </h1>
```
New:
```tsx
              {/* Title */}
              <PageTitle title={selected.title} />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/page-title.tsx src/app/\(app\)/guard/guard-client.tsx src/app/\(app\)/dispatcher/sections/queue.tsx
git commit -m "feat(ui): add PageTitle compact variant, migrate guard + dispatcher headings"
```

---

## Task 6: Migrate the 6 hand-rolled pagination call sites onto `Pagination`

**Files:**
- Modify: `src/app/(app)/cameras/cameras-client.tsx`
- Modify: `src/app/(app)/manager/sections/cameras.tsx`
- Modify: `src/app/(app)/portal/sections/alerts.tsx`
- Modify: `src/app/(app)/dispatcher/sections/incidents.tsx`
- Modify: `src/app/(app)/dispatcher/sections/activity.tsx`
- Modify: `src/app/(app)/audit/audit-client.tsx`

**Behavior note:** 3 of these 6 (`dispatcher/sections/incidents.tsx`, `dispatcher/sections/activity.tsx`, `portal/sections/alerts.tsx`, `manager/sections/cameras.tsx` — 4 actually) currently hide the *entire* pagination block, including the "X of Y" count, whenever there's only one page. `DataTable`'s own built-in pagination (and `cameras-client.tsx`/`audit-client.tsx`, which already match it) always show the count and hide only the Previous/Next controls. Since `DataTable`'s behavior can't be changed without altering 3 other pages that already depend on it (`reports-client.tsx`, `portal/sections/reports.tsx`, `portal/sections/incidents.tsx`) and weren't flagged as a problem, this task standardizes all 6 sites on `DataTable`'s existing behavior: **always render `Pagination` (drop the outer `totalPages > 1` guard where present) — the component itself decides whether to show Previous/Next.**

- [ ] **Step 1: Migrate `cameras/cameras-client.tsx`**

Old import (line 6):
```tsx
import { PageTitle, StatCard, ActionMenu } from "@/components/ui";
```
New:
```tsx
import { PageTitle, StatCard, ActionMenu, Pagination } from "@/components/ui";
```
Old import (line 4, lucide-react) — drop `ChevronLeft`, `ChevronRight` (no longer used directly):
```tsx
import { Wifi, WifiOff, Wrench, Circle, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
```
New:
```tsx
import { Wifi, WifiOff, Wrench, Circle, Plus, Eye, Pencil, Trash2 } from "lucide-react";
```

Old (lines 88–120):
```tsx
        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {total === 0
                ? "0 cameras"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
```
New:
```tsx
        {/* Pagination */}
        {total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="cameras" />
        )}
```
(The now-unused `totalPages` local at the top of the component can stay — it's harmless dead code removal is optional here since it's not referenced elsewhere; for cleanliness, remove it: delete `const totalPages = Math.ceil(total / pageSize);`.)

- [ ] **Step 2: Migrate `manager/sections/cameras.tsx`**

Old import (line 5):
```tsx
import { PageTitle, Button, Card, ActionMenu } from "@/components/ui";
```
New:
```tsx
import { PageTitle, Button, Card, ActionMenu, Pagination } from "@/components/ui";
```
Old import (line 4) — drop `ChevronLeft, ChevronRight`:
```tsx
import { Plus, ChevronLeft, ChevronRight, Camera as CameraIcon, Pencil, Trash2 } from "lucide-react";
```
New:
```tsx
import { Plus, Camera as CameraIcon, Pencil, Trash2 } from "lucide-react";
```

Old (lines 83–110):
```tsx
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, cameras.length)} of {cameras.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
```
New:
```tsx
        {cameras.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={cameras.length} onPageChange={setPage} itemLabel="cameras" />
        )}
```
(`totalPages` local stays unused only if referenced elsewhere in the file — check: it is not, so delete `const totalPages = Math.ceil(cameras.length / PAGE_SIZE);` too.)

- [ ] **Step 3: Migrate `portal/sections/alerts.tsx`**

Old import (line 5):
```tsx
import { PageTitle, Card, Pill, Button } from '@/components/ui'
```
New:
```tsx
import { PageTitle, Card, Pill, Button, Pagination } from '@/components/ui'
```
Old import (line 4) — drop `ChevronLeft, ChevronRight`:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
```
Delete this import line entirely (nothing else from `lucide-react` is imported in this file).

Old (lines 96–123):
```tsx
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, alerts.length)} of {alerts.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
```
New:
```tsx
      {alerts.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={alerts.length} onPageChange={setPage} itemLabel="alerts" />
      )}
```
Delete the now-unused `const totalPages = Math.ceil(alerts.length / PAGE_SIZE);` line.

- [ ] **Step 4: Migrate `dispatcher/sections/incidents.tsx`**

Old import (line 4) — drop, nothing else from lucide-react remains:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
```
Delete this line.
Old import (line 5):
```tsx
import { PageTitle } from '@/components/ui'
```
New:
```tsx
import { PageTitle, Pagination } from '@/components/ui'
```

Old (lines 57–84):
```tsx
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, open.length)} of {open.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
```
New:
```tsx
      {open.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={open.length} onPageChange={setPage} itemLabel="incidents" />
      )}
```
Delete the now-unused `const totalPages = Math.ceil(open.length / PAGE_SIZE);` line.

- [ ] **Step 5: Migrate `dispatcher/sections/activity.tsx`**

Old import (line 14) — drop, nothing else from this line remains:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
```
Delete this line.
Old import (line 15):
```tsx
import { PageTitle, Card, getToneClasses } from '@/components/ui'
```
New:
```tsx
import { PageTitle, Card, getToneClasses, Pagination } from '@/components/ui'
```

Old (lines 109–136):
```tsx
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, activity.length)} of {activity.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
```
New:
```tsx
        {activity.length > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <Pagination page={page} pageSize={PAGE_SIZE} total={activity.length} onPageChange={setPage} itemLabel="events" />
          </div>
        )}
```
Delete the now-unused `const totalPages = Math.ceil(activity.length / PAGE_SIZE);` line.

- [ ] **Step 6: Migrate `audit-client.tsx`**

Old import (lines 22–23) — drop `ChevronLeft, ChevronRight`:
```tsx
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
```
New (remove those two lines from the `lucide-react` import list; keep the rest as-is).

Old import (lines 25–31):
```tsx
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
  getToneClasses,
} from "@/components/ui";
```
New:
```tsx
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
  getToneClasses,
  Pagination,
} from "@/components/ui";
```

Old (lines 270–304):
```tsx
        {/* Pagination footer */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {total === 0
                ? "0 results"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
```
New:
```tsx
        {/* Pagination footer */}
        {total > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        )}
```
(`totalPages` is computed once near the top of the component (`const totalPages = Math.ceil(total / pageSize);`) and not used elsewhere in this file — delete that line too.)

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors — in particular no unused-import warnings for `ChevronLeft`/`ChevronRight` and no unused `totalPages` locals.

Run: `npm run lint`
Expected: clean (ESLint's `no-unused-vars` would catch anything missed above).

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/cameras/cameras-client.tsx \
  src/app/\(app\)/manager/sections/cameras.tsx \
  src/app/\(app\)/portal/sections/alerts.tsx \
  src/app/\(app\)/dispatcher/sections/incidents.tsx \
  src/app/\(app\)/dispatcher/sections/activity.tsx \
  src/app/\(app\)/audit/audit-client.tsx
git commit -m "refactor(ui): migrate 6 hand-rolled pagination blocks onto Pagination"
```

---

## Task 7: Rebuild `assign-guard-modal.tsx` on the shared `Modal` primitives

**Files:**
- Modify: `src/components/dispatch/assign-guard-modal.tsx`

**Interfaces:**
- Consumes: `Modal({ open, onClose, children, width? })`, `ModalHeader({ title, eyebrow?, sub?, onClose? })`, `ModalBody({ children })`, `ModalFooter({ children })`, `SuccessState({ title, sub?, onDone? })` — all from `src/components/ui/modal.tsx`, already exported via the barrel.

- [ ] **Step 1: Replace the hand-rolled wrapper with `Modal` + `SuccessState` for the success step**

Old import (line 5):
```tsx
import { Button, Pill, Label } from '@/components/ui'
```
New:
```tsx
import { Button, Pill, Label, Modal, ModalHeader, ModalBody, ModalFooter, SuccessState } from '@/components/ui'
```
Old import (line 4) — drop `CheckCircle2` (now handled inside `SuccessState`), keep `Send`, `X` is also no longer needed since `ModalHeader` renders its own close button:
```tsx
import { Send, CheckCircle2, X } from 'lucide-react'
```
New:
```tsx
import { Send } from 'lucide-react'
```

Old (full return statement, lines 51–176):
```tsx
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
```

New:
```tsx
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
```

Note: `ModalHeader`'s `sub` prop is typed `string` (not `ReactNode`) in the existing component — the interpolated template string above satisfies that as-is, no further change needed. `SuccessState`'s `sub` prop is already typed `React.ReactNode`, so the JSX fragment works directly.

Also delete the two early-return guards' redundancy check — no change needed there (`if (!alert) return null; if (!open) return null;` stays; `Modal` itself also no-ops when `open` is false, so the second check is now technically redundant but harmless — leave it, since `alert` must still be checked before rendering guard-list content that reads `alert.title`).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: clean — confirms `CheckCircle2` and `X` aren't flagged as unused-then-reintroduced anywhere else in the file.

- [ ] **Step 3: Commit**

```bash
git add src/components/dispatch/assign-guard-modal.tsx
git commit -m "refactor(dispatch): rebuild AssignGuardModal on shared Modal primitives"
```

---

## Task 8: `Toggle` migration, `Button` migration, backdrop color fix

**Files:**
- Modify: `src/components/ui/toggle.tsx`
- Modify: `src/app/(app)/cameras/[id]/camera-detail-client.tsx`
- Modify: `src/app/(app)/cameras/cameras-client.tsx`
- Modify: `src/app/(app)/app-shell.tsx`

**Interfaces:**
- Produces: `Toggle({ on, onChange, disabled? })` — adds an optional `disabled` prop (defaults `false`), backward-compatible with the 2 existing callers (`settings-client.tsx`, which doesn't pass it).

- [ ] **Step 1: Add `disabled` support to `Toggle`**

Old (full file, `src/components/ui/toggle.tsx`):
```tsx
"use client";

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-blue ${
        on ? "bg-p-blue" : "bg-surface border border-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
```

New:
```tsx
"use client";

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ on, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-blue ${
        on ? "bg-p-blue" : "bg-surface border border-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
```

- [ ] **Step 2: Migrate the AI-detection toggle in `camera-detail-client.tsx`**

Old import (line 6):
```tsx
import { Card, KV, Button, Label, Pill, Breadcrumb } from "@/components/ui";
```
New:
```tsx
import { Card, KV, Button, Label, Pill, Breadcrumb, Toggle } from "@/components/ui";
```

Old (lines 132–152):
```tsx
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                  aiConfig?.enabled ? 'bg-p-blue' : 'bg-p-gray/30'
                }`}
                onClick={() => startTransition(async () => {
                  try {
                    await toggleCameraAi(camera.id, !(aiConfig?.enabled ?? false));
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                  }
                })}
                disabled={isPending}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    aiConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
```
New:
```tsx
              <Toggle
                on={aiConfig?.enabled ?? false}
                disabled={isPending}
                onChange={() => startTransition(async () => {
                  try {
                    await toggleCameraAi(camera.id, !(aiConfig?.enabled ?? false));
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                  }
                })}
              />
```

- [ ] **Step 3: Migrate the "Add camera" button in `cameras-client.tsx`**

Old import (line 6, from Task 6 Step 1 this is now `import { PageTitle, StatCard, ActionMenu, Pagination } from "@/components/ui";`):
```tsx
import { PageTitle, StatCard, ActionMenu, Pagination } from "@/components/ui";
```
New:
```tsx
import { PageTitle, StatCard, ActionMenu, Pagination, Button } from "@/components/ui";
```

Old (lines 44–53):
```tsx
        <PageTitle
          title="Cameras & devices"
          sub={`${total} cameras across all company sites. Click a camera to view live stream.`}
          actions={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans transition-colors duration-150 cursor-pointer bg-p-blue text-white hover:bg-p-blue-hover active:bg-p-blue-hover px-4 py-2 text-sm"
            >
              <Plus size={15} strokeWidth={2} />
              Add camera
            </button>
          }
        />
```
New:
```tsx
        <PageTitle
          title="Cameras & devices"
          sub={`${total} cameras across all company sites. Click a camera to view live stream.`}
          actions={
            <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
              Add camera
            </Button>
          }
        />
```

- [ ] **Step 4: Fix `app-shell.tsx`'s mobile drawer backdrop color**

Old (line 39–42):
```tsx
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
```
New:
```tsx
        <div
          className="absolute inset-0 bg-navy/50"
          onClick={() => setSidebarOpen(false)}
        />
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/toggle.tsx \
  src/app/\(app\)/cameras/\[id\]/camera-detail-client.tsx \
  src/app/\(app\)/cameras/cameras-client.tsx \
  src/app/\(app\)/app-shell.tsx
git commit -m "refactor(ui): migrate camera AI toggle + Add-camera button onto shared primitives, fix drawer backdrop color"
```

---

## Task 9: Container padding, stat-grid gap, and portal max-width standardization

**Files:**
- Modify: `src/app/(app)/portal/portal-client.tsx`
- Modify: `src/app/(app)/dispatcher/dispatcher-client.tsx`
- Modify: `src/app/(app)/cameras/cameras-client.tsx`
- Modify: `src/app/(app)/sites/[id]/site-detail-client.tsx`
- Modify: `src/app/(app)/dashboard/dashboard-client.tsx`
- Modify: `src/app/(app)/portal/sections/reports.tsx`
- Modify: `src/app/(app)/portal/sections/incidents.tsx`

**Canonical values (from spec Section 3):** top-level page shell = `px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6`; stat-card grid gap = `gap-3.5`; portal wide-content max-width = `1200px` (portal narrow-content, `help.tsx`/`alerts.tsx` at `900px`, already matches and needs no change).

- [ ] **Step 1: `portal-client.tsx` container padding**

Old (line 157):
```tsx
      <main className="flex-1 min-w-0 overflow-auto bg-bg px-4 sm:px-8 py-6 sm:py-8">
```
New:
```tsx
      <main className="flex-1 min-w-0 overflow-auto bg-bg px-4 sm:px-9 py-6 sm:py-8">
```

- [ ] **Step 2: `dispatcher-client.tsx` container padding**

Old (line 129):
```tsx
      <div className="flex-1 min-w-0 overflow-auto px-4 sm:px-6 py-6">
```
New:
```tsx
      <div className="flex-1 min-w-0 overflow-auto px-4 sm:px-9 py-6 sm:py-8">
```

- [ ] **Step 3: Stat-card grid gap — `cameras-client.tsx`**

Old (line 57):
```tsx
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```
New:
```tsx
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
```

- [ ] **Step 4: Stat-card grid gap — `site-detail-client.tsx`**

Old (line 88):
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```
New:
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
```

- [ ] **Step 5: Stat-card grid gap — `dashboard-client.tsx`** (2 occurrences)

Old (line 177):
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
```
New:
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
```

Old (line 223):
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 mb-4 sm:mb-8">
```
New:
```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 sm:mb-8">
```

- [ ] **Step 6: Portal max-width — `portal/sections/reports.tsx`**

Old (line 79):
```tsx
    <div className="flex flex-col gap-6 max-w-[1000px]">
```
New:
```tsx
    <div className="flex flex-col gap-6 max-w-[1200px]">
```

- [ ] **Step 7: Portal max-width — `portal/sections/incidents.tsx`**

Old (line 58):
```tsx
    <div className="flex flex-col gap-6 max-w-[1100px]">
```
New:
```tsx
    <div className="flex flex-col gap-6 max-w-[1200px]">
```

`portal/sections/home.tsx` (`max-w-[1200px]`) already matches the new wide-tier canonical value — no change. `portal/sections/help.tsx` and `portal/sections/alerts.tsx` (`max-w-[900px]` each) already match the narrow tier and already match each other — no change.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (this task is class-name-only, so this is mostly a sanity check).

- [ ] **Step 9: Commit**

```bash
git add src/app/\(app\)/portal/portal-client.tsx \
  src/app/\(app\)/dispatcher/dispatcher-client.tsx \
  src/app/\(app\)/cameras/cameras-client.tsx \
  src/app/\(app\)/sites/\[id\]/site-detail-client.tsx \
  src/app/\(app\)/dashboard/dashboard-client.tsx \
  src/app/\(app\)/portal/sections/reports.tsx \
  src/app/\(app\)/portal/sections/incidents.tsx
git commit -m "style: standardize container padding, stat-grid gaps, and portal max-widths"
```

---

## Task 10: Consolidate guard's internal heading/stat typography

**Files:**
- Modify: `src/app/(app)/guard/guard-client.tsx`

Guard's greeting `<h1>` (line 205) was already migrated to `PageTitle` in Task 5. Three remaining hand-rolled sizes inside `guard-client.tsx` — an incident-card title in the list view (`18px/bold`) and two detail-view headings (`22px/bold` each, already matching each other) — get consolidated to one shared value: `text-[20px] font-bold`. Per the approved spec, guard intentionally does **not** adopt `StatCard`/`SectionHeader` for these (it's a distinct mobile-only flow) — this is purely a same-file internal consistency fix.

- [ ] **Step 1: List-view incident card title**

Old (line 234):
```tsx
              <p className="font-serif text-[18px] font-bold text-ink leading-snug mb-1">
                {incident.title}
              </p>
```
New:
```tsx
              <p className="font-serif text-[20px] font-bold text-ink leading-snug mb-1">
                {incident.title}
              </p>
```

- [ ] **Step 2: Resolved-state detail heading**

Old (line 359):
```tsx
          <p className="font-serif text-[22px] font-bold text-ink mb-1">
            Incident resolved.
          </p>
```
New:
```tsx
          <p className="font-serif text-[20px] font-bold text-ink mb-1">
            Incident resolved.
          </p>
```

- [ ] **Step 3: Active-state detail heading**

Old (line 392):
```tsx
      <h2 className="font-serif text-[22px] font-bold text-ink leading-tight mb-5">
        {incident.title}
      </h2>
```
New:
```tsx
      <h2 className="font-serif text-[20px] font-bold text-ink leading-tight mb-5">
        {incident.title}
      </h2>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (class-name-only change).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/guard/guard-client.tsx
git commit -m "style(guard): consolidate internal heading sizes to text-[20px] font-bold"
```

---

## Task 11: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero errors/warnings.

- [ ] **Step 3: Unit tests**

Run: `npm test`
Expected: all pass (this refactor doesn't touch any file under test — `lib/**/*.test.ts` — but confirms nothing broke incidentally).

- [ ] **Step 4: E2E regression**

Run: `npm run test:e2e`
Expected: all pass. This is the main functional safety net — role-based Playwright locators (`getByRole`, `getByLabel`, etc.) should still find every migrated element, and the `Breadcrumb`-based back-navigation (Task 4) and the AI-detection `Toggle` (Task 8) are the two spots most likely to have a real behavioral regression if something was wired wrong.

Note: `e2e/global-setup.ts` runs `npx supabase db reset`, which destroys local DB state — expected, per `primex/CLAUDE.md`.

- [ ] **Step 5: Manual visual pass**

Start the dev server (`npm run dev`) and click through each of the 5 dashboards as their respective seeded users (`supabase/seed.sql`, password `testpass123`):
- `jordan@primexsecurity.com.au` (super_admin) — dashboard, cameras (check the "Add camera" button and stat-grid gap), a camera detail page (check the AI toggle and breadcrumb), a site detail page (breadcrumb), an alert detail page (breadcrumb), a company detail page (breadcrumb + 3 migrated headings), audit log (pagination), reports (pagination + 3 migrated headings)
- `samira@` (dispatcher) — alert queue (SectionHeader with eyebrow, PageTitle on selected alert), incidents (pagination), activity log (pagination + tone icons), verify container padding now matches other dashboards
- `marcus@` (guard) — open an assignment, confirm the breadcrumb-style back control still navigates back to the list, confirm heading sizes read consistently
- `claire@apexretail.com.au` (company_manager) — cameras (pagination), sites, reports (2 migrated headings), dashboard (2 migrated headings)
- `brett@nexuslogistics.com.au` (client/portal) — home (3 migrated headings, tone-map icons), alerts (pagination), reports (max-width), incidents (max-width), help (3 migrated headings), confirm container padding now matches

Confirm the mobile sidebar drawer backdrop (any non-guard/dispatcher/manager/client role — i.e. super_admin — on a narrow viewport) now reads as the same navy scrim used by every modal, not a flat black overlay.

- [ ] **Step 6: Final commit (if any cleanup was needed)**

Only if Steps 1–5 surfaced something to fix — otherwise this task ends at Step 5 with no commit.
