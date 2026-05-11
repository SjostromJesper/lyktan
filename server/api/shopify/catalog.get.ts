export default defineEventHandler(async () => {
  const shopDomain = String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '')

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
    query CatalogProducts {
      products(first: 100, sortKey: TITLE) {
        nodes {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
          variants(first: 1) {
            nodes {
              id
              price {
                amount
                currencyCode
              }
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
    body: JSON.stringify({ query })
  })

  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw createError({
      statusCode: response.status || 500,
      statusMessage: result.errors?.map((entry: { message: string }) => entry.message).join(', ') || 'Shopify request failed'
    })
  }

  return {
    products: result.data?.products?.nodes ?? []
  }
})
