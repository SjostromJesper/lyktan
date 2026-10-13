<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { groupedHours } = useStoreHours()
</script>

<template>
  <footer class="mt-28 bg-navy text-white">
    <div class="grid h-1 grid-cols-4" aria-hidden="true">
      <span class="bg-cat-kort" /><span class="bg-cat-mini" /><span class="bg-cat-brad" /><span class="bg-cat-roll" />
    </div>

    <div class="page-shell grid gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] sm:px-6">
      <div class="space-y-4">
        <img src="/images/logo/paper-wide.svg" alt="Butik Lyktan" class="h-10 w-auto">
        <p class="max-w-xs text-sm leading-6 text-white/70">{{ t('home.seoDescription') }}</p>
      </div>

      <div class="space-y-2">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.07em] text-white/60">{{ t('contact.address') }}</p>
        <p class="text-sm text-white/90">Veddestabron 8B<br>177 48 Järfälla</p>
        <a href="mailto:hej@butiklyktan.se" class="inline-block text-sm text-lyktan-brand underline decoration-2 underline-offset-4 transition hover:text-white">hej@butiklyktan.se</a>
      </div>

      <div class="space-y-2">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.07em] text-white/60">{{ t('nav.customerService') }}</p>
        <NuxtLink :to="localePath('/villkor')" class="block text-sm text-lyktan-brand underline decoration-2 underline-offset-4 transition hover:text-white">
          {{ t('nav.terms') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/kontakt')" class="block text-sm text-white/80 transition hover:text-white">
          {{ t('nav.contact') }}
        </NuxtLink>
      </div>

      <div class="space-y-2">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.07em] text-white/60">{{ t('contact.openingHours') }}</p>
        <p
          v-for="group in groupedHours"
          :key="group.label"
          class="flex justify-between gap-4 text-sm"
          :class="group.isToday ? 'font-semibold text-white' : 'text-white/70'"
        >
          <span>{{ group.label }}</span>
          <span class="font-mono tabular-nums">{{ group.display }}</span>
        </p>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="page-shell flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p class="text-xs text-white/60">© Butik Lyktan · {{ t('nav.companyInfo') }}</p>
        <SocialLinks variant="dark" />
      </div>
    </div>
  </footer>
</template>
