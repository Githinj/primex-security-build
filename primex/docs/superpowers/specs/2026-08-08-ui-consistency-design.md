# UI Consistency Pass — Design

## Problem

Primex has 5 role-based dashboards (`super_admin`, `dispatcher`, `guard`, `company_manager`, `client`) sharing one design system in `src/components/ui/`. A code audit found the shared token layer (colors via `p-blue`/`p-red`/`ink`/`surface`/`border` etc.) is well-respected — there's no raw Tailwind palette leakage. The drift is structural instead: several shared primitives are reimplemented locally with small, silent deltas rather than imported, and some primitives that should exist don't yet.

Concretely:
- `DataTable`'s pagination markup is copy-pasted independently in 6 grid-based list pages (no standalone `Pagination` to import).
- `Pill`'s tone→color lookup is redefined independently in 3 files.
- A hand-rolled modal in `assign-guard-modal.tsx` reproduces `Modal` almost verbatim.
- A hand-rolled toggle in `camera-detail-client.tsx` duplicates `Toggle` with a different track size and off-state color.
- `PageTitle` is skipped by the guard dashboard and one dispatcher page; `Breadcrumb` is used in 1 of 5+ "back to X" locations.
- Page headings use 9 different size/weight combinations for what should be ~2 heading levels.
- Container padding and stat-card grid gaps differ per dashboard for the identical layout role.

## Goal

Fix consistency, not visuals. No token, palette, radius, shadow, or font changes — this is a refactor of presentation/markup so the 5 dashboards consistently use the same shared primitives, not a restyle.

## Design

### 1. New / hardened primitives (`src/components/ui/`)

- **`Pagination`** — extract the prev/next + "Page X of Y" markup currently embedded in `data-table.tsx` into a standalone component. `DataTable` switches to using it internally, eliminating the split between "the one inside DataTable" and the 6 copy-pasted instances elsewhere.
- **Tone map export** — pull the tone→soft-color lookup currently private to `pill.tsx` out into an exported helper (e.g. `getToneClasses(tone)`), so other files stop maintaining their own copies of the same red/amber/green/blue/gray → soft-bg mapping.
- **`SectionHeader`** — new component for "heading directly under a page title." Canonical style: `text-xl font-semibold` (the plurality choice already used in `dashboard-client.tsx`, `dispatcher/queue.tsx`, `manager/reports.tsx`, `reports-client.tsx`).
- **`PageTitle`** — add a compact size variant if needed so guard's mobile single-column view has a legitimate option instead of a hand-rolled `<h1>`.

### 2. Migration — call sites moving to shared primitives

| Primitive | Call sites to migrate |
|---|---|
| `Modal` | `components/dispatch/assign-guard-modal.tsx` — rebuild on `Modal`/`ModalHeader`/`ModalBody`/`ModalFooter` |
| `Toggle` | `cameras/[id]/camera-detail-client.tsx`'s AI Detection switch |
| `Breadcrumb` | Ad-hoc "‹ Back to X" links in `sites/[id]`, `cameras/[id]`, `alerts/[id]`, `companies/[id]`, guard's two back-links |
| `PageTitle` | `guard-client.tsx`'s hand-rolled `<h1>`; `dispatcher/sections/queue.tsx:209`'s `text-[32px] font-semibold` |
| `Pagination` | `cameras-client.tsx`, `manager/sections/cameras.tsx`, `portal/sections/alerts.tsx`, `dispatcher/sections/incidents.tsx`, `dispatcher/sections/activity.tsx`, `audit-client.tsx` |
| Tone map | `dispatcher/sections/activity.tsx`, `audit-client.tsx`, `portal/sections/home.tsx` — replace local `bgMap`/`fgMap` with `getToneClasses` |
| `Button` | `cameras-client.tsx`'s "Add camera" raw `<button>` → `<Button variant="primary" icon={Plus}>` |
| Backdrop color | `app-shell.tsx`'s mobile drawer backdrop `bg-black/40` → `bg-navy/50` (matches `Modal`'s scrim) |
| `SectionHeader` | The 9 drifted heading call sites: company-detail, dashboard, dispatcher/queue, manager/reports, reports-client, portal/home, portal/alerts, portal/help, guard |

### 3. Spacing / container standardization

- **Top-level page shell**: canonicalize on `px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6` (already used by 11 pages: dashboard, cameras, alerts, sites, incidents, companies, reports, team, settings, audit, guards). Apply to `portal-client.tsx` (currently `sm:px-8`) and `dispatcher-client.tsx` (currently `sm:px-6 py-6`).
  - **Exception**: guard's `mx-auto max-w-[400px] px-5 py-6 min-h-full` stays as-is — a deliberately distinct phone-only single-column screen, not drifted.
- **Stat-card grid gap**: canonicalize on `gap-3.5` for the `grid-cols-2 lg:grid-cols-4` pattern (plurality: `audit-client.tsx`, `company-detail-client.tsx`, `reports-client.tsx`, `manager/sections/reports.tsx`). Update `cameras-client.tsx`/`site-detail-client.tsx` (`gap-4`) and `dashboard-client.tsx` (`gap-3 sm:gap-3.5`).
- **Portal section max-widths**: consolidate the current 5 one-off pixel caps to 2 named sizes — narrower for text/help content (`help.tsx`, `alerts.tsx`), wider for table/list content (`reports.tsx`, `incidents.tsx`, `home.tsx`). Exact pixel values decided during implementation.

### 4. Typography consolidation

- `dispatcher/sections/queue.tsx:209` migrates to `PageTitle` (covered in Section 2 table).
- Guard's own internal stat-like numbers (currently 3 different size/weight combos across `guard-client.tsx`, excluding the h1 already covered above) get consolidated to one consistent size/weight *within guard's own file* — guard does not adopt `StatCard` itself, since it's a distinct mobile-only flow rather than a drifted copy of the desktop grid pattern.
- No changes to `StatCard` or the global type scale beyond `SectionHeader` and these two fixes.

### Out of scope

- Tailwind tokens/palette (`p-blue`, `ink`, `surface`, etc.) — already well-respected, not touched.
- `Card`'s API — `className` overrides found in the audit are additive layout, not fighting the component; not a real problem.
- Visual redesign — colors, radii, shadows, fonts stay as-is.
- `opengraph-image.tsx`'s hex-literal duplication — known, understandable exception (edge runtime, can't use Tailwind classes).

### Verification

- `npx tsc --noEmit` after migrations (primitive prop changes could break callers).
- `npm run lint`.
- `npm run test:e2e` as a regression check — role-based Playwright locators should catch anything actually broken, even though this pass shouldn't change behavior.
- Manual visual pass through each of the 5 dashboards before calling it done.
