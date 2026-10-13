// The whole regular shop in one list ("Visa hela sortimentet"): every product except
// events (sold via /events), the singles (their own section under /singelkort) and
// the internal utility products. Same product shape as the collection route, so the
// category page can show it with the same filters and sorting.
const SORT_KEYS: Record<string, 'TITLE' | 'PRICE' | 'CREATED_AT'> = { TITLE: 'TITLE', PRICE: 'PRICE', CREATED: 'CREATED_AT' }
const EXCLUDED_HANDLES = new Set(['medlemskap', 'bordsbokning-forskott'])
const PAGE_SIZE = 250
const MAX_PAGES = 4

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const query = getQuery(event)
  const sortKey = SORT_KEYS[String(query.sort || 'TITLE').toUpperCase()] ?? 'TITLE'
  const reverse = query.reverse === 'true'
  const language = toShopifyLanguage(query.lang)

  const products: any[] = []
  let after: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const data: any = await shopifyStorefrontGraphql(`#graphql
      query AllProducts($first: Int!, $after: String, $sortKey: ProductSortKeys!, $reverse: Boolean!, $query: String!, $language: LanguageCode!) @inContext(language: $language) {
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
          pageInfo {
            hasNextPage
            endCursor
          }
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
            inStoreOnly: metafield(namespace: "custom", key: "in_store_only") {
              value
            }
            collections(first: 5) {
              nodes {
                handle
              }
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
    `, { first: PAGE_SIZE, after, sortKey, reverse, query: '-tag:event AND -tag:single', language }, { ttl: query.t ? 0 : 60 })

    products.push(...(data.products?.nodes ?? []))

    if (!data.products?.pageInfo?.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }

  return {
    collection: { id: 'all', title: 'Hela sortimentet', handle: 'alla' },
    products: products.filter((p) => !EXCLUDED_HANDLES.has(p.handle) && !(p.tags ?? []).includes('single'))
  }
})
