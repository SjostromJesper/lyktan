<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { loadExistingCart } = useShopifyCart()

const shippingBannerDismissed = useState('shipping-banner-dismissed', () => false)

const { openStatus, groupedHours, startClock, stopClock } = useStoreHours()

onMounted(() => {
  loadExistingCart()
  startClock()
})

onBeforeUnmount(() => {
  stopClock()
})
</script>

<template>
  <div class="min-h-screen bg-lyktan-paper">
    <NuxtRouteAnnouncer />

    <!-- One slim info bar: open status left, shipping notice right -->
    <div class="border-b border-lyktan-line bg-lyktan-soft text-[0.76rem] text-lyktan-mute">
      <div class="page-shell flex min-h-9 flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-1.5 sm:justify-between sm:px-6">
        <span class="inline-flex items-center gap-2">
          <span
            class="inline-block h-2 w-2 rounded-full"
            :class="openStatus.isOpen ? 'bg-lyktan-go shadow-[0_0_0_3px_rgba(18,145,95,0.15)]' : 'bg-lyktan-mute/40'"
          />
          <span class="font-semibold text-lyktan-ink">{{ openStatus.label }}</span>
          <span>{{ openStatus.message }}</span>
        </span>
        <span v-if="!shippingBannerDismissed" class="inline-flex items-center gap-2">
          <span class="hidden h-1 w-1 rounded-full bg-lyktan-brand sm:inline-block" />
          <span>{{ t('layout.shippingNotice') }}</span>
          <button
            type="button"
            :aria-label="t('layout.dismissShippingNotice')"
            class="inline-grid h-6 w-6 place-items-center rounded-full text-sm text-lyktan-mute transition hover:bg-lyktan-line hover:text-lyktan-ink"
            @click="shippingBannerDismissed = true"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <SiteHeader />
    <CartDrawer />
    <NuxtPage />

    <footer class="mt-28 border-t border-lyktan-line bg-lyktan-soft">
      <!-- the category colours as a thin stripe -->
      <div class="grid h-1 grid-cols-4" aria-hidden="true">
        <span class="bg-cat-kort" /><span class="bg-cat-mini" /><span class="bg-cat-brad" /><span class="bg-cat-roll" />
      </div>

      <div class="page-shell grid gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] sm:px-6">
        <div class="space-y-4">
          <img src="/images/logo/ink-wide.svg" alt="Butik Lyktan" class="h-10 w-auto">
          <p class="max-w-xs text-sm leading-6 text-lyktan-mute">{{ t('home.seoDescription') }}</p>
        </div>

        <div class="space-y-2">
          <p class="eyebrow">{{ t('contact.address') }}</p>
          <p class="text-sm text-lyktan-ink">Veddestabron 8B<br>177 48 Järfälla</p>
          <a href="mailto:hej@butiklyktan.se" class="inline-block text-sm text-lyktan-ink underline decoration-lyktan-brand decoration-2 underline-offset-4 transition hover:text-lyktan-brand">hej@butiklyktan.se</a>
        </div>

        <div class="space-y-2">
          <p class="eyebrow">{{ t('nav.customerService') }}</p>
          <NuxtLink
            :to="localePath('/villkor')"
            class="block text-sm text-lyktan-ink underline decoration-lyktan-brand decoration-2 underline-offset-4 transition hover:text-lyktan-brand"
          >
            {{ t('nav.terms') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/kontakt')"
            class="block text-sm text-lyktan-mute transition hover:text-lyktan-ink"
          >
            {{ t('nav.contact') }}
          </NuxtLink>
        </div>

        <div class="space-y-2">
          <p class="eyebrow">{{ t('contact.openingHours') }}</p>
          <p
            v-for="group in groupedHours"
            :key="group.label"
            class="flex justify-between gap-4 text-sm"
            :class="group.isToday ? 'font-semibold text-lyktan-ink' : 'text-lyktan-mute'"
          >
            <span>{{ group.label }}</span>
            <span class="font-mono tabular-nums">{{ group.display }}</span>
          </p>
        </div>
      </div>

      <div class="border-t border-lyktan-line">
        <div class="page-shell flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p class="text-xs text-lyktan-mute">© Butik Lyktan · {{ t('nav.companyInfo') }}</p>
          <SocialLinks />
        </div>
      </div>
    </footer>
  </div>
</template>
