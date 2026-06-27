# Primex Security System — Full Implementation Plan

> **Drop-in spec for Claude Code.** This is the complete build plan for the Primex multi-tenant security operations platform.
>
> **Stack:** React 18 · TypeScript · Vite · React Router v6 · Zustand · TanStack Query · Vitest + React Testing Library · Playwright (E2E)
> **Infra (Phase 2):** DigitalOcean · Ant Media Server Enterprise Edition (self-hosted) · DO Spaces · Python AI worker
> **Design reference:** `Primex-Mockup.jsx` (3,917 lines · 6 role views · 20+ modal flows)

---

## How to use this document (for Claude Code)

1. **Read `Primex-Mockup.jsx` first.** Every component, token, and mock-data shape in this plan is derived from it. The mockup is the source of truth for visuals and behavior.
2. **Build Phase 1 before Phase 2.** Phase 2 (streaming, AI, drag-and-drop, E2E) builds on Phase 1 types, stores, and mock data with no breaking changes.
3. **Co-locate tests.** Every component, store, hook, and util has a `__tests__/` sibling. Write the test alongside the implementation, not after.
4. **Port mock data verbatim.** `COMPANIES`, `SITES`, `CAMERAS`, `GUARDS`, `ALERTS`, `INCIDENTS`, `ACTIVITY`, `REPORTS`, `TEAM`, `ROLES_PERMS` all come straight from the mockup into `src/data/mock.ts`.
5. **Match the design system exactly.** The `T` token object and the `Inter` + `Playfair Display` font pairing are non-negotiable — they define the entire look.

### Quick command reference

```bash
pnpm dev               # Vite dev server
pnpm test              # Vitest watch mode
pnpm test:run          # single run (CI)
pnpm test:coverage     # coverage report
pnpm e2e               # Playwright E2E
pnpm build             # production build
```

---

# PART I — PHASE 1: CORE PLATFORM

## 1. Project Overview

Primex is a multi-tenant, multi-role security operations platform. The mockup defines six distinct role-based views (Landing, Login, Super Admin, Dispatcher, Guard/Mobile, Company Manager, Business Client) with shared primitives, a design system, and modal flows.

### Role Matrix (from mockup)

| Role | View | Key Capabilities |
|---|---|---|
| Super Admin | `AdminView` | All companies, users, sites, platform settings |
| Company Manager | `CompanyView` | Own company — sites, team, alerts, reports |
| Dispatcher | `DispatcherView` | Alerts, incidents, camera monitoring, guard dispatch |
| Guard / Responder | `GuardView` | Mobile — assigned incidents, status updates |
| Business Client | `ClientView` | Own site — alerts, reports, help (read-only) |
| Unauthenticated | Landing + Login | Marketing, auth entry |

---

## 2. Tech Stack & Tooling

```
primex/
├── vite.config.ts          # Vite + React plugin
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router/
    ├── design-system/      # Tokens, primitives (from mockup T object)
    ├── features/           # Domain modules
    ├── stores/             # Zustand slices
    ├── hooks/              # Custom hooks
    ├── services/           # API layer
    ├── types/              # Shared TypeScript types
    └── test/               # Global test setup
```

### Dependencies

| Category | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 |
| State (global) | Zustand |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Icons | lucide-react (already in mockup) |
| Fonts | Google Fonts — Playfair Display + Inter (already in mockup) |
| Testing | Vitest + React Testing Library + jsdom |
| E2E (Phase 2) | Playwright |

---

## 3. Design System (`src/design-system/`)

Extracted directly from the mockup's `T` object and primitive components.

### 3.1 Token File — `tokens.ts`

```ts
export const T = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSubtle: "#F1F5F9",
  navy: "#0B1220",
  navyDarker: "#060B14",
  navyTile: "#111A2E",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  ink: "#0F172A",
  ink2: "#334155",
  ink3: "#64748B",
  ink4: "#94A3B8",
  blue: "#1E5BFF",
  blueHover: "#1747CC",
  blueSoft: "#EEF3FF",
  blueSofter: "#F5F8FF",
  red: "#DC2626",
  redSoft: "#FEE2E2",
  amber: "#D97706",
  amberSoft: "#FEF3C7",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
  gray: "#64748B",
  graySoft: "#F1F5F9",
} as const;

export const sans = "Inter, -apple-system, system-ui, sans-serif";
export const serif = "'Playfair Display', Georgia, serif";
```

### 3.2 Primitive Components (`src/design-system/components/`)

Each maps 1-to-1 from the mockup:

| Component | Source in Mockup | Props |
|---|---|---|
| `Pill` | `Pill` | `tone`, `children`, `dot`, `size` |
| `Btn` | `Btn` | `variant`, `icon`, `size`, `full`, `onClick` |
| `Card` | `Card` | `padding`, `style`, `children` |
| `Label` | `Label` | `children`, `style` |
| `StatCard` | `StatCard` | `label`, `value`, `icon`, `supporting`, `accent` |
| `LiveDot` | `LiveDot` | `color` |
| `DataTable` | `DataTable` | `columns`, `rows` |
| `Breadcrumb` | `Breadcrumb` | `items: string[]` |
| `PageTitle` | `PageTitle` | `title`, `sub`, `actions`, `phaseTag` |
| `PhaseTag` | `PhaseTag` | `children` |
| `InfoBox` | `InfoBox` | `tone`, `children` |
| `TextInput` | `TextInput` | `value`, `onChange`, `placeholder`, `type` |
| `Select` | `Select` | `value`, `onChange`, `options`, `placeholder` |
| `Field` | `Field` | `label`, `required`, `hint`, `children` |
| `Modal` | `Modal` | `open`, `onClose`, `width`, `children` |
| `ModalHeader` | `ModalHeader` | `title`, `sub`, `eyebrow`, `onClose` |
| `ModalBody` | `ModalBody` | `children` |
| `ModalFooter` | `ModalFooter` | `children` |
| `SuccessState` | `SuccessState` | `title`, `sub`, `onClose` |

### 3.3 Design System Test Suite — `src/design-system/__tests__/`

```ts
// Pill.test.tsx
describe('Pill', () => {
  it('renders children with correct tone styles', () => { ... });
  it('renders dot by default, hides when dot=false', () => { ... });
  it('applies sm size padding correctly', () => { ... });
  it('applies all tone variants without crashing', () => { ... });
});

// Btn.test.tsx
describe('Btn', () => {
  it('renders primary variant with correct background color', () => { ... });
  it('calls onClick handler when clicked', () => { ... });
  it('renders icon when icon prop provided', () => { ... });
  it('renders full width when full=true', () => { ... });
  it('renders all variants without crashing', () => { ... });
});

// Modal.test.tsx
describe('Modal', () => {
  it('does not render when open=false', () => { ... });
  it('renders children when open=true', () => { ... });
  it('calls onClose when backdrop is clicked', () => { ... });
  it('does not call onClose when modal body is clicked', () => { ... });
});

// DataTable.test.tsx
describe('DataTable', () => {
  it('renders correct number of header columns', () => { ... });
  it('renders correct number of rows', () => { ... });
  it('renders cell content correctly', () => { ... });
});
```

---

## 4. Type Definitions (`src/types/`)

```ts
// domain.ts — mirrors mockup mock data shapes
export type CompanyStatus = "Active" | "Pending" | "Inactive";
export type RiskLevel = "Low" | "Medium" | "High";
export type CameraStatus = "Online" | "Offline" | "Maintenance" | "Unknown";
export type AlertSeverity = "Critical" | "Warning" | "Info";
export type AlertStatus = "New" | "Reviewing" | "Escalated" | "Closed";
export type IncidentStatus = "Open" | "In Progress" | "Dispatched" | "Resolved" | "Closed";
export type GuardStatus = "Available" | "On Incident" | "Off-duty";
export type UserRole = "admin" | "dispatcher" | "guard" | "company" | "client";

export interface Company {
  id: string; name: string; type: string;
  sites: number; users: number; status: CompanyStatus;
}
export interface Site {
  id: string; companyId: string; name: string;
  type: string; address: string; risk: RiskLevel;
  status: string; cameras: number;
}
export interface Camera {
  id: string; siteId: string; name: string;
  location: string; status: CameraStatus;
  lastChecked: string; warning: string | null;
}
export interface Guard {
  id: string; name: string; status: GuardStatus;
  zone: string; phone: string; shifts: string;
}
export interface Alert {
  id: string; title: string; siteId: string;
  cameraId: string | null; severity: AlertSeverity;
  status: AlertStatus; createdAt: string;
  description: string; source: string;
}
export interface Incident {
  id: string; title: string; siteId: string;
  alertId: string; severity: AlertSeverity;
  status: IncidentStatus; guardId: string | null;
  startedAt: string; notes: string;
}
```

---

## 5. State Management (`src/stores/`)

