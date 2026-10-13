<script setup lang="ts">
import { BOOKING_MAX_DURATION_HOURS, addHours, getClosingTimeForDate, getSlotsForDate, getStockholmTodayIso, isPastIsoDate } from '#shared/utils/bookingSlots'

type BookingTable = { id: string, name: string, kind: 'bord' | 'rum', capacity: number, priceKr: number | null }
type OccupiedSlot = { tableId: string, time: string, type: 'booking' | 'event' | 'room-locked', label: string, groupId?: string }
type OverviewCell = { time: string, colspan: number, occupied: OccupiedSlot | null }
type AvailabilityResponse = { date: string, slotTimes: string[], tables: BookingTable[], occupiedSlots: OccupiedSlot[] }
type BookingConfirmation = {
  id: string
  date: string
  startTime: string
  endTime: string
  tableId: string
  tableName: string
  partySize: number
  forMiniatures: boolean
  requiresDeposit: boolean
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const DEPOSIT_KR = 20
const REMAINDER_PER_PERSON_MINIATURES_KR = 60
const REMAINDER_PER_PERSON_OTHER_KR = 40

const today = getStockholmTodayIso()
const partySizeOptions = [1, 2, 3, 4, 5, 6, 7, 8]

const forMiniatures = ref(false)
const partySize = ref(2)
const selectedDate = ref(today)
const selectedTime = ref<string | null>(null)

// --- Kalender: hel månad, måndag först, max 2 månader framåt (HANDOFF.md) ---
const monthOffset = ref(0)
const todayDate = new Date(`${today}T00:00:00`)

const calendarMonth = computed(() => {
  const base = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset.value, 1)
  return { year: base.getFullYear(), month: base.getMonth() }
})

