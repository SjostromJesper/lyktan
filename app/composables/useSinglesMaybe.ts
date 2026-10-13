import type { CartCard } from '~/utils/singlesCart'

// The "Maybe" list: cards the visitor wants to keep an eye on but isn't buying
// yet. It is not part of the Shopify cart (so it never reaches checkout) and is
// kept in the browser only. Prices and stock are refreshed from Shopify whenever
// the cart page opens, so a saved card never shows a stale price.
const STORAGE_KEY = 'singles-maybe'

const refreshQuery = `#graphql
  query MaybeVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        quantityAvailable
        price {
          amount
          currencyCode
        }
        image {
          url
        }
      }
    }
  }
`

export const useSinglesMaybe = () => {
  const storefront = useStorefront()
  const items = useState<CartCard[]>('singles-maybe', () => [])
  const loaded = useState('singles-maybe-loaded', () => false)

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value.map((i) => ({ ...i, lineId: null }))))
    } catch { /* private mode: the list just won't survive a reload */ }
  }

  const load = () => {
    if (!import.meta.client || loaded.value) return
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(stored)) items.value = stored
    } catch { /* ignore a corrupt list */ }
    loaded.value = true
  }

  const add = (card: CartCard) => {
    const existing = items.value.find((i) => i.variantId === card.variantId)
    items.value = existing
      ? items.value.map((i) => (i.variantId === card.variantId ? { ...i, quantity: i.quantity + card.quantity } : i))
      : [...items.value, { ...card, lineId: null }]
    persist()
  }

  const remove = (variantId: string) => {
    items.value = items.value.filter((i) => i.variantId !== variantId)
    persist()
  }

  const refresh = async () => {
    if (!items.value.length) return

    try {
      const response = await storefront.request(refreshQuery, { variables: { ids: items.value.map((i) => i.variantId) } })
      const nodes = (response.data?.nodes ?? []) as any[]

      items.value = items.value.map((item) => {
        const node = nodes.find((n) => n?.id === item.variantId)
        // A variant that no longer exists is shown as unavailable rather than silently dropped.
        if (!node) return { ...item, available: false, stock: 0 }
        return {
          ...item,
          available: node.availableForSale !== false,
          stock: typeof node.quantityAvailable === 'number' ? node.quantityAvailable : item.stock,
          price: Number(node.price?.amount ?? item.price),
          image: node.image?.url ?? item.image
        }
      })
      persist()
    } catch { /* keep what we have */ }
  }

  return { items, load, add, remove, refresh }
}
