<script setup lang="ts">
type Collection = { id: string, handle: string, title: string }

const props = defineProps<{ open: boolean, triggerEl?: HTMLElement | null }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: collectionsData } = await useAsyncData('butik-collections', () =>
  $fetch<{ collections: Collection[] }>('/api/shopify/collections', { query: { lang: locale.value } })
)
const collections = computed(() => collectionsData.value?.collections ?? [])

const specialEvents = useSpecialEvents()
const nextEvent = computed(() => getUpcomingSpecialEvents(specialEvents.data.value ?? [], 1)[0] ?? null)
const nextEventBadge = computed(() => {
  if (!nextEvent.value) return null
  const [y, m, d] = nextEvent.value.datum.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(date)
})

const { openStatus } = useStoreHours()

const panelEl = ref<HTMLElement | null>(null)
const closeBtnEl = ref<HTMLElement | null>(null)

// Built from parts (not one literal string) so a CSS :not(...) selector
// living in a <script> block can't be misread as a Tailwind class by the
// build-time class scanner, which caused a CSS syntax error at build time.
const focusablesSelector = ['a[href]', 'button' + ':not([disabled])', 'input', 'select', 'textarea', '[tabindex]' + ':not([tabindex="-1"])'].join(', ')

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
    return
  }

  if (e.key !== 'Tab' || !panelEl.value) return

  const focusables = Array.from(panelEl.value.querySelectorAll<HTMLElement>(focusablesSelector)).filter((el) => el.offsetParent !== null)
  if (!focusables.length) return

  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    await nextTick()
    closeBtnEl.value?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    props.triggerEl?.focus()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-50 bg-navy sm:hidden" role="dialog" aria-modal="true" :aria-label="t('nav.mobileNav')">
      <div ref="panelEl" class="flex h-full flex-col overflow-y-auto bg-white">
        <div class="flex min-h-[72px] items-center justify-between gap-4 border-b border-lyktan-line px-4">
          <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')" @click="emit('close')">
            <img src="/images/logo/ink-wide.svg" alt="Butik Lyktan" class="h-8 w-auto">
          </NuxtLink>
          <button
            ref="closeBtnEl"
            type="button"
            :aria-label="t('nav.closeMenu')"
            class="inline-grid h-10 w-10 place-items-center rounded-full text-lyktan-ink transition hover:bg-lyktan-well"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="flex-1 space-y-6 p-4">
          <NuxtLink
            :to="localePath('/butik')"
            :aria-label="t('nav.search')"
            class="flex min-h-11 items-center gap-2 rounded-full border border-lyktan-line bg-lyktan-well px-4 text-sm text-lyktan-mute"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" stroke-linecap="round" />
            </svg>
            {{ t('nav.search') }}
          </NuxtLink>

          <div class="rounded-2xl bg-lyktan-soft p-4">
            <p class="mb-2 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-lyktan-accent">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path d="M7 7V6a5 5 0 0 1 10 0v1h2.5a1 1 0 0 1 1 1.12l-1.2 10A2 2 0 0 1 17.31 20H6.69a2 2 0 0 1-1.99-1.88l-1.2-10A1 1 0 0 1 4.5 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z" fill="currentColor" /></svg>
              {{ t('nav.webshop') }}
            </p>
            <nav>
              <NuxtLink
                v-for="cat in collections"
                :key="cat.id"
                :to="localePath(`/butik/${cat.handle}`)"
                class="flex min-h-[52px] items-center justify-between gap-2 border-b border-white/60 text-[0.95rem] font-medium text-lyktan-ink last:border-b-0"
                @click="emit('close')"
              >
                {{ cat.title }}
                <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </NuxtLink>
              <NuxtLink :to="localePath('/butik')" class="mt-2 block text-[0.85rem] font-semibold text-lyktan-accent" @click="emit('close')">
                {{ t('nav.allProducts') }} →
              </NuxtLink>
            </nav>
          </div>

          <nav :aria-label="t('nav.otherLinks')" class="space-y-0">
            <NuxtLink :to="localePath('/events')" class="flex min-h-14 items-center justify-between gap-2 border-b border-lyktan-line text-[0.95rem] font-semibold text-lyktan-accent" @click="emit('close')">
              {{ t('nav.events') }}
              <span v-if="nextEventBadge" class="rounded-full bg-navy px-2.5 py-1 font-mono text-[0.68rem] text-white">{{ nextEventBadge }}</span>
            </NuxtLink>
            <NuxtLink :to="localePath('/singelkort')" class="flex min-h-14 items-center gap-2 border-b border-lyktan-line text-[0.95rem] font-medium text-lyktan-ink" @click="emit('close')">
              {{ t('nav.singles') }}
              <span class="rounded-full bg-lyktan-brand px-2 py-0.5 text-[0.62rem] font-extrabold uppercase leading-none tracking-wide text-lyktan-ink">{{ t('nav.beta') }}</span>
            </NuxtLink>
            <NuxtLink :to="localePath('/bordsbokning')" class="flex min-h-14 items-center border-b border-lyktan-line text-[0.95rem] font-medium text-lyktan-ink" @click="emit('close')">
              {{ t('nav.booking') }}
            </NuxtLink>
            <NuxtLink :to="localePath('/kontakt')" class="flex min-h-14 items-center border-b border-lyktan-line text-[0.95rem] font-medium text-lyktan-ink" @click="emit('close')">
              {{ t('nav.findUs') }}
            </NuxtLink>
            <NuxtLink :to="localePath('/kontakt')" class="flex min-h-12 items-center gap-2 text-[0.85rem] font-medium text-lyktan-mute" @click="emit('close')">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1.6-3.4 4.3-5 7-5s5.4 1.6 7 5" stroke-linecap="round" /></svg>
              {{ t('nav.myAccount') }}
            </NuxtLink>
          </nav>
        </div>

        <div class="mt-auto bg-navy px-4 py-4 text-[0.8rem] text-white/85">
          <p class="flex items-center gap-2 font-semibold text-white">
            <span class="inline-block h-1.5 w-1.5 rounded-full" :class="openStatus.isOpen ? 'bg-lyktan-brand' : 'bg-white/40'" />
            {{ openStatus.text }}
          </p>
          <p class="mt-1">Veddestabron 8B, Järfälla</p>
          <SocialLinks class="mt-2 -ml-2" variant="dark" />
        </div>
      </div>
    </div>
  </Transition>
</template>
