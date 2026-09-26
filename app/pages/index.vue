<script setup lang="ts">
import { getCarouselEvents } from '~/utils/events'

const { t, locale } = useI18n()
const localePath = useLocalePath()

// The hero carousel shows Shopify products tagged "event" that are flagged
// event_show_in_carousel via metafield and have an upcoming event_date.
const { data: specialEvents } = await useSpecialEvents()

const heroItems = computed(() =>
  getCarouselEvents(specialEvents.value ?? []).map((event) => ({
    handle: event.produktHandle as string,
    link: localePath(`/produkter/${event.produktHandle}`),
    eyebrow: t('home.upcomingEvent'),
    title: event.titel,
    text: event.beskrivning,
    product: {
      title: event.titel,
      featuredImage: event.featuredImage ?? null
    }
  }))
)

// Utility products (membership/booking deposit) have no tags, so they can't
// be excluded via a "-tag:event"-style query filter — filtered out below instead.
const EXCLUDED_SHOWCASE_HANDLES = new Set(['medlemskap', 'bordsbokning-forskott'])

const homepageQuery = `#graphql
  query HomepageProducts($language: LanguageCode!) @inContext(language: $language) {
    showcaseProducts: products(first: 10, sortKey: CREATED_AT, reverse: true, query: "-tag:event") {
      nodes {
        id
        title
        handle
        tags
        featuredImage {
          url
          altText
        }
        releaseDate: metafield(namespace: "custom", key: "release_date") {
          value
        }
        inStoreOnly: metafield(namespace: "custom", key: "in_store_only") {
          value
        }
        variants(first: 1) {
          nodes {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`

const { data } = await useStorefrontData(`homepage-products-${locale.value}`, homepageQuery, {
  variables: { language: locale.value === 'en' ? 'EN' : 'SV' },
  transform: (result) => ({
    showcaseProducts: (result.showcaseProducts?.nodes ?? [])
      .filter((product: any) => !EXCLUDED_SHOWCASE_HANDLES.has(product.handle))
      .slice(0, 8)
  })
})

// Category tiles — same endpoint as /butik
type Collection = { id: string, handle: string, title: string, image: { url: string, altText: string | null } | null }
const { data: collectionsData } = await useAsyncData(`home-collections-${locale.value}`, () =>
  $fetch<{ collections: Collection[] }>('/api/shopify/collections', { query: { lang: locale.value } }).catch(() => ({ collections: [] }))
)
const categories = computed(() =>
  (collectionsData.value?.collections ?? []).slice(0, 5).map((c, i) => ({ ...c, accent: categoryAccentAt(c.title, i) }))
)

const eventAccent = categoryAccent('event')

const visitCards = computed(() => [
  { to: localePath('/bordsbokning'), title: t('nav.booking'), text: t('home.visitBookingText'), accent: categoryAccent('brädspel') },
  { to: localePath('/events'), title: t('nav.events'), text: t('home.visitEventsText'), accent: eventAccent },
  { to: localePath('/kontakt'), title: t('nav.contact'), text: t('home.visitContactText'), accent: categoryAccent('miniatyr') }
])

const activeHeroIndex = ref(0)
let heroInterval: ReturnType<typeof window.setInterval> | undefined

const activeHero = computed(() => heroItems.value[activeHeroIndex.value] ?? heroItems.value[0] ?? null)

const goToHeroSlide = (index: number) => {
  activeHeroIndex.value = index
}

onMounted(() => {
  if (heroItems.value.length > 1) {
    heroInterval = window.setInterval(() => {
      activeHeroIndex.value = (activeHeroIndex.value + 1) % heroItems.value.length
    }, 5000)
  }
})

onBeforeUnmount(() => {
  if (heroInterval) {
    window.clearInterval(heroInterval)
  }
})

useSeoMeta({
  title: 'Butik Lyktan',
  description: () => t('home.seoDescription')
})
</script>