Using Zustand with one slice per domain.

### 5.1 Auth Store — `authStore.ts`

```ts
interface AuthState {
  role: UserRole | "landing" | "login" | null;
  user: { name: string; role: string } | null;
  setRole: (role: string) => void;
  logout: () => void;
}
```

**Test suite — `authStore.test.ts`**
```ts
describe('authStore', () => {
  it('initializes with role=landing', () => { ... });
  it('setRole updates role correctly', () => { ... });
  it('logout resets role and user to null', () => { ... });
});
```

### 5.2 Alert Store — `alertStore.ts`

```ts
interface AlertState {
  alerts: Alert[];
  selected: Alert | null;
  setAlerts: (alerts: Alert[]) => void;
  selectAlert: (id: string) => void;
  updateAlertStatus: (id: string, status: AlertStatus) => void;
}
```

**Test suite — `alertStore.test.ts`**
```ts
describe('alertStore', () => {
  it('setAlerts replaces alerts array', () => { ... });
  it('selectAlert sets correct alert', () => { ... });
  it('selectAlert returns null for unknown id', () => { ... });
  it('updateAlertStatus mutates only the target alert', () => { ... });
});
```

### 5.3 Incident Store — `incidentStore.ts`

```ts
interface IncidentState {
  incidents: Incident[];
  createIncident: (from: Alert, guardId?: string) => void;
  assignGuard: (incidentId: string, guardId: string) => void;
  updateStatus: (incidentId: string, status: IncidentStatus) => void;
}
```

**Test suite — `incidentStore.test.ts`**
```ts
describe('incidentStore', () => {
  it('createIncident adds incident with correct alertId', () => { ... });
  it('assignGuard sets guardId on correct incident', () => { ... });
  it('updateStatus changes only the target incident status', () => { ... });
  it('createIncident defaults status to Open', () => { ... });
});
```

---

## 6. Feature Modules

### Phase 1 — Core (Weeks 1–6)

---

#### Feature 1: Authentication & Role Routing

**Files:** `src/features/auth/`

Components:
- `LandingPage` — hero, feature cards, solutions section, pricing, footer
- `LoginPage` — role selector with email + password fields (mockup: `LoginPage`)
- `TopBar` — sticky global bar with role switcher (Super Admin only), notifications

Routing:
```ts
// router/index.tsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>} />
  <Route path="/dispatcher/*" element={<ProtectedRoute role="dispatcher"><DispatcherLayout /></ProtectedRoute>} />
  <Route path="/guard/*" element={<ProtectedRoute role="guard"><GuardLayout /></ProtectedRoute>} />
  <Route path="/company/*" element={<ProtectedRoute role="company"><CompanyLayout /></ProtectedRoute>} />
  <Route path="/client/*" element={<ProtectedRoute role="client"><ClientLayout /></ProtectedRoute>} />
</Routes>
```

**Test suite — `auth/__tests__/`**
```ts
// LoginPage.test.tsx
describe('LoginPage', () => {
  it('renders email and password inputs', () => { ... });
  it('renders role selection options', () => { ... });
  it('calls onContinue with correct role on submit', () => { ... });
  it('shows error state when fields are empty on submit', () => { ... });
  it('displays Back to landing link', () => { ... });
});

// LandingPage.test.tsx
describe('LandingPage', () => {
  it('renders hero section with Get Started CTA', () => { ... });
  it('renders all three feature cards (Smart Cameras, AI Detection, Dispatch)', () => { ... });
  it('renders solutions tabs and switches content on tab click', () => { ... });
  it('goLogin is called when Get Started is clicked', () => { ... });
  it('renders pricing section with all three tiers', () => { ... });
});

// TopBar.test.tsx
describe('TopBar', () => {
  it('renders scope dropdown only for admin role', () => { ... });
  it('does not render scope dropdown for dispatcher role', () => { ... });
  it('renders notification bell', () => { ... });
});

// ProtectedRoute.test.tsx
describe('ProtectedRoute', () => {
  it('renders children when role matches', () => { ... });
  it('redirects to /login when role does not match', () => { ... });
});
```

---

#### Feature 2: Sidebar Navigation

**Files:** `src/features/navigation/Sidebar.tsx`

The sidebar is shared across all authenticated views. Nav items per role:

| Role | Nav items |
|---|---|
| Admin | Dashboard, Companies, Sites, Users & Roles, Alerts, Settings |
| Dispatcher | Dashboard, Alerts, Incidents, Camera Monitoring, Guards, Sites, Reports |
| Guard | My Assignments, Incident Detail, Shift Info |
| Company Manager | Overview, Sites & Cameras, Team, Alerts, Reports, Settings |
| Client | My Site, Alerts, Reports, Get Help |

**Test suite — `navigation/__tests__/Sidebar.test.tsx`**
```ts
describe('Sidebar', () => {
  it('renders correct nav items for admin role', () => { ... });
  it('renders correct nav items for dispatcher role', () => { ... });
  it('renders correct nav items for guard role', () => { ... });
  it('renders correct nav items for client role', () => { ... });
  it('highlights active nav item', () => { ... });
  it('renders scope dropdown for admin, static label for others', () => { ... });
  it('shows "All systems operational" status indicator', () => { ... });
  it('renders user avatar with initials', () => { ... });
  it('scoped company dropdown opens on click (admin only)', () => { ... });
  it('closes scope dropdown when option is selected', () => { ... });
});
```

---

#### Feature 3: Super Admin View

**Files:** `src/features/admin/`

Pages: Dashboard, Companies, Sites, Users & Roles, Settings

Sub-components:
- `CompanyTable` — sortable table from `COMPANIES` mock data
- `InviteCompanyModal` — multi-field form with success state
- `CompanyDetailsModal` — view + edit modes
- `UserManagementTable` — users with role pills
- `RolesPermissionsTable` — roles with permission descriptions
- `PlatformStatsRow` — 4-up stat cards (companies, sites, cameras, active incidents)

**Test suite — `admin/__tests__/`**
```ts
// AdminDashboard.test.tsx
describe('AdminDashboard', () => {
  it('renders 4 stat cards (Companies, Sites, Cameras, Incidents)', () => { ... });
  it('renders recent activity feed with correct items', () => { ... });
  it('renders company table with all mock companies', () => { ... });
  it('opens InviteCompanyModal when Invite Company button clicked', () => { ... });
});

// InviteCompanyModal.test.tsx
describe('InviteCompanyModal', () => {
  it('renders all form fields: name, type, contact name, email, plan', () => { ... });
  it('does not render when open=false', () => { ... });
  it('calls onClose when Cancel is clicked', () => { ... });
  it('shows success state after Send Invitation is clicked', () => { ... });
  it('success state displays the entered email address', () => { ... });
  it('resets form fields after close from success state', () => { ... });
  it('all company type options are selectable', () => { ... });
  it('all plan options are selectable', () => { ... });
});

// CompanyDetailsModal.test.tsx
describe('CompanyDetailsModal', () => {
  it('renders company name in modal title', () => { ... });
  it('displays view mode fields by default', () => { ... });
  it('switches to edit mode when Edit button is clicked', () => { ... });
  it('shows success state after saving edits', () => { ... });
  it('returns null when company prop is null', () => { ... });
});

// UsersAndRoles.test.tsx
describe('UsersAndRoles', () => {
  it('renders team members table with correct roles', () => { ... });
  it('renders roles & permissions table', () => { ... });
  it('opens invite user modal on button click', () => { ... });
  it('renders user status pills (Active, Inactive)', () => { ... });
  it('renders action buttons per row (Edit, Suspend, Remove)', () => { ... });
});
```

---

#### Feature 4: Dispatcher View

**Files:** `src/features/dispatcher/`

Pages: Dashboard, Alerts, Incidents, Camera Monitoring, Guards, Sites, Reports

Sub-components:
- `AlertFeed` — filterable list with severity pills, quick actions
- `AlertDetailModal` — full description, source, actions (Escalate, Assign Guard, Close)
- `CreateAlertModal` — form: title, site, severity, camera, description
- `IncidentTable` — status, guard, site columns
- `IncidentDetailModal` — timeline, guard assignment, notes
- `CameraGrid` — camera cards with status indicators (from `CAMERAS` mock)
- `CameraDetailModal` — live feed placeholder, status, warnings
- `GuardRoster` — guard cards with availability, contact, dispatch button
- `DispatchGuardModal` — select incident, add note, confirm

