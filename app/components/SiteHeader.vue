<script setup lang="ts">
type Collection = { id: string, handle: string, title: string }

const { cartOpen, cartQuantity, cart, formatMoney } = useShopifyCart()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const { openStatus } = useStoreHours()

const shippingBannerDismissed = useState('shipping-banner-dismissed', () => false)

const { data: collectionsData } = await useAsyncData('butik-collections', () =>
  $fetch<{ collections: Collection[] }>('/api/shopify/collections', { query: { lang: locale.value } })
)
const collections = computed(() => collectionsData.value?.collections ?? [])

const cartTotalLabel = computed(() => formatMoney(cart.value?.cost?.totalAmount?.amount, cart.value?.cost?.totalAmount?.currencyCode))

// --- Header search ---
const searchTerm = ref('')
const submitSearch = () => {
  if (!searchTerm.value.trim()) return
  router.push(localePath({ path: '/butik', query: { q: searchTerm.value.trim() } }))
}

// --- Webbshop dropdown (desktop) ---
const shopMenuOpen = ref(false)
const shopMenuEl = ref<HTMLElement | null>(null)
const shopTriggerEl = ref<HTMLElement | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const openShopMenu = () => {
  if (closeTimer) clearTimeout(closeTimer)
  shopMenuOpen.value = true
}
const scheduleCloseShopMenu = () => {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => { shopMenuOpen.value = false }, 120)
}
const closeShopMenu = () => {
  shopMenuOpen.value = false
}

const onDocumentClick = (e: MouseEvent) => {
  if (!shopMenuOpen.value) return
  const target = e.target as Node
  if (shopMenuEl.value?.contains(target) || shopTriggerEl.value?.contains(target)) return
  closeShopMenu()
}
const onDocumentKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && shopMenuOpen.value) {
    closeShopMenu()
    shopTriggerEl.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  if (closeTimer) clearTimeout(closeTimer)
})

// --- Mobile menu ---
const mobileMenuOpen = ref(false)
const mobileMenuTriggerEl = ref<HTMLElement | null>(null)
const route = useRoute()

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
  closeShopMenu()
})
</script>

