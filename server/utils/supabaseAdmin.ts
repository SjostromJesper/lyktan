import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service role key — bypasses RLS,
 * so it must never be reachable from anywhere under app/. Booking writes
 * only ever happen from server/api routes.
 *
 * A fresh client is created on every call rather than cached in a
 * module-level singleton — a cached client here has been observed to go
 * stale across Nitro dev-server HMR reloads and silently return empty
 * results with no error.
 */
export const useSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is missing'
    })
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
