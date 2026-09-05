<script setup lang="ts">
type Collection = { id: string, handle: string, title: string, image: { url: string, altText: string | null } | null }
type SearchProduct = {
  id: string
  title: string
  handle: string
  featuredImage: { url: string, altText: string | null } | null
  variants: { nodes: { id: string, price: { amount: string, currencyCode: string }, compareAtPrice: { amount: string, currencyCode: string } | null }[] }
}

const { data: collectionsData, pending: loadingCollections } = await useAsyncData('butik-collections', () =>
  $fetch<{ collections: Collection[] }>('/api/shopify/collections')
)

const collections = computed(() => collectionsData.value?.collections ?? [])

const searchTerm = ref('')
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
    const res = await $fetch<{ products: SearchProduct[] }>('/api/shopify/search', { query: { q: term } })
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

const isSearching = computed(() => searchTerm.value.trim().length > 0)

useSeoMeta({
  title: 'Butik | Butik Lyktan',
  description: 'Bläddra bland kortspel, miniatyrspel, brädspel och rollspel hos Butik Lyktan.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-8">
      <div>
        <p class="eyebrow">Butik</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Bläddra bland produkterna
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          Produkter kan köpas direkt och hämtas ut i butik medan vi bygger vidare resten av upplevelsen.
        </p>
      </div>

      <label class="block max-w-md">
        <span class="sr-only">Sök produkter</span>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="Sök efter produkter…"
          class="min-h-12 w-full rounded-full border border-black/12 bg-white px-5 text-sm text-lyktan-ink"
        >
      </label>

      <template v-if="isSearching">
        <p v-if="searching" class="text-sm text-lyktan-mute">Söker…</p>
        <p v-else-if="!searchResults.length" class="text-sm text-lyktan-mute">Inga produkter matchade "{{ searchTerm }}".</p>
        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in searchResults" :key="product.id" :product="product" />
        </div>
      </template>

      <template v-else>
        <p v-if="loadingCollections" class="text-sm text-lyktan-mute">Hämtar kategorier…</p>
        <p v-else-if="!collections.length" class="text-sm text-lyktan-mute">Inga kategorier ännu.</p>

        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <NuxtLink
            v-for="collection in collections"
            :key="collection.id"
            :to="`/butik/${collection.handle}`"
            class="group flex flex-col overflow-hidden rounded-2xl bg-lyktan-surface transition hover:bg-black/[0.06]"
          >
            <div class="relative aspect-[4/3] overflow-hidden bg-black/[0.04]">
              <img
                v-if="collection.image?.url"
                :src="collection.image.url"
                :alt="collection.image.altText || collection.title"
                class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              >
              <div v-else class="grid h-full w-full place-items-center text-2xl font-medium text-lyktan-mute">
                {{ collection.title.slice(0, 2).toUpperCase() }}
              </div>
            </div>
            <div class="p-4">
              <span class="text-[0.95rem] font-medium text-lyktan-ink">{{ collection.title }}</span>
            </div>
          </NuxtLink>
        </div>
      </template>
    </div>
  </main>
</template>
