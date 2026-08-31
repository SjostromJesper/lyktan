<script setup lang="ts">
const { cartOpen, cartQuantity } = useShopifyCart()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-black/8 bg-white/90 backdrop-blur">
    <div class="page-shell flex min-h-[64px] items-center justify-between gap-6 px-4 sm:px-6">
      <NuxtLink to="/" class="text-[1.1rem] font-semibold tracking-[-0.01em] text-lyktan-ink">
        Butik Lyktan
      </NuxtLink>

      <nav aria-label="Huvudnavigation" class="hidden items-center gap-6 sm:flex">
        <NuxtLink to="/butik" class="text-[0.86rem] text-lyktan-mute transition hover:text-lyktan-ink">
          Butik
        </NuxtLink>
        <NuxtLink to="/events" class="text-[0.86rem] text-lyktan-mute transition hover:text-lyktan-ink">
          Event
        </NuxtLink>
        <NuxtLink to="/bordsbokning" class="text-[0.86rem] text-lyktan-mute transition hover:text-lyktan-ink">
          Boka bord
        </NuxtLink>
        <NuxtLink to="/kontakt" class="text-[0.86rem] text-lyktan-mute transition hover:text-lyktan-ink">
          Kontakt
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-1">
        <button type="button" aria-label="Sök" class="inline-grid h-9 w-9 place-items-center rounded-full text-lyktan-ink transition hover:bg-black/5">
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Öppna kundvagnen"
          class="relative inline-grid h-9 w-9 place-items-center rounded-full text-lyktan-ink transition hover:bg-black/5"
          @click="cartOpen = true"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="h-[18px] w-[18px]">
            <path
              d="M7 7V6a5 5 0 0 1 10 0v1h2.5a1 1 0 0 1 1 1.12l-1.2 10A2 2 0 0 1 17.31 20H6.69a2 2 0 0 1-1.99-1.88l-1.2-10A1 1 0 0 1 4.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
              fill="currentColor"
            />
          </svg>
          <span
            v-if="cartQuantity"
            class="absolute -right-0.5 -top-0.5 inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-lyktan-ink px-1 text-[0.6rem] font-semibold text-white"
          >
            {{ cartQuantity }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
