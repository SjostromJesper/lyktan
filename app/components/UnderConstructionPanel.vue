<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  title?: string
  text?: string
}>()
</script>

<template>
  <section class="rounded-[10px] bg-lyktan-mint px-6 py-8 sm:px-8 sm:py-10">
    <p class="eyebrow !text-lyktan-go">{{ t('underConstruction.eyebrow') }}</p>
    <h1 class="mt-3 max-w-2xl text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
      {{ title || t('underConstruction.defaultTitle') }}
    </h1>
    <p class="mt-3 max-w-2xl text-sm leading-7 text-lyktan-ink/75 sm:text-base">
      {{ text || t('underConstruction.defaultText') }}
    </p>
  </section>
</template>
