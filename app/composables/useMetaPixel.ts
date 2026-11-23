// Skickar en standardhändelse till Meta Pixel (t.ex. ViewContent, AddToCart). Gör ingenting om besökaren inte
// har godkänt marknadsföringscookies eller om pixeln inte är laddad (se plugins/metaPixel.client.ts).
export const useMetaPixel = () => {
  const { marketing } = useConsent()

  const track = (event: string, params?: Record<string, unknown>) => {
    if (import.meta.server || marketing.value !== 'granted') return
    try {
      ;(window as any).fbq?.('track', event, params)
    } catch {
      // Spårning får aldrig synas för besökaren.
    }
  }

  /** gid://shopify/Product/123 → "123" */
  const numericId = (gid?: string | null) => String(gid ?? '').split('/').pop() ?? ''

  return { track, numericId }
}
