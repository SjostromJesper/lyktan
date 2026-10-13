// One-off events (products tagged "event"). Cached for a minute on the server; the
// page turns the raw products into schedule entries (see useSpecialEvents).
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const language = toShopifyLanguage(getQuery(event).lang)

  return shopifyStorefrontGraphql(`#graphql
  query SpecialEvents($language: LanguageCode!) @inContext(language: $language) {
    products(first: 20, sortKey: TITLE, query: "tag:event") {
      nodes {
        title
        handle
        description
        featuredImage {
          url
          altText
        }
        dateAndTime: metafield(namespace: "custom", key: "date_and_time") {
          value
        }
        showInCarousel: metafield(namespace: "custom", key: "show_in_carousel") {
          value
        }
        variants(first: 1) {
          nodes {
            price {
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
