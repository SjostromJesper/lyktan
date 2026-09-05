// Products that should never surface in storefront search — event tickets
// (tag:event, sold via /events instead of /butik) and the two internal
// utility products used only for membership/booking checkout.
const EXCLUDED_HANDLES = new Set(['medlemskap', 'bordsbokning-forskott'])

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const query = getQuery(event)
  const term = String(query.q || '').trim().slice(0, 100)

  if (!term) {
    return { products: [] }
  }

  const safeTerm = term.replace(/["\\]/g, '')

  const data = await shopifyStorefrontGraphql<{ products: { nodes: any[] } }>(`#graphql
    query SearchProducts($query: String!) {
      products(first: 20, query: $query) {
        nodes {
          id
          title
          handle
          tags
          featuredImage {
            url
            altText
          }
          releaseDate: metafield(namespace: "custom", key: "release_date") {
            value
          }
          variants(first: 1) {
            nodes {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `, { query: `(title:*${safeTerm}* OR tag:*${safeTerm}*) AND -tag:event` })

  const products = (data.products?.nodes ?? []).filter((product) => !EXCLUDED_HANDLES.has(product.handle))

  return { products }
})
