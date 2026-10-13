// The catalog grows with every scanned bunt, and Shopify returns at most 250 products per
// request, so the list is fetched page by page until it is complete (capped as a safety net).
const PAGE_SIZE = 250
const MAX_PAGES = 12

const SINGLES_QUERY = `#graphql
    query SinglesCollection($first: Int!, $after: String, $language: LanguageCode!) @inContext(language: $language) {
      collection(handle: "singelkort") {
        id
        title
        handle
        products(first: $first, after: $after, sortKey: TITLE) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            cardGame: metafield(namespace: "custom", key: "card_game") {
              value
            }
            cardSet: metafield(namespace: "custom", key: "card_set") {
              value
            }
            rarity: metafield(namespace: "custom", key: "rarity") {
              value
            }
            collectorNumber: metafield(namespace: "custom", key: "collector_number") {
              value
            }
            setCode: metafield(namespace: "custom", key: "set_code") {
              value
            }
            cardLanguage: metafield(namespace: "custom", key: "card_language") {
              value
            }
            variants(first: 25) {
              nodes {
                id
                title
                availableForSale
                quantityAvailable
                image {
                  url
                  altText
                }
                selectedOptions {
                  name
                  value
                }
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
    }
  `

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const language = toShopifyLanguage(getQuery(event).lang)
  const ttl = getQuery(event).t ? 0 : 30

  let collection: { id: string, title: string, handle: string } | null = null
  const products: any[] = []
  let after: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const data: any = await shopifyStorefrontGraphql(SINGLES_QUERY, { first: PAGE_SIZE, after, language }, { ttl })

    if (!data.collection) break

    collection = { id: data.collection.id, title: data.collection.title, handle: data.collection.handle }
    products.push(...data.collection.products.nodes)

    if (!data.collection.products.pageInfo?.hasNextPage) break
    after = data.collection.products.pageInfo.endCursor
  }

  return { collection, products }
})
