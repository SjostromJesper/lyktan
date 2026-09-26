type CartAddBody = {
  productTitle?: string
  variantTitle?: string
  quantity?: number
  priceKr?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CartAddBody>(event)

  const productTitle = String(body?.productTitle || '').trim().slice(0, 200)
  const variantTitle = body?.variantTitle ? String(body.variantTitle).trim().slice(0, 100) : null
  const quantity = Number.isInteger(body?.quantity) && Number(body?.quantity) > 0 ? Number(body?.quantity) : 1
  const priceKr = Number.isFinite(Number(body?.priceKr)) ? Number(body?.priceKr) : null

  if (!productTitle) {
    throw createError({ statusCode: 400, statusMessage: 'Produktnamn saknas' })
  }

  const supabase = useSupabaseAdmin()

  const { error } = await supabase
    .from('cart_activity')
    .insert({ product_title: productTitle, variant_title: variantTitle, quantity, price_kr: priceKr })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  setResponseStatus(event, 201)

  return { ok: true }
})
