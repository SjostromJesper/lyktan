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
  const language = toShopifyLanguage(query.lang)

  // Singles live in their own section (/singelkort), never in the regular shop.
  if (String(event.context.params?.handle || '') === 'singelkort') {
    throw createError({ statusCode: 404, statusMessage: 'Kollektionen hittades inte' })
  }

  const COLLECTION_QUERY = `#graphql
    query CollectionProducts($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean!, $language: LanguageCode!) @inContext(language: $language) {
      collection(handle: $handle) {
        id
        title
        handle
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
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
    }
  `

  // 250 is the Storefront API's max page size. Larger collections are read page by page
  // (capped), so nothing is silently cut off as the catalog grows.
  let data: { collection: { id: string, title: string, handle: string, products: { nodes: any[] } } | null } = { collection: null }
  let after: string | null = null

  for (let page = 0; page < 4; page++) {
    const result: any = await shopifyStorefrontGraphql(COLLECTION_QUERY, { handle, first: 250, after, sortKey, reverse, language }, { ttl: query.t ? 0 : 60 })

    if (!result.collection) break

    data = data.collection
      ? { collection: { ...data.collection, products: { nodes: [...data.collection.products.nodes, ...result.collection.products.nodes] } } }
      : { collection: { ...result.collection, products: { nodes: [...result.collection.products.nodes] } } }

    if (!result.collection.products.pageInfo?.hasNextPage) break
    after = result.collection.products.pageInfo.endCursor
  }

  if (!data.collection) {
    throw createError({ statusCode: 404, statusMessage: 'Kollektionen hittades inte' })
  }

  return {
    collection: { id: data.collection.id, title: data.collection.title, handle: data.collection.handle },
    // Singles only ever show up under /singelkort.
    products: data.collection.products.nodes.filter((product: any) => !(product.tags ?? []).includes('single'))
  }
})
