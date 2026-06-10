<script setup lang="ts">
useSeoMeta({
  title: 'Event | Butik Lyktan',
  description: 'Eventsidan ar tillfalligt under konstruktion.'
})
</script>

<template>
  <main class="locked-page">
    <section class="locked-shell">
      <UnderConstructionPanel
        title="Det här eventet är tillfälligt stängt."
        text="Just nu är det bara Magic: The Gathering - Marvel-prereleasen som är öppen på sajten."
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
