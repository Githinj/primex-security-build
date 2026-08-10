/**
 * Every protected route, and which roles each page's server component lets
 * through. Mirrors the `redirect()` guard at the top of each `page.tsx`.
 *
 * Shared between the access-control spec (which asserts on it) and global setup
 * (which walks it to warm the dev server's on-demand compiler).
 */
export interface RouteAccess {
  path: string
  allow: string[]
  /** The page's own <h1>, where it has a stable one. */
  heading?: RegExp
}

export const ROUTE_ACCESS: RouteAccess[] = [
  { path: '/dashboard', allow: ['super_admin'], heading: /Operational overview/ },
  { path: '/companies', allow: ['super_admin'], heading: /Companies/ },
  { path: '/guards', allow: ['super_admin'], heading: /Guards/ },
  { path: '/audit', allow: ['super_admin'], heading: /Audit log/ },
  { path: '/alerts', allow: ['super_admin', 'company_manager'], heading: /Alerts/ },
  { path: '/incidents', allow: ['super_admin', 'company_manager'], heading: /Incidents/ },
  { path: '/sites', allow: ['super_admin', 'company_manager'], heading: /Sites/ },
  { path: '/cameras', allow: ['super_admin', 'company_manager'], heading: /Cameras & devices/ },
  { path: '/reports', allow: ['super_admin', 'company_manager'], heading: /Reports/ },
  { path: '/team', allow: ['super_admin', 'company_manager'], heading: /Team/ },
  { path: '/settings', allow: ['super_admin', 'company_manager'], heading: /Settings/ },
  { path: '/dispatcher', allow: ['super_admin', 'dispatcher'] },
  { path: '/manager', allow: ['super_admin', 'company_manager'] },
  { path: '/guard', allow: ['guard'] },
  { path: '/portal', allow: ['client'] },
]
