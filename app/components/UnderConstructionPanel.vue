<script setup lang="ts">
defineProps<{
  title?: string
  text?: string
}>()
</script>

<template>
  <section class="rounded-2xl bg-lyktan-surface px-6 py-8 sm:px-8 sm:py-10">
    <p class="eyebrow">Under konstruktion</p>
    <h1 class="mt-3 max-w-2xl text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
      {{ title || 'Sidan byggs om just nu.' }}
    </h1>
    <p class="mt-3 max-w-2xl text-sm leading-7 text-lyktan-mute sm:text-base">
      {{
        text ||
        'Vi öppnar fler delar av sajten snart. Just nu är Magic: The Gathering - Marvel-prereleasen det enda som är öppet.'
      }}
    </p>
  </section>
</template>
