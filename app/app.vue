<template>
  <div>
    <NuxtRouteAnnouncer />
    <div class="shipping-banner">
      Frakt är inte tillgängligt just nu.
    </div>
    <SiteHeader />
    <CartDrawer />
    <NuxtPage />
  </div>
</template>

<style scoped>
.shipping-banner {
  min-height: 38px;
  display: grid;
  place-items: center;
  padding: 8px 16px;
  background: #ef6c2f;
  color: white;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
}
</style>
