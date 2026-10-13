type RecurringEventRow = { titel: string, tid: string, weekday: number }

/**
 * The standing weekly schedule ("stående event"), managed in the admin
 * panel and stored in Supabase — the same real data the booking grid
 * blocks tables against, not a hardcoded local file.
 */
export const useRecurringEvents = () =>
  useAsyncData('recurring-events', () =>
    $fetch<{ recurringEvents: RecurringEventRow[] }>('/api/recurring-events').then((res) => res.recurringEvents)
  , { default: () => [] })

export type { RecurringEventRow }
