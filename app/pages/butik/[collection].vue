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
  collection: { id: string, title: string, handle: string } | null
  products: Product[]
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const SORT_OPTIONS = computed(() => [
  { value: 'TITLE:false', label: t('sort.nameAsc'), sort: 'TITLE', reverse: false },
  { value: 'PRICE:false', label: t('sort.priceAsc'), sort: 'PRICE', reverse: false },
  { value: 'PRICE:true', label: t('sort.priceDesc'), sort: 'PRICE', reverse: true },
  { value: 'CREATED:true', label: t('sort.newest'), sort: 'CREATED', reverse: true }
])

const route = useRoute()
// /butik (no category in the URL) shows the whole shop: this same page, fed by the all-products route.
const handle = computed(() => String(route.params.collection || ''))
const showAll = computed(() => !handle.value)

const sortValue = ref(SORT_OPTIONS.value[0].value)
const activeSort = computed(() => SORT_OPTIONS.value.find((option) => option.value === sortValue.value) ?? SORT_OPTIONS.value[0])

// Fetched with useAsyncData (not onMounted) so the title, h1 and product grid
// are in the server-rendered HTML; the key changes with handle/sort/locale, which
// re-fetches on the client when the visitor changes sort order.
const { data: collectionData, status: loadStatus, error: loadFetchError } = await useAsyncData(
  () => `collection-${showAll.value ? 'all' : handle.value}-${sortValue.value}-${locale.value}`,
  () => $fetch<CollectionResponse>(showAll.value ? '/api/shopify/products' : `/api/shopify/collection/${handle.value}`, {
    query: { sort: activeSort.value.sort, reverse: String(activeSort.value.reverse), lang: locale.value }
  })
)

// An unknown slug is a real 404 (status code in the server response too), not an
// empty page with an error message. Other failures keep the inline error text.
const notFound = computed(
  () => (loadFetchError.value as any)?.statusCode === 404 || (!loadFetchError.value && loadStatus.value !== 'pending' && !collectionData.value?.collection)
)
const notFoundError = () => createError({ statusCode: 404, statusMessage: 'Kategorin hittades inte', fatal: true })

// On the server, throwing in setup makes the response a real 404. In the browser
// a throw would abort setup mid-render, so show the error page without throwing.
if (notFound.value) {
  if (import.meta.server) throw notFoundError()
  else showError(notFoundError())
}
// Navigating between categories keeps this component alive, so react to later changes too.
watch(notFound, (missing) => { if (missing) showError(notFoundError()) })

const collectionTitle = computed(() => (showAll.value ? t('shop.allProductsTitle') : collectionData.value?.collection?.title ?? ''))
const products = computed<Product[]>(() => collectionData.value?.products ?? [])
const loading = computed(() => loadStatus.value === 'pending')
const loadError = computed(() => (loadFetchError.value ? (loadFetchError.value as any)?.data?.statusMessage || t('shop.collectionLoadFailed') : ''))

const priceOf = (product: Product) => Number(product.variants?.nodes?.[0]?.price?.amount ?? 0)
const isAvailable = (product: Product) => product.variants?.nodes?.[0]?.availableForSale !== false

// --- Filters — kept deliberately minimal: sort, price, in-stock. This
// store's tags are SEO/all-purpose (single designer names, individual game
// titles, etc.), not a curated facet list, so a full tag cloud is noise
// rather than a useful filter. ---
const inStockOnly = ref(false)
const PRICE_BUCKETS = [
  { key: 'under300', labelKey: 'shop.priceUnder300', test: (price: number) => price < 300 },
  { key: '300to1000', labelKey: 'shop.price300to1000', test: (price: number) => price >= 300 && price <= 1000 },
  { key: 'over1000', labelKey: 'shop.priceOver1000', test: (price: number) => price > 1000 }
] as const
const activePriceBuckets = ref<Set<string>>(new Set())
const filtersOpen = ref(false)

