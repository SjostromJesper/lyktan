export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const language = toShopifyLanguage(getQuery(event).lang)

  const data = await shopifyStorefrontGraphql<{
    collection: {
      id: string
      title: string
      handle: string
      products: { nodes: any[] }
    } | null
  }>(`#graphql
    query SinglesCollection($first: Int!, $language: LanguageCode!) @inContext(language: $language) {
      collection(handle: "singelkort") {
        id
        title
        handle
        products(first: $first, sortKey: TITLE) {
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
            variants(first: 25) {
              nodes {
                id
                title
                availableForSale
                quantityAvailable
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
    # Same reasoning as the general collection route: the singles catalog is
    # small for now, so one request covers everything and the page can
    # filter/sort client-side with no pagination.
  `, { first: 250, language })

  return {
    collection: data.collection ? { id: data.collection.id, title: data.collection.title, handle: data.collection.handle } : null,
    products: data.collection?.products.nodes ?? []
  }
})
