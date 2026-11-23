// Meta Pixel (Facebook/Instagram). Laddas BARA efter att besökaren tackat ja till marknadsföringscookies.
// Före samtycke hämtas inget från Meta och inga cookies sätts.
// Sidvisning skickas vid första sidan och vid varje klientbyte av sida (sajten är en SPA).
// Inloggning, konto och QR-sidor spåras aldrig: deras adresser kan innehålla personuppgifter (t.ex. ?epost=).
const NEVER_TRACK = [/^\/logga-in/, /^\/konto(\/|$)/, /^\/a(\/|$)/]

export default defineNuxtPlugin(() => {
  const pixelId = String(useRuntimeConfig().public.metaPixelId || '')
  if (!pixelId) return

  const route = useRoute()
  const { marketing, load } = useConsent()
  const w = window as any
  let started = false

  const trackable = (path: string) => !NEVER_TRACK.some((re) => re.test(path))
  const pageView = (path: string) => { if (trackable(path)) w.fbq?.('track', 'PageView') }

  // Meta's standardkod för att ladda pixeln, i oförändrad form.
  const loadScript = () => {
    if (w.fbq) return
    const n: any = (w.fbq = function (...args: unknown[]) { n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args) })
    if (!w._fbq) w._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = document.createElement('script')
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(t)
  }

  const start = () => {
    loadScript()
    w.fbq('init', pixelId)
    started = true
    pageView(route.path)
  }

  const clearCookies = () => {
    const host = location.hostname.split('.').slice(-2).join('.')
    for (const name of ['_fbp', '_fbc']) {
      document.cookie = `${name}=; Max-Age=0; path=/`
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${host}`
    }
  }

  load()

  watch(marketing, (choice) => {
    if (choice === 'granted') {
      if (!started) start()
      else w.fbq?.('consent', 'grant')
    } else if (choice === 'denied') {
      if (started) w.fbq?.('consent', 'revoke')
      clearCookies()
    }
  }, { immediate: true })

  watch(() => route.path, (path) => { if (started && marketing.value === 'granted') pageView(path) })
})