const togglePriceBucket = (key: string) => {
  const next = new Set(activePriceBuckets.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activePriceBuckets.value = next
}

const resetFilters = () => {
  inStockOnly.value = false
  activePriceBuckets.value = new Set()
}

// Kortspel har flera distinkta spel i samma kollektion (Magic, Pokémon …) —
// bygg spel-flikar från riktiga taggar, samma klassificering som på
// startsidan. Andra kategorier har ingen motsvarande spelbaserad uppdelning
// i data, så flikraden visas bara när kollektionen faktiskt har fler än ett spel.
const cardGameGroups = computed(() => {
  if (handle.value !== 'kortspel') return []
  const groups = new Map<string, Product[]>()
  for (const product of products.value) {
    const label = classifyCardGame(product, t('shop.otherGames'))
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(product)
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
})

const activeGame = ref<string | null>(null)
watch(cardGameGroups, () => { activeGame.value = null })

const gameFilteredProducts = computed(() => {
  if (!activeGame.value) return products.value
  return cardGameGroups.value.find(([label]) => label === activeGame.value)?.[1] ?? products.value
})

watch([handle, sortValue, locale], resetFilters)

const hasActiveFilters = computed(() => inStockOnly.value || activePriceBuckets.value.size > 0)

const filteredProducts = computed(() => {
  return gameFilteredProducts.value.filter((product) => {
    if (inStockOnly.value && !isAvailable(product)) {
      return false
    }

    if (activePriceBuckets.value.size > 0) {
      const price = priceOf(product)
      const matchesBucket = PRICE_BUCKETS.some((bucket) => activePriceBuckets.value.has(bucket.key) && bucket.test(price))
      if (!matchesBucket) {
        return false
      }
    }

    return true
  })
})

// 50 products per page, more as you scroll (?sida=N keeps your place).
const progressive = useProgressiveList(computed(() => filteredProducts.value.length))
const visibleProducts = computed(() => filteredProducts.value.slice(0, progressive.limit.value))
watch([inStockOnly, activePriceBuckets, activeGame, sortValue, handle], progressive.reset)

useSeoMeta({
  title: () => collectionTitle.value ? `${collectionTitle.value} | Butik Lyktan` : 'Butik | Butik Lyktan',
  description: () => t('shop.collectionSeoDescription', { name: collectionTitle.value || t('shop.products') })
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-8">
      <!-- Kräm-hero: brödsmulor, rubrik, spel-flikar -->
      <section class="category-hero">
        <nav class="flex items-center gap-2 text-sm text-lyktan-mute">
          <NuxtLink :to="localePath('/')" class="transition hover:text-lyktan-ink">{{ t('shop.breadcrumbHome') }}</NuxtLink>
          <span class="text-lyktan-line">/</span>
          <span class="text-lyktan-ink">{{ collectionTitle || '…' }}</span>
        </nav>

        <h1 class="category-title mt-3">{{ collectionTitle || t('shop.category') }}</h1>

        <div v-if="cardGameGroups.length > 1" role="tablist" :aria-label="collectionTitle" class="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            role="tab"
            :aria-selected="activeGame === null"
            class="tab-pill"
            :class="{ 'tab-pill-active': activeGame === null }"
            @click="activeGame = null"
          >
            {{ t('shop.allGames') }}
          </button>
          <button
            v-for="group in cardGameGroups"
            :key="group[0]"
            type="button"
            role="tab"
            :aria-selected="activeGame === group[0]"
            class="tab-pill"
            :class="{ 'tab-pill-active': activeGame === group[0] }"
            @click="activeGame = group[0]"
          >
            {{ group[0] }}
          </button>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
        <!-- Sidebar-filter (desktop: alltid synlig, mobil: bakom Filter-knappen) -->
        <aside class="flex flex-col gap-7" :class="filtersOpen ? 'flex' : 'hidden lg:flex'">
          <div class="flex flex-col gap-3 border-b border-lyktan-line pb-6">
            <span class="filter-label">{{ t('shop.price') }}</span>
            <label v-for="bucket in PRICE_BUCKETS" :key="bucket.key" class="flex items-center gap-2.5 text-[0.95rem] text-lyktan-ink">
              <input
                type="checkbox"
                :checked="activePriceBuckets.has(bucket.key)"
                class="h-[18px] w-[18px] accent-lyktan-ink"
                @change="togglePriceBucket(bucket.key)"
              >
              {{ t(bucket.labelKey) }}
            </label>
          </div>
          <div class="flex flex-col gap-3">
            <span class="filter-label">{{ t('shop.availability') }}</span>
            <label class="flex items-center gap-2.5 text-[0.95rem] text-lyktan-ink">
              <input v-model="inStockOnly" type="checkbox" class="h-[18px] w-[18px] accent-lyktan-ink">
              {{ t('shop.inStockOnly') }}
            </label>
          </div>
          <button v-if="hasActiveFilters" type="button" class="self-start text-sm font-semibold text-lyktan-accent hover:underline" @click="resetFilters">
            {{ t('shop.clearFilters') }}
          </button>
        </aside>

        <div class="flex flex-col gap-5">
          <div class="flex items-center justify-between gap-4">
            <button
              type="button"
              class="inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition lg:hidden"
              :class="hasActiveFilters ? 'border-lyktan-ink bg-lyktan-ink text-white' : 'border-lyktan-line text-lyktan-ink'"
              @click="filtersOpen = !filtersOpen"
            >
              {{ t('shop.filter') }}
              <span v-if="hasActiveFilters" class="inline-grid h-5 w-5 place-items-center rounded-full bg-white text-[0.68rem] font-semibold text-lyktan-ink">
                {{ activePriceBuckets.size + (inStockOnly ? 1 : 0) }}
              </span>
            </button>

            <p v-if="!loading && !loadError" class="hidden text-sm text-lyktan-mute lg:block">
              {{ t('shop.filteredCount', { shown: filteredProducts.length, total: products.length }) }}
            </p>

            <label class="ml-auto block">
              <span class="sr-only">{{ t('shop.sort') }}</span>
              <select
                v-model="sortValue"
                class="min-h-11 rounded-full border-2 border-lyktan-line bg-white px-4 text-sm font-semibold text-lyktan-ink"
              >
                <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>

          <p v-if="!loading && !loadError" class="text-sm text-lyktan-mute lg:hidden">
            {{ t('shop.filteredCount', { shown: filteredProducts.length, total: products.length }) }}
          </p>

          <div v-if="loading" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            <div v-for="i in 9" :key="i" class="grid gap-3">
              <div class="skeleton-block aspect-square w-full rounded-[10px]" />
              <div class="skeleton-block h-3 w-3/4 rounded-full" />
              <div class="skeleton-block h-3 w-1/3 rounded-full" />
            </div>
          </div>

          <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

          <template v-else>
            <div v-if="filteredProducts.length" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              <ProductCard v-for="product in visibleProducts" :key="product.id" :product="product" />
            </div>

            <LoadMore
              v-if="filteredProducts.length > 50"
              :shown="progressive.shown.value"
              :total="progressive.total.value"
              :has-more="progressive.hasMore.value"
              :href="progressive.nextHref.value"
              @more="progressive.showMore"
            />

            <div v-else class="rounded-[18px] border border-lyktan-line bg-lyktan-surface p-8 text-center">
              <p class="eyebrow">{{ t('shop.noProducts') }}</p>
              <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
                {{ t('shop.noProductsMatch') }}
              </h3>
              <button type="button" class="secondary-cta mt-4" @click="resetFilters">{{ t('shop.clearFilters') }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.category-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 36px 24px;
  border-radius: 24px;
  background: var(--color-lyktan-soft);
  text-align: center;
}
.category-title {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--color-lyktan-ink);
}

.filter-label {
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-lyktan-ink);
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
