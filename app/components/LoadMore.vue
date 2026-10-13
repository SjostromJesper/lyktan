<script setup lang="ts">
// Footer of a progressively shown list: how many are showing, a "Visa fler" link, and an
// invisible marker that asks for the next page shortly before it scrolls into view.
// Without JavaScript the link still works as an ordinary page link (?sida=N).
const props = defineProps<{ shown: number, total: number, hasMore: boolean, href: string, label?: string }>()
const emit = defineEmits<{ more: [] }>()

const { t } = useI18n()
const marker = ref<HTMLElement | null>(null)
const AHEAD_PX = 900
let timer: ReturnType<typeof setTimeout> | undefined

// Asks for the next page once the end of the list is within a screen or so of the
// viewport. Checked on scroll and resize (throttled to one check every 60 ms) and after
// each page is added, since a tall screen may need more than one page to fill up.
const check = () => {
  timer = undefined
  if (!props.hasMore || !marker.value) return
  if (marker.value.getBoundingClientRect().top < window.innerHeight + AHEAD_PX) emit('more')
}

const schedule = () => {
  if (timer === undefined) timer = setTimeout(check, 60)
}

onMounted(() => {
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  schedule()
})

watch(() => props.shown, async () => {
  await nextTick()
  schedule()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  clearTimeout(timer)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
    <p class="text-sm" style="color: var(--lm-muted, #6A6F7A)">{{ t('shop.showingOf', { shown, total }) }}</p>
    <a v-if="hasMore" :href="href" class="btn btn-secondary" @click.prevent="emit('more')">{{ label ?? t('shop.showMore') }}</a>
    <span ref="marker" aria-hidden="true" class="block h-px w-full" />
  </div>
</template>
