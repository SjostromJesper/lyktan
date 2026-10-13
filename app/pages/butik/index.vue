<script setup lang="ts">
// "Visa hela sortimentet": /butik is the whole shop, shown with the same filters and
// sorting as a category page (the category page itself, with no category chosen).
import CollectionPage from './[collection].vue'

type SearchProduct = {
  id: string
  title: string
  handle: string
  featuredImage: { url: string, altText: string | null } | null
  variants: { nodes: { id: string, price: { amount: string, currencyCode: string }, compareAtPrice: { amount: string, currencyCode: string } | null }[] }
}

const { t, locale } = useI18n()
const route = useRoute()

const searchTerm = ref(String(route.query.q || ''))
const searchResults = ref<SearchProduct[]>([])
const searching = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | undefined

const runSearch = async (term: string) => {
  if (!term.trim()) {
    searchResults.value = []
    searching.value = false
    return
  }

  searching.value = true

  try {
    const res = await $fetch<{ products: SearchProduct[] }>('/api/shopify/search', { query: { q: term, lang: locale.value } })
    searchResults.value = res.products
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

watch(searchTerm, (term) => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => runSearch(term), 300)
})

// A ?q= from the header search bar arrives as the initial ref value, which
// the watcher above misses (it only fires on change) — run it once up front.
if (searchTerm.value.trim()) {
  runSearch(searchTerm.value)
}

const isSearching = computed(() => searchTerm.value.trim().length > 0)

// The category page sets the title and description itself when browsing the whole shop.
useSeoMeta({
  title: () => (isSearching.value ? `${searchTerm.value} | Butik Lyktan` : undefined),
  description: () => (isSearching.value ? t('shop.seoDescription') : undefined)
})
</script>

<template>
  <div>
    <div class="page-shell px-4 pt-6 sm:px-6">
      <label class="block max-w-md">
        <span class="sr-only">{{ t('shop.searchLabel') }}</span>
        <input
          v-model="searchTerm"
          type="search"
          :placeholder="t('shop.searchPlaceholder')"
          class="min-h-12 w-full rounded-full border border-lyktan-line bg-white px-5 text-sm text-lyktan-ink transition focus:border-lyktan-ink focus:outline-none"
        >
      </label>
    </div>

    <main v-if="isSearching" class="px-4 pb-24 pt-8 sm:px-6">
      <div class="page-shell grid gap-6">
        <p v-if="searching" class="text-sm text-lyktan-mute">{{ t('shop.searching') }}</p>
        <p v-else-if="!searchResults.length" class="text-sm text-lyktan-mute">{{ t('shop.noResults', { term: searchTerm }) }}</p>
        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in searchResults" :key="product.id" :product="product" />
        </div>
      </div>
    </main>

    <CollectionPage v-else />
  </div>
</template>