<template>
  <main class="pb-24">
    <!-- Hero: white, big type, the product on a tinted panel -->
    <section class="page-shell px-4 pt-10 sm:px-6 lg:pt-14">
      <Transition name="hero-copy-transition" mode="out-in">
        <div
          v-if="activeHero"
          :key="activeHero.handle"
          class="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
        >
          <div>
            <span class="pill">
              <span class="h-2 w-2 rounded-full" :style="{ background: eventAccent.color }" />
              {{ activeHero.eyebrow }}
            </span>
            <h1 class="hero-title mt-5 max-w-[15ch]">{{ activeHero.title }}</h1>
            <p class="mt-5 max-w-[46ch] text-[1.05rem] leading-7 text-lyktan-mute">{{ activeHero.text }}</p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
              <NuxtLink :to="activeHero.link || localePath('/')" class="primary-cta !min-h-12 !px-6">
                {{ t('home.bookSpot') }} <span aria-hidden="true">→</span>
              </NuxtLink>
              <NuxtLink :to="localePath('/events')" class="secondary-cta !min-h-12">{{ t('home.allEvents') }}</NuxtLink>
            </div>

            <div v-if="heroItems.length > 1" class="mt-10 flex items-center gap-1.5">
              <button
                v-for="(slide, index) in heroItems"
                :key="slide.handle"
                type="button"
                class="h-1.5 w-1.5 rounded-full bg-lyktan-line transition-all"
                :class="{ '!w-6 !bg-lyktan-ink': index === activeHeroIndex }"
                :aria-label="t('home.showSlide', { title: slide.title })"
                @click="goToHeroSlide(index)"
              />
            </div>
          </div>

          <div class="hero-panel" :style="{ '--tint': eventAccent.tint, '--dot': eventAccent.color }">
            <img
              v-if="activeHero.product?.featuredImage?.url"
              :src="activeHero.product.featuredImage.url"
              :alt="activeHero.product.featuredImage.altText || activeHero.product.title"
              class="relative z-[1] max-h-[360px] w-full object-contain drop-shadow-[0_20px_30px_rgba(21,23,28,0.18)]"
            >
            <div v-else class="relative z-[1] text-4xl font-bold text-lyktan-mute">
              {{ activeHero.title?.slice(0, 2).toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- No event in the carousel: a store intro instead -->
        <div v-else key="intro" class="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <span class="pill">
              <span class="h-2 w-2 rounded-full bg-lyktan-brand" />
              {{ t('home.heroEyebrow') }}
            </span>
            <h1 class="hero-title mt-5 max-w-[16ch]">{{ t('home.heroTitle') }}</h1>
            <p class="mt-5 max-w-[46ch] text-[1.05rem] leading-7 text-lyktan-mute">{{ t('home.heroText') }}</p>
            <div class="mt-8 flex flex-wrap items-center gap-3">
              <NuxtLink :to="localePath('/butik')" class="primary-cta !min-h-12 !px-6">
                {{ t('home.heroCta') }} <span aria-hidden="true">→</span>
              </NuxtLink>
              <NuxtLink :to="localePath('/bordsbokning')" class="secondary-cta !min-h-12">{{ t('home.heroSecondary') }}</NuxtLink>
            </div>
          </div>
          <div class="intro-tiles" aria-hidden="true">
            <span class="bg-cat-kort" /><span class="bg-cat-mini" /><span class="bg-cat-brad" /><span class="bg-cat-roll" />
            <img src="/images/logo/orange-solo.svg" alt="" class="intro-logo">
          </div>
        </div>
      </Transition>
    </section>

    <div class="page-shell grid grid-cols-1 gap-20 px-4 pt-16 sm:px-6 lg:pt-20">
      <!-- Categories -->
      <section v-if="categories.length">
        <p class="eyebrow">{{ t('home.categoriesEyebrow') }}</p>
        <h2 class="section-title mt-2">{{ t('home.categoriesTitle') }}</h2>
        <div class="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <NuxtLink
            v-for="category in categories"
            :key="category.id"
            :to="localePath(`/butik/${category.handle}`)"
            class="category-tile group"
            :style="{ '--tint': category.accent.tint, '--dot': category.accent.color }"
          >
            <span class="flex items-center justify-between">
              <span class="h-2.5 w-2.5 rounded-full" :style="{ background: category.accent.color }" />
              <span class="text-lg text-lyktan-mute transition group-hover:translate-x-0.5 group-hover:text-lyktan-ink" aria-hidden="true">→</span>
            </span>
            <span class="mt-8 block text-[1.05rem] font-semibold leading-tight text-lyktan-ink">{{ category.title }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Products -->
      <section v-if="data?.showcaseProducts?.length">
        <div class="flex flex-col gap-4 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">{{ t('home.shopEyebrow') }}</p>
            <h2 class="section-title mt-2">{{ t('home.browseProducts') }}</h2>
            <p class="mt-3 max-w-md text-sm leading-6 text-lyktan-mute">{{ t('home.browseProductsText') }}</p>
          </div>
          <NuxtLink :to="localePath('/butik')" class="link-arrow shrink-0">
            {{ t('home.viewAllInShop') }} <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in data.showcaseProducts" :key="product.id" :product="product" />
        </div>
      </section>

      <!-- In the store -->
      <section>
        <p class="eyebrow">{{ t('home.visitEyebrow') }}</p>
        <h2 class="section-title mt-2">{{ t('home.visitTitle') }}</h2>
        <div class="mt-7 grid gap-3 sm:grid-cols-3">
          <NuxtLink
            v-for="card in visitCards"
            :key="card.to"
            :to="card.to"
            class="visit-card group"
            :style="{ '--dot': card.accent.color }"
          >
            <span class="block text-[1.15rem] font-semibold text-lyktan-ink">{{ card.title }}</span>
            <span class="mt-2 block text-sm leading-6 text-lyktan-mute">{{ card.text }}</span>
            <span class="mt-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-lyktan-line text-lyktan-ink transition group-hover:border-transparent group-hover:bg-[var(--dot)] group-hover:text-white" aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.hero-title {
  font-size: clamp(2.5rem, 5.4vw, 4.4rem);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.035em;
  color: var(--color-lyktan-ink);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-lyktan-line);
  border-radius: 999px;
  padding: 5px 12px 5px 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-lyktan-ink);
  background: #fff;
}

/* Product on a soft tinted panel, with a few small category-colour dots */
.hero-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  padding: 40px;
  border-radius: 28px;
  background: var(--tint);
  overflow: hidden;
}
.hero-panel::before,
.hero-panel::after {
  content: "";
  position: absolute;
  border-radius: 999px;
}
.hero-panel::before {
  width: 58%;
  aspect-ratio: 1;
  background: #fff;
  opacity: 0.7;
}
.hero-panel::after {
  width: 14px;
  height: 14px;
  top: 28px;
  right: 30px;
  background: var(--dot);
  box-shadow: -34px 22px 0 -3px var(--color-cat-mini), -8px 56px 0 -4px var(--color-cat-brad);
}