**Test suite — `dispatcher/__tests__/`**
```ts
// AlertFeed.test.tsx
describe('AlertFeed', () => {
  it('renders all alerts from props', () => { ... });
  it('filters alerts by severity when filter is applied', () => { ... });
  it('filters alerts by status', () => { ... });
  it('renders severity pills with correct tones (red=Critical, amber=Warning)', () => { ... });
  it('opens AlertDetailModal when alert row is clicked', () => { ... });
  it('renders search input and filters results by title', () => { ... });
});

// AlertDetailModal.test.tsx
describe('AlertDetailModal', () => {
  it('renders alert title, description, source, severity', () => { ... });
  it('renders Escalate, Assign Guard, Close Alert action buttons', () => { ... });
  it('calls onClose when modal backdrop is clicked', () => { ... });
  it('shows linked camera when cameraId is present', () => { ... });
  it('does not show camera section when cameraId is null', () => { ... });
});

// CreateAlertModal.test.tsx
describe('CreateAlertModal', () => {
  it('renders all form fields', () => { ... });
  it('site dropdown contains all available sites', () => { ... });
  it('severity options include Critical, Warning, Info', () => { ... });
  it('shows success state after form submission', () => { ... });
  it('validates required fields before submission', () => { ... });
});

// CameraGrid.test.tsx
describe('CameraGrid', () => {
  it('renders a card for each camera in props', () => { ... });
  it('renders Online cameras with green status pill', () => { ... });
  it('renders Offline cameras with red status pill', () => { ... });
  it('renders Maintenance cameras with amber status pill', () => { ... });
  it('renders warning text for cameras with warnings', () => { ... });
  it('opens CameraDetailModal on card click', () => { ... });
});

// GuardRoster.test.tsx
describe('GuardRoster', () => {
  it('renders all guards with name, status, zone, phone', () => { ... });
  it('renders Available status in green', () => { ... });
  it('renders On Incident status in amber', () => { ... });
  it('renders Off-duty status in gray', () => { ... });
  it('opens DispatchGuardModal when Dispatch is clicked on available guard', () => { ... });
  it('disables dispatch button for off-duty guards', () => { ... });
});

// DispatchGuardModal.test.tsx
describe('DispatchGuardModal', () => {
  it('renders guard name in modal header', () => { ... });
  it('renders open incident options in select', () => { ... });
  it('shows success state after confirming dispatch', () => { ... });
  it('updates guard status to On Incident after dispatch', () => { ... });
});
```

---

#### Feature 5: Guard (Mobile) View

**Files:** `src/features/guard/`

Pages: My Assignments, Incident Detail (with status flow), Shift Info

Sub-components:
- `AssignmentCard` — incident summary with Accept / En Route / Arrived / Resolve actions
- `IncidentTimeline` — chronological status updates
- `ResolveIncidentModal` — photo upload placeholder, notes, confirmation
- `ShiftCard` — shift schedule, contact info

**Test suite — `guard/__tests__/`**
```ts
// AssignmentCard.test.tsx
describe('AssignmentCard', () => {
  it('renders incident title, site, severity', () => { ... });
  it('renders Accept button when status is Open', () => { ... });
  it('renders En Route button when status is Dispatched', () => { ... });
  it('renders Arrived and Resolve buttons when status is In Progress', () => { ... });
  it('calls correct status update on button click', () => { ... });
  it('renders resolved state correctly', () => { ... });
});

// ResolveIncidentModal.test.tsx
describe('ResolveIncidentModal', () => {
  it('renders notes textarea', () => { ... });
  it('renders photo upload trigger', () => { ... });
  it('shows success state after confirmation', () => { ... });
  it('calls onClose when Cancel is clicked', () => { ... });
});

// IncidentTimeline.test.tsx
describe('IncidentTimeline', () => {
  it('renders all timeline events in order', () => { ... });
  it('marks current status step as active', () => { ... });
  it('marks past steps as completed', () => { ... });
});
```

---

#### Feature 6: Company Manager View

**Files:** `src/features/company/`

Pages: Overview, Sites & Cameras, Team, Alerts, Reports, Settings

Sub-components:
- `CompanyOverview` — KPI cards (sites, guards, open alerts, response time)
- `SiteList` — filterable cards with risk level, camera count, status
- `SiteDetailPanel` — site info + camera list for that site
- `AddSiteModal` — form: name, type, address, risk
- `TeamTable` — users with role, last active, status
- `InviteUserModal` — name, email, role select, success state
- `CompanyAlerts` — alerts scoped to this company's sites
- `CompanyReports` — downloadable report rows

**Test suite — `company/__tests__/`**
```ts
// CompanyOverview.test.tsx
describe('CompanyOverview', () => {
  it('renders site count stat card', () => { ... });
  it('renders open alerts count', () => { ... });
  it('renders guard count', () => { ... });
  it('renders activity feed', () => { ... });
});

// SiteList.test.tsx
describe('SiteList', () => {
  it('renders all sites for the current company', () => { ... });
  it('renders risk level pills with correct tones', () => { ... });
  it('renders Maintenance status correctly', () => { ... });
  it('filters sites by search input', () => { ... });
  it('opens AddSiteModal when Add Site button is clicked', () => { ... });
});

// AddSiteModal.test.tsx
describe('AddSiteModal', () => {
  it('renders all required fields', () => { ... });
  it('type options include Store, Office, Warehouse, etc.', () => { ... });
  it('risk options include Low, Medium, High', () => { ... });
  it('shows success state after submission', () => { ... });
  it('resets form on close', () => { ... });
});

// TeamTable.test.tsx
describe('TeamTable', () => {
  it('renders all team members with correct roles', () => { ... });
  it('renders last active timestamps', () => { ... });
  it('renders Inactive status pill for inactive users', () => { ... });
  it('opens InviteUserModal on Invite button click', () => { ... });
});

// InviteUserModal.test.tsx
describe('InviteUserModal', () => {
  it('renders name, email, and role fields', () => { ... });
  it('role options include Dispatcher, Guard, Site Manager, etc.', () => { ... });
  it('shows success state with email confirmation', () => { ... });
});
```

---

#### Feature 7: Business Client View

**Files:** `src/features/client/`

Pages: My Site, Alerts, Reports, Get Help

Sub-components:
- `ClientSiteCard` — site name, address, risk, camera count
- `ClientAlertList` — read-only alert table (no dispatch actions)
- `ClientReports` — downloadable PDF report rows
- `ClientHelp` — call dispatch, report incident, help center, email support cards

**Test suite — `client/__tests__/`**
```ts
// ClientSiteCard.test.tsx
describe('ClientSiteCard', () => {
  it('renders site name and address', () => { ... });
  it('renders camera count and risk level', () => { ... });
  it('renders status pill', () => { ... });
});

// ClientAlertList.test.tsx
describe('ClientAlertList', () => {
  it('renders alerts scoped to client site only', () => { ... });
  it('does not render dispatch/assign actions', () => { ... });
  it('renders severity pills with correct tones', () => { ... });
});

// ClientReports.test.tsx
describe('ClientReports', () => {
  it('renders report rows with name, period, incidents, date', () => { ... });
  it('renders PDF download button per row', () => { ... });
});

// ClientHelp.test.tsx
describe('ClientHelp', () => {
  it('renders Call Dispatch card with phone number', () => { ... });
  it('renders Report an Incident card with action button', () => { ... });
  it('renders Help Center and Email Support cards', () => { ... });
  it('Call now button is clickable', () => { ... });
});
```

---

## 7. Custom Hooks (`src/hooks/`)

| Hook | Purpose | Test |
|---|---|---|
| `useAlerts(filters?)` | Filtered alert list via React Query | Filters by severity, status, siteId |
| `useIncidents(filters?)` | Incident list with guard join | Status and guard filter tests |
| `useCameras(siteId?)` | Cameras for a site | Site-scoped filter test |
| `useGuards()` | Guard roster with status | Availability filter test |
| `useCompanies()` | All companies (admin only) | RBAC guard test |
| `useRole()` | Current user role from auth store | Returns correct role |
| `useModal(initial?)` | `{ open, onOpen, onClose }` helper | Toggle state tests |

**Test suites — `hooks/__tests__/`**
```ts
// useModal.test.ts
describe('useModal', () => {
  it('initializes as closed by default', () => { ... });
  it('initializes as open when initial=true', () => { ... });
  it('onOpen sets open to true', () => { ... });
  it('onClose sets open to false', () => { ... });
});

// useAlerts.test.ts
describe('useAlerts', () => {
  it('returns all alerts when no filter', () => { ... });
  it('filters by severity correctly', () => { ... });
  it('filters by status correctly', () => { ... });
  it('filters by siteId correctly', () => { ... });
  it('returns empty array when no match', () => { ... });
});

// useRole.test.ts
describe('useRole', () => {
  it('returns current role from auth store', () => { ... });
  it('returns null when not authenticated', () => { ... });
});
```

---

## 8. Services Layer (`src/services/`)

Mock API service layer using `msw` (Mock Service Worker) in tests, swappable for real API.

