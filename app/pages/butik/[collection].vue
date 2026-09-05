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
  pageInfo: { hasNextPage: boolean, endCursor: string | null }
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
const pageInfo = ref<{ hasNextPage: boolean, endCursor: string | null }>({ hasNextPage: false, endCursor: null })
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')
const activeFilterTag = ref('alla')

const normalizeTag = (tag?: string | null) =>
  String(tag ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

const loadProducts = async () => {
  loading.value = true
  loadError.value = ''
  activeFilterTag.value = 'alla'

  try {
    const res = await $fetch<CollectionResponse>(`/api/shopify/collection/${handle.value}`, {
      query: { sort: activeSort.value.sort, reverse: String(activeSort.value.reverse) }
    })
    collectionTitle.value = res.collection.title
    products.value = res.products
    pageInfo.value = res.pageInfo
  } catch (err: any) {
    loadError.value = err?.data?.statusMessage || 'Kunde inte hämta produkter'
    products.value = []
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!pageInfo.value.hasNextPage || loadingMore.value) return

  loadingMore.value = true

  try {
    const res = await $fetch<CollectionResponse>(`/api/shopify/collection/${handle.value}`, {
      query: { sort: activeSort.value.sort, reverse: String(activeSort.value.reverse), after: pageInfo.value.endCursor }
    })
    products.value = [...products.value, ...res.products]
    pageInfo.value = res.pageInfo
  } catch (err: any) {
    loadError.value = err?.data?.statusMessage || 'Kunde inte hämta fler produkter'
  } finally {
    loadingMore.value = false
  }
}

watch([handle, sortValue], loadProducts, { immediate: true })

const availableFilterTags = computed(() => {
  const tags = new Map<string, string>()

  for (const product of products.value) {
    for (const tag of product.tags ?? []) {
      const normalizedTag = normalizeTag(tag)

      if (!normalizedTag || tags.has(normalizedTag)) {
        continue
      }

      tags.set(normalizedTag, tag)
    }
  }

  return [...tags.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'sv-SE'))
    .map(([value, label]) => ({ value, label }))
})

const filteredProducts = computed(() => {
  if (activeFilterTag.value === 'alla') {
    return products.value
  }

  return products.value.filter((product) => product.tags?.some((tag) => normalizeTag(tag) === activeFilterTag.value))
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

      <div class="flex flex-col gap-4 border-b border-black/8 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 class="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          {{ collectionTitle || 'Kategori' }}
        </h1>

        <label class="block">
          <span class="sr-only">Sortera</span>
          <select
            v-model="sortValue"
            class="min-h-10 rounded-lg border border-black/12 bg-white px-3 text-sm text-lyktan-ink"
          >
            <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </div>

      <div v-if="availableFilterTags.length" class="flex flex-wrap gap-4">
        <button
          type="button"
          class="text-[0.82rem] transition"
          :class="activeFilterTag === 'alla' ? 'font-medium text-lyktan-ink' : 'text-lyktan-mute hover:text-lyktan-ink'"
          @click="activeFilterTag = 'alla'"
        >
          Alla
        </button>
        <button
          v-for="tag in availableFilterTags"
          :key="tag.value"
          type="button"
          class="text-[0.82rem] transition"
          :class="activeFilterTag === tag.value ? 'font-medium text-lyktan-ink' : 'text-lyktan-mute hover:text-lyktan-ink'"
          @click="activeFilterTag = tag.value"
        >
          {{ tag.label }}
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

      <div v-else-if="filteredProducts.length" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>

      <div v-else class="rounded-2xl bg-lyktan-surface p-8 text-center">
        <p class="eyebrow">Inga produkter</p>
        <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
          Det finns inga produkter här ännu.
        </h3>
      </div>

      <div v-if="!loading && pageInfo.hasNextPage && activeFilterTag === 'alla'" class="flex justify-center">
        <button type="button" class="secondary-cta" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Hämtar…' : 'Visa fler' }}
        </button>
      </div>
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
