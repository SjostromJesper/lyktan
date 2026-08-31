import { createHmac, timingSafeEqual } from 'node:crypto'

const VALID_TIERS = ['litet', 'stort']
const VALID_MONTHS = [1, 6, 12]

type NoteAttribute = { name: string; value: string }

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10)

const splitName = (fullName: string): { firstName: string; lastName: string } => {
  const trimmed = fullName.trim().replace(/\s+/g, ' ')
  const spaceIndex = trimmed.indexOf(' ')

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: trimmed }
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1)
  }
}

const handleBookingDeposit = async (order: any, attrMap: Record<string, string>) => {
  const bookingId = String(attrMap.booking_id || '').trim()

  if (!bookingId) {
    throw createError({ statusCode: 400, statusMessage: 'Booking deposit order has no booking_id' })
  }

  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', shopify_order_id: String(order.id) })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Already confirmed (duplicate webhook delivery) or the pending hold
  // expired and got taken by someone else — either way, nothing to do.
  if (!data) {
    return { received: true, skipped: 'booking already confirmed or no longer pending' }
  }

  return { received: true, bookingId }
}

const verifyHmac = (rawBody: string, header: string | undefined, secret: string): boolean => {
  if (!header) return false

  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const digestBuffer = Buffer.from(digest)
  const headerBuffer = Buffer.from(header)

  if (digestBuffer.length !== headerBuffer.length) return false

  return timingSafeEqual(digestBuffer, headerBuffer)
}

export default defineEventHandler(async (event) => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET

  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'SHOPIFY_WEBHOOK_SECRET is missing' })
  }

  const rawBody = await readRawBody(event, 'utf8')
  const hmacHeader = getHeader(event, 'x-shopify-hmac-sha256')

  if (!rawBody || !verifyHmac(rawBody, hmacHeader, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  const order = JSON.parse(rawBody)
  const attributes: NoteAttribute[] = order.note_attributes ?? []
  const attrMap = Object.fromEntries(attributes.map((entry) => [entry.name, entry.value]))

  if (attrMap.booking_deposit === 'true') {
    return await handleBookingDeposit(order, attrMap)
  }

  // This webhook fires for every paid order in the shop, not just
  // membership purchases — ignore anything that isn't one of ours.
  if (attrMap.member_purchase !== 'true') {
    return { received: true, skipped: 'not a membership or booking order' }
  }

  const tier = String(attrMap.member_tier || '').trim()
  const months = Number(attrMap.member_months)
  const name = String(attrMap.member_name || '').trim()
  const email = String(attrMap.member_email || order.email || '').trim().toLowerCase()
  const phone = String(attrMap.member_phone || order.phone || '').trim()

  if (!VALID_TIERS.includes(tier) || !VALID_MONTHS.includes(months)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid membership attributes on order' })
  }

  if (!email && !phone) {
    throw createError({ statusCode: 400, statusMessage: 'Order has neither email nor phone' })
  }

  const supabase = useSupabaseAdmin()
  const orderRef = order.name || `#${order.id}`
  const actor = `Webshop-order ${orderRef} (${email || phone})`

  let existing: { id: string; expiry_date: string | null } | null = null

  if (email) {
    const { data, error } = await supabase
      .from('members')
      .select('id, expiry_date')
      .eq('email', email)
      .maybeSingle()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    existing = data as any
  }

  if (!existing && phone) {
    const { data, error } = await supabase
      .from('members')
      .select('id, expiry_date')
      .eq('phone', phone)
      .maybeSingle()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    existing = data as any
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let memberId: string
  let previousExpiry: string | null = null

  if (existing) {
    memberId = existing.id
    previousExpiry = existing.expiry_date
  } else {
    const { firstName, lastName } = splitName(name || email || phone)

    const { data: created, error: insertError } = await supabase
      .from('members')
      .insert({
        first_name: firstName || 'Okänd',
        last_name: lastName || 'Okänd',
        phone: phone || null,
        email: email || null,
        tier
      })
      .select('id')
      .single()

    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
    memberId = (created as any).id
  }

  // Still active → extend from the current expiry. Expired (or brand new)
  // → start fresh from today. Mirrors the admin panel's renewal logic.
  let base = today

  if (previousExpiry) {
    const previousExpiryDate = new Date(`${previousExpiry}T00:00:00Z`)
    if (previousExpiryDate >= today) {
      base = previousExpiryDate
    }
  }

  const newExpiry = new Date(base)
  newExpiry.setUTCMonth(newExpiry.getUTCMonth() + months)

  const { error: updateError } = await supabase
    .from('members')
    .update({
      expiry_date: toIsoDate(newExpiry),
      renewed_at: toIsoDate(today),
      tier,
      qr_token: crypto.randomUUID()
    })
    .eq('id', memberId)

  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

  const { error: renewalError } = await supabase.from('membership_renewals').insert({
    member_id: memberId,
    months,
    previous_expiry_date: previousExpiry,
    new_expiry_date: toIsoDate(newExpiry),
    source: 'webshop',
    actor
  })

  if (renewalError) throw createError({ statusCode: 500, statusMessage: renewalError.message })

  return { received: true, memberId, newExpiry: toIsoDate(newExpiry) }
})
