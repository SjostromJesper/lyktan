<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { bannerOpen, choose } = useConsent()
</script>

<template>
  <section
    v-if="bannerOpen"
    role="dialog"
    aria-live="polite"
    :aria-label="t('consent.title')"
    class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[620px] rounded-[18px] border border-lyktan-line bg-white p-5 shadow-[0_18px_50px_-12px_rgba(21,23,28,0.35)] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0"
  >
    <h2 class="text-[1rem] font-semibold text-lyktan-ink">{{ t('consent.title') }}</h2>
    <p class="mt-1.5 text-[0.88rem] leading-6 text-lyktan-mute-2">
      {{ t('consent.text') }}
      <NuxtLink :to="localePath('/villkor')" class="underline underline-offset-2 hover:text-lyktan-accent">{{ t('consent.more') }}</NuxtLink>
    </p>
    <div class="mt-4 grid grid-cols-2 gap-2.5">
      <button type="button" class="secondary-cta" @click="choose('denied')">{{ t('consent.decline') }}</button>
      <button type="button" class="primary-cta" @click="choose('granted')">{{ t('consent.accept') }}</button>
    </div>
  </section>
</template>