<template>
  <header class="sticky top-0 z-40">
    <!-- Topprad: adress, öppet-status, fraktnotis -->
    <div class="bg-navy text-white">
      <div class="page-shell flex min-h-9 items-center justify-center gap-4 px-4 text-[0.76rem] font-semibold uppercase tracking-[0.04em] sm:justify-between sm:px-6">
        <span class="hidden text-white/65 sm:inline">{{ t('nav.address') }}</span>
        <span class="inline-flex items-center gap-2 normal-case tracking-normal">
          <span class="inline-block h-2 w-2 rounded-full" :class="openStatus.isOpen ? 'bg-lyktan-brand' : 'bg-white/40'" />
          {{ openStatus.text }}
        </span>
        <span v-if="!shippingBannerDismissed" class="hidden items-center gap-2 normal-case tracking-normal text-white/80 sm:inline-flex">
          <span class="hidden h-1 w-1 rounded-full bg-lyktan-brand sm:inline-block" />
          <span>{{ t('layout.shippingNotice') }}</span>
          <button
            type="button"
            :aria-label="t('layout.dismissShippingNotice')"
            class="inline-grid h-6 w-6 place-items-center rounded-full text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            @click="shippingBannerDismissed = true"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <!-- Header: sök / logga / konto+varukorg -->
    <div class="border-b border-lyktan-line bg-white/90 backdrop-blur-md">
      <div class="page-shell grid min-h-[84px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6">
        <div class="flex min-w-0 items-center gap-1">
          <button
            ref="mobileMenuTriggerEl"
            type="button"
            :aria-label="t('nav.openMenu')"
            :aria-expanded="mobileMenuOpen"
            class="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-lyktan-ink transition hover:bg-lyktan-well sm:hidden"
            @click="mobileMenuOpen = true"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
            </svg>
          </button>

          <NuxtLink :to="localePath('/butik')" :aria-label="t('nav.search')" class="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-lyktan-ink transition hover:bg-lyktan-well sm:hidden">
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" stroke-linecap="round" />
            </svg>
          </NuxtLink>

          <form class="hidden min-w-0 sm:block" @submit.prevent="submitSearch">
            <label class="flex h-11 max-w-[320px] items-center gap-2 rounded-full border border-lyktan-line bg-lyktan-well px-4 text-lyktan-mute">
              <span class="sr-only">{{ t('nav.search') }}</span>
              <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" stroke-linecap="round" />
              </svg>
              <input v-model="searchTerm" type="search" :placeholder="t('nav.searchPlaceholder')" class="min-w-0 flex-1 bg-transparent text-sm text-lyktan-ink outline-none placeholder:text-lyktan-mute">
            </label>
          </form>
        </div>

        <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')" class="col-start-2 flex shrink-0 items-center gap-3 justify-self-center">
          <img src="/images/logo/ink-wide.svg" alt="Butik Lyktan" class="h-8 w-auto sm:h-9">
          <span class="hidden flex-col leading-none sm:flex">
            <span class="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-lyktan-mute">{{ t('nav.tagline') }}</span>
          </span>
        </NuxtLink>

        <div class="col-start-3 flex items-center justify-self-end gap-1">
          <NuxtLink :to="localePath('/kontakt')" :aria-label="t('nav.myAccount')" class="inline-grid h-10 w-10 place-items-center rounded-full text-lyktan-ink transition hover:bg-lyktan-well">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 20c1.6-3.4 4.3-5 7-5s5.4 1.6 7 5" stroke-linecap="round" />
            </svg>
          </NuxtLink>

          <button
            type="button"
            :aria-label="t('nav.openCart')"
            class="relative inline-flex h-10 items-center gap-2 rounded-full px-2 text-lyktan-ink transition hover:bg-lyktan-well sm:px-3"
            @click="cartOpen = true"
          >
            <span class="relative inline-grid h-[18px] w-[18px] place-items-center">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="h-[18px] w-[18px]">
                <path
                  d="M7 7V6a5 5 0 0 1 10 0v1h2.5a1 1 0 0 1 1 1.12l-1.2 10A2 2 0 0 1 17.31 20H6.69a2 2 0 0 1-1.99-1.88l-1.2-10A1 1 0 0 1 4.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
                  fill="currentColor"
                />
              </svg>
              <span
                v-if="cartQuantity"
                class="absolute -right-1.5 -top-1.5 inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-lyktan-brand px-1 font-mono text-[0.6rem] font-semibold text-lyktan-ink ring-2 ring-white"
              >
                {{ cartQuantity }}
              </span>
            </span>
            <span class="hidden font-mono text-[0.85rem] font-semibold sm:inline">{{ cartTotalLabel }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Navrad: Webbshop-dropdown + huvudlänkar, centrerade -->
    <nav :aria-label="t('nav.mainNav')" class="hidden border-b border-lyktan-line bg-white/90 backdrop-blur-md sm:block">
      <div class="page-shell flex min-h-[64px] items-center justify-center gap-2 px-4 sm:px-6">
        <div
          class="relative"
          @mouseenter="openShopMenu"
          @mouseleave="scheduleCloseShopMenu"
        >
          <button
            ref="shopTriggerEl"
            type="button"
            class="webshop-trigger"
            :class="{ 'webshop-trigger-active': shopMenuOpen }"
            :aria-expanded="shopMenuOpen"
            aria-haspopup="true"
            @click="openShopMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-[18px] w-[18px]" fill="none" stroke="#8A5200" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {{ t('nav.webshop') }}
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5 transition" :class="{ 'rotate-180': shopMenuOpen }" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="shopMenuOpen"
              ref="shopMenuEl"
              class="absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-lyktan-line bg-white p-2 shadow-xl"
              role="menu"
              :aria-label="t('nav.webshop')"
            >
              <NuxtLink
                v-for="cat in collections"
                :key="cat.id"
                :to="localePath(`/butik/${cat.handle}`)"
                role="menuitem"
                class="flex min-h-11 items-center rounded-xl px-3 text-[0.9rem] font-medium text-lyktan-ink transition hover:bg-lyktan-well"
                @click="closeShopMenu"
              >
                {{ cat.title }}
              </NuxtLink>
              <div class="my-1.5 border-t border-lyktan-line" />
              <NuxtLink
                :to="localePath('/butik')"
                role="menuitem"
                class="flex min-h-11 items-center rounded-xl px-3 text-[0.9rem] font-semibold text-lyktan-accent transition hover:bg-lyktan-well"
                @click="closeShopMenu"
              >
                {{ t('nav.allProducts') }}
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <NuxtLink :to="localePath('/events')" class="nav-link" active-class="nav-link-active">{{ t('nav.events') }}</NuxtLink>
        <NuxtLink :to="localePath('/singelkort')" class="nav-link gap-1.5" active-class="nav-link-active">
          {{ t('nav.singles') }}
          <span class="rounded-full bg-lyktan-brand px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase leading-none tracking-wide text-lyktan-ink">{{ t('nav.beta') }}</span>
        </NuxtLink>
        <NuxtLink :to="localePath('/bordsbokning')" class="nav-link" active-class="nav-link-active">{{ t('nav.booking') }}</NuxtLink>
        <NuxtLink :to="localePath('/kontakt')" class="nav-link" active-class="nav-link-active">{{ t('nav.findUs') }}</NuxtLink>
      </div>
    </nav>
  </header>

  <MobileMenu :open="mobileMenuOpen" :trigger-el="mobileMenuTriggerEl" @close="mobileMenuOpen = false" />
</template>

<style scoped>
.webshop-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px 0 14px;
  border-radius: 22px;
  background: var(--color-lyktan-soft);
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--color-lyktan-ink);
  transition: background-color 0.15s ease;
}
.webshop-trigger-active,
.webshop-trigger:hover {
  background: var(--color-lyktan-brand);
}
</style>
