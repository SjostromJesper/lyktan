<script setup lang="ts">
import { getUpcomingSpecialEvents, getWeeklyPattern } from '~/utils/events'

const now = new Date()

const weeklyPattern = getWeeklyPattern()
const otherUpcomingEvents = getUpcomingSpecialEvents(20, now)

const formatEventDate = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

useSeoMeta({
  title: 'Event | Butik Lyktan',
  description: 'Spelkvällar nästan varje vardag och specialevent som prereleases hos Butik Lyktan i Järfälla.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-14">
      <div>
        <p class="eyebrow">Event</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Spelkvällar och event i butiken
        </h1>
      </div>

      <section>
        <h2 class="mt-2 text-[clamp(1.3rem,2.4vw,1.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Veckoschema
        </h2>

        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="day in weeklyPattern" :key="day.weekday" class="min-w-0 rounded-2xl border border-black/8 p-5">
            <p class="font-semibold text-lyktan-ink">{{ day.label }}</p>

            <ul v-if="day.events.length" class="mt-3 divide-y divide-black/8">
              <li v-for="event in day.events" :key="event.titel" class="py-3 first:pt-0 last:pb-0">
                <p class="text-sm font-medium text-lyktan-ink">{{ event.titel }}</p>
                <p class="mt-0.5 text-[0.8rem] text-lyktan-mute">{{ event.tid }} · {{ event.kostnad }}</p>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-lyktan-mute">Inga bokade event</p>
          </div>
        </div>
      </section>

      <section>
        <p class="eyebrow">Andra event</p>
        <h2 class="mt-2 text-[clamp(1.3rem,2.4vw,1.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Andra event som händer snart
        </h2>

        <ul v-if="otherUpcomingEvents.length" class="mt-6 w-full divide-y divide-black/8 rounded-2xl border border-black/8">
          <li
            v-for="(event, index) in otherUpcomingEvents"
            :key="`${event.datum}-${event.titel}-${index}`"
            class="flex flex-col gap-3 p-5 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <span class="w-28 shrink-0 text-sm text-lyktan-mute">{{ formatEventDate(event.datum) }}</span>
            <div class="flex-1">
              <p class="font-medium text-lyktan-ink">{{ event.titel }}</p>
              <p class="mt-1 text-sm leading-6 text-lyktan-mute">{{ event.beskrivning }}</p>
              <p class="mt-1 text-[0.8rem] text-lyktan-mute">{{ event.tid }} · {{ event.kostnad }}</p>
            </div>
            <NuxtLink
              v-if="event.produktHandle"
              :to="`/produkter/${event.produktHandle}`"
              class="secondary-cta shrink-0 !min-h-9 !text-[0.8rem]"
            >
              Boka din plats
            </NuxtLink>
          </li>
        </ul>

        <div v-else class="mt-6 w-full rounded-2xl bg-lyktan-surface p-8 text-center">
          <p class="eyebrow">Inga bokade specialevent just nu</p>
          <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            Kalendern uppdateras löpande — kika förbi igen snart.
          </h3>
        </div>
      </section>
    </div>
  </main>
</template>
