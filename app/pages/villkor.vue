<script setup lang="ts">
const { t, tm, rt } = useI18n()

type TermsSection = { heading: string, body: string[] }

const sections = computed<TermsSection[]>(() =>
  (tm('terms.sections') as any[]).map(section => ({
    heading: rt(section.heading),
    body: (section.body as any[]).map(paragraph => rt(paragraph))
  }))
)

useSeoMeta({
  title: () => `${t('terms.title')} | Butik Lyktan`,
  description: () => t('terms.seoDescription')
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-10">
      <div>
        <p class="eyebrow">{{ t('nav.customerService') }}</p>
        <h1 class="mt-2 page-title">
          {{ t('terms.title') }}
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          {{ t('terms.intro') }}
        </p>
        <p class="mt-2 text-xs text-lyktan-mute">
          {{ t('terms.updated') }}
        </p>
      </div>

      <div class="grid max-w-2xl gap-10">
        <section v-for="section in sections" :key="section.heading">
          <h2 class="section-title">
            {{ section.heading }}
          </h2>
          <p
            v-for="(paragraph, index) in section.body"
            :key="index"
            class="mt-3 text-sm leading-7 text-lyktan-mute"
          >
            {{ paragraph }}
          </p>
        </section>
      </div>
    </div>
  </main>
</template>
