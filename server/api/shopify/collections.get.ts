export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const data = await shopifyStorefrontGraphql<{
    collections: { nodes: { id: string, handle: string, title: string, image: { url: string, altText: string | null } | null }[] }
  }>(`#graphql
    query Collections {
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
  `)

  return { collections: data.collections?.nodes ?? [] }
})
