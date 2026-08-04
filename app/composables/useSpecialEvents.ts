import type { EventEntry } from '~/utils/events'

const specialEventsQuery = `#graphql
  query SpecialEvents {
    products(first: 20, sortKey: TITLE, query: "tag:event") {
      nodes {
        title
        handle
        description
        featuredImage {
          url
          altText
        }
        dateAndTime: metafield(namespace: "custom", key: "date_and_time") {
          value
        }
        showInCarousel: metafield(namespace: "custom", key: "show_in_carousel") {
          value
        }
      }
    }
  }
`

/**
 * date_and_time is Shopify's combined "Date and time" metafield type — it
 * comes back as a single ISO timestamp, so it's split into the datum/tid
 * shape the rest of the site expects, rendered in the shop's local time.
 */
const splitDateAndTime = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const datum = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

  const tid = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)

  return { datum, tid }
}

/**
 * Special (one-off) events are Shopify products tagged "event" with
 * date_and_time/show_in_carousel metafields (namespace "custom") — no
 * local data file to maintain. Products without a date_and_time are
 * dropped since there's no way to place them on the schedule.
 */
export const useSpecialEvents = () =>
  useStorefrontData('special-events', specialEventsQuery, {
    transform: (result): EventEntry[] =>
      (result.products?.nodes ?? [])
        .map((product: any): EventEntry | null => {
          const parsed = splitDateAndTime(product.dateAndTime?.value)

          if (!parsed) {
            return null
          }

          return {
            titel: product.title,
            datum: parsed.datum,
            tid: parsed.tid,
            beskrivning: product.description ?? '',
            kostnad: 'Se produkt',
            produktHandle: product.handle,
            visaIKarusell: product.showInCarousel?.value === 'true',
            featuredImage: product.featuredImage ?? null
          }
        })
        .filter((event: EventEntry | null): event is EventEntry => event !== null)
  })
