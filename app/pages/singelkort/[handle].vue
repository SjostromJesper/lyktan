<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const handle = computed(() => String(route.params.handle || ''))
const productResponse = useState<{ handle?: string | null; product?: any | null } | null>('shopify-single', () => null)
const error = ref<Error | null>(null)
const loadingProduct = ref(false)
let inventoryRefreshInterval: ReturnType<typeof window.setInterval> | undefined

const loadProduct = async (force = false) => {
  if (!handle.value) return

  const isSameProductAlreadyShown = productResponse.value?.handle === handle.value
  if (!isSameProductAlreadyShown) loadingProduct.value = true

  try {
    const query: Record<string, unknown> = { lang: locale.value }
    if (force) query.t = Date.now()
    productResponse.value = await $fetch(`/api/shopify/product/${handle.value}`, { query, cache: 'no-store' })
    error.value = null
  } catch (caughtError: any) {
    error.value = caughtError
    productResponse.value = null
  } finally {
    loadingProduct.value = false
  }
}

if (import.meta.server) {
  await loadProduct()
}

watch([handle, locale], () => loadProduct())

const product = computed(() => productResponse.value?.product ?? null)
const variants = computed(() => product.value?.variants?.nodes ?? [])

const optionValue = (variant: any, optionName: string) =>
  variant.selectedOptions?.find((o: any) => o.name.toLowerCase() === optionName.toLowerCase())?.value ?? null

const conditions = computed(() =>
  [...new Set(variants.value.map((v: any) => optionValue(v, 'Skick')).filter(Boolean))] as string[]
)

const hasFoilOption = computed(() => variants.value.some((v: any) => optionValue(v, 'Foil') === 'Ja'))

const selectedCondition = ref('')
const selectedFoil = ref(false)

watch([variants], () => {
  selectedCondition.value = conditions.value[0] || ''
  selectedFoil.value = false
}, { immediate: true })

const variantForCondition = (condition: string, foil: boolean) =>
  variants.value.find((v: any) => optionValue(v, 'Skick') === condition && optionValue(v, 'Foil') === (foil ? 'Ja' : 'Nej'))

// A condition doesn't necessarily have both a foil and non-foil printing —
// dropping to one that only has non-foil (or only foil) must clear an
// unavailable foil selection, or the price/stock shown silently falls back
// to an unrelated variant while the picker still looks selected.
watch(selectedCondition, (condition) => {
  if (!variantForCondition(condition, selectedFoil.value)) {
    selectedFoil.value = Boolean(variantForCondition(condition, true)) && !variantForCondition(condition, false)
  }
})

const selectedVariant = computed(() => {
  if (!variants.value.length) return null

  const match = variants.value.find((v: any) => {
    const conditionOk = !conditions.value.length || optionValue(v, 'Skick') === selectedCondition.value
    const foilOk = !hasFoilOption.value || optionValue(v, 'Foil') === (selectedFoil.value ? 'Ja' : 'Nej')
    return conditionOk && foilOk
  })

  return match || variants.value[0]
})

const isSoldOut = computed(
  () => !selectedVariant.value?.availableForSale || selectedVariant.value?.quantityAvailable === 0
)

const { addVariantToCart, loadingVariantId, formatMoney } = useShopifyCart()

const addCurrentVariant = async () => {
  if (!selectedVariant.value?.id || isSoldOut.value || !product.value) return
  await addVariantToCart(selectedVariant.value.id, product.value.title)
  await loadProduct(true)
}

onMounted(() => {
  loadProduct(true)
  inventoryRefreshInterval = window.setInterval(() => loadProduct(true), 30000)
})

onBeforeUnmount(() => {
  if (inventoryRefreshInterval) window.clearInterval(inventoryRefreshInterval)
})

const goBack = async () => {
  if (import.meta.client && window.history.length > 1) {
    await router.back()
    return
  }
  await router.push(localePath('/singelkort'))
}

const CONDITION_KEYS: Record<string, string> = {
  Nyskick: 'singles.conditionMint',
  Utmärkt: 'singles.conditionExcellent',
  Bra: 'singles.conditionGood',
  Ok: 'singles.conditionOk',
  Dåligt: 'singles.conditionPoor'
}

const conditionLabel = (condition: string | null) => (condition && CONDITION_KEYS[condition] ? t(CONDITION_KEYS[condition]) : condition)

