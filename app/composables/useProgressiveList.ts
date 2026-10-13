// Shows a long list in pages of 50: the first page at once, the next one as the visitor
// scrolls near the end (see LoadMore.vue), with "Visa fler" as a plain link as fallback.
//
// The number of pages shown is kept in the address (?sida=3), so a reload or a shared
// link lands on the same depth, and the server renders exactly those pages instead of
// the whole list. Call reset() whenever filters or sorting change.
export const PAGE_SIZE = 50

export const useProgressiveList = (total: Ref<number>, options: { pageSize?: number } = {}) => {
  const pageSize = options.pageSize ?? PAGE_SIZE
  const route = useRoute()

  const requested = Math.floor(Number(route.query.sida))
  const pages = ref(Number.isFinite(requested) && requested > 1 ? Math.min(requested, 400) : 1)

  const limit = computed(() => pages.value * pageSize)
  const shown = computed(() => Math.min(limit.value, total.value))
  const hasMore = computed(() => shown.value < total.value)

  const hrefForPage = (page: number) => {
    const query = new URLSearchParams(Object.entries(route.query).flatMap(([k, v]) => (k === 'sida' || v == null ? [] : [[k, String(v)]])))
    if (page > 1) query.set('sida', String(page))
    const text = query.toString()
    return `${route.path}${text ? `?${text}` : ''}`
  }

  const nextHref = computed(() => hrefForPage(pages.value + 1))

  const syncUrl = () => {
    if (!import.meta.client) return
    history.replaceState(history.state, '', hrefForPage(pages.value))
  }

  const showMore = () => {
    if (!hasMore.value) return
    pages.value += 1
    syncUrl()
  }

  const reset = () => {
    if (pages.value === 1) return
    pages.value = 1
    syncUrl()
  }

  return { limit, shown, total, hasMore, nextHref, showMore, reset, pages }
}
