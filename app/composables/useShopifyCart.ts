export const useShopifyCart = () => {
  const storefront = useStorefront()
  const cartId = useCookie<string | null>('shopify-cart-id', {
    sameSite: 'lax',
    secure: false
  })

  const cartFragment = `#graphql
    fragment CartFields on Cart {
      id
      checkoutUrl
      totalQuantity
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
        totalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 20) {
        nodes {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
                handle
                featuredImage {
                  url
                  altText
                }
              }
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

  const createCartMutation = `${cartFragment}
    mutation CreateCart($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const addCartLinesMutation = `${cartFragment}
    mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const updateCartLinesMutation = `${cartFragment}
    mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const removeCartLinesMutation = `${cartFragment}
    mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const getCartQuery = `${cartFragment}
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        ...CartFields
      }
    }
  `

  const cart = useState<any | null>('shopify-cart', () => null)
  const cartOpen = useState('shopify-cart-open', () => false)
  const cartBusy = useState('shopify-cart-busy', () => false)
  const cartError = useState('shopify-cart-error', () => '')
  const cartNotice = useState('shopify-cart-notice', () => '')
  const loadingVariantId = useState('shopify-cart-loading-variant', () => '')

  const cartItems = computed(() => cart.value?.lines?.nodes ?? [])
  const cartQuantity = computed(() => cart.value?.totalQuantity ?? 0)
  const checkoutUrl = computed(() => cart.value?.checkoutUrl ?? '')

  const formatMoney = (amount?: string | null, currencyCode?: string | null) => {
    const value = Number(amount ?? 0)
    const currency = currencyCode ?? 'SEK'

    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value)
  }

  const applyCartResult = (payload: any, action: string) => {
    const userErrors = payload?.userErrors ?? []

    if (userErrors.length) {
      cartError.value = userErrors.map((entry: { message: string }) => entry.message).join(', ')
      cartNotice.value = ''
      return false
    }

    cart.value = payload?.cart ?? null

    if (cart.value?.id) {
      cartId.value = cart.value.id
    }

    cartError.value = ''
    cartNotice.value = action
    return true
  }

  const loadExistingCart = async () => {
    if (!cartId.value || cart.value?.id === cartId.value) {
      return
    }

    try {
      cartBusy.value = true
      const response = await storefront.request(getCartQuery, {
        variables: {
          cartId: cartId.value
        }
      })

      cart.value = response.data?.cart ?? null

      if (!cart.value) {
        cartId.value = null
      }
    } catch {
      cartId.value = null
      cart.value = null
    } finally {
      cartBusy.value = false
    }
  }

  const addVariantToCart = async (variantId: string, productTitle: string) => {
    if (!variantId) {
      cartError.value = 'Produkten verkar inte ha en kopbar variant just nu.'
      cartNotice.value = ''
      return
    }

    try {
      loadingVariantId.value = variantId
      cartBusy.value = true

      if (!cart.value?.id) {
        const response = await storefront.request(createCartMutation, {
          variables: {
            lines: [
              {
                quantity: 1,
                merchandiseId: variantId
              }
            ]
          }
        })

        applyCartResult(response.data?.cartCreate, `${productTitle} lades i kundvagnen.`)
        cartOpen.value = true
        return
      }

      const response = await storefront.request(addCartLinesMutation, {
        variables: {
          cartId: cart.value.id,
          lines: [
            {
              quantity: 1,
              merchandiseId: variantId
            }
          ]
        }
      })

      applyCartResult(response.data?.cartLinesAdd, `${productTitle} lades i kundvagnen.`)
      cartOpen.value = true
    } catch (caughtError: any) {
      cartError.value = caughtError?.message ?? 'Det gick inte att lagga till produkten i kundvagnen.'
      cartNotice.value = ''
    } finally {
      loadingVariantId.value = ''
      cartBusy.value = false
    }
  }

  const updateLineQuantity = async (lineId: string, quantity: number) => {
    if (!cart.value?.id) {
      return
    }

    try {
      cartBusy.value = true

      if (quantity <= 0) {
        const response = await storefront.request(removeCartLinesMutation, {
          variables: {
            cartId: cart.value.id,
            lineIds: [lineId]
          }
        })

        applyCartResult(response.data?.cartLinesRemove, 'Produkten togs bort fran kundvagnen.')
        return
      }

      const response = await storefront.request(updateCartLinesMutation, {
        variables: {
          cartId: cart.value.id,
          lines: [
            {
              id: lineId,
              quantity
            }
          ]
        }
      })

      applyCartResult(response.data?.cartLinesUpdate, 'Kundvagnen uppdaterades.')
    } catch (caughtError: any) {
      cartError.value = caughtError?.message ?? 'Det gick inte att uppdatera kundvagnen.'
      cartNotice.value = ''
    } finally {
      cartBusy.value = false
    }
  }

  return {
    cart,
    cartBusy,
    cartError,
    cartNotice,
    cartOpen,
    cartItems,
    cartQuantity,
    checkoutUrl,
    loadingVariantId,
    formatMoney,
    loadExistingCart,
    addVariantToCart,
    updateLineQuantity
  }
}
