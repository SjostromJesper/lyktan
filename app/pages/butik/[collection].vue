<script setup lang="ts">
type Product = {
  id: string
  title: string
  handle: string
  tags: string[]
  featuredImage: { url: string, altText: string | null } | null
  variants: { nodes: { id: string, availableForSale: boolean, price: { amount: string, currencyCode: string }, compareAtPrice: { amount: string, currencyCode: string } | null }[] }
}
type CollectionResponse = {
  collection: { id: string, title: string, handle: string }
  products: Product[]
}

const SORT_OPTIONS = [
  { value: 'TITLE:false', label: 'Namn A–Ö', sort: 'TITLE', reverse: false },
  { value: 'PRICE:false', label: 'Pris: lägst först', sort: 'PRICE', reverse: false },
  { value: 'PRICE:true', label: 'Pris: högst först', sort: 'PRICE', reverse: true },
  { value: 'CREATED:true', label: 'Nyast först', sort: 'CREATED', reverse: true }
]

const route = useRoute()
const handle = computed(() => String(route.params.collection || ''))

const sortValue = ref(SORT_OPTIONS[0].value)
const activeSort = computed(() => SORT_OPTIONS.find((option) => option.value === sortValue.value) ?? SORT_OPTIONS[0])

const collectionTitle = ref('')
const products = ref<Product[]>([])
const loading = ref(true)
const loadError = ref('')

const priceOf = (product: Product) => Number(product.variants?.nodes?.[0]?.price?.amount ?? 0)
const isAvailable = (product: Product) => product.variants?.nodes?.[0]?.availableForSale !== false

// --- Filters — kept deliberately minimal: sort, price, in-stock. This
// store's tags are SEO/all-purpose (single designer names, individual game
// titles, etc.), not a curated facet list, so a full tag cloud is noise
// rather than a useful filter. ---
const inStockOnly = ref(false)
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)
const filtersOpen = ref(false)

const resetFilters = () => {
  inStockOnly.value = false
  priceMin.value = null
  priceMax.value = null
}

const loadProducts = async () => {
  loading.value = true
  loadError.value = ''
  resetFilters()

  try {
    const res = await $fetch<CollectionResponse>(`/api/shopify/collection/${handle.value}`, {
      query: { sort: activeSort.value.sort, reverse: String(activeSort.value.reverse) }
    })
    collectionTitle.value = res.collection.title
    products.value = res.products
  } catch (err: any) {
    loadError.value = err?.data?.statusMessage || 'Kunde inte hämta produkter'
    products.value = []
  } finally {
    loading.value = false
  }
}

watch([handle, sortValue], loadProducts, { immediate: true })

const priceBounds = computed(() => {
  if (!products.value.length) return { min: 0, max: 0 }
  const prices = products.value.map(priceOf)
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
})

const hasActiveFilters = computed(() => inStockOnly.value || priceMin.value !== null || priceMax.value !== null)

const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    if (inStockOnly.value && !isAvailable(product)) {
      return false
    }

    const price = priceOf(product)

    if (priceMin.value !== null && price < priceMin.value) {
      return false
    }

    if (priceMax.value !== null && price > priceMax.value) {
      return false
    }

    return true
  })
})

useSeoMeta({
  title: () => collectionTitle.value ? `${collectionTitle.value} | Butik Lyktan` : 'Butik | Butik Lyktan',
  description: () => `Bläddra bland ${collectionTitle.value || 'produkter'} hos Butik Lyktan.`
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-8">
      <nav class="flex items-center gap-2 text-sm text-lyktan-mute">
        <NuxtLink to="/butik" class="transition hover:text-lyktan-ink">Butik</NuxtLink>
        <span class="text-black/20">/</span>
        <span class="text-lyktan-ink">{{ collectionTitle || '…' }}</span>
      </nav>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          {{ collectionTitle || 'Kategori' }}
        </h1>

        <div v-if="!loading && !loadError" class="flex items-center gap-3">
          <label class="block">
            <span class="sr-only">Sortera</span>
            <select
              v-model="sortValue"
              class="min-h-10 rounded-full border border-black/12 bg-white px-3 text-sm text-lyktan-ink"
            >
              <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <button
            type="button"
            class="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition"
            :class="hasActiveFilters ? 'border-lyktan-ink bg-lyktan-ink text-white' : 'border-black/15 text-lyktan-ink hover:bg-black/[0.04]'"
            @click="filtersOpen = !filtersOpen"
          >
            Filter
            <span v-if="hasActiveFilters" class="inline-grid h-4 w-4 place-items-center rounded-full bg-white text-[0.62rem] font-semibold text-lyktan-ink">
              {{ (priceMin !== null ? 1 : 0) + (priceMax !== null ? 1 : 0) + (inStockOnly ? 1 : 0) }}
            </span>
          </button>
        </div>
      </div>

      <div v-if="filtersOpen" class="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-black/8 py-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-lyktan-mute">Pris</span>
          <input
            v-model.number="priceMin"
            type="number"
            min="0"
            :placeholder="String(priceBounds.min)"
            class="min-h-9 w-20 rounded-lg border border-black/12 bg-white px-2.5 text-sm text-lyktan-ink"
          >
          <span class="text-lyktan-mute">–</span>
          <input
            v-model.number="priceMax"
            type="number"
            min="0"
            :placeholder="String(priceBounds.max)"
            class="min-h-9 w-20 rounded-lg border border-black/12 bg-white px-2.5 text-sm text-lyktan-ink"
          >
          <span class="text-sm text-lyktan-mute">kr</span>
        </div>

        <label class="flex items-center gap-2 text-sm text-lyktan-ink">
          <input v-model="inStockOnly" type="checkbox" class="h-4 w-4 rounded border-black/25">
          Bara i lager
        </label>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="text-sm font-medium text-lyktan-accent hover:underline"
          @click="resetFilters"
        >
          Rensa
        </button>
      </div>

      <div v-if="loading" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
        <div v-for="i in 8" :key="i" class="grid gap-3">
          <div class="skeleton-block aspect-square w-full rounded-xl" />
          <div class="skeleton-block h-3 w-3/4 rounded-full" />
          <div class="skeleton-block h-3 w-1/3 rounded-full" />
        </div>
      </div>

      <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

      <template v-else>
        <p v-if="hasActiveFilters" class="text-sm text-lyktan-mute">
          {{ filteredProducts.length }} av {{ products.length }} produkter
        </p>

        <div v-if="filteredProducts.length" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
        </div>

        <div v-else class="rounded-2xl bg-lyktan-surface p-8 text-center">
          <p class="eyebrow">Inga produkter</p>
          <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            Inga produkter matchar filtren.
          </h3>
          <button type="button" class="secondary-cta mt-4" @click="resetFilters">Rensa filter</button>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
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
