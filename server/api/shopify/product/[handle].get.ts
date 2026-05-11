export default defineEventHandler(async (event) => {
  const handle = String(event.context.params?.handle || '').trim()
  const shopDomain = String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '')

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

  return {
    handle,
    product: result.data?.product ?? null
  }
})
