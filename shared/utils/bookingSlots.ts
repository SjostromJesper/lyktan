import { openingHours } from './openingHours'

export const SLOT_INTERVAL_HOURS = 2

/** A booking holds its table for up to this long, unless something else on the same table starts sooner. */
export const BOOKING_MAX_DURATION_HOURS = 4

/** How long an unpaid ("pending") booking holds its table before it's treated as abandoned. */
export const PENDING_BOOKING_HOLD_MINUTES = 20

/** Today's date in the shop's own timezone, as YYYY-MM-DD. */
export const getStockholmTodayIso = (): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

const getWeekdayForIsoDate = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number)
  // Date.UTC avoids the server/client-local-timezone shift that plain
  // `new Date(isoDate)` + getDay() is prone to near midnight.
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Bookable time slots (e.g. "10:00") for a given YYYY-MM-DD date, derived from opening hours. */
export const getSlotsForDate = (isoDate: string): string[] => {
  const schedule = openingHours.find((entry) => entry.key === getWeekdayForIsoDate(isoDate))

  if (!schedule) {
    return []
  }

  const slots: string[] = []

  for (let hour = schedule.open; hour < schedule.close; hour += SLOT_INTERVAL_HOURS) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }

  return slots
}

export const isPastIsoDate = (isoDate: string): boolean => isoDate < getStockholmTodayIso()

/** Adds whole hours to a "HH:MM" time string, capped at 23:xx. */
export const addHours = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + hours * 60
  const cappedHour = Math.min(23, Math.floor(total / 60))
  return `${String(cappedHour).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Closing time (e.g. "19:00") for a given YYYY-MM-DD date, or null if closed. */
export const getClosingTimeForDate = (isoDate: string): string | null => {
  const schedule = openingHours.find((entry) => entry.key === getWeekdayForIsoDate(isoDate))
  return schedule ? `${String(schedule.close).padStart(2, '0')}:00` : null
}
