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
    <button type="button" class="cart-fab" @click="cartOpen = true">
      <span class="cart-fab-label">Kundvagn</span>
      <span class="cart-fab-count">{{ cartQuantity }}</span>
    </button>

    <transition name="fade">
      <button
        v-if="cartOpen"
        type="button"
        class="drawer-backdrop"
        aria-label="Stäng kundvagnen"
        @click="cartOpen = false"
      />
    </transition>

    <aside class="cart-drawer" :class="{ 'cart-drawer-open': cartOpen }" aria-label="Kundvagn">
      <div class="drawer-head">
        <div>
          <p class="card-label">Kundvagn</p>
          <h2>{{ cartQuantity }} varor</h2>
        </div>
        <button type="button" class="drawer-close" @click="cartOpen = false">Stäng</button>
      </div>

      <p v-if="cartNotice" class="cart-notice">{{ cartNotice }}</p>
      <p v-if="cartError" class="cart-error">{{ cartError }}</p>

      <div v-if="cartItems.length" class="drawer-lines">
        <article v-for="line in cartItems" :key="line.id" class="drawer-line">
          <div class="drawer-line-image">
            <img
              v-if="line.merchandise?.product?.featuredImage?.url"
              :src="line.merchandise.product.featuredImage.url"
              :alt="line.merchandise.product.featuredImage.altText || line.merchandise?.product?.title"
            >
            <div v-else class="drawer-line-fallback">
              {{ line.merchandise?.product?.title?.slice(0, 2).toUpperCase() }}
            </div>
          </div>

          <div class="drawer-line-copy">
            <strong>{{ line.merchandise?.product?.title }}</strong>
            <span>{{ line.merchandise?.title }}</span>
            <span>{{ formatMoney(line.merchandise?.price?.amount, line.merchandise?.price?.currencyCode) }}</span>
          </div>

          <div class="quantity-controls">
            <button type="button" :disabled="cartBusy" @click="updateLineQuantity(line.id, line.quantity - 1)">-</button>
            <span>{{ line.quantity }}</span>
            <button type="button" :disabled="cartBusy" @click="updateLineQuantity(line.id, line.quantity + 1)">+</button>
          </div>
        </article>
      </div>

      <div v-else class="drawer-empty">
        <p class="cart-empty">Kundvagnen är tom.</p>
      </div>

      <div class="drawer-footer">
        <div class="drawer-summary">
          <span>Subtotal</span>
          <strong v-if="cart?.cost?.subtotalAmount">
            {{ formatMoney(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode) }}
          </strong>
          <strong v-else>{{ formatMoney('0', 'SEK') }}</strong>
        </div>

        <a v-if="checkoutUrl" class="checkout-button" :href="checkoutUrl">
          Gå till betalning
        </a>
      </div>
    </aside>
  </div>
</template>

<style scoped>
:global(button) {
  font: inherit;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

.cart-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 0 14px 0 18px;
  border: 0;
  border-radius: 999px;
  color: white;
  background: #171717;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}

.cart-fab-label {
  font-weight: 700;
}

.cart-fab-count {
  min-width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #ef6c2f;
  font-weight: 800;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  border: 0;
  background: rgba(20, 18, 16, 0.4);
}

.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 50;
  width: min(420px, 100vw);
  height: 100vh;
  padding: 20px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 14px;
  border-left: 1px solid rgba(23, 23, 23, 0.08);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  box-shadow: -24px 0 60px rgba(20, 24, 22, 0.12);
  transform: translateX(100%);
  transition: transform 220ms ease;
}

.cart-drawer-open {
  transform: translateX(0);
}

.drawer-head,
.drawer-summary {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.card-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #ef6c2f;
}

h2,
p {
  margin: 0;
}

h2 {
  margin-top: 10px;
  font-size: 2rem;
  line-height: 1;
}

.drawer-close,
.quantity-controls button,
.checkout-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  max-height: 42px;
  align-self: end;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(23, 23, 23, 0.08);
  background: white;
  font-weight: 700;
}

.drawer-close,
.quantity-controls button {
  cursor: pointer;
}

.drawer-lines {
  display: grid;
  align-content: start;
  gap: 12px;
  overflow: auto;
  padding-right: 4px;
}

.drawer-line {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(23, 23, 23, 0.08);
  border-radius: 20px;
  background: white;
}

.drawer-line-image {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(135deg, #f6ede5, #ebe3da);
}

.drawer-line-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.drawer-line-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ef6c2f;
}

.drawer-line-copy {
  display: grid;
  gap: 4px;
}

.drawer-line-copy strong {
  font-size: 0.98rem;
}

.drawer-line-copy span {
  color: #616460;
  font-size: 0.92rem;
}

.quantity-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.quantity-controls button {
  min-width: 42px;
  padding: 0;
}

.cart-notice {
  color: #0d8f6f;
  font-weight: 600;
}

.cart-error {
  color: #b93b30;
  font-weight: 600;
}

.drawer-empty {
  display: grid;
  place-items: center;
  border: 1px dashed rgba(23, 23, 23, 0.12);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.7);
  padding: 20px;
  text-align: center;
}

.cart-empty {
  color: #616460;
  line-height: 1.6;
}

.drawer-footer {
  display: grid;
  gap: 14px;
  padding-top: 8px;
  border-top: 1px solid rgba(23, 23, 23, 0.08);
}

.checkout-button {
  width: 100%;
  color: white;
  border-color: transparent;
  background: linear-gradient(135deg, #ef6c2f, #ff8b55);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .cart-fab {
    right: 12px;
    bottom: 12px;
  }

  .cart-drawer {
    width: 100vw;
  }

  .drawer-line {
    grid-template-columns: 1fr;
  }
}
</style>