const monthLabel = computed(() => {
  const label = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(
    new Date(calendarMonth.value.year, calendarMonth.value.month, 1)
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const toIso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const calendarCells = computed(() => {
  const { year, month } = calendarMonth.value
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const cells: { iso: string | null, label: string, disabled: boolean, isToday: boolean, isSelected: boolean }[] = []

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ iso: null, label: '', disabled: true, isToday: false, isSelected: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIso(year, month, day)
    cells.push({
      iso,
      label: String(day),
      disabled: isPastIsoDate(iso),
      isToday: iso === today,
      isSelected: iso === selectedDate.value
    })
  }

  return cells
})

const canGoPrevMonth = computed(() => monthOffset.value > 0)
const canGoNextMonth = computed(() => monthOffset.value < 2)
const prevMonth = () => { if (canGoPrevMonth.value) monthOffset.value -= 1 }
const nextMonth = () => { if (canGoNextMonth.value) monthOffset.value += 1 }

const pickDate = (iso: string | null, disabled: boolean) => {
  if (!iso || disabled) return
  selectedDate.value = iso
}

const slotTimes = ref<string[]>([])
const tables = ref<BookingTable[]>([])
const occupiedSlots = ref<OccupiedSlot[]>([])
const loadingAvailability = ref(false)
const availabilityError = ref('')

const selectedTableId = ref<string | null>(null)

const name = ref('')
const phone = ref('')
const email = ref('')
const notes = ref('')
const submitting = ref(false)
const formError = ref('')
const showReviewModal = ref(false)
const checkingMembership = ref(false)
const isMemberBooking = ref(false)
const confirmedBooking = ref<BookingConfirmation | null>(null)

const { startBookingDepositCheckout } = useShopifyCart()

const occupiedMap = computed(() => new Map(occupiedSlots.value.map((slot) => [`${slot.tableId}|${slot.time}`, slot])))
const occupiedAt = (tableId: string, time: string | null) => (time ? occupiedMap.value.get(`${tableId}|${time}`) ?? null : null)

const selectedTable = computed(() => tables.value.find((table) => table.id === selectedTableId.value) ?? null)

// Groups consecutive slots that belong to the same booking/event (or are
// all room-locked) into one wide cell instead of repeating the label in
// every slot — free slots always stay their own cell so each stays
// individually clickable.
const overviewRows = computed<Map<string, OverviewCell[]>>(() => {
  const rows = new Map<string, OverviewCell[]>()

  for (const table of tables.value) {
    const cells: OverviewCell[] = []

    for (const time of slotTimes.value) {
      const occ = occupiedAt(table.id, time)
      const last = cells[cells.length - 1]
      const sameAsLast = Boolean(
        last?.occupied
        && occ
        && last.occupied.type === occ.type
        && (occ.type === 'room-locked' ? true : Boolean(occ.groupId) && last.occupied.groupId === occ.groupId)
      )

      if (sameAsLast) {
        last.colspan += 1
      } else {
        cells.push({ time, colspan: 1, occupied: occ })
      }
    }

    rows.set(table.id, cells)
  }

  return rows
})

// Mirrors the server's own end-time calculation (index.post.ts) so the
// customer sees the real hold time before confirming, not just the start.
const projectedEndTime = computed(() => {
  if (!selectedTableId.value || !selectedTime.value) {
    return null
  }

  const nextBlockingTime = occupiedSlots.value
    .filter((slot) => slot.tableId === selectedTableId.value && slot.time > selectedTime.value! && (slot.type === 'booking' || slot.type === 'event'))
    .map((slot) => slot.time)
    .sort()[0] ?? null

  const maxEnd = addHours(selectedTime.value, BOOKING_MAX_DURATION_HOURS)
  const closingTime = getClosingTimeForDate(selectedDate.value)

  return [maxEnd, nextBlockingTime, closingTime].filter((time): time is string => Boolean(time)).sort()[0]
})

// Varning enligt HANDOFF.md: väljer man sista möjliga starttiden den dagen,
// hinner man riskera att butiken stänger innan bordet är klart.
const isLateStartTime = computed(() => {
  if (!selectedTime.value) return false
  const slots = getSlotsForDate(selectedDate.value)
  return slots.length > 0 && selectedTime.value === slots[slots.length - 1]
})

const loadAvailability = async () => {
  selectedTableId.value = null
  showReviewModal.value = false
  confirmedBooking.value = null
  loadingAvailability.value = true
  availabilityError.value = ''

  try {
    const response = await $fetch<AvailabilityResponse>('/api/bookings/availability', {
      query: { date: selectedDate.value },
      cache: 'no-store'
    })
    slotTimes.value = response.slotTimes
    tables.value = response.tables
    occupiedSlots.value = response.occupiedSlots
    selectedTime.value = response.slotTimes[0] ?? null
  } catch (error: any) {
    slotTimes.value = []
    tables.value = []
    occupiedSlots.value = []
    selectedTime.value = null
    availabilityError.value = error?.data?.statusMessage || t('booking.loadFailed')
  } finally {
    loadingAvailability.value = false
  }
}

watch(selectedDate, loadAvailability, { immediate: true })

watch(selectedTime, () => {
  selectedTableId.value = null
  showReviewModal.value = false
  confirmedBooking.value = null
  formError.value = ''
})

// From the day-overview grid — a cell click already tells us both the time
// and the table, so jump straight there instead of just changing the time.
// Setting selectedTableId has to wait a tick: changing selectedTime triggers
// the watcher below that clears selectedTableId, and that watcher is queued
// (not synchronous), so setting both in the same call would have the clear
// run after and wipe out the table we just picked.
const selectFromOverview = async (tableId: string, time: string) => {
  if (occupiedAt(tableId, time)) {
    return
  }

  selectedTime.value = time
  await nextTick()
  selectedTableId.value = tableId
  formError.value = ''
}

const canSubmit = computed(
  () => Boolean(selectedTableId.value && selectedTime.value && name.value.trim() && (phone.value.trim() || email.value.trim()))
)

const remainderPerPersonKr = computed(() => (forMiniatures.value ? REMAINDER_PER_PERSON_MINIATURES_KR : REMAINDER_PER_PERSON_OTHER_KR))
const remainderTotalKr = computed(() => remainderPerPersonKr.value * partySize.value)

const openReview = async () => {
  if (!selectedTableId.value || !selectedTime.value) {
    return
  }

  if (!name.value.trim()) {
    formError.value = t('booking.nameRequired')
    return
  }

  if (!phone.value.trim() && !email.value.trim()) {
    formError.value = t('booking.contactRequired')
    return
  }

  formError.value = ''
  confirmedBooking.value = null
  isMemberBooking.value = false
  checkingMembership.value = true
  showReviewModal.value = true

  try {
    const { isMember } = await $fetch<{ isMember: boolean }>('/api/bookings/member-lookup', {
      query: { phone: phone.value.trim(), email: email.value.trim() }
    })
    isMemberBooking.value = isMember
  } catch {
    // Purely a display nicety — if the lookup fails, submit just proceeds
    // as a normal (deposit) booking and the server re-checks anyway.
  } finally {
    checkingMembership.value = false
  }
}

const confirmAndPay = async () => {
  if (!selectedTableId.value || !selectedTime.value) {
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    const response = await $fetch<{ booking: BookingConfirmation }>('/api/bookings', {
      method: 'POST',
      body: {
        date: selectedDate.value,
        startTime: selectedTime.value,
        tableId: selectedTableId.value,
        partySize: partySize.value,
        forMiniatures: forMiniatures.value,
        name: name.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        notes: notes.value.trim()
      }
    })

    const booking = response.booking

    if (!booking.requiresDeposit) {
      // Member — already confirmed server-side, no payment needed.
      confirmedBooking.value = booking
      name.value = ''
      phone.value = ''
      email.value = ''
      notes.value = ''
      return
    }

    const { product } = await $fetch<{ product: { variants: { nodes: { id: string }[] } } | null }>(
      '/api/shopify/product/bordsbokning-forskott'
    )
    const variantId = product?.variants?.nodes?.[0]?.id

    if (!variantId) {
      throw new Error(t('booking.depositProductNotFound'))
    }

    const checkoutUrl = await startBookingDepositCheckout({
      variantId,
      bookingId: booking.id,
      tableName: booking.tableName,
      date: booking.date,
      startTime: booking.startTime,
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim()
    })

    window.location.href = checkoutUrl
  } catch (error: any) {
    formError.value = error?.data?.statusMessage || error?.message || t('product.genericError')
    showReviewModal.value = false

    if (error?.statusCode === 409) {
      await loadAvailability()
    }
  } finally {
    submitting.value = false
  }
}

const formatSelectedDate = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  const formatted = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})