```ts
// services/alertService.ts
export const alertService = {
  getAll: (): Promise<Alert[]> => { ... },
  getById: (id: string): Promise<Alert> => { ... },
  create: (data: CreateAlertDto) => { ... },
  updateStatus: (id: string, status: AlertStatus) => { ... },
};

// services/incidentService.ts
export const incidentService = {
  getAll: (): Promise<Incident[]> => { ... },
  create: (data: CreateIncidentDto) => { ... },
  assignGuard: (id: string, guardId: string) => { ... },
  updateStatus: (id: string, status: IncidentStatus) => { ... },
};
```

**Test suite — `services/__tests__/`**
```ts
// alertService.test.ts (using msw handlers)
describe('alertService', () => {
  it('getAll returns array of alerts', async () => { ... });
  it('getById returns correct alert', async () => { ... });
  it('create posts correct payload', async () => { ... });
  it('updateStatus sends PATCH with new status', async () => { ... });
  it('handles 404 gracefully', async () => { ... });
  it('handles network error gracefully', async () => { ... });
});
```

---

## 9. Utility Functions (`src/utils/`)

| Utility | Logic | Source |
|---|---|---|
| `sevTone(severity)` | Maps severity to Pill tone | From mockup `sevTone` |
| `incTone(status)` | Maps incident status to Pill tone | From mockup `incTone` |
| `camTone(status)` | Maps camera status to Pill tone | From mockup `camTone` |
| `formatRelativeTime(date)` | "Just now", "12m ago", "Yesterday" | Inferred from mockup data |
| `getInitials(name)` | "Marcus Ellis" → "ME" | From mockup avatar rendering |

**Test suite — `utils/__tests__/tones.test.ts`**
```ts
describe('sevTone', () => {
  it('Critical → red', () => { ... });
  it('Warning → amber', () => { ... });
  it('Info → blue', () => { ... });
  it('unknown → gray', () => { ... });
});

describe('incTone', () => {
  it('Resolved → green', () => { ... });
  it('Closed → green', () => { ... });
  it('In Progress → amber', () => { ... });
  it('Dispatched → amber', () => { ... });
  it('Open → gray', () => { ... });
});

describe('camTone', () => {
  it('Online → green', () => { ... });
  it('Offline → red', () => { ... });
  it('Maintenance → amber', () => { ... });
  it('Unknown → gray', () => { ... });
});

describe('getInitials', () => {
  it('returns two-letter initials for full name', () => { ... });
  it('returns one letter for single name', () => { ... });
  it('handles three-word names using first two words', () => { ... });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for < 60 seconds ago', () => { ... });
  it('returns "Xm ago" for minutes', () => { ... });
  it('returns "Xh ago" for hours', () => { ... });
  it('returns "Yesterday" for 24-48h', () => { ... });
});
```

---

## 10. Implementation Phases & Timeline

### Phase 1 — Foundation (Weeks 1–2)

- Vite + React + TypeScript project scaffold
- Design system: tokens, all primitive components
- Router setup with role-based guards
- Zustand stores (auth, alerts, incidents)
- Mock data layer (`src/data/mock.ts` — port `COMPANIES`, `SITES`, `CAMERAS`, `GUARDS`, `ALERTS`, `INCIDENTS` from mockup)
- Design system tests ✅

### Phase 2 — Authentication & Navigation (Week 3)

- LandingPage (all sections: hero, feature cards, solutions tabs, pricing, CTA, footer)
- LoginPage with role selector
- TopBar with scope dropdown (admin only)
- Sidebar navigation (all 5 role configurations)
- Auth + navigation tests ✅

### Phase 3 — Super Admin & Dispatcher Views (Weeks 4–5)

- AdminView: dashboard, companies, users & roles, settings
- All admin modals: InviteCompany, CompanyDetails
- DispatcherView: dashboard, alerts feed, incidents, cameras, guards, reports
- All dispatcher modals: AlertDetail, CreateAlert, CameraDetail, DispatchGuard
- Admin + dispatcher tests ✅

### Phase 4 — Remaining Role Views (Week 6)

- GuardView: assignments, incident detail with status flow, resolve modal
- CompanyView: overview, sites & cameras, team, alerts, reports, settings
- ClientView: my site, alerts, reports, help
- All remaining modal tests ✅

### Phase 5 — Integration & Polish (Week 7)

- Wire React Query for real API (or keep MSW for staging)
- Real-time alert updates (polling or WebSocket stub)
- Accessibility: keyboard nav, focus rings (already in mockup CSS)
- Responsive adjustments for Guard mobile view
- Full integration test pass

### Phase 6 — Phase 2 Features (Future)

- AI detection integration (Phase 2 tags in mockup)
- AWS Kinesis camera streaming
- Drag-and-drop dispatch board
- Playwright E2E tests for critical flows

---

## 11. Test Configuration

```ts
// vitest.config.ts
export default {
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
};

// src/test/setup.ts
import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from './mswHandlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Test Commands

```bash
pnpm test              # run all tests (watch mode)
pnpm test:run          # single run (CI)
pnpm test:coverage     # coverage report
pnpm test:ui           # Vitest UI browser
```

### Coverage Targets

| Module | Target |
|---|---|
| Design System | 95% |
| Stores | 95% |
| Hooks | 90% |
| Utils | 100% |
| Feature Components | 80% |
| Services | 85% |

---

## 12. File Tree Summary

```
src/
├── design-system/
│   ├── tokens.ts
│   └── components/
│       ├── Pill.tsx / __tests__/Pill.test.tsx
│       ├── Btn.tsx / __tests__/Btn.test.tsx
│       ├── Card.tsx
│       ├── Modal.tsx / __tests__/Modal.test.tsx
│       ├── DataTable.tsx / __tests__/DataTable.test.tsx
│       └── ... (all primitives)
├── types/
│   └── domain.ts
├── stores/
│   ├── authStore.ts / __tests__/authStore.test.ts
│   ├── alertStore.ts / __tests__/alertStore.test.ts
│   └── incidentStore.ts / __tests__/incidentStore.test.ts
├── hooks/
│   ├── useAlerts.ts / __tests__/useAlerts.test.ts
│   ├── useModal.ts / __tests__/useModal.test.ts
│   └── useRole.ts / __tests__/useRole.test.ts
├── services/
│   ├── alertService.ts / __tests__/alertService.test.ts
│   └── incidentService.ts
├── utils/
│   ├── tones.ts / __tests__/tones.test.ts
│   ├── formatTime.ts / __tests__/formatTime.test.ts
│   └── getInitials.ts
├── data/
│   └── mock.ts          # All mock data from mockup
├── features/
│   ├── auth/
│   │   ├── LandingPage.tsx / __tests__/LandingPage.test.tsx
│   │   ├── LoginPage.tsx / __tests__/LoginPage.test.tsx
│   │   └── TopBar.tsx / __tests__/TopBar.test.tsx
│   ├── navigation/
│   │   └── Sidebar.tsx / __tests__/Sidebar.test.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx / __tests__/AdminDashboard.test.tsx
│   │   ├── InviteCompanyModal.tsx / __tests__/InviteCompanyModal.test.tsx
│   │   └── CompanyDetailsModal.tsx / __tests__/CompanyDetailsModal.test.tsx
│   ├── dispatcher/
│   │   ├── AlertFeed.tsx / __tests__/AlertFeed.test.tsx
│   │   ├── AlertDetailModal.tsx / __tests__/AlertDetailModal.test.tsx
│   │   ├── CameraGrid.tsx / __tests__/CameraGrid.test.tsx
│   │   ├── GuardRoster.tsx / __tests__/GuardRoster.test.tsx
│   │   └── DispatchGuardModal.tsx / __tests__/DispatchGuardModal.test.tsx
│   ├── guard/
│   │   ├── AssignmentCard.tsx / __tests__/AssignmentCard.test.tsx
│   │   └── ResolveIncidentModal.tsx / __tests__/ResolveIncidentModal.test.tsx
│   ├── company/
│   │   ├── SiteList.tsx / __tests__/SiteList.test.tsx
│   │   ├── AddSiteModal.tsx / __tests__/AddSiteModal.test.tsx
│   │   └── TeamTable.tsx / __tests__/TeamTable.test.tsx
│   └── client/
│       ├── ClientSiteCard.tsx / __tests__/ClientSiteCard.test.tsx
│       ├── ClientAlertList.tsx / __tests__/ClientAlertList.test.tsx
│       └── ClientHelp.tsx / __tests__/ClientHelp.test.tsx
├── router/
│   └── index.tsx
├── test/
│   ├── setup.ts
│   └── mswHandlers.ts
└── App.tsx
```

---

# PART II — PHASE 2: STREAMING, AI, DISPATCH BOARD & E2E

## Evaluation: What You Already Have

### Ant Media Server Enterprise Edition on DigitalOcean

**What it gives you out of the box:**

| Capability | Detail |
|---|---|
| WebRTC ingest + playback | Sub-500ms latency for live camera feeds |
| RTMP / HLS / CMAF ingest | Works with virtually all IP cameras and DVRs |
| REST API | Full programmatic control of streams, rooms, recordings |
| Cluster mode | Horizontal scaling across multiple DO Droplets |
| Recording to S3/DO Spaces | Native — frames and segments stored automatically |
| Adaptive bitrate | Multiple quality rungs served per stream |
| Token-based stream security | JWT-protected embed tokens per stream |
| Built-in REST hooks | Webhooks on stream start/stop/recording events |

**Verdict: This is an excellent foundation.** Ant Media EE eliminates the need for AWS Kinesis Video Streams entirely for the ingest/playback layer. Kinesis was listed in the mockup as a Phase 2 integration, but that was likely a placeholder for "video pipeline" — Ant Media replaces it more cost-effectively on your own infrastructure.

---

## Recommendation: Replace AWS Kinesis with Ant Media + DO Architecture

### Why Skip Kinesis (given what you have)

AWS Kinesis Video Streams charges per GB ingested + per GB consumed for playback. For a multi-site security platform with 24/7 feeds, costs escalate rapidly — a 10-camera site running 24/7 at 720p is ~200 GB/month per site. At $0.0085/GB that's $1.70/site/month at minimum, and that's before AI processing throughput costs.

Ant Media Enterprise on a DO Droplet is a flat monthly cost. At 240+ sites (mockup stat), the savings are significant.

**What you do instead of Kinesis:**

```
Camera (RTMP/RTSP) → Ant Media Ingest → WebRTC Player in Primex UI
                                      ↓
                              DO Spaces (recordings)
                                      ↓
                         AI Worker (Python, runs on DO Droplet)
                         pulls segments from Spaces → runs inference
                                      ↓
                         Alert webhook → Primex API → Alert store
