const ALLOWED_SORT_KEYS = ['TITLE', 'PRICE', 'CREATED'] as const
type SortKey = (typeof ALLOWED_SORT_KEYS)[number]

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const handle = String(event.context.params?.handle || '').trim()

  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: 'Missing collection handle' })
  }

  const query = getQuery(event)
  const sortKeyParam = String(query.sort || 'TITLE').toUpperCase()
  const sortKey: SortKey = (ALLOWED_SORT_KEYS as readonly string[]).includes(sortKeyParam) ? (sortKeyParam as SortKey) : 'TITLE'
  const reverse = query.reverse === 'true'

  const data = await shopifyStorefrontGraphql<{
    collection: {
      id: string
      title: string
      handle: string
      products: {
        nodes: any[]
      }
    } | null
  }>(`#graphql
    query CollectionProducts($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean!) {
      collection(handle: $handle) {
        id
        title
        handle
        products(first: $first, sortKey: $sortKey, reverse: $reverse) {
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
    }
    # 250 is the Storefront API's max page size — comfortably covers this
    # store's whole catalog (biggest collection is under 30 today), so the
    # page can filter/sort everything client-side with no pagination.
  `, { handle, first: 250, sortKey, reverse })

  if (!data.collection) {
    throw createError({ statusCode: 404, statusMessage: 'Kollektionen hittades inte' })
  }

  return {
    collection: { id: data.collection.id, title: data.collection.title, handle: data.collection.handle },
    products: data.collection.products.nodes
  }
})
