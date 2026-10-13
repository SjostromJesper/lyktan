// Shopify serves product photos at their full upload size (scans are 1500x2100,
// several hundred KB each). The CDN resizes on request with ?width=, so ask for
// roughly what is shown instead of the original.
export const shopifyImage = (url: string | null | undefined, width: number): string => {
  if (!url) return ''
  if (!url.includes('cdn.shopify.com')) return url
  return `${url}${url.includes('?') ? '&' : '?'}width=${width}`
}

/** srcset for a few widths, so phones and sharp screens each get a fitting size. */
export const shopifySrcset = (url: string | null | undefined, widths: number[]): string | undefined => {
  if (!url || !url.includes('cdn.shopify.com')) return undefined
  return widths.map((w) => `${shopifyImage(url, w)} ${w}w`).join(', ')
}
