// Used by the booking review step to tell the customer up front whether
// they're recognized as a member (and so won't need to pay the deposit).
// Purely informational — server/api/bookings/index.post.ts re-derives this
// itself rather than trusting anything the client sends.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const phone = String(query.phone || '').trim()
  const email = String(query.email || '').trim().toLowerCase()

  if (!phone && !email) {
    return { isMember: false }
  }

  const supabase = useSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  let found = false

  if (email) {
    const { data } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .gte('expiry_date', today)
      .maybeSingle()
    found = Boolean(data)
  }

  if (!found && phone) {
    const { data } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .gte('expiry_date', today)
      .maybeSingle()
    found = Boolean(data)
  }

  return { isMember: found }
})
