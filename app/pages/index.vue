<script setup lang="ts">
import { getCarouselEvents, getUpcomingEvents } from '~/utils/events'

const { t, locale } = useI18n()
const localePath = useLocalePath()

// The hero carousel shows Shopify products tagged "event" that are flagged
// event_show_in_carousel via metafield and have an upcoming event_date.
const { data: specialEvents } = await useSpecialEvents()
const { data: recurringEvents } = await useRecurringEvents()

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


const { data } = await useAsyncData(`homepage-products-${locale.value}`, () => $fetch<any>('/api/shopify/home-products', { query: { lang: locale.value } }), {
  watch: [locale],
  transform: (result: any) => ({
    showcaseProducts: (result.showcaseProducts?.nodes ?? [])
      .filter((product: any) => !EXCLUDED_SHOWCASE_HANDLES.has(product.handle) && !(product.tags ?? []).includes('single'))
      .slice(0, 8)
  })
})

// Kortspel-flikar — hämtar hela kortspel-kollektionen (samma data som
// /butik/kortspel) och grupperar klientsidan per spel utifrån taggar, i
// stället för hårdkodade flikar. Kortspel säljs aldrig i webbshoppen, så
// varje produkt flaggas in_store_only här oavsett metafält.
const { data: kortspelData } = await useAsyncData(`home-kortspel-${locale.value}`, () =>
  $fetch<{ products: any[] }>('/api/shopify/collection/kortspel', { query: { lang: locale.value } }).catch(() => ({ products: [] }))
)

const cardGameGroups = computed(() => {
  const groups = new Map<string, any[]>()
  for (const product of kortspelData.value?.products ?? []) {
    const flagged = { ...product, inStoreOnly: { value: 'true' } }
    const label = classifyCardGame(product, t('home.cardGamesTitle'))
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(flagged)
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4)
})

const activeCardTab = ref('')
watch(cardGameGroups, (groups) => {
  if (groups.length && !groups.some(([label]) => label === activeCardTab.value)) {
    activeCardTab.value = groups[0]![0]
  }
}, { immediate: true })

const activeCardProducts = computed(() =>
  (cardGameGroups.value.find(([label]) => label === activeCardTab.value)?.[1] ?? []).slice(0, 5)
)

