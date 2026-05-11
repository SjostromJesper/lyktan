<script setup lang="ts">
const { cartOpen, cartQuantity } = useShopifyCart()
</script>

<template>
  <header class="site-header">
    <div class="header-shell">
      <NuxtLink to="/" class="brand">
<!--        <span class="brand-mark" aria-hidden="true"></span>-->
        <span class="brand-copy">
          <span class="brand-title">Butik Lyktan</span>
        </span>
      </NuxtLink>

      <div class="header-actions">
        <span class="status-badge">Sidan är under konstruktion</span>

        <button type="button" class="cart-button" aria-label="Öppna kundvagnen" @click="cartOpen = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 7V6a5 5 0 0 1 10 0v1h2.5a1 1 0 0 1 1 1.12l-1.2 10A2 2 0 0 1 17.31 20H6.69a2 2 0 0 1-1.99-1.88l-1.2-10A1 1 0 0 1 4.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
              fill="currentColor"
            />
          </svg>
          <span v-if="cartQuantity" class="cart-badge">{{ cartQuantity }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
:global(a) {
  color: inherit;
  text-decoration: none;
}

:global(button) {
  font: inherit;
}

.site-header {
  position: relative;
  z-index: 40;
  width: 100%;
  border-bottom: 1px solid rgba(17, 24, 39, 0.09);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 248, 250, 0.98));
  color: #111111;
  backdrop-filter: blur(14px);
}

.header-shell {
  width: min(1280px, calc(100% - 32px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-height: 82px;
  padding: 0 6px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #ef6c2f;
  flex-shrink: 0;
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.brand-subtitle {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(17, 17, 17, 0.48);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1;
}

.status-badge {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #f7f7f8;
  color: #4a4f58;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cart-button {
  position: relative;
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 8px;
  background: #ffffff;
  color: #111111;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.cart-button:hover {
  background: #faf7f4;
  border-color: rgba(239, 108, 47, 0.35);
}

.cart-button svg {
  width: 20px;
  height: 20px;
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #ef6c2f;
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
}

@media (max-width: 760px) {
  .header-shell {
    width: min(100% - 24px, 1280px);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    padding: 14px 0;
  }

  .header-actions {
    gap: 10px;
  }

  .brand-subtitle {
    display: none;
  }
}
</style>