const occupiedTitle = (table: BookingTable, time: string) => {
  const occupied = occupiedAt(table.id, time)

  if (occupied?.type === 'room-locked') {
    return t('booking.roomLockedTitle')
  }

  return occupied?.label ?? t('booking.tableFreeTitle', { table: table.name, time })
}

// Screen-reader name for a time button: "Bord 1, 12:00, ledigt" / "…, bokat" / "…, valt".
const cellAriaLabel = (table: BookingTable, time: string) => {
  const occupied = occupiedAt(table.id, time)
  let state = t('booking.free')

  if (selectedTableId.value === table.id && selectedTime.value === time) state = t('booking.selected')
  else if (occupied?.type === 'event') state = `${t('booking.standingEvent')}: ${occupied.label}`
  else if (occupied?.type === 'room-locked') state = t('booking.locked')
  else if (occupied) state = t('booking.booked')

  // Tables are named just "1", "2" … so say "Bord 1" for a screen reader.
  const tableName = /^\d+$/.test(table.name.trim()) ? `${t('booking.table')} ${table.name.trim()}` : table.name
  return `${tableName}, ${time}, ${state.toLowerCase()}`
}

const overviewCellClass = (tableId: string, time: string) => {
  if (selectedTableId.value === tableId && selectedTime.value === time) {
    return 'bg-lyktan-ink text-white'
  }

  const occupied = occupiedAt(tableId, time)

  if (occupied?.type === 'event') {
    return 'cursor-not-allowed bg-amber-50 text-amber-700'
  }

  if (occupied?.type === 'room-locked') {
    return 'cursor-not-allowed bg-black/[0.03] text-lyktan-mute'
  }

  if (occupied) {
    return 'cursor-not-allowed bg-red-50 text-red-400'
  }

  return 'bg-lyktan-mint text-lyktan-go hover:bg-[#D3E6D9]'
}