// Kommande event-kort — återanvänder samma sammanslagna lista (återkommande +
// specialevent) som /events kommer bygga på, begränsat till de 3 närmaste.
const weekdayShort = (date: Date) => {
  const label = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { weekday: 'short' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

const upcomingEventCards = computed(() =>
  getUpcomingEvents(recurringEvents.value, specialEvents.value ?? [], 3).map((eventItem, index) => {
    const date = new Date(`${eventItem.datum}T00:00:00`)
    const month = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { month: 'short' }).format(date).replace('.', '')
    return {
      key: `${eventItem.datum}-${eventItem.titel}-${index}`,
      day: new Intl.DateTimeFormat('sv-SE', { day: 'numeric' }).format(date),
      month: month.charAt(0).toUpperCase() + month.slice(1),
      title: eventItem.titel,
      meta: [`${weekdayShort(date)} ${eventItem.tid}`, eventItem.kostnad].filter(Boolean).join(' · '),
      link: eventItem.produktHandle ? localePath(`/produkter/${eventItem.produktHandle}`) : localePath('/events')
    }
  })
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
              :src="shopifyImage(activeHero.product.featuredImage.url, 800)"
              :srcset="shopifySrcset(activeHero.product.featuredImage.url, [480, 800, 1200])"
              sizes="(min-width: 1024px) 40vw, 90vw"
              fetchpriority="high"
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
      <!-- Fördelar -->
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="perk-tile">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 10l9-6 9 6v10H3V10z" /><path d="M9 20v-6h6v6" /></svg>
          <div><p class="perk-title">{{ t('home.perkPickupTitle') }}</p><p class="perk-text">{{ t('home.perkPickupText') }}</p></div>
        </div>
        <div class="perk-tile">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H5a3 3 0 0 0 3 4" /><path d="M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4" /><path d="M8 20h8" /></svg>
          <div><p class="perk-title">{{ t('home.perkEventsTitle') }}</p><p class="perk-text">{{ t('home.perkEventsText') }}</p></div>
        </div>
        <div class="perk-tile">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect x="3" y="7" width="18" height="4" rx="1" /><path d="M6 11v8" /><path d="M18 11v8" /></svg>
          <div><p class="perk-title">{{ t('home.perkBookingTitle') }}</p><p class="perk-text">{{ t('home.perkBookingText') }}</p></div>
        </div>
        <div class="perk-tile">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <div><p class="perk-title">{{ t('home.perkHoursTitle') }}</p><p class="perk-text">{{ t('home.perkHoursText') }}</p></div>
        </div>
      </section>

      <!-- Nytt i butiken -->
      <section v-if="data?.showcaseProducts?.length" class="new-products-panel">
        <h2 class="panel-title">{{ t('home.newProductsTitle') }}</h2>
        <div class="grid w-full grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
          <ProductCard v-for="product in data.showcaseProducts" :key="product.id" :product="product" />
        </div>
        <NuxtLink :to="localePath('/butik')" class="primary-cta !min-h-[50px]">
          {{ t('home.newProductsCta') }}
        </NuxtLink>
      </section>

      <!-- Kortspel med flikar -->
      <section v-if="cardGameGroups.length" class="flex flex-col items-center gap-6">
        <h2 class="section-title text-center">{{ t('home.cardGamesTitle') }}</h2>
        <div role="tablist" :aria-label="t('home.cardGamesTitle')" class="flex flex-wrap justify-center gap-2">
          <button
            v-for="group in cardGameGroups"
            :key="group[0]"
            type="button"
            role="tab"
            :aria-selected="group[0] === activeCardTab"
            class="tab-pill"
            :class="{ 'tab-pill-active': group[0] === activeCardTab }"
            @click="activeCardTab = group[0]"
          >
            {{ group[0] }}
          </button>
        </div>
        <div class="grid w-full grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          <ProductCard v-for="product in activeCardProducts" :key="product.id" :product="product" />
        </div>
      </section>

      <!-- Kommande event -->
      <section v-if="upcomingEventCards.length" class="flex flex-col items-center gap-9">
        <h2 class="section-title text-center">{{ t('home.upcomingEvent') }}</h2>
        <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <NuxtLink v-for="eventCard in upcomingEventCards" :key="eventCard.key" :to="eventCard.link" class="event-card-mini group">
            <div class="event-daybox">
              <span class="event-day">{{ eventCard.day }}</span>
              <span class="event-month">{{ eventCard.month }}</span>
            </div>
            <div class="min-w-0">
              <p class="truncate text-[1.05rem] font-bold leading-tight text-lyktan-ink">{{ eventCard.title }}</p>
              <p class="mt-1 text-sm text-lyktan-mute">{{ eventCard.meta }}</p>
            </div>
          </NuxtLink>
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

.perk-tile {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 84px;
  padding: 0 24px;
  border-radius: 16px;
  background: var(--color-lyktan-soft);
}
.perk-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-lyktan-ink);
}
.perk-text {
  margin-top: 2px;
  font-size: 0.85rem;
  color: var(--color-lyktan-mute);
}

.new-products-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 44px 32px;
  border-radius: 28px;
  background: var(--color-lyktan-soft);
}
.panel-title {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-lyktan-ink);
  text-align: center;
}

.event-card-mini {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  border-radius: 20px;
  border: 2px solid var(--color-lyktan-line);
  transition: border-color 0.15s ease;
}
.event-card-mini:hover {
  border-color: var(--color-navy);
}
.event-daybox {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 76px;
  border-radius: 16px;
  background: var(--color-navy);
  color: #fff;
}
.event-day {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1;
}
.event-month {
  margin-top: 2px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lyktan-brand);
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
