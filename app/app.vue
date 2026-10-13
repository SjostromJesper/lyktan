<script setup lang="ts">
const { loadExistingCart } = useShopifyCart()
const { startClock, stopClock } = useStoreHours()

onMounted(() => {
  loadExistingCart()
  startClock()
})

onBeforeUnmount(() => {
  stopClock()
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
