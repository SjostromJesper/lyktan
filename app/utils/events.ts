import event26 from '~/data/event26.json'

type EventEntry = {
  titel: string
  datum: string
  tid: string
  beskrivning: string
  kostnad: string
}

type EventMonthMap = Record<string, Record<string, EventEntry[]>>
type EventYearFile = {
  months: EventMonthMap
}

type EventSeries = {
  slug: string
  label: string
  description: string
  matches: (event: EventEntry) => boolean
}

const eventFilesByYear = new Map<string, EventYearFile>([
  ['26', event26 as EventYearFile]
])

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

export const getEventYearKey = (date = new Date()) => String(date.getFullYear()).slice(-2)

export const getEventFileForYear = (yearKey: string) => eventFilesByYear.get(yearKey) ?? null

export const getAllEventEntries = (yearKey: string) => {
  const file = getEventFileForYear(yearKey)

  if (!file) {
    return []
  }

  return Object.entries(file.months)
    .flatMap(([monthKey, days]) =>
      Object.entries(days).flatMap(([dayKey, events]) =>
        events.map((event) => ({
          ...event,
          monthKey,
          dayKey
        }))
      )
    )
    .sort((left, right) => {
      if (left.datum === right.datum) {
        return left.tid.localeCompare(right.tid, 'sv-SE')
      }

      return left.datum.localeCompare(right.datum, 'sv-SE')
    })
}

export const getMonthOptions = (yearKey: string) => {
  const file = getEventFileForYear(yearKey)

  if (!file) {
    return []
  }

  return Object.keys(file.months)
    .sort((left, right) => Number(left) - Number(right))
    .map((monthKey) => {
      const label = new Intl.DateTimeFormat('sv-SE', {
        month: 'long',
        year: 'numeric'
      }).format(new Date(2000 + Number(yearKey), Number(monthKey) - 1, 1))

      return {
        value: monthKey,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      }
    })
}

export const getEventsForMonth = (yearKey: string, monthKey: string) => {
  const file = getEventFileForYear(yearKey)
  const month = file?.months?.[monthKey] ?? {}

  return Object.keys(month)
    .sort((left, right) => Number(left) - Number(right))
    .map((dayKey) => ({
      dayKey,
      date: month[dayKey]?.[0]?.datum ?? `${2000 + Number(yearKey)}-${monthKey}-${dayKey}`,
      events: month[dayKey] ?? []
    }))
}

export const getUpcomingEvents = (limit = 4, fromDate = new Date()) => {
  const yearKey = getEventYearKey(fromDate)

  const fromIso = [
    fromDate.getFullYear(),
    String(fromDate.getMonth() + 1).padStart(2, '0'),
    String(fromDate.getDate()).padStart(2, '0')
  ].join('-')

  const entries = getAllEventEntries(yearKey)
    .filter((event) => event.datum >= fromIso)

  return entries.slice(0, limit)
}

export const getEventSeriesList = () => eventSeriesList

export const getEventSeriesBySlug = (slug: string) =>
  eventSeriesList.find((series) => series.slug === slug) ?? null

export const getPrimarySeriesForEvent = (event: EventEntry) =>
  eventSeriesList.find((series) => series.matches(event)) ?? null

export const getEventsForSeries = (yearKey: string, slug: string) => {
  const series = getEventSeriesBySlug(slug)

  if (!series) {
    return []
  }

  return getAllEventEntries(yearKey).filter((event) => series.matches(event))
}

export const getMonthOptionsForSeries = (yearKey: string, slug: string) => {
  const events = getEventsForSeries(yearKey, slug)
  const usedMonths = [...new Set(events.map((event) => event.monthKey))]

  return usedMonths.map((monthKey) => {
    const label = new Intl.DateTimeFormat('sv-SE', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(2000 + Number(yearKey), Number(monthKey) - 1, 1))

    return {
      value: monthKey,
      label: label.charAt(0).toUpperCase() + label.slice(1)
    }
  })
}

export const getEventsForSeriesMonth = (yearKey: string, slug: string, monthKey: string) => {
  const events = getEventsForSeries(yearKey, slug).filter((event) => event.monthKey === monthKey)
  const grouped = new Map<string, typeof events>()

  for (const event of events) {
    const existing = grouped.get(event.datum) ?? []
    existing.push(event)
    grouped.set(event.datum, existing)
  }

  return [...grouped.entries()].map(([date, dateEvents]) => ({
    date,
    events: dateEvents
  }))
}

export type { EventEntry, EventSeries }
