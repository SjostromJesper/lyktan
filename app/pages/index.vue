<script setup lang="ts">
const {
  addVariantToCart,
  loadingVariantId,
  formatMoney
} = useShopifyCart()

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

const heroSlides = [
  {
    handle: 'pokemon-pitch-black-prerelease',
    link: '/produkter/pokemon-pitch-black-prerelease',
    eyebrow: 'Kommande event',
    title: 'Pokemon Pitch Black Prerelease',
    text: 'Var med på Butik Lyktans Pokemon Pitch Black-prerelease. Säkra din plats direkt och hoppa rakt in i eventet via produktsidan.'
  },
  {
    handle: 'riftbound-unleashed-postrift-event',
    link: '/produkter/riftbound-unleashed-postrift-event',
    eyebrow: 'Kommande event',
    title: 'Riftbound Unleashed Postrift Event',
    text: 'Var med på vårt Riftbound Unleashed Postrift-event efter den sena leveransen. Säkra din plats direkt via produktsidan.'
  }
] as const

const homepageQuery = `#graphql
  query HomepageProducts($firstHeroHandle: String!, $secondHeroHandle: String!) {
    firstHero: product(handle: $firstHeroHandle) {
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
    secondHero: product(handle: $secondHeroHandle) {
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
    latestTagged: products(first: 5, sortKey: UPDATED_AT, reverse: true, query: "tag:nyhet") {
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
    latestRecent: products(first: 5, sortKey: UPDATED_AT, reverse: true) {
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
    storefrontProducts: products(first: 100, sortKey: TITLE) {
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

const { data, error } = await useStorefrontData('homepage-products', homepageQuery, {
  variables: {
    firstHeroHandle: heroSlides[0].handle,
    secondHeroHandle: heroSlides[1].handle
  },
  transform: (result) => ({
    heroProducts: [result.firstHero ?? null, result.secondHero ?? null],
    latestTagged: result.latestTagged?.nodes ?? [],
    latestRecent: result.latestRecent?.nodes ?? [],
    storefrontProducts: result.storefrontProducts?.nodes ?? []
  })
})

const activeHeroIndex = ref(0)
let heroInterval: ReturnType<typeof window.setInterval> | undefined

const heroItems = computed(() =>
  heroSlides.map((slide, index) => ({
    ...slide,
    product: data.value?.heroProducts?.[index] ?? null
  }))
)

const activeHero = computed(() => heroItems.value[activeHeroIndex.value] ?? heroItems.value[0] ?? null)
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

const addHomepageProductToCart = async (product: any) => {
  const firstVariant = product?.variants?.nodes?.[0]

  if (!firstVariant?.id) {
    return
  }

  await addVariantToCart(firstVariant.id, product.title)
}

watch(activeCategory, () => {
  activeFilterTag.value = 'alla'
})

const goToHeroSlide = (index: number) => {
  activeHeroIndex.value = index
}

onMounted(() => {
  heroInterval = window.setInterval(() => {
    activeHeroIndex.value = (activeHeroIndex.value + 1) % heroItems.value.length
  }, 5000)
})

onBeforeUnmount(() => {
  if (heroInterval) {
    window.clearInterval(heroInterval)
  }
})

useSeoMeta({
  title: 'Butik Lyktan',
  description: 'Spelbutik med event, miniatyrspel, kortspel, brädspel och rollspel.'
})
</script>

<template>
  <main class="home-page">
    <div class="page-shell">
      <section class="hero-card surface-card">
        <div class="hero-copy">
          <Transition name="hero-copy-transition" mode="out-in">
            <div :key="activeHero?.handle" class="hero-copy-inner">
              <p class="eyebrow">{{ activeHero?.eyebrow }}</p>
              <h1>{{ activeHero?.title }}</h1>
              <p class="lead">{{ activeHero?.text }}</p>

              <div class="hero-actions">
                <NuxtLink :to="activeHero?.link || '/'" class="primary-button">
                  Boka din plats
                </NuxtLink>
              </div>
            </div>
          </Transition>

          <div class="hero-dots">
            <button
              v-for="(slide, index) in heroItems"
              :key="slide.handle"
              type="button"
              class="hero-dot"
              :class="{ 'hero-dot-active': index === activeHeroIndex }"
              :aria-label="`Visa ${slide.title}`"
              @click="goToHeroSlide(index)"
            />
          </div>
        </div>

        <div class="hero-media">
          <Transition name="hero-image-transition" mode="out-in">
            <img
              v-if="activeHero?.product?.featuredImage?.url"
              :key="activeHero.product.handle"
              :src="activeHero.product.featuredImage.url"
              :alt="activeHero.product.featuredImage.altText || activeHero.product.title"
            >
            <img
              v-else
              :key="activeHero?.handle || 'hero-fallback'"
              src="/images/events/riftbound-unleashed.jpg"
              :alt="activeHero?.title || 'Kommande event'"
            >
          </Transition>
        </div>
      </section>

      <UnderConstructionPanel
        title="Fler delar av sajten öppnar snart."
        text="Just nu är sidan under konstruktion."
      />

      <section class="catalog-preview surface-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Tillfällig katalog</p>
            <h2>Bläddra efter speltyp</h2>
          </div>
          <p class="section-note">
            För tillfället kan produkter endast plockas upp i butik
          </p>
        </div>

        <div class="tab-row">
          <button
            v-for="category in categoryTabs"
            :key="category.slug"
            type="button"
            class="tab-button"
            :class="{ 'tab-button-active': category.slug === activeCategory }"
            @click="activeCategory = category.slug"
          >
            {{ category.label }}
          </button>
        </div>

        <div v-if="availableFilterTags.length" class="filter-row">
          <button
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip-active': activeFilterTag === 'alla' }"
            @click="activeFilterTag = 'alla'"
          >
            Alla
          </button>

          <button
            v-for="tag in availableFilterTags"
            :key="tag.value"
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip-active': activeFilterTag === tag.value }"
            @click="activeFilterTag = tag.value"
          >
            {{ tag.label }}
          </button>
        </div>

        <div v-if="filteredCategoryProducts.length" class="catalog-grid">
          <article
            v-for="product in filteredCategoryProducts"
            :key="product.id"
            class="catalog-card"
          >
            <div class="catalog-item-media">
              <img
                v-if="product.featuredImage?.url"
                :src="product.featuredImage.url"
                :alt="product.featuredImage.altText || product.title"
              >
              <div v-else class="catalog-item-fallback">{{ product.title.slice(0, 2).toUpperCase() }}</div>
            </div>

            <div class="catalog-item-copy">
              <h3>{{ product.title }}</h3>
              <p class="catalog-price">
                {{ formatMoney(product.variants?.nodes?.[0]?.price?.amount, product.variants?.nodes?.[0]?.price?.currencyCode) }}
              </p>
              <div class="catalog-item-tags">
                <span v-for="tag in product.tags" :key="`${product.id}-${tag}`" class="catalog-tag">
                  {{ tag }}
                </span>
              </div>

              <div class="catalog-actions">
                <button
                  type="button"
                  class="catalog-cart-button"
                  :disabled="loadingVariantId === product.variants?.nodes?.[0]?.id"
                  @click="addHomepageProductToCart(product)"
                >
                  {{
                    loadingVariantId === product.variants?.nodes?.[0]?.id
                      ? 'Lägger till...'
                      : 'Lägg i kundvagn'
                  }}
                </button>

                <NuxtLink :to="`/produkter/${product.handle}`" class="catalog-link-button">
                  Produktsida
                </NuxtLink>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="state-card">
          <p class="eyebrow">Inga produkter</p>
          <h3>Det finns inga produkter här ännu.</h3>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #f5f5f7;
  color: #121212;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

.home-page {
  min-height: 100vh;
  padding: 18px 16px 48px;
}

.page-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.surface-card {
  border: 1px solid rgba(18, 18, 18, 0.08);
  border-radius: 8px;
  background: white;
  box-shadow: 0 14px 34px rgba(24, 26, 32, 0.04);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(340px, 0.96fr);
  gap: 0;
  overflow: hidden;
}

.hero-copy {
  padding: 38px 34px;
  background: linear-gradient(180deg, #fbfbfc, #f5f5f7);
  border-right: 1px solid rgba(18, 18, 18, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-copy-inner {
  display: grid;
}

.hero-media {
  overflow: hidden;
  background: #eef0f4;
  display: grid;
  place-items: center;
  padding: 18px;
}

.hero-media img {
  width: 100%;
  height: 100%;
  min-height: 390px;
  max-height: 420px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef6c2f;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2,
h3 {
  letter-spacing: -0.045em;
  line-height: 0.98;
}

h1 {
  margin-top: 12px;
  font-size: clamp(2.5rem, 4.5vw, 4.4rem);
}

h2 {
  font-size: clamp(2rem, 3.2vw, 3rem);
}

h3 {
  font-size: 1.08rem;
}

.lead,
.story-copy p,
.section-note,
.state-card p,
.product-copy p {
  color: #666b73;
  line-height: 1.6;
}

.lead {
  margin-top: 16px;
  max-width: 50ch;
  font-size: 1rem;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 26px;
}

.hero-dots {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
}

.hero-dot {
  width: 12px;
  height: 12px;
  padding: 0;
  border: 1px solid rgba(18, 18, 18, 0.14);
  border-radius: 999px;
  background: white;
  cursor: pointer;
}

.hero-dot-active {
  background: #121212;
  border-color: #121212;
}

.hero-copy-transition-enter-active,
.hero-copy-transition-leave-active,
.hero-image-transition-enter-active,
.hero-image-transition-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.hero-copy-transition-enter-from,
.hero-image-transition-enter-from {
  opacity: 0;
  transform: translateY(18px);
}

.hero-copy-transition-leave-to,
.hero-image-transition-leave-to {
  opacity: 0;
  transform: translateY(-18px);
}

.primary-button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid #121212;
  background: #121212;
  color: white;
  font-weight: 800;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.catalog-preview {
  padding: 26px;
  display: grid;
  gap: 18px;
}

.tab-row,
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tab-button,
.filter-chip {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  background: #fbfbfc;
  color: #4a4f58;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.tab-button-active,
.filter-chip-active,
.tab-button:hover,
.filter-chip:hover {
  background: #121212;
  border-color: #121212;
  color: white;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.catalog-card {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  background: linear-gradient(180deg, #fbfbfc, #f5f5f7);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.catalog-card:hover {
  transform: translateY(-1px);
  border-color: rgba(239, 108, 47, 0.28);
}

.catalog-item-media {
  aspect-ratio: 1 / 1;
  background: #eef0f4;
  overflow: hidden;
}

.catalog-item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.catalog-item-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #7a7f92;
  font-size: 1.1rem;
  font-weight: 800;
}

.catalog-item-copy {
  display: grid;
  gap: 10px;
  align-content: start;
}

.catalog-item-copy h3 {
  font-size: 1rem;
  line-height: 1.18;
}

.catalog-price {
  color: #121212;
  font-weight: 800;
}

.catalog-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog-tag {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  background: white;
  color: #4a4f58;
  font-size: 0.8rem;
  font-weight: 700;
}

.catalog-actions {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.catalog-cart-button,
.catalog-link-button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid #121212;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.catalog-cart-button {
  background: #121212;
  color: white;
  cursor: pointer;
}

.catalog-cart-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.catalog-link-button {
  background: white;
  color: #121212;
}

.hero-price {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 6px;
  background: white;
  border: 1px solid rgba(18, 18, 18, 0.08);
  font-weight: 800;
}

.story-section {
  display: grid;
  gap: 14px;
}

.story-copy {
  max-width: 820px;
  margin: 0 auto;
  text-align: center;
}

.story-copy h2 {
  margin: 12px 0 16px;
}

.story-image {
  overflow: hidden;
}

.story-placeholder {
  min-height: 340px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, #f3f4f6, #eceef2);
  color: #7a7f92;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.product-section {
  display: grid;
  gap: 14px;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.section-head h2 {
  margin-top: 10px;
}

.section-note code {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #efeff4;
  color: #121212;
  font-family: inherit;
  font-size: 0.92em;
}

.latest-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.product-card {
  padding: 12px;
  display: grid;
  gap: 10px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  border-color: rgba(239, 108, 47, 0.2);
  box-shadow: 0 18px 28px rgba(24, 26, 32, 0.06);
}

.product-image {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 4px;
  background: #f1f2f6;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #7d64ff;
  font-size: 1.5rem;
  font-weight: 800;
}

.product-copy {
  display: grid;
  gap: 6px;
}

.product-copy h3 {
  font-size: 0.98rem;
  line-height: 1.18;
}

.product-copy p {
  color: #121212;
  font-weight: 800;
}

.state-card {
  padding: 24px;
}

.state-card h3 {
  margin: 10px 0 12px;
}

@media (max-width: 1100px) {
  .latest-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-copy {
    border-right: 0;
    border-bottom: 1px solid rgba(18, 18, 18, 0.08);
  }

  .hero-media img {
    min-height: 260px;
    max-height: 320px;
  }

  .section-head {
    display: grid;
    align-items: start;
  }
}

@media (max-width: 720px) {
  .home-page {
    padding: 16px 12px 32px;
  }

  .surface-card {
    border-radius: 8px;
  }

  .hero-card {
    gap: 0;
  }

  .hero-copy {
    padding: 20px;
  }

  .catalog-preview {
    padding: 20px;
  }

  .story-placeholder {
    min-height: 220px;
  }

  .latest-grid {
    grid-template-columns: 1fr 1fr;
  }

}

@media (max-width: 520px) {
  .catalog-grid {
    grid-template-columns: 1fr;
  }

  .latest-grid {
    grid-template-columns: 1fr;
  }
}
</style>
