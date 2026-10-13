// Not tagged #graphql: this hits the Admin API, not Storefront — the dev-time schema
// validator only knows the Storefront schema and would misflag Admin-only fields.
const adminInventoryQuery = `
  query ProductInventory($query: String!) {
    products(first: 1, query: $query) {
      nodes {
        handle
        variants(first: 25) {
          nodes {
            id
            inventoryQuantity
            sellableOnlineQuantity
          }
        }
      }
    }
  }
`

const fetchAdminInventory = async (shopDomain: string, privateToken: string, handle: string): Promise<any | null> => {
  try {
    const adminResponse = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': privateToken
      },
      body: JSON.stringify({ query: adminInventoryQuery, variables: { query: `handle:${handle}` } })
    })

    const adminResult = await adminResponse.json()

    if (!adminResponse.ok || adminResult.errors?.length) {
      console.warn('[shopify/product] Admin API inventory lookup failed, falling back to Storefront stock counts:', adminResponse.status, adminResult.errors ?? adminResult)
      return null
    }

    return adminResult
  } catch (adminError) {
    console.warn('[shopify/product] Admin API inventory lookup threw, falling back to Storefront stock counts:', adminError)
    return null
  }
}

// A page view reuses the product for a few seconds. The page itself asks for fresh stock
// (with ?t=) as soon as it opens and every 30 seconds, and that always skips this cache.
const PRODUCT_TTL_MS = 10_000
const productCache = new Map<string, { at: number, value: { handle: string, product: any } }>()

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const handle = String(event.context.params?.handle || '').trim()
  const language = toShopifyLanguage(getQuery(event).lang)
  const cacheKey = `${handle}|${language}`
  const cached = productCache.get(cacheKey)

  if (!getQuery(event).t && !import.meta.dev && cached && Date.now() - cached.at < PRODUCT_TTL_MS) {
    return cached.value
  }

  const shopDomain = String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '')
  const privateToken = String(process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || '')

  if (!handle) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing product handle'
    })
  }

  if (!shopDomain) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SHOPIFY_STORE_DOMAIN is missing'
    })
  }

  if (!publicToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SHOPIFY_STOREFRONT_PUBLIC_TOKEN is missing'
    })
  }

  const query = `#graphql
    query ProductPage($handle: String!, $language: LanguageCode!) @inContext(language: $language) {
      product(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        featuredImage {
          url
          altText
        }
        images(first: 10) {
          nodes {
            url
            altText
          }
        }
        collections(first: 3) {
          nodes {
            title
            handle
          }
        }
        releaseDate: metafield(namespace: "custom", key: "release_date") {
          value
        }
        inStoreOnly: metafield(namespace: "custom", key: "in_store_only") {
          value
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
  `

  // The Admin stock lookup only needs the handle, so it runs alongside the Storefront
  // request instead of after it (saves one round trip, ~150 ms).
  const adminLookup = privateToken ? fetchAdminInventory(shopDomain, privateToken, handle) : null

  const response = await fetch(`https://${shopDomain}/api/2026-01/graphql.json`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': publicToken
    },
    body: JSON.stringify({
      query,
      variables: { handle, language }
    })
  })

  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw createError({
      statusCode: response.status || 500,
      statusMessage: result.errors?.map((entry: { message: string }) => entry.message).join(', ') || 'Shopify request failed'
    })
  }

  const product = result.data?.product ?? null

  if (product && !privateToken) {
    console.warn('[shopify/product] SHOPIFY_STOREFRONT_PRIVATE_TOKEN is not set — using Storefront API stock counts, which Shopify may cache briefly.')
  }

  if (product && adminLookup) {
    const adminResult = await adminLookup

    if (adminResult) {
      const adminProduct = adminResult.data?.products?.nodes?.[0]
      const inventoryByVariantId = new Map(
        (adminProduct?.variants?.nodes ?? []).map((variant: any) => [
          variant.id,
          // Prefer sellableOnlineQuantity — it reflects what's actually available
          // to sell via the online store channel. inventoryQuantity can include
          // stock at other locations/channels that isn't sellable here, which
          // was overstating the count shown on the site.
          typeof variant.sellableOnlineQuantity === 'number'
            ? variant.sellableOnlineQuantity
            : typeof variant.inventoryQuantity === 'number'
              ? variant.inventoryQuantity
              : null
        ])
      )

      if (inventoryByVariantId.size) {
        product.variants.nodes = (product.variants?.nodes ?? []).map((variant: any) => {
          const inventoryQuantity = inventoryByVariantId.get(variant.id)

          if (typeof inventoryQuantity !== 'number') {
            return variant
          }

          return {
            ...variant,
            quantityAvailable: inventoryQuantity
          }
        })
      } else {
        console.warn('[shopify/product] Admin API returned no inventory data for handle:', handle, adminResult)
      }
    }
  }

  const value = { handle, product }

  if (product && !import.meta.dev) {
    if (productCache.size >= 200) productCache.delete(productCache.keys().next().value!)
    productCache.set(cacheKey, { at: Date.now(), value })
  }

  return value
})
