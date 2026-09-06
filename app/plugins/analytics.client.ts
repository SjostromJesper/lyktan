// Self-hosted, cookieless pageview tracking (no third-party analytics
// dependency). Fires once for the initial route and again on every
// client-side navigation.
export default defineNuxtPlugin(() => {
  const route = useRoute()

  watch(
    () => route.fullPath,
    (path) => {
      $fetch('/api/analytics/track', {
        method: 'POST',
        body: { path, referrer: document.referrer || null }
      }).catch(() => {
        // Never let a tracking failure be visible to the visitor.
      })
    },
    { immediate: true }
  )
})
