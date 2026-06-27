import { execSync } from 'child_process'

export default function globalSetup() {
  console.log('[global-setup] Resetting Supabase database...')
  execSync('npx supabase db reset', { stdio: 'inherit', cwd: __dirname + '/..' })
  console.log('[global-setup] Database reset complete.')
}
