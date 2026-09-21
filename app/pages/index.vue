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
    <section v-if="heroItems.length" class="hero-felt relative overflow-hidden bg-lyktan-felt text-lyktan-cream">
      <Transition name="hero-copy-transition" mode="out-in">
        <div :key="activeHero?.handle" class="page-shell grid grid-cols-1 items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-20">
          <div>
            <p class="eyebrow !text-lyktan-brand">{{ activeHero?.eyebrow }}</p>
            <h1 class="mt-4 max-w-[14ch] text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-lyktan-cream">
              {{ activeHero?.title }}
            </h1>
            <p class="mt-5 max-w-md text-[1.02rem] leading-7 text-lyktan-sage">
              {{ activeHero?.text }}
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-5">
              <NuxtLink :to="activeHero?.link || localePath('/')" class="primary-cta">
                {{ t('home.bookSpot') }}
              </NuxtLink>
              <span class="text-sm text-lyktan-sage">{{ t('home.pickupInStore') }}</span>
            </div>
          </div>

          <div class="hero-glow relative flex min-h-[260px] items-center justify-center lg:min-h-[380px]">
            <img
              v-if="activeHero?.product?.featuredImage?.url"
              :src="activeHero.product.featuredImage.url"
              :alt="activeHero.product.featuredImage.altText || activeHero.product.title"
              class="relative max-h-[380px] w-full object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]"
            >
            <div v-else class="relative text-2xl font-medium text-lyktan-sage">
              {{ activeHero?.title?.slice(0, 2).toUpperCase() }}
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="heroItems.length > 1" class="page-shell flex items-center gap-1.5 px-4 pb-6 sm:px-6">
        <button
          v-for="(slide, index) in heroItems"
          :key="slide.handle"
          type="button"
          class="h-1.5 w-1.5 rounded-full bg-white/25 transition"
          :class="{ '!w-5 !bg-lyktan-brand': index === activeHeroIndex }"
          :aria-label="t('home.showSlide', { title: slide.title })"
          @click="goToHeroSlide(index)"
        />
      </div>
    </section>

    <div class="page-shell grid grid-cols-1 gap-16 px-4 pt-16 sm:px-6">
      <UnderConstructionPanel
        :title="t('home.underConstructionTitle')"
        :text="t('home.underConstructionText')"
      />

      <section v-if="data?.showcaseProducts?.length">
        <div class="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">{{ t('home.shopEyebrow') }}</p>
            <h2 class="mt-2 text-[clamp(1.4rem,2.6vw,1.8rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
              {{ t('home.browseProducts') }}
            </h2>
            <p class="mt-2 max-w-md text-sm leading-6 text-lyktan-mute">
              {{ t('home.browseProductsText') }}
            </p>
          </div>
          <NuxtLink :to="localePath('/butik')" class="shrink-0 text-sm text-lyktan-mute transition hover:text-lyktan-ink">
            {{ t('home.viewAllInShop') }} →
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in data.showcaseProducts" :key="product.id" :product="product" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Felt texture: a faint diagonal weave so the green reads as cloth, not a flat fill */
.hero-felt {
  background-image:
    radial-gradient(120% 80% at 85% 50%, rgba(28, 81, 64, 0.9) 0%, rgba(18, 59, 48, 0) 60%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.018) 0 2px, transparent 2px 6px);
}

/* The lantern: warm orange light behind the featured product */
.hero-glow::before {
  content: "";
  position: absolute;
  inset: 8% 12%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(254, 77, 1, 0.38), rgba(254, 77, 1, 0.12) 55%, transparent 100%);
  filter: blur(8px);
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
