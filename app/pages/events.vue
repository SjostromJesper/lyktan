<script setup lang="ts">
import { getUpcomingSpecialEvents, getWeeklyPattern, getPrimarySeriesForEvent } from '~/utils/events'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const now = new Date()
const todayWeekday = now.getDay()

const { data: recurringEvents } = await useRecurringEvents()
const weeklyPattern = computed(() => getWeeklyPattern(recurringEvents.value, (weekday) => t(`hours.weekday.${weekday}`)))
const { data: specialEvents } = await useSpecialEvents()
const upcomingSpecialEvents = computed(() => getUpcomingSpecialEvents(specialEvents.value ?? [], 6, now))

const eventTag = (event: { titel: string }) => getPrimarySeriesForEvent(event as any)?.label ?? t('events.genericTag')

const weekdayShort = (weekday: number) => {
  const label = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { weekday: 'short' }).format(new Date(2026, 0, 4 + weekday))
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

const formatCardDate = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return {
    day: new Intl.DateTimeFormat('sv-SE', { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { month: 'short' }).format(date).replace('.', '')
  }
}

useSeoMeta({
  title: 'Event | Butik Lyktan',
  description: () => t('events.seoDescription')
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-16">
      <section class="events-hero">
        <h1 class="events-hero-title">{{ t('nav.events') }}</h1>
        <p class="mt-2 max-w-md text-[1.05rem] text-white/80">{{ t('events.heroSubtitle') }}</p>
      </section>

      <section class="grid gap-5">
        <h2 class="section-title">{{ t('events.upcomingSpecialTitle') }}</h2>

        <div v-if="upcomingSpecialEvents.length" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div v-for="event in upcomingSpecialEvents" :key="`${event.datum}-${event.titel}`" class="special-event-card">
            <div class="flex items-center gap-4 sm:items-start">
              <div class="event-daybox">
                <span class="event-day">{{ formatCardDate(event.datum).day }}</span>
                <span class="event-month">{{ formatCardDate(event.datum).month }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <span class="event-tag">{{ eventTag(event) }}</span>
                <p class="mt-1.5 text-[1.1rem] font-extrabold leading-tight text-lyktan-ink">{{ event.titel }}</p>
                <p class="mt-1 text-sm text-lyktan-mute">{{ event.tid }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end">
              <span class="font-mono text-[1.05rem] font-extrabold text-lyktan-ink">{{ event.kostnad }}</span>
              <NuxtLink v-if="event.produktHandle" :to="localePath(`/produkter/${event.produktHandle}`)" class="primary-cta !min-h-11 !px-5 !text-[0.9rem]">
                {{ t('events.register') }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <div v-else class="rounded-[18px] border border-lyktan-line bg-lyktan-surface p-8 text-center">
          <p class="eyebrow">{{ t('events.noSpecialEvents') }}</p>
          <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">{{ t('events.calendarUpdates') }}</h3>
        </div>
      </section>

      <section class="grid gap-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 class="section-title">{{ t('events.weeklySchedule') }}</h2>
            <p class="mt-1.5 text-[0.95rem] text-lyktan-mute-2">{{ t('events.weeklyScheduleText') }}</p>
          </div>
          <a href="https://discord.gg/r8RS4N6cqQ" target="_blank" rel="noopener noreferrer" class="secondary-cta !min-h-[46px]">
            {{ t('events.discordCta') }}
          </a>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <div
            v-for="day in weeklyPattern"
            :key="day.weekday"
            class="week-day-card"
            :class="day.weekday === todayWeekday ? 'week-day-card-today' : ''"
          >
            <div class="flex items-center justify-between">
              <span class="week-day-label">{{ day.label }}</span>
              <span v-if="day.weekday === todayWeekday" class="today-badge">{{ t('events.todayBadge') }}</span>
            </div>

            <div v-for="item in day.events" :key="item.titel" class="week-event-item">
              <span class="week-event-time">{{ item.tid }}</span>
              <span class="week-event-name">{{ item.titel }}</span>
              <span v-if="item.kostnad" class="week-event-price">{{ item.kostnad }}</span>
            </div>

            <div v-if="!day.events.length" class="week-event-empty">
              <span>{{ t('events.noFixedEvents') }}</span>
              <NuxtLink :to="localePath('/bordsbokning')">{{ t('nav.booking') }} →</NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.events-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  padding: 32px 24px;
  border-radius: 24px;
  background: var(--color-navy);
  text-align: center;
}
.events-hero-title {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: #fff;
}

.special-event-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  border: 2px solid var(--color-lyktan-line);
}
@media (min-width: 640px) {
  .special-event-card {
    flex-direction: row;
    align-items: center;
  }
}
.event-daybox {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 84px;
  border-radius: 18px;
  background: var(--color-navy);
  color: #fff;
}
.event-day {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
}
.event-month {
  margin-top: 2px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lyktan-brand);
}
.event-tag {
  display: inline-flex;
  border-radius: 12px;
  background: var(--color-lyktan-soft);
  padding: 4px 10px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-lyktan-accent);
}

.week-day-card {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 20px;
  background: var(--color-lyktan-well);
  border: 2px solid var(--color-lyktan-well);
}
.week-day-card-today {
  background: var(--color-lyktan-soft);
  border-color: var(--color-lyktan-brand);
}
.week-day-label {
  font-size: 0.88rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-lyktan-ink);
}
.today-badge {
  border-radius: 10px;
  background: var(--color-lyktan-brand);
  padding: 3px 8px;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-navy);
}
.week-event-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--color-lyktan-line);
}
.week-event-time {
  align-self: flex-start;
  border-radius: 8px;
  background: var(--color-navy);
  padding: 3px 8px;
  font-size: 0.7rem;
  font-weight: 800;
  color: #fff;
}
.week-event-name {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--color-lyktan-ink);
}
.week-event-price {
  font-size: 0.8rem;
  color: var(--color-lyktan-mute);
}
.week-event-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  border: 1px dashed var(--color-lyktan-line);
  font-size: 0.8rem;
  color: var(--color-lyktan-mute);
  line-height: 1.4;
}
.week-event-empty a {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--color-lyktan-accent);
}
</style>
