<script setup lang="ts">
const { t } = useI18n()

withDefaults(defineProps<{
  title?: string
  text?: string
  headingTag?: 'h1' | 'h2'
}>(), { headingTag: 'h2' })
</script>

<template>
  <section class="flex flex-col gap-3 rounded-[18px] border border-lyktan-line bg-white p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
    <span class="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#FFF1EA] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.07em] text-[#B83800]">
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-lyktan-brand motion-reduce:animate-none" />
      {{ t('underConstruction.eyebrow') }}
    </span>
    <div class="min-w-0">
      <component :is="headingTag" class="text-[1.05rem] font-semibold tracking-[-0.01em] text-lyktan-ink">
        {{ title || t('underConstruction.defaultTitle') }}
      </component>
      <p class="mt-1 text-sm leading-6 text-lyktan-mute">
        {{ text || t('underConstruction.defaultText') }}
      </p>
    </div>
  </section>
</template>
