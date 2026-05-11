<script setup lang="ts">
useSeoMeta({
  title: 'Butik | Butik Lyktan',
  description: 'Butikssidan ar tillfalligt under konstruktion.'
})
</script>

<template>
  <main class="locked-page">
    <section class="locked-shell">
      <UnderConstructionPanel
        title="Butiken byggs färdigt just nu."
        text="Vi öppnar hela webbshoppen snart. Just nu är det bara Pokemon Chaos Rising-prereleasen som är öppen för köp."
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
