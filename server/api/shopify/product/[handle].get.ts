export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const handle = String(event.context.params?.handle || '').trim()
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
    query ProductPage($handle: String!) {
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
        variants(first: 25) {
          nodes {
            id
            title
            availableForSale
            quantityAvailable
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `

  const response = await fetch(`https://${shopDomain}/api/2026-01/graphql.json`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': publicToken
    },
    body: JSON.stringify({
      query,
      variables: { handle }
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

  if (product && privateToken) {
    const adminQuery = `#graphql
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

    try {
      const adminResponse = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': privateToken
        },
        body: JSON.stringify({
          query: adminQuery,
          variables: { query: `handle:${handle}` }
        })
      })

      const adminResult = await adminResponse.json()

      if (!adminResponse.ok || adminResult.errors?.length) {
        console.warn(
          '[shopify/product] Admin API inventory lookup failed, falling back to Storefront stock counts:',
          adminResponse.status,
          adminResult.errors ?? adminResult
        )
      }

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
    } catch (adminError) {
      console.warn('[shopify/product] Admin API inventory lookup threw, falling back to Storefront stock counts:', adminError)
    }
  }

  return {
    handle,
    product
  }
})
