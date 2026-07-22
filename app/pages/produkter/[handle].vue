<script setup lang="ts">
import {
  buildButikLink,
  findCatalogCategory,
  findCatalogSubcategory,
  findCatalogSystem,
  getCatalogLocation
} from '~/utils/catalog'

const route = useRoute()
const router = useRouter()
const handle = computed(() => String(route.params.handle || ''))
const selectedVariantId = ref('')
const productResponse = useState<{ handle?: string | null; routeHandle?: string | null; product?: any | null } | null>('shopify-product', () => null)
const error = ref<Error | null>(null)
const loadingProduct = ref(false)
let inventoryRefreshInterval: ReturnType<typeof window.setInterval> | undefined

const refreshProductInventory = () => {
  loadProduct(true)
}

const refreshWhenVisible = () => {
  if (document.visibilityState === 'visible') {
    loadProduct(true)
  }
}

const loadProduct = async (force = false) => {
  if (!handle.value) {
    return
  }

  loadingProduct.value = true

  try {
    const query = force ? { t: Date.now() } : undefined

    productResponse.value = await $fetch(`/api/shopify/product/${handle.value}`, {
      query,
      cache: 'no-store'
    })
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

watch(handle, () => {
  selectedVariantId.value = ''
  loadProduct()
})

const product = computed(() => productResponse.value?.product ?? null)

const productDescriptionHtml = computed(() => {
  if (product.value?.descriptionHtml) {
    return product.value.descriptionHtml
  }

  if (!product.value?.description) {
    return ''
  }

  const escapedText = product.value.description
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<p>${escapedText}</p>`
})

const {
  addVariantToCart,
  loadingVariantId,
  formatMoney
} = useShopifyCart()

const variants = computed(() => product.value?.variants?.nodes ?? [])

watchEffect(() => {
  if (!selectedVariantId.value && variants.value[0]?.id) {
    selectedVariantId.value = variants.value[0].id
  }
})

const selectedVariant = computed(
  () => variants.value.find((entry: any) => entry.id === selectedVariantId.value) ?? variants.value[0] ?? null
)

const isSoldOut = computed(
  () => !selectedVariant.value?.availableForSale || selectedVariant.value?.quantityAvailable === 0
)

const catalogLocation = computed(() => getCatalogLocation(product.value?.handle))
const breadcrumbItems = computed(() => {
  const location = catalogLocation.value

  if (!location) {
    return []
  }

  const category = findCatalogCategory(location.categorySlug)
  const system = findCatalogSystem(location.categorySlug, location.systemSlug)
  const subcategory = findCatalogSubcategory(location.categorySlug, location.systemSlug, location.subcategorySlug)

  if (!category || !system || !subcategory) {
    return []
  }

  return [
    {
      label: category.label,
      to: buildButikLink(category.slug)
    },
    {
      label: system.label,
      to: buildButikLink(category.slug, system.slug)
    },
    {
      label: subcategory.label,
      to: buildButikLink(category.slug, system.slug, subcategory.slug)
    }
  ]
})

onMounted(() => {
  loadProduct(true)

  inventoryRefreshInterval = window.setInterval(() => {
    loadProduct(true)
  }, 30000)

  window.addEventListener('pageshow', refreshProductInventory)
  window.addEventListener('focus', refreshProductInventory)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})

onBeforeUnmount(() => {
  if (inventoryRefreshInterval) {
    window.clearInterval(inventoryRefreshInterval)
  }

  window.removeEventListener('pageshow', refreshProductInventory)
  window.removeEventListener('focus', refreshProductInventory)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})

const addCurrentVariant = async () => {
  if (!selectedVariant.value?.id || isSoldOut.value || !product.value) {
    return
  }

  await addVariantToCart(selectedVariant.value.id, product.value.title)
  await loadProduct(true)
}

const goBack = async () => {
  if (import.meta.client && window.history.length > 1) {
    await router.back()
    return
  }

  await router.push('/')
}

const variantAvailability = (variant: any) => {
  if (!variant) {
    return ''
  }

  if (variant.availableForSale === false || variant.quantityAvailable === 0) {
    return 'Slutsåld'
  }

  if (typeof variant.quantityAvailable === 'number') {
    if (variant.quantityAvailable > 99) {
      return '99+ kvar'
    }

    return `${variant.quantityAvailable} kvar`
  }

  return 'Finns i lager'
}

useSeoMeta({
  title: () => product.value?.title ? `${product.value.title} | Butik Lyktan` : 'Produkt | Butik Lyktan',
  description: () => product.value?.description || 'Produktsida hos Butik Lyktan.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-8 sm:px-6">
    <section class="page-shell grid gap-6">
      <nav v-if="breadcrumbItems.length" class="flex flex-wrap items-center gap-2 text-sm text-lyktan-mute">
        <NuxtLink to="/butik" class="transition hover:text-lyktan-ink">Butik</NuxtLink>
        <template v-for="item in breadcrumbItems" :key="item.to">
          <span class="text-black/20">/</span>
          <NuxtLink :to="item.to" class="transition hover:text-lyktan-ink">{{ item.label }}</NuxtLink>
        </template>
        <span class="text-black/20">/</span>
        <span class="text-lyktan-ink">{{ product?.title }}</span>
      </nav>

      <button type="button" class="secondary-cta w-fit !min-h-9 !px-4 !text-[0.84rem]" @click="goBack">
        ← Tillbaka
      </button>

      <div v-if="loadingProduct" class="grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.84fr)]" aria-hidden="true">
        <div class="bg-lyktan-surface p-5">
          <div class="skeleton-block h-[500px] w-full" />
        </div>

        <div class="grid gap-4">
          <div class="skeleton-block h-2.5 w-24 rounded-full" />
          <div class="skeleton-block mt-3 h-7 w-4/5 rounded-full" />
          <div class="skeleton-block h-7 w-3/5 rounded-full" />
          <div class="skeleton-block mt-2 h-3 w-full rounded-full" />
          <div class="skeleton-block h-3 w-full rounded-full" />
          <div class="skeleton-block h-3 w-2/3 rounded-full" />

          <div class="mt-4 grid gap-4 border-t border-black/8 pt-4">
            <div class="skeleton-block h-2.5 w-14 rounded-full" />
            <div class="skeleton-block h-8 w-32 rounded-full" />
            <div class="skeleton-block h-3 w-28 rounded-full" />
            <div class="skeleton-block h-11 w-full rounded-full" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="bg-lyktan-surface p-8">
        <p class="eyebrow">API-fel</p>
        <h1 class="mt-3 text-[clamp(1.6rem,2.8vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">Produkten kunde inte laddas.</h1>
        <p class="mt-4 text-sm leading-7 text-lyktan-mute">{{ error.message }}</p>
      </div>

      <div v-else-if="product" class="grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.84fr)]">
        <div class="flex items-center justify-center bg-lyktan-surface p-6">
          <img
            v-if="product.featuredImage?.url"
            :src="product.featuredImage.url"
            :alt="product.featuredImage.altText || product.title"
            class="max-h-[500px] w-full object-contain"
          >
          <div v-else class="grid min-h-[420px] w-full place-items-center text-5xl font-medium text-lyktan-mute">
            {{ product.title.slice(0, 2).toUpperCase() }}
          </div>
        </div>

        <div>
          <p class="eyebrow">Produkt</p>
          <h1 class="mt-3 text-[clamp(1.7rem,2.8vw,2.3rem)] font-semibold leading-[1.15] tracking-[-0.01em] text-lyktan-ink">
            {{ product.title }}
          </h1>
          <div
            v-if="productDescriptionHtml"
            class="description-richtext mt-4 text-sm leading-7 text-lyktan-mute"
            v-html="productDescriptionHtml"
          />
          <p v-else class="mt-4 text-sm leading-7 text-lyktan-mute">
            Lägg till en produktbeskrivning i Shopify så visas den här automatiskt.
          </p>

          <div class="mt-6 border-t border-black/8 pt-5">
            <div class="flex items-end justify-between gap-4 pb-5">
              <strong class="text-[1.6rem] font-semibold tracking-[-0.01em] text-lyktan-ink">
                {{ formatMoney(selectedVariant?.price?.amount, selectedVariant?.price?.currencyCode) }}
              </strong>
              <span class="text-[0.84rem]" :class="isSoldOut ? 'text-lyktan-mute' : 'text-emerald-600'">
                {{ variantAvailability(selectedVariant) }}
              </span>
            </div>

            <div class="grid gap-4">
              <div v-if="variants.length > 1" class="grid gap-2">
                <label for="variant" class="eyebrow">Välj variant</label>
                <select
                  id="variant"
                  v-model="selectedVariantId"
                  class="min-h-12 rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
                >
                  <option v-for="variant in variants" :key="variant.id" :value="variant.id">
                    {{ variant.title }} · {{ formatMoney(variant.price?.amount, variant.price?.currencyCode) }}
                  </option>
                </select>
              </div>

              <button
                type="button"
                class="primary-cta w-full"
                :disabled="loadingVariantId === selectedVariant?.id || isSoldOut"
                @click="addCurrentVariant"
              >
                {{
                  isSoldOut
                    ? 'Ej tillgänglig'
                    : loadingVariantId === selectedVariant?.id
                      ? 'Lägger till...'
                      : 'Lägg i kundvagn'
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-lyktan-surface p-8">
        <p class="eyebrow">Ingen produkt</p>
        <h1 class="mt-3 text-[clamp(1.6rem,2.8vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">Den här produkten finns inte.</h1>
        <p class="mt-4 text-sm leading-7 text-lyktan-mute">Kontrollera handlet i Shopify eller länken du försökte öppna.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.description-richtext {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.description-richtext :deep(p),
.description-richtext :deep(ul),
.description-richtext :deep(ol) {
  margin: 0 0 14px;
}

.description-richtext :deep(ul),
.description-richtext :deep(ol) {
  padding-left: 20px;
}

.description-richtext :deep(li + li) {
  margin-top: 6px;
}

.description-richtext :deep(strong) {
  color: #111111;
}

.skeleton-block {
  background: linear-gradient(90deg, #eceef2 0%, #f6f7f9 50%, #eceef2 100%);
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
