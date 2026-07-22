<script setup lang="ts">
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

    <div class="flex min-h-8 items-center justify-center gap-2 bg-lyktan-surface px-4 text-center text-[0.76rem] text-lyktan-mute">
      <span class="inline-block h-1.5 w-1.5 rounded-full" :class="openStatus.isOpen ? 'bg-emerald-500' : 'bg-black/25'" />
      <span class="font-medium text-lyktan-ink">{{ openStatus.label }}</span>
      <span>·</span>
      <span>{{ openStatus.message }}</span>
    </div>

    <div
      v-if="!shippingBannerDismissed"
      class="relative flex min-h-8 items-center justify-center border-b border-black/6 px-4 pr-12 text-center text-[0.76rem] text-lyktan-mute"
    >
      <span>Frakt är inte tillgängligt just nu. Det går enbart att hämta ut produkter i butiken.</span>
      <button
        type="button"
        aria-label="Stäng fraktmeddelande"
        class="absolute right-2 top-1/2 inline-grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-base text-lyktan-mute hover:bg-black/5"
        @click="shippingBannerDismissed = true"
      >
        ×
      </button>
    </div>

    <SiteHeader />
    <CartDrawer />
    <NuxtPage />

    <footer class="mt-24 border-t border-black/8 bg-lyktan-surface">
      <div class="page-shell flex flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div class="space-y-1">
          <p class="font-semibold text-lyktan-ink">Butik Lyktan</p>
          <p class="text-sm text-lyktan-mute">Veddestabron 8B, 177 48 Järfälla</p>
          <p class="text-sm text-lyktan-mute">hej@butiklyktan.se</p>
        </div>

        <div class="space-y-1">
          <p
            v-for="group in groupedHours"
            :key="group.label"
            class="text-sm"
            :class="group.isToday ? 'font-medium text-lyktan-ink' : 'text-lyktan-mute'"
          >
            {{ group.label }} {{ group.display }}
          </p>
        </div>
      </div>

      <div class="border-t border-black/8">
        <p class="page-shell px-4 py-4 text-xs text-lyktan-mute sm:px-6">© Butik Lyktan</p>
      </div>
    </footer>
  </div>
</template>
