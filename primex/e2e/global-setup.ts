import { execSync } from 'child_process'

export default function globalSetup() {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[global-setup] Resetting Supabase database (attempt ${attempt}/${maxRetries})...`)
      execSync('npx supabase db reset', { stdio: 'inherit', cwd: __dirname + '/..' })
      console.log('[global-setup] Database reset complete.')
      return
    } catch (err) {
      if (attempt === maxRetries) throw err
      console.log(`[global-setup] Reset failed, retrying in 5s...`)
      execSync('sleep 5')
    }
  }
}