useSeoMeta({
  title: () => product.value?.title ? `${product.value.title} | Singelkort | Butik Lyktan` : 'Singelkort | Butik Lyktan',
  description: () => product.value?.description || t('singles.seoDescription'),
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="organic min-h-screen px-4 pb-24 pt-8 sm:px-6">
    <section class="page-shell grid gap-6">
      <nav class="flex flex-wrap items-center gap-2 text-sm" style="color: var(--color-neutral-600)">
        <NuxtLink :to="localePath('/singelkort')" class="transition hover:underline">{{ t('singles.title') }}</NuxtLink>
        <span class="opacity-40">/</span>
        <span style="color: var(--color-text)">{{ product?.title }}</span>
      </nav>

      <button type="button" class="btn btn-secondary w-fit !min-h-9 !px-4 !text-[0.84rem]" @click="goBack">
        ← {{ t('product.back') }}
      </button>

      <div v-if="loadingProduct" class="grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.84fr)]" aria-hidden="true">
        <div class="card">
          <div class="organic-skeleton aspect-[5/7] w-full" style="border-radius: var(--radius-md)" />
        </div>
        <div class="grid gap-4">
          <div class="organic-skeleton h-2.5 w-24 rounded-full" />
          <div class="organic-skeleton mt-3 h-7 w-4/5 rounded-full" />
          <div class="organic-skeleton h-8 w-32 rounded-full" />
        </div>
      </div>

      <div v-else-if="error" class="card p-8">
        <p class="card-kicker">{{ t('product.apiError') }}</p>
        <h1 class="mt-3 text-2xl">{{ t('singles.cardLoadFailed') }}</h1>
        <p class="mt-4 text-sm" style="color: var(--color-neutral-600)">{{ error.message }}</p>
      </div>

      <div v-else-if="product" class="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
        <div class="card h-fit">
          <div
            class="relative flex items-center justify-center overflow-hidden"
            style="aspect-ratio: 5/7; border-radius: var(--radius-md); background: var(--color-neutral-100); box-shadow: inset 0 0 0 1px var(--color-divider)"
          >
            <img
              v-if="product.featuredImage?.url"
              :src="product.featuredImage.url"
              :alt="product.featuredImage.altText || product.title"
              class="washed h-full w-full object-contain p-4"
            >
            <div v-else class="grid h-full w-full place-items-center text-4xl font-bold" style="color: var(--color-neutral-500); font-family: var(--font-heading)">
              {{ product.title.slice(0, 2).toUpperCase() }}
            </div>
          </div>
        </div>

        <div>
          <p v-if="product.cardGame?.value || product.cardSet?.value" class="text-[12px] uppercase tracking-wide" style="color: var(--color-neutral-600)">
            {{ [product.cardGame?.value, product.cardSet?.value, product.rarity?.value].filter(Boolean).join(' · ') }}
            <span v-if="product.collectorNumber?.value"> · #{{ product.collectorNumber.value }}</span>
          </p>
          <h1 class="mt-2 text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.05]">
            {{ product.title }}
          </h1>

          <div v-if="product.description" class="mt-4 text-sm leading-7" style="color: var(--color-neutral-700)">
            {{ product.description }}
          </div>

          <div class="mt-6 border-t pt-5" style="border-color: var(--color-divider)">
            <div class="flex items-end justify-between gap-4 pb-5">
              <strong class="text-[1.8rem] font-bold" style="color: var(--color-accent-700)">
                {{ formatMoney(selectedVariant?.price?.amount, selectedVariant?.price?.currencyCode) }}
              </strong>
              <span class="text-[0.78rem] font-semibold" :style="{ color: isSoldOut ? 'var(--color-neutral-600)' : 'var(--color-accent-2-700)' }">
                {{ isSoldOut ? t('product.soldOut') : (typeof selectedVariant?.quantityAvailable === 'number' ? t('product.stockLeft', { count: selectedVariant.quantityAvailable }) : t('product.inStock')) }}
              </span>
            </div>

            <div v-if="conditions.length > 1" class="grid gap-2">
              <span class="text-[0.72rem] uppercase tracking-wide" style="color: var(--color-neutral-600)">{{ t('singles.condition') }}</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="condition in conditions"
                  :key="condition"
                  type="button"
                  class="btn !min-h-9"
                  :class="selectedCondition === condition ? 'btn-selected' : 'btn-secondary'"
                  @click="selectedCondition = condition"
                >
                  {{ conditionLabel(condition) }}
                </button>
              </div>
            </div>

            <div v-if="hasFoilOption" class="mt-4 grid gap-2">
              <span class="text-[0.72rem] uppercase tracking-wide" style="color: var(--color-neutral-600)">{{ t('singles.foil') }}</span>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn !min-h-9"
                  :class="!selectedFoil ? 'btn-selected' : 'btn-secondary'"
                  :disabled="!variantForCondition(selectedCondition, false)"
                  @click="selectedFoil = false"
                >
                  {{ t('singles.no') }}
                </button>
                <button
                  type="button"
                  class="btn !min-h-9"
                  :class="selectedFoil ? 'btn-selected' : 'btn-secondary'"
                  :disabled="!variantForCondition(selectedCondition, true)"
                  @click="selectedFoil = true"
                >
                  ✦ {{ t('singles.foil') }}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-block mt-6 !min-h-12 w-full text-sm"
              :disabled="loadingVariantId === selectedVariant?.id || isSoldOut"
              @click="addCurrentVariant"
            >
              {{
                isSoldOut
                  ? t('product.unavailable')
                  : loadingVariantId === selectedVariant?.id
                    ? t('product.adding')
                    : t('product.addToCart')
              }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="card p-8">
        <p class="card-kicker">{{ t('singles.noCard') }}</p>
        <h1 class="mt-3 text-2xl">{{ t('singles.noCardTitle') }}</h1>
        <p class="mt-4 text-sm" style="color: var(--color-neutral-600)">{{ t('singles.noCardText') }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.organic-skeleton {
  background: linear-gradient(90deg, var(--color-neutral-200) 0%, var(--color-neutral-100) 50%, var(--color-neutral-200) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
