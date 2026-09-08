const SITE_URL = 'https://butiklyktan.se'

const STATIC_PATHS = ['/', '/butik', '/bordsbokning', '/events', '/kontakt']

// Shopify products that exist purely as internal purchase vehicles (booking
// deposits, memberships) — not real catalog items, shouldn't be indexed.
const EXCLUDED_PRODUCT_HANDLES = new Set(['medlemskap', 'bordsbokning-forskott'])

const escapeXml = (value: string) => value.replace(/&/g, '&amp;')

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  const urls: { loc: string, lastmod?: string }[] = STATIC_PATHS.map((path) => ({ loc: `${SITE_URL}${path}` }))

  try {
    const [productsData, collectionsData] = await Promise.all([
      shopifyStorefrontGraphql<{ products: { nodes: { handle: string, updatedAt: string }[] } }>(`#graphql
        query SitemapProducts {
          products(first: 250) {
            nodes {
              handle
              updatedAt
            }
          }
        }
      `),
      shopifyStorefrontGraphql<{ collections: { nodes: { handle: string }[] } }>(`#graphql
        query SitemapCollections {
          collections(first: 20) {
            nodes {
              handle
            }
          }
        }
      `)
    ])

    for (const product of productsData.products?.nodes ?? []) {
      if (EXCLUDED_PRODUCT_HANDLES.has(product.handle)) continue
      urls.push({ loc: `${SITE_URL}/produkter/${product.handle}`, lastmod: product.updatedAt?.slice(0, 10) })
    }

    for (const collection of collectionsData.collections?.nodes ?? []) {
      urls.push({ loc: `${SITE_URL}/butik/${collection.handle}` })
    }
  } catch {
    // If Shopify is unreachable, still serve the static pages rather than a 500.
  }

  const body = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}\n  </url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
})