/* Intro (no event): four category-coloured tiles around the logo */
.intro-tiles {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  aspect-ratio: 5 / 4;
  max-height: 380px;
}
.intro-tiles > span {
  border-radius: 24px;
}
.intro-tiles > span:nth-child(1) { border-top-left-radius: 120px; }
.intro-tiles > span:nth-child(4) { border-bottom-right-radius: 120px; }
.intro-logo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 96px;
  height: 96px;
  padding: 18px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(21, 23, 28, 0.15);
}

.category-tile {
  display: block;
  padding: 18px;
  border-radius: 18px;
  background: var(--tint);
  border: 1px solid transparent;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.category-tile:hover {
  border-color: var(--dot);
  transform: translateY(-2px);
}

.visit-card {
  display: block;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid var(--color-lyktan-line);
  background: #fff;
  position: relative;
  transition: border-color 0.15s ease;
}
.visit-card::before {
  content: "";
  position: absolute;
  left: 24px;
  top: 0;
  width: 28px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--dot);
}
.visit-card:hover {
  border-color: var(--color-lyktan-ink);
}

.link-arrow {
  display: inline-flex;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-lyktan-ink);
  text-decoration: underline;
  text-decoration-color: var(--color-lyktan-brand);
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .category-tile:hover { transform: none; }
}

.hero-copy-transition-enter-active,
.hero-copy-transition-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.hero-copy-transition-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.hero-copy-transition-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
