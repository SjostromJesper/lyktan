<script setup lang="ts">
useSeoMeta({
  title: 'Kontakt | Butik Lyktan',
  description: 'Kontaktsidan ar tillfalligt under konstruktion.'
})
</script>

<template>
  <main class="locked-page">
    <section class="locked-shell">
      <UnderConstructionPanel
        title="Kontaktsidan öppnar snart."
        text="Vi bygger klart sajten just nu. Just nu är det bara Magic: The Gathering - Marvel-prereleasen som är öppen."
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