```

---

## Module 1: Camera Streaming Integration

### 1.1 Architecture

```
Ant Media Server (DO Droplet, 8+ vCPU)
  ├── Ingest endpoints: rtmp://antmedia.primex.io/live/{streamId}
  ├── Playback: wss://antmedia.primex.io/live/{streamId}.webrtc
  ├── REST API: https://antmedia.primex.io:5443/WebRTCAppEE/rest/v2/
  └── Webhooks: POST → https://api.primex.io/webhooks/antmedia
```

Each camera in Primex maps to a unique `streamId` (stored on the `Camera` entity). The Ant Media REST API is called server-side — stream tokens are generated per-session and never exposed to the browser.

### 1.2 Camera Entity Extension

```ts
// types/domain.ts — additions
export interface Camera {
  // ... existing fields from Phase 1
  streamId: string;          // Ant Media stream identifier
  streamUrl: string;         // rtmp:// or rtsp:// ingest URL
  recordingEnabled: boolean;
  lastFrameAt: string | null;
}
```

### 1.3 Stream Token Service (Backend)

```ts
// services/streamTokenService.ts (Node/Express backend)
import crypto from 'crypto';

export async function getViewToken(streamId: string, userId: string): Promise<string> {
  // Call Ant Media REST API to generate a one-time JWT view token
  const res = await fetch(
    `${ANTMEDIA_API}/broadcasts/${streamId}/token?expireDate=${oneHourFromNow()}&type=play`,
    { headers: { Authorization: `Bearer ${ANTMEDIA_ADMIN_TOKEN}` } }
  );
  const { tokenId } = await res.json();
  // Audit log: which user requested which stream token
  await auditLog({ userId, streamId, action: 'stream_token_requested' });
  return tokenId;
}
```

### 1.4 React Player Component — `CameraPlayer.tsx`

```tsx
// features/cameras/CameraPlayer.tsx
import { useEffect, useRef } from 'react';
import { useStreamToken } from '../../hooks/useStreamToken';

interface Props {
  streamId: string;
  cameraName: string;
  status: CameraStatus;
}

export function CameraPlayer({ streamId, cameraName, status }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { token, isLoading, error } = useStreamToken(streamId);

  useEffect(() => {
    if (!token || !videoRef.current) return;
    // Ant Media WebRTC SDK — loaded via CDN script tag
    const webRTCAdaptor = new (window as any).WebRTCAdaptor({
      websocket_url: `wss://${ANTMEDIA_HOST}/live/websocket`,
      mediaConstraints: { video: false, audio: false },
      remoteVideoElement: videoRef.current,
      callback: (info: string) => {
        if (info === 'initialized') webRTCAdaptor.play(streamId, token);
      },
    });
    return () => webRTCAdaptor.stop(streamId);
  }, [token, streamId]);

  if (status === 'Offline') return <OfflinePlaceholder cameraName={cameraName} />;
  if (isLoading) return <StreamSkeleton />;
  if (error) return <StreamError />;

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block' }} />
      <LiveBadge />
      <CameraOverlay name={cameraName} />
    </div>
  );
}
```

### 1.5 Camera Grid Enhancement — `CameraMonitoringPage.tsx`

The dispatcher's Camera Monitoring section (from the mockup) becomes a live grid. Layout options:
- 2×2 (4-up), 3×3 (9-up), 1+5 (spotlight + sidebar)
- Per-stream status overlays (green live dot, offline state, maintenance banner)
- Click-to-fullscreen on any tile

### 1.6 Ant Media Webhook Handler

```ts
// api/webhooks/antmedia.ts
export async function handleAntMediaWebhook(payload: AntMediaEvent) {
  switch (payload.action) {
    case 'liveStreamEnded':
      await cameraService.setStatus(payload.streamId, 'Offline');
      await alertService.create({
        title: `Camera offline — ${payload.streamId}`,
        severity: 'Warning',
        source: 'System',
      });
      break;
    case 'liveStreamStarted':
      await cameraService.setStatus(payload.streamId, 'Online');
      break;
  }
}
```

### 1.7 Test Suite — `cameras/__tests__/`

```ts
// CameraPlayer.test.tsx
describe('CameraPlayer', () => {
  it('renders offline placeholder when status is Offline', () => { ... });
  it('renders skeleton while token is loading', () => { ... });
  it('renders error state when token fetch fails', () => { ... });
  it('initializes WebRTC adaptor when token is available', () => { ... });
  it('stops WebRTC stream on unmount', () => { ... });
});

// useStreamToken.test.ts
describe('useStreamToken', () => {
  it('fetches token from backend with correct streamId', async () => { ... });
  it('returns isLoading=true while fetching', async () => { ... });
  it('returns error when backend returns 403', async () => { ... });
  it('does not refetch token if streamId unchanged', async () => { ... });
});

// antmediaWebhook.test.ts
describe('antmediaWebhook', () => {
  it('sets camera status to Offline on liveStreamEnded', async () => { ... });
  it('creates Warning alert on liveStreamEnded', async () => { ... });
  it('sets camera status to Online on liveStreamStarted', async () => { ... });
  it('rejects requests without valid signature', async () => { ... });
});
```

### 1.8 DigitalOcean Recommendations

**Current (baseline):**
- 1× Ant Media EE Droplet (8 vCPU / 16 GB RAM) handles ~50 concurrent WebRTC streams
- DO Spaces for recordings (S3-compatible, cheap egress within DO)

**Recommended upgrades:**

| What | Why |
|---|---|
| Add a DO Load Balancer in front of Ant Media | Zero-downtime restarts, health checks, SSL termination |
| Enable Ant Media cluster mode with 2+ Origin + Edge nodes | Origins ingest, Edges serve playback — separates load |
| Use DO Spaces CDN (built-in) for HLS recordings | Viewers get segments from edge, not your Droplet |
| Managed PostgreSQL (DO) for stream metadata | Avoid storing stream state in Ant Media's internal DB |
| DO Monitoring + alerts on Ant Media Droplet CPU | Streams are CPU-heavy; alert at 70% so you can scale before it saturates |

**Topology diagram:**

```
IP Cameras (RTMP/RTSP)
        │
        ▼
Ant Media Origin Nodes (2×) ──── DO Load Balancer ──── Internet
        │
        ▼
Ant Media Edge Nodes (2×)
        │
        ├─ WebRTC → Primex React app (dispatcher camera grid)
        └─ HLS → DO Spaces CDN → recordings archive
```

---

## Module 2: AI Detection Integration

### 2.1 What the Mockup Defines

From `Primex-Mockup.jsx` Phase 2 tags:
- "Manual + AI-flagged alerts (Phase 2) routed to one dispatcher"
- "Real-Time AI Detection — Detect people, vehicles, motion, and suspicious activity automatically"
- `ReportsPage` has `phaseTag="AI insights · Phase 3"` — suggests AI reporting comes after detection

Detection categories needed: people lingering, concealment behavior, after-hours motion, door events, vehicle detection.

### 2.2 Architecture: Frame Extraction Worker

Since you control the Ant Media server, the most efficient path is a Python worker that:
1. Pulls JPEG snapshots from Ant Media's REST API at configurable intervals (e.g. every 2 seconds per camera)
2. Runs inference on each frame
3. Posts results to the Primex API if confidence exceeds threshold

```
Ant Media REST API (/broadcasts/{streamId}/snapshot)
        │  (2-second poll per active camera)
        ▼
