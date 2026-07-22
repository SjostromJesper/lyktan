<script setup lang="ts">
const {
  cart,
  cartBusy,
  cartError,
  cartNotice,
  cartOpen,
  cartItems,
  cartQuantity,
  checkoutUrl,
  formatMoney,
  updateLineQuantity
} = useShopifyCart()
</script>

<template>
  <div>
    <transition name="fade">
      <button
        v-if="cartOpen"
        type="button"
        class="fixed inset-0 z-[89] border-0 bg-black/30"
        aria-label="Stäng kundvagnen"
        @click="cartOpen = false"
      />
    </transition>

    <aside
      class="fixed right-0 top-0 z-[90] flex h-screen w-full max-w-[400px] flex-col gap-4 bg-white p-6 shadow-[-8px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out"
      :class="cartOpen ? 'translate-x-0' : 'translate-x-full'"
      aria-label="Kundvagn"
    >
      <div class="flex shrink-0 items-start justify-between gap-3">
        <h2 class="text-[1.15rem] font-semibold tracking-[-0.01em] text-lyktan-ink">Kundvagn</h2>
        <button type="button" aria-label="Stäng" class="inline-grid h-8 w-8 place-items-center rounded-full text-lyktan-mute hover:bg-black/5 hover:text-lyktan-ink" @click="cartOpen = false">
          ×
        </button>
      </div>

      <p v-if="cartNotice" class="shrink-0 text-sm text-lyktan-mute">{{ cartNotice }}</p>
      <p v-if="cartError" class="shrink-0 text-sm text-rose-600">{{ cartError }}</p>

      <div v-if="cartItems.length" class="grid flex-1 content-start gap-5 overflow-auto pr-1">
        <article
          v-for="line in cartItems"
          :key="line.id"
          class="grid grid-cols-[64px_1fr_auto] items-center gap-4"
        >
          <div class="h-16 w-16 overflow-hidden rounded-lg bg-lyktan-surface">
            <img
              v-if="line.merchandise?.product?.featuredImage?.url"
              :src="line.merchandise.product.featuredImage.url"
              :alt="line.merchandise.product.featuredImage.altText || line.merchandise?.product?.title"
              class="h-full w-full object-cover"
            >
            <div v-else class="grid h-full w-full place-items-center text-sm font-semibold text-lyktan-mute">
              {{ line.merchandise?.product?.title?.slice(0, 2).toUpperCase() }}
            </div>
          </div>

          <div class="grid gap-0.5">
            <strong class="text-[0.9rem] font-medium leading-tight text-lyktan-ink">{{ line.merchandise?.product?.title }}</strong>
            <span class="text-[0.82rem] text-lyktan-mute">{{ line.merchandise?.title }}</span>
            <span class="text-[0.82rem] text-lyktan-mute">{{ formatMoney(line.merchandise?.price?.amount, line.merchandise?.price?.currencyCode) }}</span>
          </div>

          <div class="inline-flex items-center gap-3">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-full text-sm text-lyktan-ink transition hover:bg-black/5 disabled:opacity-40"
              :disabled="cartBusy"
              @click="updateLineQuantity(line.id, line.quantity - 1)"
            >
              −
            </button>
            <span class="min-w-3 text-center text-sm">{{ line.quantity }}</span>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-full text-sm text-lyktan-ink transition hover:bg-black/5 disabled:opacity-40"
              :disabled="cartBusy"
              @click="updateLineQuantity(line.id, line.quantity + 1)"
            >
              +
            </button>
          </div>
        </article>
      </div>

      <div v-else class="grid flex-1 place-items-center py-10 text-center">
        <p class="text-sm text-lyktan-mute">Kundvagnen är tom.</p>
      </div>

      <div class="grid shrink-0 gap-3 border-t border-black/8 pt-4">
        <div class="flex items-start justify-between gap-3">
          <span class="text-sm text-lyktan-mute">Subtotal</span>
          <strong v-if="cart?.cost?.subtotalAmount" class="text-[1.05rem] font-semibold text-lyktan-ink">
            {{ formatMoney(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode) }}
          </strong>
          <strong v-else class="text-[1.05rem] font-semibold text-lyktan-ink">{{ formatMoney('0', 'SEK') }}</strong>
        </div>

        <a v-if="checkoutUrl" :href="checkoutUrl" class="primary-cta w-full">
          Gå till betalning
        </a>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
