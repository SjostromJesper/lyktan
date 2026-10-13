// The newest regular products for the homepage's "Nytt i butiken". Singles (tag
// "single") and events never belong there. Cached for a minute on the server.
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const language = toShopifyLanguage(getQuery(event).lang)

  return shopifyStorefrontGraphql(`#graphql
  query HomepageProducts($language: LanguageCode!) @inContext(language: $language) {
    showcaseProducts: products(first: 10, sortKey: CREATED_AT, reverse: true, query: "-tag:event AND -tag:single") {
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
`, { language }, { ttl: 60 })
})
