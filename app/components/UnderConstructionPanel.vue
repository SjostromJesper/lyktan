<script setup lang="ts">
defineProps<{
  title?: string
  text?: string
}>()
</script>

<template>
  <section class="construction-card">
    <p class="eyebrow">Under konstruktion</p>
    <h1>{{ title || 'Sidan byggs om just nu.' }}</h1>
    <p>
      {{
        text ||
        'Vi öppnar fler delar av sajten snart. Just nu är Pokemon Chaos Rising-prereleasen det enda som är öppet.'
      }}
    </p>
  </section>
</template>

<style scoped>
.construction-card {
  border: 1px solid rgba(18, 18, 18, 0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, #fbfbfc, #f5f5f7);
  padding: 28px;
  box-shadow: 0 14px 34px rgba(24, 26, 32, 0.04);
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef6c2f;
}

h1,
p {
  margin: 0;
}

h1 {
  margin-top: 12px;
  font-size: clamp(1.9rem, 3.2vw, 3rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

p:last-child {
  margin-top: 14px;
  color: #666b73;
  line-height: 1.65;
}

@media (max-width: 720px) {
  .construction-card {
    padding: 22px;
  }
}
</style>
