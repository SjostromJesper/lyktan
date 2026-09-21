<script setup lang="ts">
const { t } = useI18n()
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

    <div class="flex min-h-8 items-center justify-center gap-2 bg-lyktan-felt px-4 text-center text-[0.76rem] text-lyktan-sage">
      <span class="inline-block h-1.5 w-1.5 rounded-full" :class="openStatus.isOpen ? 'bg-[#5BD69A] shadow-[0_0_0_3px_rgba(91,214,154,0.2)]' : 'bg-white/30'" />
      <span class="font-medium text-lyktan-cream">{{ openStatus.label }}</span>
      <span>·</span>
      <span>{{ openStatus.message }}</span>
    </div>

    <div
      v-if="!shippingBannerDismissed"
      class="relative flex min-h-8 items-center justify-center border-b border-lyktan-line bg-lyktan-well px-4 pr-12 text-center text-[0.76rem] text-lyktan-ink"
    >
      <span>{{ t('layout.shippingNotice') }}</span>
      <button
        type="button"
        :aria-label="t('layout.dismissShippingNotice')"
        class="absolute right-2 top-1/2 inline-grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[7px] text-base text-lyktan-mute hover:bg-black/5"
        @click="shippingBannerDismissed = true"
      >
        ×
      </button>
    </div>

    <SiteHeader />
    <CartDrawer />
    <NuxtPage />

    <footer class="mt-24 bg-lyktan-felt text-lyktan-cream">
      <div class="page-shell flex flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div class="space-y-2">
          <img src="/images/logo/paper-wide.svg" alt="Butik Lyktan" class="h-9 w-auto">
          <p class="pt-2 text-sm text-lyktan-sage">Veddestabron 8B, 177 48 Järfälla</p>
          <a href="mailto:hej@butiklyktan.se" class="block text-sm text-lyktan-sage transition hover:text-lyktan-brand">hej@butiklyktan.se</a>
        </div>

        <div class="space-y-1">
          <p
            v-for="group in groupedHours"
            :key="group.label"
            class="text-sm"
            :class="group.isToday ? 'font-medium text-lyktan-cream' : 'text-lyktan-sage'"
          >
            {{ group.label }} {{ group.display }}
          </p>
        </div>
      </div>

      <div class="border-t border-lyktan-felt-line">
        <div class="page-shell flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p class="text-xs text-lyktan-sage">© Butik Lyktan</p>
          <SocialLinks variant="dark" />
        </div>
      </div>
    </footer>
  </div>
</template>