AI Worker (Python, DO Droplet — GPU or CPU)
  ├── Object detection model (YOLOv8 or Roboflow Inference)
  ├── Behavior classification (dwell time, concealment heuristic)
  └── POST /api/ai-events { streamId, cameraId, eventType, confidence, frameUrl }
        │
        ▼
Primex API → Alert creation → WebSocket push → Dispatcher UI
```

### 2.3 Model Selection Recommendation

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **YOLOv8n (self-hosted)** | Free, fast on CPU, no data leaves DO | Requires model tuning, no behavior analysis | Best for cost-sensitive Phase 2 start |
| **Roboflow Inference** | Pre-tuned security models, hosted API | Per-inference cost, data leaves infra | Good if GPU Droplet is too slow |
| **AWS Rekognition** | No infra to manage, person/activity detection | Expensive at scale, ties to AWS | Avoid — contradicts your DO-first strategy |
| **Claude Vision API** | Rich scene understanding, no training needed | Higher latency (not real-time), cost at scale | Best for incident report generation (Phase 3) |

**Recommended path:** YOLOv8n on a DO GPU Droplet (H100 or A100) for real-time detection. Claude Vision for post-incident report summaries.

### 2.4 AI Worker — Python Service

```python
# ai_worker/worker.py
import asyncio, httpx
from ultralytics import YOLO

model = YOLO("yolov8n.pt")  # or custom-tuned security model
SNAPSHOT_INTERVAL = 2  # seconds

async def process_camera(camera_id: str, stream_id: str):
    async with httpx.AsyncClient() as client:
        while True:
            # Pull frame from Ant Media
            frame_res = await client.get(
                f"{ANTMEDIA_API}/broadcasts/{stream_id}/snapshot",
                headers={"Authorization": f"Bearer {ANTMEDIA_TOKEN}"}
            )
            if frame_res.status_code == 200:
                results = model(frame_res.content)
                events = extract_security_events(results, camera_id)
                for event in events:
                    await client.post(f"{PRIMEX_API}/ai-events", json=event)
            await asyncio.sleep(SNAPSHOT_INTERVAL)

def extract_security_events(results, camera_id: str) -> list:
    events = []
    for box in results[0].boxes:
        cls = results[0].names[int(box.cls)]
        conf = float(box.conf)
        if cls == "person" and conf > 0.75:
            events.append({
                "cameraId": camera_id,
                "eventType": "person_detected",
                "confidence": conf,
                "boundingBox": box.xyxy[0].tolist()
            })
    return events
```

### 2.5 Dwell Time / Behavior Heuristic

Raw YOLO detection tells you "person present." Suspicious behavior needs a layer on top:

```python
# State tracker per camera — in-memory (or Redis for multi-worker)
dwell_tracker: dict[str, dict] = {}  # { camera_id: { person_track_id: { first_seen, last_seen, zone } } }

def update_dwell(camera_id, track_id, zone, timestamp):
    key = f"{camera_id}:{track_id}"
    if key not in dwell_tracker:
        dwell_tracker[key] = { "first_seen": timestamp, "zone": zone }
    dwell_tracker[key]["last_seen"] = timestamp
    dwell_seconds = (timestamp - dwell_tracker[key]["first_seen"]).seconds
    if dwell_seconds > 120:  # 2+ minutes in high-value zone
        return "suspicious_dwell"
    return None
```

### 2.6 Alert Source Field

The mockup's `Alert` entity already has `source: "AI"` as a valid value (from the mock data: `{ source: "AI" }`). The AI pipeline slots directly into the existing alert model. No schema changes needed.

### 2.7 UI Changes for AI Alerts

In `AlertFeed`, AI-sourced alerts get an additional visual treatment:

```tsx
// In AlertFeed row rendering
{alert.source === 'AI' && (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10.5, color: T.blue, fontWeight: 600, letterSpacing: 0.3 }}>
    <Cpu size={10} /> AI
  </span>
)}
```

The camera tile in the alert detail panel shows the frame snapshot that triggered the alert (stored in DO Spaces via the worker).

### 2.8 Test Suite — `ai/__tests__/`

```ts
// aiAlertPipeline.test.ts
describe('AI Alert Pipeline', () => {
  it('creates alert with source=AI when confidence exceeds threshold', async () => { ... });
  it('does not create alert when confidence is below threshold', async () => { ... });
  it('attaches frameUrl to alert when snapshot is available', async () => { ... });
  it('deduplicates alerts for same camera within cooldown window', async () => { ... });
  it('sets severity to Critical for suspicious_dwell events', async () => { ... });
  it('sets severity to Warning for after_hours_motion events', async () => { ... });
});

// aiEventHandler.test.ts (API endpoint)
describe('POST /api/ai-events', () => {
  it('rejects requests without valid worker API key', async () => { ... });
  it('creates alert and triggers WebSocket notification', async () => { ... });
  it('returns 400 for missing required fields', async () => { ... });
  it('applies cooldown correctly — no duplicate alerts within 60s', async () => { ... });
});

// AlertFeed.test.tsx — AI source display
describe('AlertFeed AI source', () => {
  it('renders AI badge on alerts with source=AI', () => { ... });
  it('does not render AI badge on manual alerts', () => { ... });
  it('renders frame snapshot thumbnail in detail panel for AI alerts', () => { ... });
});
```

---

## Module 3: Drag-and-Drop Dispatch Board

### 3.1 What the Mockup Shows

The `DispatchBoard` component exists in the dispatcher view (`section === "dispatch"`). Currently it is a static list. The Phase 2 version adds drag-and-drop to assign guards to incidents by dragging a guard card onto an incident column.

The mockup's data model already supports this: `Incident.guardId` is the assignment FK.

### 3.2 Library Recommendation

| Library | Size | API | Recommendation |
|---|---|---|---|
| **`@dnd-kit/core`** | 10 KB | Headless, composable, keyboard-accessible | **Use this** |
| `react-beautiful-dnd` | 30 KB | Higher-level, less flexible | Archived, avoid |
| `react-dnd` | 25 KB | Flexible but verbose | Overkill for this use case |

`@dnd-kit` is the best fit — it's headless (works with your existing inline styles from the mockup's design system), accessible by default, and has native touch support for the Guard mobile view.

### 3.3 Board Layout

```
┌─────────────────────────────────────────────────────────┐
│  DISPATCH BOARD                                          │
├──────────────┬──────────────┬──────────────┬────────────┤
│  UNASSIGNED  │  DISPATCHED  │  IN PROGRESS │  RESOLVED  │
│  (3)         │  (1)         │  (1)         │  (2)       │
│              │              │              │            │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │            │
│ │Incident 1│ │ │Incident 2│ │ │Incident 3│ │            │
│ │Critical  │ │ │Critical  │ │ │Warning   │ │            │
│ │Bay Ridge │ │ │Park Slope│ │ │Bay Ridge │ │            │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │            │
│              │              │              │            │
│ GUARDS       │              │              │            │
│ ┌──────────┐ │              │              │            │
│ │Marcus E. │ │              │              │            │
│ │Available │ │              │              │            │
│ └──────────┘ │              │              │            │
└──────────────┴──────────────┴──────────────┴────────────┘
```

Drag interactions:
- Guard card → Incident card: assigns guard, moves incident to Dispatched
- Incident card → column: changes incident status
- Guard card → column header: bulk-assigns to all unassigned in that column (Phase 3)

### 3.4 Implementation

```tsx
// features/dispatcher/DispatchBoard.tsx
import {
  DndContext, DragOverlay, closestCorners,
  useDraggable, useDroppable, DragEndEvent,
} from '@dnd-kit/core';
import { useIncidentStore } from '../../stores/incidentStore';
import { useGuardStore } from '../../stores/guardStore';

const COLUMNS: IncidentStatus[] = ['Open', 'Dispatched', 'In Progress', 'Resolved'];

