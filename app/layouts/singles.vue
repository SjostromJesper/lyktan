<script setup lang="ts">
import '~/assets/css/singelkort.css'

const { t } = useI18n()
const localePath = useLocalePath()
// The singles section has its own cart, separate from the shop's (see useShopifyCart scopes).
const { cartQuantity, cart, cartNotice, formatMoney, loadExistingCart } = useSinglesCart()
const route = useRoute()

onMounted(loadExistingCart)

// Short confirmation after adding a card; the cart page itself doesn't need one.
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
watch(cartNotice, (message) => {
  if (!message || route.path.endsWith('/kundkorg')) return
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 4500)
})
onBeforeUnmount(() => clearTimeout(toastTimer))

const cartTotalLabel = computed(() => formatMoney(cart.value?.cost?.totalAmount?.amount, cart.value?.cost?.totalAmount?.currencyCode))
</script>

<template>
  <div class="lykta min-h-screen">
    <!-- Topprad: tillbaka till huvudsajten -->
    <div class="border-b border-[var(--color-divider)] bg-[#080A0E] text-[0.75rem] font-semibold tracking-[0.04em] text-[var(--color-neutral-600)]">
      <div class="mx-auto flex min-h-9 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink :to="localePath('/')" class="inline-flex items-center gap-1.5 transition hover:text-[var(--color-text)]">
          <span aria-hidden="true">←</span> {{ t('singles.backToShop') }}
        </NuxtLink>
        <span class="hidden items-center gap-2 sm:inline-flex">
          <span class="inline-block h-[7px] w-[7px] rounded-full bg-[#3FB950]" />
          {{ t('singles.topNotice') }}
        </span>
        <span class="hidden md:inline">{{ t('nav.address') }}</span>
      </div>
    </div>

    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-[var(--color-divider)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div class="mx-auto flex min-h-[72px] w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink :to="localePath('/singelkort')" class="flex shrink-0 items-center gap-3" :aria-label="t('singles.title')">
          <img src="/images/logo/paper-wide.svg" alt="Butik Lyktan" class="h-8 w-auto sm:h-9">
          <span class="num text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">{{ t('singles.title') }}</span>
        </NuxtLink>

        <nav :aria-label="t('singles.title')" class="hidden items-center gap-1 sm:flex">
          <NuxtLink :to="localePath('/singelkort')" class="singles-nav-link" active-class="singles-nav-link-active">{{ t('singles.menuAll') }}</NuxtLink>
          <NuxtLink :to="localePath('/kontakt')" class="singles-nav-link" active-class="singles-nav-link-active">{{ t('singles.menuFindUs') }}</NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <NuxtLink :to="localePath('/')" class="btn btn-secondary !hidden !px-4 sm:!inline-flex">{{ t('singles.backToShop') }}</NuxtLink>
          <NuxtLink
            :to="localePath('/singelkort/kundkorg')"
            :aria-label="t('singles.cart.cartLabel', { count: cartQuantity, total: cartTotalLabel })"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 text-sm font-bold text-[var(--color-text)]"
            :style="route.path.endsWith('/kundkorg') ? 'box-shadow: inset 0 0 0 1px var(--color-accent)' : ''"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span class="num hidden sm:inline">{{ cartTotalLabel }}</span>
            <span
              v-if="cartQuantity"
              class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-xs font-extrabold text-[var(--color-bg)]"
            >{{ cartQuantity }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Mobil: menyn som egen rad -->
      <nav :aria-label="t('singles.title')" class="flex gap-1 border-t border-[var(--color-divider)] px-4 py-1.5 sm:hidden">
        <NuxtLink :to="localePath('/singelkort')" class="singles-nav-link" active-class="singles-nav-link-active">{{ t('singles.menuAll') }}</NuxtLink>
        <NuxtLink :to="localePath('/kontakt')" class="singles-nav-link" active-class="singles-nav-link-active">{{ t('singles.menuFindUs') }}</NuxtLink>
      </nav>
    </header>

    <slot />

    <transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
        style="background: var(--color-surface-3); border-color: var(--color-divider-2)"
        role="status"
      >
        <span>{{ toast }}</span>
        <NuxtLink :to="localePath('/singelkort/kundkorg')" class="shrink-0 font-bold" style="color: var(--color-accent)" @click="toast = ''">{{ t('singles.cart.viewCart') }}</NuxtLink>
      </div>
    </transition>

    <footer class="border-t border-[var(--color-divider)] bg-[#080A0E] text-[0.8rem] text-[var(--color-neutral-600)]">
      <div class="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <NuxtLink :to="localePath('/')" class="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)] transition hover:text-[var(--color-accent)]">
          <span aria-hidden="true">←</span> {{ t('singles.backToShop') }}
        </NuxtLink>
        <span>{{ t('nav.address') }} · hej@butiklyktan.se</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.singles-nav-link {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-neutral-600);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.singles-nav-link:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}
.singles-nav-link-active {
  color: var(--color-accent);
  background: var(--color-surface-2);
}
</style>
