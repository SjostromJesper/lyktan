export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const language = toShopifyLanguage(getQuery(event).lang)

  const data = await shopifyStorefrontGraphql<{
    collections: { nodes: { id: string, handle: string, title: string, image: { url: string, altText: string | null } | null }[] }
  }>(`#graphql
    query Collections($language: LanguageCode!) @inContext(language: $language) {
      collections(first: 20, sortKey: TITLE) {
        nodes {
          id
          handle
          title
          image {
            url
            altText
          }
        }
      }
    }
  `, { language })

  // Singelkort is a real collection (so the Storefront API can serve it to
  // /singelkort), but that page is deliberately unlisted while it's still
  // pre-launch — it must not show up as a category tile here.
  const collections = (data.collections?.nodes ?? []).filter((c) => c.handle !== 'singelkort')

  return { collections }
})