export function DispatchBoard() {
  const { incidents, assignGuard, updateStatus } = useIncidentStore();
  const { guards } = useGuardStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const draggedType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Guard dragged onto Incident → assign
    if (draggedType === 'guard' && overType === 'incident') {
      assignGuard(over.id as string, active.id as string);
    }
    // Incident dragged onto Column → update status
    if (draggedType === 'incident' && overType === 'column') {
      updateStatus(active.id as string, over.id as IncidentStatus);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={e => setActiveId(String(e.active.id))}
      collisionDetection={closestCorners}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {COLUMNS.map(col => (
          <DispatchColumn key={col} status={col}
            incidents={incidents.filter(i => i.status === col)}
            guards={col === 'Open' ? guards.filter(g => g.status === 'Available') : []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeId && <DragPreview id={activeId} incidents={incidents} guards={guards} />}
      </DragOverlay>
    </DndContext>
  );
}

function DispatchColumn({ status, incidents, guards }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column' } });
  return (
    <div ref={setNodeRef} style={{
      background: isOver ? T.blueSofter : T.surfaceSubtle,
      borderRadius: 10, padding: 12, minHeight: 400,
      border: `1px solid ${isOver ? T.blue : T.border}`,
      transition: 'background .15s, border-color .15s',
    }}>
      <ColumnHeader status={status} count={incidents.length} />
      {incidents.map(inc => <DraggableIncidentCard key={inc.id} incident={inc} />)}
      {guards.map(g => <DraggableGuardCard key={g.id} guard={g} />)}
    </div>
  );
}

function DraggableIncidentCard({ incident }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: incident.id, data: { type: 'incident' },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{
      opacity: isDragging ? 0.4 : 1,
      transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      background: T.surface, borderRadius: 8, padding: 14,
      border: `1px solid ${T.border}`, marginBottom: 8, cursor: 'grab',
    }}>
      <Pill tone={sevTone(incident.severity)}>{incident.severity}</Pill>
      <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginTop: 8 }}>
        {incident.title}
      </div>
    </div>
  );
}
```

### 3.5 Optimistic Updates + Undo

Drag-and-drop assignment should feel instant. Use optimistic updates in Zustand and roll back on API error:

```ts
assignGuard: async (incidentId, guardId) => {
  const prev = get().incidents;
  // Optimistic
  set(state => ({
    incidents: state.incidents.map(i =>
      i.id === incidentId ? { ...i, guardId, status: 'Dispatched' } : i
    )
  }));
  try {
    await incidentService.assignGuard(incidentId, guardId);
  } catch {
    set({ incidents: prev }); // rollback
    toast.error('Assignment failed — please try again');
  }
}
```

### 3.6 Test Suite — `dispatcher/__tests__/DispatchBoard.test.tsx`

```ts
describe('DispatchBoard', () => {
  it('renders 4 columns: Open, Dispatched, In Progress, Resolved', () => { ... });
  it('renders incidents in correct columns by status', () => { ... });
  it('renders available guards in the Open column', () => { ... });
  it('columns highlight on drag-over', () => { ... });
  it('assigns guard when guard card is dropped on incident card', async () => { ... });
  it('moves incident to correct column when dropped on column header', async () => { ... });
  it('rolls back assignment on API error', async () => { ... });
  it('is keyboard accessible — guard can be assigned via keyboard', async () => { ... });
  it('shows DragOverlay with correct preview during drag', async () => { ... });
  it('off-duty guards cannot be dragged', () => { ... });
  it('optimistically updates UI before API response', async () => { ... });
});
```

---

## Module 4: Playwright E2E Tests

### 4.1 Setup

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } }, // Guard view
  ],
});
```

### 4.2 Page Object Model

```ts
// e2e/pages/DispatcherPage.ts
export class DispatcherPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/dispatcher'); }

  async selectAlert(title: string) {
    await this.page.getByRole('button', { name: title }).click();
  }

  async convertToIncident() {
    await this.page.getByRole('button', { name: 'Convert to incident' }).click();
  }

  async assignGuard(guardName: string) {
    await this.page.getByRole('combobox', { name: 'Guard' }).selectOption(guardName);
    await this.page.getByRole('button', { name: 'Dispatch' }).click();
  }
  
  alertQueue() { return this.page.locator('[data-testid="alert-queue"]'); }
  dispatchBoard() { return this.page.locator('[data-testid="dispatch-board"]'); }
}
```

### 4.3 Critical Flow Test Suites

#### Flow 1: Alert → Incident → Guard Dispatch

```ts
// e2e/flows/alert-to-dispatch.spec.ts
test.describe('Alert to Dispatch Flow', () => {
  test('dispatcher receives critical alert and dispatches guard', async ({ page }) => {
    const dispatcher = new DispatcherPage(page);
    await dispatcher.goto();

    // Step 1: Alert appears in queue
    await expect(dispatcher.alertQueue()).toContainText('Suspicious activity');

    // Step 2: Select alert and view detail
    await dispatcher.selectAlert('Suspicious activity — Spirits aisle');
    await expect(page.getByText('Subject lingering near high-value shelf')).toBeVisible();

    // Step 3: Convert to incident
    await dispatcher.convertToIncident();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('combobox', { name: 'Assign guard' }).selectOption('Marcus Ellis');
    await page.getByRole('button', { name: 'Confirm dispatch' }).click();

    // Step 4: Success state
    await expect(page.getByText('Incident created')).toBeVisible();

    // Step 5: Incident appears on dispatch board
    await page.getByRole('button', { name: 'Dispatch board' }).click();
    await expect(page.getByText('Possible shoplifting')).toBeVisible();
    await expect(page.getByText('Marcus Ellis')).toBeVisible();
  });

  test('dispatcher creates manual alert', async ({ page }) => {
    const dispatcher = new DispatcherPage(page);
    await dispatcher.goto();
    await page.getByRole('button', { name: 'Create alert' }).click();
    await page.getByLabel('Title').fill('Door propped open — rear entrance');
    await page.getByRole('combobox', { name: 'Site' }).selectOption('Sunset Liquor — Bay Ridge');
    await page.getByRole('combobox', { name: 'Severity' }).selectOption('Warning');
    await page.getByRole('button', { name: 'Create alert' }).click();
    await expect(page.getByText('Alert created')).toBeVisible();
    await expect(dispatcher.alertQueue()).toContainText('Door propped open');
  });
});
```

#### Flow 2: Guard Mobile — Accept to Resolve

```ts
// e2e/flows/guard-mobile.spec.ts
test.describe('Guard Mobile Flow', { tag: '@mobile' }, () => {
  test.use({ ...devices['iPhone 14'] });

  test('guard accepts, goes en route, arrives, and resolves incident', async ({ page }) => {
    await page.goto('/guard');
    
    // Step 1: See assigned incident
    await expect(page.getByText('Possible shoplifting — Spirits aisle')).toBeVisible();
    
    // Step 2: Accept
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('Accepted')).toBeVisible();

    // Step 3: En Route
    await page.getByRole('button', { name: 'En Route' }).click();
    await expect(page.getByText('En route')).toBeVisible();

    // Step 4: Arrived
    await page.getByRole('button', { name: 'Arrived' }).click();

    // Step 5: Resolve with notes
    await page.getByRole('button', { name: 'Resolve' }).click();
    await page.getByLabel('Resolution notes').fill('Subject left the store. No items taken. Reviewed footage.');
    await page.getByRole('button', { name: 'Confirm resolution' }).click();
    await expect(page.getByText('Incident resolved')).toBeVisible();
  });
});
```

#### Flow 3: Super Admin Company Onboarding

```ts
// e2e/flows/admin-onboarding.spec.ts
test.describe('Super Admin — Company Onboarding', () => {
  test('admin invites new company and sees it in company list', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Companies' }).click();
    await page.getByRole('button', { name: 'Invite company' }).click();

    // Fill invite form
    await page.getByLabel('Company name').fill('Riverline Convenience');
    await page.getByRole('combobox', { name: 'Company type' }).selectOption('Retail');
    await page.getByLabel('Primary contact name').fill('Sam Rivera');
    await page.getByLabel('Contact email').fill('sam@riverline.com');
    await page.getByRole('button', { name: 'Send invitation' }).click();

    // Success state shows correct email
    await expect(page.getByText('sam@riverline.com')).toBeVisible();
    await expect(page.getByText('Invite sent.')).toBeVisible();

    // Company appears in list after Done
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText('Riverline Convenience')).toBeVisible();
  });
});
```

#### Flow 4: Drag-and-Drop Dispatch Board

```ts
// e2e/flows/dispatch-board-dnd.spec.ts
test.describe('Dispatch Board — Drag and Drop', () => {
  test('guard is assigned to incident by drag and drop', async ({ page }) => {
    await page.goto('/dispatcher');
    await page.getByRole('button', { name: 'Dispatch board' }).click();

    const guardCard = page.getByTestId('guard-card-marcus-ellis');
    const incidentCard = page.getByTestId('incident-card-i3');

    // Drag guard card onto incident card
    await guardCard.dragTo(incidentCard);

    // Incident moves to Dispatched column
    const dispatchedCol = page.getByTestId('column-dispatched');
    await expect(dispatchedCol).toContainText('Camera maintenance check');
    await expect(dispatchedCol).toContainText('Marcus Ellis');
  });

  test('incident moves to correct column when dragged', async ({ page }) => {
    await page.goto('/dispatcher');
    await page.getByRole('button', { name: 'Dispatch board' }).click();

    const incidentCard = page.getByTestId('incident-card-i1');
    const resolvedCol = page.getByTestId('column-resolved');
    await incidentCard.dragTo(resolvedCol);

    await expect(resolvedCol).toContainText('Possible shoplifting');
  });
});
```

