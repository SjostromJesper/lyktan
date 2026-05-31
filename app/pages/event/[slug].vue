<script setup lang="ts">
useSeoMeta({
  title: 'Event | Butik Lyktan',
  description: 'Eventsidorna ar tillfalligt under konstruktion.'
})
</script>

<template>
  <main class="locked-page">
    <section class="locked-shell">
      <UnderConstructionPanel
        title="Den här eventsidan öppnar snart."
        text="Vi finslipar eventsidorna just nu. Just nu är det bara One Piece-prereleasen som är öppen på sajten."
      />
    </section>
  </main>
</template>

<style scoped>
.locked-page {
  min-height: 100vh;
  padding: 18px 16px 48px;
}

.locked-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
}
</style>
