export const useShopifyCart = () => {
  const { t } = useI18n()
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

  const createCheckoutCartMutation = `#graphql
    mutation CreateCheckoutCart($lines: [CartLineInput!]!, $attributes: [AttributeInput!], $buyerIdentity: CartBuyerIdentityInput) {
      cartCreate(input: { lines: $lines, attributes: $attributes, buyerIdentity: $buyerIdentity }) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Fire-and-forget log for the admin dashboard's live "added to cart"
  // feed (see admin-panel/app/pages/index.vue) — never allowed to affect
  // the customer's own cart flow, so failures are swallowed silently.
  const logCartAdd = (variantId: string, quantity: number) => {
    const line = cart.value?.lines?.nodes?.find((l: any) => l.merchandise?.id === variantId)
    if (!line) return

    const variantTitle = line.merchandise.title && line.merchandise.title !== 'Default Title' ? line.merchandise.title : undefined

    $fetch('/api/activity/cart-add', {
      method: 'POST',
      body: {
        productTitle: line.merchandise.product?.title,
        variantTitle,
        quantity,
        priceKr: line.merchandise.price?.amount ? Number(line.merchandise.price.amount) : undefined
      }
    }).catch(() => {})
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
      cartError.value = t('cart.noVariant')
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

        if (applyCartResult(response.data?.cartCreate, t('cart.itemAdded', { title: productTitle }))) {
          logCartAdd(variantId, 1)
        }
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

      if (applyCartResult(response.data?.cartLinesAdd, t('cart.itemAdded', { title: productTitle }))) {
        logCartAdd(variantId, 1)
      }
      cartOpen.value = true
    } catch (caughtError: any) {
      cartError.value = caughtError?.message ?? t('cart.addFailed')
      cartNotice.value = ''
    } finally {
      loadingVariantId.value = ''
      cartBusy.value = false
    }
  }

  // Batch add — used by the singles list view's "Lägg allt i varukorgen",
  // where several picked variants (each with its own quantity) go into the
  // cart as one action instead of one addVariantToCart call per line.
  const addVariantsToCart = async (lines: { variantId: string, quantity: number }[], noticeText: string) => {
    const cartLines = lines
      .filter((line) => line.variantId && line.quantity > 0)
      .map((line) => ({ quantity: line.quantity, merchandiseId: line.variantId }))

    if (!cartLines.length) return

    try {
      cartBusy.value = true

      if (!cart.value?.id) {
        const response = await storefront.request(createCartMutation, { variables: { lines: cartLines } })
        if (applyCartResult(response.data?.cartCreate, noticeText)) {
          cartLines.forEach((line) => logCartAdd(line.merchandiseId, line.quantity))
        }
        cartOpen.value = true
        return
      }

      const response = await storefront.request(addCartLinesMutation, {
        variables: { cartId: cart.value.id, lines: cartLines }
      })

      if (applyCartResult(response.data?.cartLinesAdd, noticeText)) {
        cartLines.forEach((line) => logCartAdd(line.merchandiseId, line.quantity))
      }
      cartOpen.value = true
    } catch (caughtError: any) {
      cartError.value = caughtError?.message ?? t('cart.addManyFailed')
      cartNotice.value = ''
    } finally {
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

        applyCartResult(response.data?.cartLinesRemove, t('cart.itemRemoved'))
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

      applyCartResult(response.data?.cartLinesUpdate, t('cart.updated'))
    } catch (caughtError: any) {
      cartError.value = caughtError?.message ?? t('cart.updateFailed')
      cartNotice.value = ''
    } finally {
      cartBusy.value = false
    }
  }

  // Membership purchases get their own, independent cart — never mixed into
  // the shared shopping cart — so a physical-goods checkout in the same
  // session can't force a shipping address onto a membership-only order.
  const startMembershipCheckout = async (options: {
    variantId: string
    tier: string
    months: number
    name: string
    email: string
    phone: string
  }) => {
    const response = await storefront.request(createCheckoutCartMutation, {
      variables: {
        lines: [{ quantity: 1, merchandiseId: options.variantId }],
        attributes: [
          { key: 'member_purchase', value: 'true' },
          { key: 'member_name', value: options.name },
          { key: 'member_email', value: options.email },
          { key: 'member_phone', value: options.phone },
          { key: 'member_tier', value: options.tier },
          { key: 'member_months', value: String(options.months) }
        ],
        buyerIdentity: options.email ? { email: options.email } : undefined
      }
    })

    const payload = response.data?.cartCreate
    const userErrors = payload?.userErrors ?? []

    if (userErrors.length) {
      throw new Error(userErrors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const url = payload?.cart?.checkoutUrl

    if (!url) {
      throw new Error(t('cart.checkoutFailed'))
    }

    return url as string
  }

  const startBookingDepositCheckout = async (options: {
    variantId: string
    bookingId: string
    tableName: string
    date: string
    startTime: string
    name: string
    email: string
    phone: string
  }) => {
    const response = await storefront.request(createCheckoutCartMutation, {
      variables: {
        lines: [
          {
            quantity: 1,
            merchandiseId: options.variantId,
            attributes: [
              { key: 'Bord', value: options.tableName },
              { key: 'Datum', value: options.date },
              { key: 'Tid', value: options.startTime }
            ]
          }
        ],
        attributes: [
          { key: 'booking_deposit', value: 'true' },
          { key: 'booking_id', value: options.bookingId },
          { key: 'booking_name', value: options.name },
          { key: 'booking_email', value: options.email },
          { key: 'booking_phone', value: options.phone }
        ],
        buyerIdentity: options.email ? { email: options.email } : undefined
      }
    })

    const payload = response.data?.cartCreate
    const userErrors = payload?.userErrors ?? []

    if (userErrors.length) {
      throw new Error(userErrors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const url = payload?.cart?.checkoutUrl

    if (!url) {
      throw new Error(t('cart.checkoutFailed'))
    }

    return url as string
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
    addVariantsToCart,
    updateLineQuantity,
    startMembershipCheckout,
    startBookingDepositCheckout
  }
}