#### Flow 5: Camera Stream Goes Offline → Alert Created

```ts
// e2e/flows/camera-offline-alert.spec.ts
test.describe('Camera Offline → Alert Flow', () => {
  test('system alert is created when camera goes offline', async ({ page }) => {
    // Simulate Ant Media webhook (via test endpoint in dev)
    await page.request.post('/test/simulate-webhook', {
      data: { action: 'liveStreamEnded', streamId: 'cam4' }
    });

    await page.goto('/dispatcher');
    await expect(page.getByText('Camera offline — Back Storage')).toBeVisible();
    await expect(page.getByText('System')).toBeVisible(); // source = System
  });
});
```

#### Flow 6: Business Client Read-Only Access

```ts
// e2e/flows/client-access.spec.ts
test.describe('Business Client — Access Controls', () => {
  test('client sees only their site alerts — no dispatch actions', async ({ page }) => {
    await page.goto('/client');
    await page.getByRole('button', { name: 'Alerts' }).click();
    
    // Alerts visible
    await expect(page.getByText('Door propped open')).toBeVisible();

    // No dispatch buttons
    await expect(page.getByRole('button', { name: 'Convert to incident' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign guard' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Escalate' })).not.toBeVisible();
  });

  test('client cannot navigate to dispatcher routes', async ({ page }) => {
    await page.goto('/dispatcher');
    await expect(page).toHaveURL('/login');
  });
});
```

### 4.4 CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build && npm run preview &
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Additional Recommendations: What to Add Beyond the Mockup

These are capabilities not currently in the mockup that would meaningfully strengthen the platform at Phase 2:

### R1: WebSocket Real-Time Push

The mockup uses mock data snapshots. In production, the dispatcher queue needs live updates. Add a WebSocket layer so new alerts appear instantly without polling:

```ts
// hooks/useRealtimeAlerts.ts
export function useRealtimeAlerts() {
  const addAlert = useAlertStore(s => s.addAlert);
  useEffect(() => {
    const ws = new WebSocket(`wss://api.primex.io/ws?token=${userToken}`);
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === 'new_alert') addAlert(event.payload);
    };
    return () => ws.close();
  }, []);
}
```

**Test:**
```ts
describe('useRealtimeAlerts', () => {
  it('adds alert to store when WebSocket new_alert message received', async () => { ... });
  it('reconnects after disconnect', async () => { ... });
  it('closes WebSocket on unmount', async () => { ... });
});
```

### R2: DO Spaces Frame Snapshot Storage

When the AI worker detects an event, the triggering frame should be stored in DO Spaces and the URL attached to the alert. Dispatchers see the exact frame that triggered the AI alert in the alert detail panel — this is the difference between "AI flagged something" and "here's what the AI saw."

### R3: Streaming Fallback: HLS for Low-Bandwidth Clients

WebRTC is ideal for the dispatcher (low latency), but for business clients (who may be on mobile with poor signal), fall back to HLS from DO Spaces CDN. Ant Media EE handles this automatically — implement with a `preferHLS` flag on the `CameraPlayer` based on `navigator.connection.effectiveType`.

### R4: Multi-Monitor Dispatcher Mode

For dispatch centers with multiple screens, a `/dispatcher/wall` route renders a fullscreen camera grid (3×3 or 4×4) without the sidebar. The mockup doesn't show this but it's a natural extension of the camera monitoring view and adds real operational value.

---

## Phase 2 Timeline

| Week | Focus |
|---|---|
| 8–9 | Ant Media integration — stream token service, `CameraPlayer`, webhook handler, streaming tests |
| 10–11 | AI Worker — Python service, DO GPU Droplet setup, YOLOv8 model, dwell heuristic, AI alert pipeline |
| 12 | Dispatch board DnD — `@dnd-kit` implementation, optimistic updates, board tests |
| 13 | WebSocket real-time push — server + client, reconnection logic |
| 14–15 | Playwright E2E — all 6 critical flows, CI pipeline, mobile viewport tests |
| 16 | DO infrastructure hardening — LB, Ant Media cluster, Spaces CDN, monitoring |

---


---

## Appendix: Unified File Tree (Phase 1 + Phase 2)

```
src/
├── design-system/
│   ├── tokens.ts                    # T object + sans/serif fonts
│   └── components/                  # Pill, Btn, Card, Modal, DataTable, etc. (+ __tests__)
├── types/
│   └── domain.ts                    # Company, Site, Camera, Guard, Alert, Incident (+ Phase 2 stream fields)
├── stores/
│   ├── authStore.ts
│   ├── alertStore.ts
│   ├── incidentStore.ts
│   └── guardStore.ts                # Phase 2 — dispatch board
├── hooks/
│   ├── useAlerts.ts
│   ├── useModal.ts
│   ├── useRole.ts
│   ├── useStreamToken.ts            # Phase 2 — Ant Media tokens
│   └── useRealtimeAlerts.ts         # Phase 2 — WebSocket push
├── services/
│   ├── alertService.ts
│   ├── incidentService.ts
│   └── streamTokenService.ts        # Phase 2 — backend
├── utils/
│   ├── tones.ts                     # sevTone, incTone, camTone
│   ├── formatTime.ts
│   └── getInitials.ts
├── data/
│   └── mock.ts                      # All mock data from mockup
├── features/
│   ├── auth/                        # LandingPage, LoginPage, TopBar
│   ├── navigation/                  # Sidebar
│   ├── admin/                       # AdminDashboard, InviteCompanyModal, CompanyDetailsModal
│   ├── dispatcher/                  # AlertFeed, CameraGrid, GuardRoster, DispatchBoard (Phase 2 DnD)
│   ├── guard/                       # AssignmentCard, ResolveIncidentModal
│   ├── company/                     # SiteList, AddSiteModal, TeamTable
│   ├── client/                      # ClientSiteCard, ClientAlertList, ClientHelp
│   ├── cameras/                     # Phase 2 — CameraPlayer, CameraMonitoringPage
│   └── ai/                          # Phase 2 — AI alert pipeline UI
├── router/
│   └── index.tsx                    # Role-based protected routes
├── api/
│   └── webhooks/antmedia.ts         # Phase 2 — stream lifecycle webhooks
├── test/
│   ├── setup.ts
│   └── mswHandlers.ts
└── App.tsx

e2e/                                 # Phase 2 — Playwright
├── pages/                           # Page Object Model
└── flows/                           # 6 critical-flow specs

ai_worker/                           # Phase 2 — Python (separate deploy on DO GPU Droplet)
└── worker.py

infra/                               # Phase 2 — DO topology notes / IaC
```

## Appendix: Full Timeline (Weeks 1–16)

| Weeks | Phase | Focus |
|---|---|---|
| 1–2 | 1 | Scaffold, design system, router, stores, mock data |
| 3 | 1 | Landing, Login, TopBar, Sidebar (all 5 role nav configs) |
| 4–5 | 1 | Super Admin + Dispatcher views and all modals |
| 6 | 1 | Guard, Company Manager, Business Client views |
| 7 | 1 | Integration, accessibility, responsive, full test pass |
| 8–9 | 2 | Ant Media — stream tokens, CameraPlayer, webhooks |
| 10–11 | 2 | AI worker — DO GPU Droplet, YOLOv8, dwell heuristic, alert pipeline |
| 12 | 2 | Dispatch board drag-and-drop (@dnd-kit), optimistic updates |
| 13 | 2 | WebSocket real-time push |
| 14–15 | 2 | Playwright E2E — 6 flows, CI, mobile viewports |
| 16 | 2 | DO hardening — load balancer, Ant Media cluster, Spaces CDN, monitoring |

## Appendix: Key Architectural Decisions

1. **Ant Media replaces AWS Kinesis entirely.** Flat DO cost vs. per-GB AWS billing. At 240+ sites running 24/7, this is the decisive cost and control advantage.
2. **AI alerts reuse the existing `Alert` model.** The mockup's `source: "AI"` field means the AI pipeline needs zero schema changes — it just creates alerts like any other source.
3. **`@dnd-kit` for the dispatch board.** Headless (works with the mockup's inline-style design system), accessible by default, native touch support for the Guard mobile view.
4. **WebSocket push is the highest-impact production addition.** The mockup is static; live alert delivery is what makes it operational.
5. **Optimistic updates with rollback** on all dispatch actions so the board feels instant.

---

*Single-file build spec generated from `Primex-Mockup.jsx`. Phase 1 is a complete, testable product on its own; Phase 2 extends it without breaking changes.*