useSeoMeta({
  title: 'Boka bord | Butik Lyktan',
  description: () => t('booking.seoDescription')
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-8">
      <section class="booking-hero">
        <p class="text-sm text-lyktan-mute">
          <NuxtLink :to="localePath('/')" class="hover:text-lyktan-ink">{{ t('shop.breadcrumbHome') }}</NuxtLink> / {{ t('nav.booking') }}
        </p>
        <h1 class="booking-hero-title mt-2">{{ t('booking.title') }}</h1>
        <p class="mt-2 max-w-xl text-[1.02rem] text-lyktan-mute-2">{{ t('booking.intro') }}</p>
      </section>

      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="min-w-0 space-y-5">
          <!-- Steg 1: Välj dag -->
          <div class="booking-card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <span class="step-badge">1</span>
                <h2 class="step-title">{{ t('booking.step1') }}</h2>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" :aria-label="t('booking.prevMonth')" class="calendar-nav-btn" :disabled="!canGoPrevMonth" @click="prevMonth">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <span class="w-36 text-center text-[0.95rem] font-extrabold text-lyktan-ink">{{ monthLabel }}</span>
                <button type="button" :aria-label="t('booking.nextMonth')" class="calendar-nav-btn" :disabled="!canGoNextMonth" @click="nextMonth">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
              <span v-for="wd in [0,1,2,3,4,5,6]" :key="wd" class="calendar-weekday">{{ t(`hours.weekdayShort.${(wd + 1) % 7}`) }}</span>
              <button
                v-for="(cell, index) in calendarCells"
                :key="cell.iso ?? `blank-${index}`"
                type="button"
                class="calendar-cell"
                :class="{
                  'calendar-cell-selected': cell.isSelected,
                  'calendar-cell-today': cell.isToday && !cell.isSelected,
                  'calendar-cell-disabled': cell.disabled,
                  invisible: !cell.iso
                }"
                :disabled="cell.disabled || !cell.iso"
                @click="pickDate(cell.iso, cell.disabled)"
              >
                {{ cell.label }}
              </button>
            </div>

            <div class="mt-4 flex flex-wrap gap-4 text-[0.78rem] text-lyktan-mute">
              <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded-[4px] bg-lyktan-ink" /> {{ t('booking.selectedDay') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded-[4px] border-2 border-lyktan-brand box-border" /> {{ t('booking.todayLegend') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded-[4px] bg-lyktan-well" /> {{ t('booking.unavailableLegend') }}</span>
            </div>
          </div>

          <!-- Steg 2: Bord & starttid -->
          <div class="booking-card">
            <div class="flex items-center gap-3.5">
              <span class="step-badge">2</span>
              <h2 class="step-title">{{ t('booking.overview', { date: formatSelectedDate }) }}</h2>
            </div>

            <p v-if="loadingAvailability" class="mt-3 text-sm text-lyktan-mute">
              {{ t('booking.loadingTables') }}
            </p>
            <p v-else-if="availabilityError" class="mt-3 text-sm text-lyktan-mute">
              {{ availabilityError }}
            </p>
            <p v-else-if="!slotTimes.length || !tables.length" class="mt-3 text-sm text-lyktan-mute">
              {{ t('booking.noTablesThatDay') }}
            </p>

            <template v-else>
              <p class="mt-3 text-[0.8rem] text-lyktan-mute">
                {{ t('booking.overviewHint') }}
                <span class="sm:hidden">{{ t('booking.swipeHint') }} →</span>
              </p>

              <div class="mt-3 overflow-x-auto rounded-[14px] border border-lyktan-line">
              <!-- Below lg the table scrolls sideways; from lg up it is fixed-width and always fits its card. -->
              <table class="w-full min-w-[560px] border-collapse text-sm lg:min-w-0 lg:table-fixed">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 border-b border-r border-lyktan-line bg-lyktan-paper px-3 py-2 text-left text-[0.72rem] font-medium text-lyktan-mute lg:w-[4.5rem] lg:px-2">{{ t('booking.table') }}</th>
                    <th v-for="time in slotTimes" :key="time" class="border-b border-lyktan-line px-2 py-2 text-center text-[0.72rem] font-medium text-lyktan-mute lg:px-0 lg:text-[0.66rem]">
                      {{ time }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in tables" :key="table.id" class="border-b border-lyktan-line last:border-0">
                    <td class="sticky left-0 z-10 truncate border-r border-lyktan-line bg-lyktan-paper px-3 py-2 text-sm font-medium text-lyktan-ink lg:px-2" :title="table.name">{{ table.name }}</td>
                    <td v-for="cell in overviewRows.get(table.id)" :key="cell.time" class="p-1 text-center lg:p-0.5" :colspan="cell.colspan">
                      <button
                        type="button"
                        :title="occupiedTitle(table, cell.time)"
                        :aria-label="cellAriaLabel(table, cell.time)"
                        class="inline-flex h-9 w-full min-w-[3.2rem] items-center lg:min-w-0 justify-center rounded-[5px] px-1 text-[0.68rem] font-medium transition disabled:cursor-not-allowed"
                        :class="overviewCellClass(table.id, cell.time)"
                        :disabled="Boolean(cell.occupied)"
                        @click="selectFromOverview(table.id, cell.time)"
                      >
                        <span v-if="cell.occupied" class="truncate">{{ cell.occupied.label }}</span>
                        <span v-else>·</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-3 text-[0.72rem] text-lyktan-mute">
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-[#C5DCCB] bg-lyktan-mint" /> {{ t('booking.free') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-lyktan-ink" /> {{ t('booking.selected') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> {{ t('booking.booked') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-amber-200 bg-amber-50" /> {{ t('booking.standingEvent') }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-lyktan-line bg-black/[0.03]" /> {{ t('booking.locked') }}</span>
            </div>

            <p class="mt-3 text-[0.8rem] text-lyktan-ink">
              {{ t('booking.durationNote') }}
            </p>

            <p class="mt-3 text-[0.8rem] text-lyktan-mute">
              {{ t('booking.roomHint') }}
              <a href="mailto:hej@butiklyktan.se" class="text-lyktan-accent hover:underline">hej@butiklyktan.se</a>.
            </p>
            </template>
          </div>

          <!-- Steg 3: Sällskap -->
          <div class="booking-card">
            <div class="flex items-center gap-3.5">
              <span class="step-badge">3</span>
              <h2 class="step-title">{{ t('booking.step3') }}</h2>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-4">
              <span class="w-full shrink-0 text-sm font-bold text-lyktan-ink sm:w-auto">{{ t('booking.partySize') }}</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="size in partySizeOptions"
                  :key="size"
                  type="button"
                  class="pill-count"
                  :class="size === partySize ? 'pill-count-active' : ''"
                  @click="partySize = size"
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-4">
              <span class="w-full shrink-0 text-sm font-bold text-lyktan-ink sm:w-auto">{{ t('booking.forMiniatures') }}</span>
              <div class="flex gap-2">
                <button type="button" class="tab-pill" :class="forMiniatures ? 'tab-pill-active' : ''" @click="forMiniatures = true">{{ t('booking.yes') }}</button>
                <button type="button" class="tab-pill" :class="!forMiniatures ? 'tab-pill-active' : ''" @click="forMiniatures = false">{{ t('booking.no') }}</button>
              </div>
            </div>
            <p v-if="forMiniatures" class="mt-3 text-[0.8rem] text-lyktan-mute">
              {{ t('booking.miniaturesNote') }}
            </p>
          </div>
        </div>

        <aside class="min-w-0 rounded-[22px] border-2 border-lyktan-line p-6 sm:p-8">
          <div v-if="selectedTableId && selectedTime">
            <div class="booking-summary-box">
              <p class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-white/60">{{ t('booking.yourDetails') }}</p>
              <p class="mt-1 text-lg font-extrabold text-white">{{ selectedTable?.name }}</p>
              <p class="mt-1 text-sm text-white/75">{{ formatSelectedDate }} {{ t('booking.at') }} {{ selectedTime }}</p>
              <p class="mt-2 text-[0.8rem] text-white/60">{{ t('booking.yoursUntil', { start: selectedTime, end: projectedEndTime }) }}</p>
              <p v-if="selectedTable?.priceKr" class="mt-1 text-[0.8rem] text-white/60">{{ t('booking.roomCost', { price: selectedTable.priceKr }) }}</p>
            </div>

            <div v-if="isLateStartTime" role="alert" class="late-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5" /><path d="M12 18h.01" /></svg>
              <div>
                <p class="text-[0.85rem] font-extrabold text-lyktan-ink">{{ t('booking.lateWarningTitle') }}</p>
                <p class="mt-0.5 text-[0.8rem] leading-5 text-lyktan-ink/80">{{ t('booking.lateWarningText') }}</p>
              </div>
            </div>

            <form class="mt-6 grid gap-4" @submit.prevent="openReview">
              <div>
                <label for="booking-name" class="eyebrow">{{ t('booking.name') }}</label>
                <input
                  id="booking-name"
                  v-model="name"
                  type="text"
                  required
                  class="mt-2 min-h-12 w-full rounded-[10px] border border-lyktan-line bg-lyktan-field px-4 text-sm text-lyktan-ink"
                >
              </div>

              <div>
                <label for="booking-phone" class="eyebrow">{{ t('booking.phone') }}</label>
                <input
                  id="booking-phone"
                  v-model="phone"
                  type="tel"
                  class="mt-2 min-h-12 w-full rounded-[10px] border border-lyktan-line bg-lyktan-field px-4 text-sm text-lyktan-ink"
                >
              </div>

              <div>
                <label for="booking-email" class="eyebrow">{{ t('contact.email') }}</label>
                <input
                  id="booking-email"
                  v-model="email"
                  type="email"
                  class="mt-2 min-h-12 w-full rounded-[10px] border border-lyktan-line bg-lyktan-field px-4 text-sm text-lyktan-ink"
                >
              </div>

              <p class="text-[0.8rem] text-lyktan-mute">
                {{ t('booking.contactRequired') }}
              </p>

              <div>
                <label for="booking-notes" class="eyebrow">{{ t('booking.notes') }}</label>
                <textarea
                  id="booking-notes"
                  v-model="notes"
                  rows="2"
                  :placeholder="t('booking.notesPlaceholder')"
                  class="mt-2 w-full rounded-[10px] border border-lyktan-line bg-lyktan-field px-4 py-3 text-sm text-lyktan-ink"
                />
              </div>

              <p v-if="formError" class="text-sm text-red-600">
                {{ formError }}
              </p>

              <button type="submit" class="primary-cta" :disabled="!canSubmit">
                {{ t('booking.reviewBooking') }}
              </button>
            </form>
          </div>

          <div v-else>
            <p class="eyebrow">{{ t('booking.howItWorks') }}</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
              {{ t('booking.clickFreeSlot') }}
            </h2>
            <p class="mt-3 text-sm leading-7 text-lyktan-mute">
              {{ t('booking.howItWorksText', { deposit: DEPOSIT_KR }) }}
            </p>
          </div>

          <div class="useful-box mt-6">
            <h3 class="text-[0.85rem] font-extrabold uppercase tracking-[0.04em] text-lyktan-ink">{{ t('booking.usefulToKnow') }}</h3>
            <div class="mt-3 flex items-start gap-3 text-[0.85rem] leading-6 text-lyktan-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <span>{{ t('booking.hoursShort') }}</span>
            </div>
            <div class="mt-2.5 flex items-start gap-3 text-[0.85rem] leading-6 text-lyktan-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A5200" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M12 13v4" /><path d="M8 20h8" /></svg>
              <span>
                {{ t('booking.eventNoticeText') }}
                <NuxtLink :to="localePath('/events')" class="font-bold text-lyktan-accent hover:underline">{{ t('booking.eventCalendarLink') }}</NuxtLink>.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <div v-if="showReviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-lyktan-felt/60 p-4" @click.self="showReviewModal = false">
      <div class="w-full max-w-sm rounded-[18px] bg-lyktan-paper p-6 shadow-xl sm:p-8">
        <template v-if="confirmedBooking">
          <p class="eyebrow">{{ t('booking.bookedExclaim') }}</p>
          <h2 class="mt-1 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            {{ t('booking.tableIsBooked', { table: confirmedBooking.tableName }) }}
          </h2>
          <p class="mt-3 text-sm leading-7 text-lyktan-mute">
            {{ formatSelectedDate }} {{ t('booking.at') }} {{ confirmedBooking.startTime }}–{{ confirmedBooking.endTime }}.
            {{ t('booking.memberNoDeposit') }}
          </p>
          <button type="button" class="primary-cta mt-6" @click="loadAvailability">
            {{ t('booking.close') }}
          </button>
        </template>

        <template v-else>
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <p class="eyebrow">{{ t('booking.reviewBooking') }}</p>
              <h2 class="mt-1 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
                {{ selectedTable?.name }}
              </h2>
            </div>
            <button type="button" :aria-label="t('booking.close')" class="text-lyktan-mute hover:text-lyktan-ink" @click="showReviewModal = false">✕</button>
          </div>

          <dl class="grid gap-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">{{ t('booking.dateAndTime') }}</dt>
              <dd class="text-right text-lyktan-ink">{{ formatSelectedDate }} {{ t('booking.at') }} {{ selectedTime }}–{{ projectedEndTime }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">{{ t('booking.partySize') }}</dt>
              <dd class="text-lyktan-ink">{{ partySize }}{{ forMiniatures ? ` · ${t('booking.miniatures')}` : '' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">{{ t('booking.name') }}</dt>
              <dd class="text-right text-lyktan-ink">{{ name }}</dd>
            </div>
            <div v-if="phone" class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">{{ t('booking.phone') }}</dt>
              <dd class="text-lyktan-ink">{{ phone }}</dd>
            </div>
            <div v-if="email" class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">{{ t('contact.email') }}</dt>
              <dd class="text-right text-lyktan-ink">{{ email }}</dd>
            </div>
            <div v-if="notes" class="flex justify-between gap-4">
              <dt class="shrink-0 text-lyktan-mute">{{ t('booking.note') }}</dt>
              <dd class="text-right text-lyktan-ink">{{ notes }}</dd>
            </div>
          </dl>

          <div class="mt-5 space-y-2 rounded-[18px] border border-lyktan-line bg-lyktan-surface p-4 text-sm leading-6 text-lyktan-mute">
            <p v-if="checkingMembership">{{ t('booking.checkingMembership') }}</p>
            <template v-else-if="isMemberBooking">
              <p>
                <strong class="text-lyktan-ink">{{ t('booking.youAreMember') }}</strong> — {{ t('booking.noDepositNeeded') }}
              </p>
            </template>
            <template v-else>
              <p>
                {{ t('booking.depositExplainer') }} <strong class="text-lyktan-ink">{{ DEPOSIT_KR }} kr</strong>, {{ t('booking.paidNow') }}
                {{ t('booking.refundPolicy') }}
              </p>
              <p>
                {{ t('booking.remainder', { total: remainderTotalKr, perPerson: remainderPerPersonKr }) }}
              </p>
            </template>
          </div>

          <p v-if="formError" class="mt-3 text-sm text-red-600">
            {{ formError }}
          </p>

          <div class="mt-5 flex items-center gap-3">
            <button type="button" class="secondary-cta" :disabled="submitting" @click="showReviewModal = false">
              {{ t('booking.back') }}
            </button>
            <button type="button" class="primary-cta flex-1" :disabled="submitting || checkingMembership" @click="confirmAndPay">
              {{ submitting ? t('booking.sending') : (isMemberBooking ? t('booking.confirmBooking') : t('booking.approveAndPay', { deposit: DEPOSIT_KR })) }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
.booking-hero {
  padding: 32px 28px;
  border-radius: 24px;
  background: var(--color-lyktan-soft);
}
.booking-hero-title {
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--color-lyktan-ink);
}

.booking-card {
  padding: 28px;
  border-radius: 22px;
  border: 2px solid var(--color-lyktan-line);
}
.step-badge {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 17px;
  background: var(--color-navy);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
}
.step-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-lyktan-ink);
}

.calendar-nav-btn {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: 2px solid var(--color-lyktan-line);
  background: #fff;
  color: var(--color-lyktan-ink);
}
.calendar-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.calendar-weekday {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-lyktan-mute);
}
.calendar-cell {
  height: 44px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  background: #fff;
  border: 2px solid var(--color-lyktan-line);
  color: var(--color-lyktan-ink);
}
.calendar-cell-selected {
  background: var(--color-navy);
  border-color: var(--color-navy);
  color: #fff;
}
.calendar-cell-today {
  border-color: var(--color-lyktan-brand);
}
.calendar-cell-disabled {
  background: var(--color-lyktan-well);
  border-color: var(--color-lyktan-well);
  color: var(--color-lyktan-sage);
  cursor: not-allowed;
}

.pill-count {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: var(--color-lyktan-well);
  color: var(--color-lyktan-ink);
  font-size: 0.9rem;
  font-weight: 700;
}
.pill-count-active {
  background: var(--color-navy);
  color: #fff;
}

.booking-summary-box {
  padding: 18px 20px;
  border-radius: 18px;
  background: var(--color-navy);
}

.late-warning {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-lyktan-soft);
  border: 2px solid var(--color-lyktan-brand);
}

.useful-box {
  padding: 22px 24px;
  border-radius: 20px;
  background: var(--color-lyktan-soft);
}
</style>
