<script setup lang="ts">
import { getCarouselEvents } from '~/utils/events'

// The hero carousel shows only events flagged visaIKarusell in specialEvents.json.
const heroSlides = getCarouselEvents().map((event) => ({
  handle: event.produktHandle as string,
  link: `/produkter/${event.produktHandle}`,
  eyebrow: 'Kommande event',
  title: event.titel,
  text: event.beskrivning
}))

// Aliased exact-handle lookups, one per hero slide — the same reliable
// mechanism as the single-product API route, just repeated dynamically.
// (Shopify's free-text `products(query: "handle:...")` search turned out
// to not reliably exact-match hyphenated handles, so that's avoided here.)
const heroProductFields = heroSlides
  .map(
    (slide, index) => `
    hero${index}: product(handle: "${slide.handle}") {
      id
      title
      handle
      featuredImage {
        url
        altText
      }
    }
  `
  )
  .join('\n')

const homepageQuery = `#graphql
  query HomepageProducts {
    ${heroProductFields}
    showcaseProducts: products(first: 8, sortKey: TITLE, query: "tag:kortspel OR tag:figurspel OR tag:bradspel OR tag:brädspel OR tag:rollspel OR tag:tillbehor OR tag:tillbehör") {
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

const { data } = await useStorefrontData('homepage-products', homepageQuery, {
  transform: (result) => ({
    heroProducts: heroSlides.map((_, index) => result[`hero${index}`] ?? null),
    showcaseProducts: result.showcaseProducts?.nodes ?? []
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
  description: 'Spelbutik med event, miniatyrspel, kortspel, brädspel och rollspel.'
})
</script>

<template>
  <main class="pb-24">
    <section v-if="heroItems.length" class="relative overflow-hidden bg-lyktan-surface">
      <Transition name="hero-copy-transition" mode="out-in">
        <div :key="activeHero?.handle" class="page-shell grid grid-cols-1 items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-20">
          <div>
            <p class="eyebrow">{{ activeHero?.eyebrow }}</p>
            <h1 class="mt-4 max-w-[14ch] text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-lyktan-ink">
              {{ activeHero?.title }}
            </h1>
            <p class="mt-5 max-w-md text-[1.02rem] leading-7 text-lyktan-mute">
              {{ activeHero?.text }}
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-5">
              <NuxtLink :to="activeHero?.link || '/'" class="primary-cta">
                Boka din plats
              </NuxtLink>
              <span class="text-sm text-lyktan-mute">Hämtning i butik i Järfälla</span>
            </div>
          </div>

          <div class="flex min-h-[260px] items-center justify-center lg:min-h-[380px]">
            <img
              v-if="activeHero?.product?.featuredImage?.url"
              :src="activeHero.product.featuredImage.url"
              :alt="activeHero.product.featuredImage.altText || activeHero.product.title"
              class="max-h-[380px] w-full object-contain"
            >
            <div v-else class="text-2xl font-medium text-lyktan-mute">
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
          class="h-1.5 w-1.5 rounded-full bg-black/15 transition"
          :class="{ '!w-5 !bg-lyktan-ink': index === activeHeroIndex }"
          :aria-label="`Visa ${slide.title}`"
          @click="goToHeroSlide(index)"
        />
      </div>
    </section>

    <div class="page-shell grid grid-cols-1 gap-16 px-4 pt-16 sm:px-6">
      <UnderConstructionPanel
        title="Vi öppnar steg för steg."
        text="Webbshoppen byggs ut löpande. Just nu är event, utvalda produkter och butikshämtning prioriterat."
      />

      <section v-if="data?.showcaseProducts?.length">
        <div class="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">Butik</p>
            <h2 class="mt-2 text-[clamp(1.4rem,2.6vw,1.8rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
              Bläddra bland produkterna
            </h2>
            <p class="mt-2 max-w-md text-sm leading-6 text-lyktan-mute">
              Kortspel, miniatyrspel, brädspel och rollspel — köp direkt och hämta i butik.
            </p>
          </div>
          <NuxtLink to="/butik" class="shrink-0 text-sm text-lyktan-mute transition hover:text-lyktan-ink">
            Visa alla i butiken →
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
