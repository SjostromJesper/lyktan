import { createHash } from 'node:crypto'
import { getStockholmTodayIso } from '#shared/utils/bookingSlots'

const BOT_PATTERN = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|headless/i

// Not a secret — just prevents the visitor hash from being a trivial
// sha256(ip+ua+date) that anyone could brute-force back to an IP.
const ANALYTICS_SALT = 'butiklyktan-analytics-v1'

const detectDeviceType = (userAgent: string): 'mobile' | 'tablet' | 'desktop' => {
  if (/ipad|tablet/i.test(userAgent)) return 'tablet'
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

type TrackBody = {
  path?: string
  referrer?: string | null
}

export default defineEventHandler(async (event) => {
  const userAgent = getHeader(event, 'user-agent') || ''

  // Silently ignore bots/crawlers and non-browser requests — never error
  // out, a pageview ping should never be able to break the page for a
  // real visitor.
  if (!userAgent || BOT_PATTERN.test(userAgent)) {
    return { ok: true }
  }

  const body = await readBody<TrackBody>(event)
  const path = String(body?.path || '').trim().slice(0, 500)

  if (!path) {
    return { ok: true }
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const today = getStockholmTodayIso()
  const visitorHash = createHash('sha256').update(`${ip}|${userAgent}|${today}|${ANALYTICS_SALT}`).digest('hex')

  let referrerHost: string | null = null
  const referrerRaw = body?.referrer ? String(body.referrer).trim() : ''

  if (referrerRaw) {
    try {
      const referrerUrl = new URL(referrerRaw)
      const ownHost = getRequestHost(event) || ''

      if (referrerUrl.hostname !== ownHost.split(':')[0]) {
        referrerHost = referrerUrl.hostname
      }
    } catch {
      // Malformed referrer — just skip it.
    }
  }

  try {
    const supabase = useSupabaseAdmin()

    await supabase.from('analytics_pageviews').insert({
      path,
      referrer: referrerHost,
      visitor_hash: visitorHash,
      device_type: detectDeviceType(userAgent)
    })
  } catch (err) {
    // A tracking failure should never surface to the visitor.
    console.error('[analytics] failed to record pageview', err)
  }

  return { ok: true }
})
