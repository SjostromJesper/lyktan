// Reads the "Medlemskap" product from Shopify and maps its variants onto
// our fixed tier/duration grid. The product is maintained by hand in
// Shopify admin — see MEDLEMSKAP_SETUP.md for the expected option names.
const MEMBERSHIP_HANDLE = 'medlemskap'

type Plan = {
  variantId: string
  tier: 'litet' | 'stort'
  months: 1 | 6 | 12
  priceKr: number
  availableForSale: boolean
}

const parseTier = (value: string): 'litet' | 'stort' | null => {
  const normalized = value.trim().toLowerCase()
  if (normalized.startsWith('litet')) return 'litet'
  if (normalized.startsWith('stort')) return 'stort'
  return null
}

const parseMonths = (value: string): 1 | 6 | 12 | null => {
  const match = value.match(/\d+/)
  const months = match ? Number(match[0]) : null
  if (months === 1 || months === 6 || months === 12) return months
  return null
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const shopDomain = String(process.env.SHOPIFY_STORE_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '')

  if (!shopDomain || !publicToken) {
    throw createError({ statusCode: 500, statusMessage: 'Shopify-uppgifter saknas' })
  }

  const query = `#graphql
    query MembershipProduct($handle: String!) {
      product(handle: $handle) {
        id
        variants(first: 25) {
          nodes {
            id
            availableForSale
            price {
              amount
            }
            selectedOptions {
              name
              value
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
    body: JSON.stringify({ query, variables: { handle: MEMBERSHIP_HANDLE } })
  })

  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw createError({
      statusCode: response.status || 500,
      statusMessage: result.errors?.map((entry: { message: string }) => entry.message).join(', ') || 'Shopify request failed'
    })
  }

  const variants = result.data?.product?.variants?.nodes ?? []
  const plans: Plan[] = []

  for (const variant of variants) {
    const options: { name: string; value: string }[] = variant.selectedOptions ?? []
    let tier: 'litet' | 'stort' | null = null
    let months: 1 | 6 | 12 | null = null

    for (const option of options) {
      tier = tier ?? parseTier(option.value)
      months = months ?? parseMonths(option.value)
    }

    if (!tier || !months) continue

    plans.push({
      variantId: variant.id,
      tier,
      months,
      priceKr: Math.round(Number(variant.price?.amount ?? 0)),
      availableForSale: Boolean(variant.availableForSale)
    })
  }

  return { plans }
})
