const getShopDomain = () =>
  String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

const fetchStorefront = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
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

// Short-lived in-memory cache for read queries. A page view otherwise waits 200-500 ms
// on Shopify for every request; with a cache only the first request in each window does.
// Instances are per server process, so each warm serverless instance keeps its own copy.
const cache = new Map<string, { data: unknown, at: number }>()
const inflight = new Map<string, Promise<unknown>>()
const MAX_ENTRIES = 300

/**
 * Server-side Shopify Storefront API GraphQL call. Shared by every
 * server/api/shopify/* route instead of each one re-implementing the same
 * fetch + error handling.
 *
 * `ttl` (seconds) caches the result. Identical concurrent requests share one call,
 * and if Shopify fails while a cached copy exists, the older copy is served instead
 * of an error. Left out (0) the call always goes to Shopify.
 */
export const shopifyStorefrontGraphql = async <T = any>(
  query: string,
  variables?: Record<string, unknown>,
  options: { ttl?: number } = {}
): Promise<T> => {
  const ttl = import.meta.dev ? 0 : (options.ttl ?? 0)

  if (!ttl) {
    return fetchStorefront<T>(query, variables)
  }

  const key = query + JSON.stringify(variables ?? {})
  const hit = cache.get(key)

  if (hit && Date.now() - hit.at < ttl * 1000) {
    return hit.data as T
  }

  let pending = inflight.get(key) as Promise<T> | undefined

  if (!pending) {
    pending = fetchStorefront<T>(query, variables)
      .then((data) => {
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!)
        cache.set(key, { data, at: Date.now() })
        return data
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }

  try {
    return await pending
  } catch (error) {
    if (hit) return hit.data as T
    throw error
  }
}
