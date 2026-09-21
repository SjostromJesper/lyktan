<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Event | Butik Lyktan',
  description: () => t('events.slugSeoDescription')
})
</script>

<template>
  <main class="locked-page">
    <section class="locked-shell">
      <UnderConstructionPanel
        :title="t('events.slugTitle')"
        :text="t('events.slugText')"
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
