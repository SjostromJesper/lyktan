const getShopDomain = () =>
  String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

/**
 * Server-side Shopify Storefront API GraphQL call. Shared by every
 * server/api/shopify/* route instead of each one re-implementing the same
 * fetch + error handling.
 */
export const shopifyStorefrontGraphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  const shopDomain = getShopDomain()
  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '')

  if (!shopDomain) {
    throw createError({ statusCode: 500, statusMessage: 'SHOPIFY_STORE_DOMAIN is missing' })
  }

  if (!publicToken) {
    throw createError({ statusCode: 500, statusMessage: 'SHOPIFY_STOREFRONT_PUBLIC_TOKEN is missing' })
  }

  const response = await fetch(`https://${shopDomain}/api/2026-01/graphql.json`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': publicToken
    },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw createError({
      statusCode: response.status || 500,
      statusMessage: result.errors?.map((entry: { message: string }) => entry.message).join(', ') || 'Shopify request failed'
    })
  }

  return result.data as T
}
