import { recurringEvents } from '~/data/recurringEvents'
import specialEventsData from '~/data/specialEvents.json'

type EventEntry = {
  titel: string
  datum: string
  tid: string
  beskrivning: string
  kostnad: string
  produktHandle?: string
  visaIKarusell?: boolean
}

type EventSeries = {
  slug: string
  label: string
  description: string
  matches: (event: EventEntry) => boolean
}

const specialEvents = specialEventsData as EventEntry[]

const weekdayLabels = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

const eventSeriesList: EventSeries[] = [
  {
    slug: 'pokemon',
    label: 'Pokemon',
    description: 'Pokemon-event, spelkvällar och prereleases hos Butik Lyktan.',
    matches: (event) => /pokemon/i.test(event.titel)
  },
  {
    slug: 'riftbound',
    label: 'Riftbound',
    description: 'Riftbound-event och spelkvällar hos Butik Lyktan.',
    matches: (event) => /riftbound/i.test(event.titel)
  },
  {
    slug: 'magic',
    label: 'Magic',
    description: 'Magic-event som Friday Night Magic och Commander hos Butik Lyktan.',
    matches: (event) => /magic|commander/i.test(event.titel)
  },
  {
    slug: 'warhammer',
    label: 'Warhammer',
    description: 'Warhammer-kvällar och figurspelsevent hos Butik Lyktan.',
    matches: (event) => /warhammer/i.test(event.titel)
  },
  {
    slug: 'sorcery',
    label: 'Sorcery',
    description: 'Sorcery-kvällar och event hos Butik Lyktan.',
    matches: (event) => /sorcery/i.test(event.titel)
  },
  {
    slug: 'one-piece',
    label: 'One Piece',
    description: 'One Piece TCG-event hos Butik Lyktan.',
    matches: (event) => /one piece/i.test(event.titel)
  }
]

const toIsoDate = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')

const compareEvents = (left: EventEntry, right: EventEntry) =>
  left.datum === right.datum
    ? left.tid.localeCompare(right.tid, 'sv-SE')
    : left.datum.localeCompare(right.datum, 'sv-SE')

/**
 * Expands the recurring weekly rules into concrete dated occurrences for
 * a window starting at `fromDate`. This is what lets the schedule stay
 * "up to date" without anyone manually adding dates — it always looks
 * as far ahead as `days` from today.
 */
export const expandRecurringEvents = (fromDate = new Date(), days = 60): EventEntry[] => {
  const occurrences: EventEntry[] = []

  for (let offset = 0; offset < days; offset++) {
    const date = new Date(fromDate)
    date.setDate(date.getDate() + offset)
    const weekday = date.getDay()

    for (const rule of recurringEvents) {
      if (rule.weekday !== weekday) {
        continue
      }

      occurrences.push({
        titel: rule.titel,
        datum: toIsoDate(date),
        tid: rule.tid,
        beskrivning: rule.beskrivning,
        kostnad: rule.kostnad
      })
    }
  }

  return occurrences
}

/** The regular week at a glance, Monday through Sunday. */
export const getWeeklyPattern = () =>
  [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    label: weekdayLabels[weekday],
    events: recurringEvents
      .filter((rule) => rule.weekday === weekday)
      .sort((left, right) => left.tid.localeCompare(right.tid, 'sv-SE'))
  }))

/** Special (one-off) events on or after `fromDate`. */
export const getUpcomingSpecialEvents = (limit = 20, fromDate = new Date()) => {
  const fromIso = toIsoDate(fromDate)

  return specialEvents
    .filter((event) => event.datum >= fromIso)
    .sort(compareEvents)
    .slice(0, limit)
}

/** Recurring occurrences and special events on or after `fromDate`, merged and sorted. */
export const getUpcomingEvents = (limit = 20, fromDate = new Date(), windowDays = 60) => {
  const fromIso = toIsoDate(fromDate)
  const recurringOccurrences = expandRecurringEvents(fromDate, windowDays)
  const specials = specialEvents.filter((event) => event.datum >= fromIso)

  return [...recurringOccurrences, ...specials]
    .sort(compareEvents)
    .slice(0, limit)
}

export const isSpecialEvent = (event: EventEntry) =>
  specialEvents.some((special) => special.datum === event.datum && special.titel === event.titel)

/**
 * Special events flagged with `visaIKarusell: true` (and with a
 * `produktHandle` set, so there's something to link/fetch an image for),
 * on or after `fromDate`. Meant to be shown alongside the homepage's
 * regular hero slides, not instead of them.
 */
export const getCarouselEvents = (fromDate = new Date()) => {
  const fromIso = toIsoDate(fromDate)

  return specialEvents
    .filter((event) => event.visaIKarusell && event.produktHandle && event.datum >= fromIso)
    .sort(compareEvents)
}

export const getEventSeriesList = () => eventSeriesList

export const getEventSeriesBySlug = (slug: string) =>
  eventSeriesList.find((series) => series.slug === slug) ?? null

export const getPrimarySeriesForEvent = (event: EventEntry) =>
  eventSeriesList.find((series) => series.matches(event)) ?? null

export type { EventEntry, EventSeries }
