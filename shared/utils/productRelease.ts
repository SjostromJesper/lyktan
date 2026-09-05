import { getStockholmTodayIso } from './bookingSlots'

/** How many days after its release date a product still counts as "new". */
export const NEW_RELEASE_WINDOW_DAYS = 30

/** True if the product's release date is in the future — not sellable yet, only signup-able. */
export const isUpcomingRelease = (releaseDate: string | null | undefined): boolean => {
  if (!releaseDate) return false
  return releaseDate > getStockholmTodayIso()
}

/** True if the product released recently enough to still show a "Nyhet" badge. */
export const isRecentRelease = (releaseDate: string | null | undefined): boolean => {
  if (!releaseDate || isUpcomingRelease(releaseDate)) return false

  const today = getStockholmTodayIso()
  const diffDays = (Date.parse(today) - Date.parse(releaseDate)) / (1000 * 60 * 60 * 24)

  return diffDays <= NEW_RELEASE_WINDOW_DAYS
}

/** Formats an ISO date (YYYY-MM-DD) as e.g. "12 september 2026" for display. */
export const formatReleaseDate = (releaseDate: string): string =>
  new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${releaseDate}T00:00:00`))
