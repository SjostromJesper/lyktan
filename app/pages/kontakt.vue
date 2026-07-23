<script setup lang="ts">
const { openStatus, groupedHours } = useStoreHours()

const address = 'Veddestabron 8B, 177 48 Järfälla'
const mapQuery = encodeURIComponent(address)

useSeoMeta({
  title: 'Kontakt | Butik Lyktan',
  description: 'Besök Butik Lyktan på Veddestabron 8B i Järfälla, eller kontakta oss via e-post.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-10">
      <div>
        <p class="eyebrow">Kontakt</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Besök oss i butiken
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          Vi finns i Järfälla och hjälper gärna till med kortspel, miniatyrspel, brädspel och rollspel —
          både i butiken och via mejl.
        </p>
      </div>

      <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div class="space-y-8">
          <div>
            <span class="eyebrow">Adress</span>
            <p class="mt-2 text-lyktan-ink">Veddestabron 8B</p>
            <p class="text-lyktan-mute">177 48 Järfälla</p>
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${mapQuery}`"
              target="_blank"
              rel="noopener"
              class="secondary-cta mt-4 !inline-flex !min-h-10 !w-fit !px-4 !text-[0.82rem]"
            >
              Vägbeskrivning
            </a>
          </div>

          <div>
            <span class="eyebrow">E-post</span>
            <p class="mt-2">
              <a href="mailto:hej@butiklyktan.se" class="text-lyktan-ink transition hover:text-lyktan-accent">
                hej@butiklyktan.se
              </a>
            </p>
          </div>

          <div>
            <span class="eyebrow">Sociala medier</span>
            <div class="mt-2 -ml-2">
              <SocialLinks />
            </div>
          </div>

          <div>
            <span class="eyebrow">Öppettider</span>
            <div class="mt-2 space-y-1">
              <p
                v-for="group in groupedHours"
                :key="group.label"
                class="text-sm"
                :class="group.isToday ? 'font-medium text-lyktan-ink' : 'text-lyktan-mute'"
              >
                {{ group.label }} {{ group.display }}
              </p>
            </div>

            <p class="mt-3 flex items-center gap-2 text-sm">
              <span class="inline-block h-1.5 w-1.5 rounded-full" :class="openStatus.isOpen ? 'bg-emerald-500' : 'bg-black/25'" />
              <span class="font-medium text-lyktan-ink">{{ openStatus.label }}</span>
              <span class="text-lyktan-mute">· {{ openStatus.message }}</span>
            </p>
          </div>
        </div>

        <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-lyktan-surface lg:aspect-auto lg:min-h-[420px]">
          <iframe
            title="Karta till Butik Lyktan"
            :src="`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`"
            class="h-full w-full border-0"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  </main>
</template>
