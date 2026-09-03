<script setup lang="ts">
const { cartOpen, cartQuantity } = useShopifyCart()

const mobileMenuOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

const navLinks = [
  { to: '/butik', label: 'Butik' },
  { to: '/events', label: 'Event' },
  { to: '/bordsbokning', label: 'Boka bord' },
  { to: '/kontakt', label: 'Kontakt' }
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-black/8 bg-white/90 backdrop-blur">
    <div class="page-shell flex min-h-[64px] items-center justify-between gap-6 px-4 sm:px-6">
      <NuxtLink to="/" class="text-[1.1rem] font-semibold tracking-[-0.01em] text-lyktan-ink">
        Butik Lyktan
      </NuxtLink>

      <nav aria-label="Huvudnavigation" class="hidden items-center gap-6 sm:flex">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-[0.86rem] text-lyktan-mute transition hover:text-lyktan-ink"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-1">
        <button type="button" aria-label="Sök" class="hidden h-9 w-9 place-items-center rounded-full text-lyktan-ink transition hover:bg-black/5 sm:inline-grid">
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

        <button
          type="button"
          aria-label="Öppna meny"
          :aria-expanded="mobileMenuOpen"
          class="inline-grid h-9 w-9 place-items-center rounded-full text-lyktan-ink transition hover:bg-black/5 sm:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg v-if="!mobileMenuOpen" viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <nav
        v-if="mobileMenuOpen"
        aria-label="Mobilnavigation"
        class="border-t border-black/8 bg-white px-4 py-3 sm:hidden"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="block min-h-11 rounded-lg px-3 py-2.5 text-[0.95rem] text-lyktan-ink transition hover:bg-black/5"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </Transition>
  </header>
</template>
