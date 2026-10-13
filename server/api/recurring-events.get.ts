// Public, read-only view of the standing weekly schedule the shop manages
// in the admin panel (table `recurring_events`, shared Supabase project) —
// the same source of truth the booking grid already blocks tables against
// in bookings/availability.get.ts, now also used for the /events page and
// the homepage's "Kommande event" list instead of a hardcoded local file.
export default defineCachedEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase
    .from('recurring_events')
    .select('name, weekday, start_time, end_time')
    .eq('active', true)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // recurring_events.weekday is 0=Måndag..6=Söndag (the admin panel's
  // convention) — converted here to JS's Date#getDay() convention
  // (0=Söndag..6=Lördag) so callers can compare directly against dates.
  const toJsWeekday = (adminWeekday: number) => (adminWeekday === 6 ? 0 : adminWeekday + 1)

  const recurringEvents = ((data ?? []) as any[]).map((row) => ({
    titel: row.name as string,
    tid: String(row.start_time).slice(0, 5),
    weekday: toJsWeekday(row.weekday as number)
  }))

  return { recurringEvents }
}, { maxAge: 60 })
