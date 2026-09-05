type InterestBody = {
  productHandle?: string
  email?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody<InterestBody>(event)

  const productHandle = String(body?.productHandle || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()

  if (!productHandle) {
    throw createError({ statusCode: 400, statusMessage: 'Produkt saknas' })
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ange en giltig e-postadress' })
  }

  const supabase = useSupabaseAdmin()

  const { error } = await supabase
    .from('product_interest_signups')
    .upsert({ product_handle: productHandle, email }, { onConflict: 'product_handle,email', ignoreDuplicates: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  setResponseStatus(event, 201)

  return { ok: true }
})
