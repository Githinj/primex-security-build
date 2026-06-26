export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'super_admin': return '/dashboard'
    case 'dispatcher': return '/dispatcher'
    case 'guard': return '/guard'
    case 'company_manager': return '/manager'
    case 'client': return '/portal'
    default: return '/dashboard'
  }
}
