import { createClient } from '@supabase/supabase-js'

let client = null

// Server-only Supabase client using the service_role key. This file lives
// under /api and must NEVER be imported from anything in /src — importing
// it client-side would ship the service role key to every visitor's browser.
export function getSupabaseAdmin() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured in environment variables.')
  }

  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}
