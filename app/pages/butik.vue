<script setup lang="ts">
const categoryTabs = [
  {
    slug: 'kortspel',
    label: 'Kortspel',
    tags: ['kortspel']
  },
  {
    slug: 'miniatyrspel',
    label: 'Miniatyrspel',
    tags: ['miniatyrspel', 'figurspel']
  },
  {
    slug: 'bradspel',
    label: 'Brädspel',
    tags: ['bradspel', 'brädspel']
  },
  {
    slug: 'rollspel',
    label: 'Rollspel',
    tags: ['rollspel']
  }
] as const

const storeQuery = `#graphql
  query StoreProducts {
    storefrontProducts: products(first: 100, sortKey: TITLE, query: "tag:kortspel OR tag:figurspel OR tag:bradspel OR tag:brädspel OR tag:rollspel OR tag:tillbehor OR tag:tillbehör") {
      nodes {
        id
        title
        handle
        tags
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          nodes {
            id
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

const { data } = await useStorefrontData('store-products', storeQuery, {
  transform: (result) => ({
    storefrontProducts: result.storefrontProducts?.nodes ?? []
  })
})

const activeCategory = ref<(typeof categoryTabs)[number]['slug']>('kortspel')
const activeFilterTag = ref('alla')

const normalizeTag = (tag?: string | null) =>
  String(tag ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const activeCategoryConfig = computed(
  () => categoryTabs.find((category) => category.slug === activeCategory.value) ?? categoryTabs[0]
)

const storefrontProducts = computed(() => data.value?.storefrontProducts ?? [])

const categoryProducts = computed(() => {
  const allowedTags = new Set(activeCategoryConfig.value.tags.map((tag) => normalizeTag(tag)))

  return storefrontProducts.value.filter((product: any) =>
    product.tags?.some((tag: string) => allowedTags.has(normalizeTag(tag)))
  )
})

const availableFilterTags = computed(() => {
  const categoryTags = new Set(activeCategoryConfig.value.tags.map((tag) => normalizeTag(tag)))
  const tags = new Map<string, string>()

  for (const product of categoryProducts.value) {
    for (const tag of product.tags ?? []) {
      const normalizedTag = normalizeTag(tag)

      if (!normalizedTag || categoryTags.has(normalizedTag)) {
        continue
      }

      if (!tags.has(normalizedTag)) {
        tags.set(normalizedTag, tag)
      }
    }
  }

  return [...tags.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'sv-SE'))
    .map(([value, label]) => ({ value, label }))
})

const filteredCategoryProducts = computed(() => {
  if (activeFilterTag.value === 'alla') {
    return categoryProducts.value
  }

  return categoryProducts.value.filter((product: any) =>
    product.tags?.some((tag: string) => normalizeTag(tag) === activeFilterTag.value)
  )
})

watch(activeCategory, () => {
  activeFilterTag.value = 'alla'
})

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

      <div class="space-y-8">
        <div class="flex flex-col gap-4 border-b border-black/8 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <nav class="flex flex-wrap gap-x-6 gap-y-2" aria-label="Kategorier">
            <button
              v-for="category in categoryTabs"
              :key="category.slug"
              type="button"
              class="text-[0.9rem] transition"
              :class="category.slug === activeCategory ? 'font-medium text-lyktan-ink' : 'text-lyktan-mute hover:text-lyktan-ink'"
              @click="activeCategory = category.slug"
            >
              {{ category.label }}
            </button>
          </nav>

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
        </div>

        <div v-if="filteredCategoryProducts.length" class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in filteredCategoryProducts" :key="product.id" :product="product" />
        </div>

        <div v-else class="rounded-2xl bg-lyktan-surface p-8 text-center">
          <p class="eyebrow">Inga produkter</p>
          <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            Det finns inga produkter här ännu.
          </h3>
        </div>
      </div>
    </div>
  </main>
</template>
