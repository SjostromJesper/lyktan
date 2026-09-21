<script setup lang="ts">
import { BOOKING_MAX_DURATION_HOURS, addHours, getClosingTimeForDate, getStockholmTodayIso } from '#shared/utils/bookingSlots'

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

const DEPOSIT_KR = 20
const REMAINDER_PER_PERSON_MINIATURES_KR = 60
const REMAINDER_PER_PERSON_OTHER_KR = 40

const today = getStockholmTodayIso()
const partySizeOptions = [1, 2, 3, 4, 5, 6, 7, 8]

const forMiniatures = ref(false)
const partySize = ref(2)
const selectedDate = ref(today)
const selectedTime = ref<string | null>(null)

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
    <div class="page-shell grid gap-10">
      <div>
        <p class="eyebrow">{{ t('nav.booking') }}</p>
        <h1 class="mt-2 page-title">
          {{ t('booking.title') }}
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          {{ t('booking.intro') }}
        </p>
      </div>

      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="min-w-0 space-y-8">
          <div>
            <span class="eyebrow">{{ t('booking.forMiniatures') }}</span>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-[10px] px-4 text-sm font-medium transition"
                :class="forMiniatures ? 'bg-lyktan-ink text-white' : 'border border-lyktan-line bg-lyktan-surface text-lyktan-ink hover:border-lyktan-mute'"
                @click="forMiniatures = true"
              >
                {{ t('booking.yes') }}
              </button>
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-[10px] px-4 text-sm font-medium transition"
                :class="!forMiniatures ? 'bg-lyktan-ink text-white' : 'border border-lyktan-line bg-lyktan-surface text-lyktan-ink hover:border-lyktan-mute'"
                @click="forMiniatures = false"
              >
                {{ t('booking.no') }}
              </button>
            </div>
            <p v-if="forMiniatures" class="mt-2 text-[0.8rem] text-lyktan-mute">
              {{ t('booking.miniaturesNote') }}
            </p>
          </div>

          <div class="grid gap-8 sm:flex sm:flex-wrap">
            <div class="min-w-0">
              <span class="eyebrow">{{ t('booking.partySize') }}</span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="size in partySizeOptions"
                  :key="size"
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-sm font-medium transition"
                  :class="size === partySize ? 'bg-lyktan-ink text-white' : 'border border-lyktan-line bg-lyktan-surface text-lyktan-ink hover:border-lyktan-mute'"
                  @click="partySize = size"
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <div class="min-w-0">
              <label for="booking-date" class="eyebrow">{{ t('booking.date') }}</label>
              <input
                id="booking-date"
                v-model="selectedDate"
                type="date"
                :min="today"
                class="mt-2 min-h-12 w-full max-w-xs rounded-[10px] border border-lyktan-line bg-lyktan-field px-4 text-sm text-lyktan-ink"
              >
            </div>
          </div>

          <div>
            <span class="eyebrow">{{ t('booking.overview', { date: formatSelectedDate }) }}</span>

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
              <p class="mt-1 text-[0.8rem] text-lyktan-mute">
                {{ t('booking.overviewHint') }}
                <span class="sm:hidden">{{ t('booking.swipeHint') }} →</span>
              </p>

              <div class="mt-3 overflow-x-auto rounded-[10px] border border-lyktan-line">
              <table class="w-full min-w-[440px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 border-b border-r border-lyktan-line bg-lyktan-paper px-3 py-2 text-left text-[0.72rem] font-medium text-lyktan-mute">{{ t('booking.table') }}</th>
                    <th v-for="time in slotTimes" :key="time" class="border-b border-lyktan-line px-2 py-2 text-center text-[0.72rem] font-medium text-lyktan-mute">
                      {{ time }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in tables" :key="table.id" class="border-b border-lyktan-line last:border-0">
                    <td class="sticky left-0 z-10 border-r border-lyktan-line bg-lyktan-paper px-3 py-2 text-sm font-medium text-lyktan-ink">{{ table.name }}</td>
                    <td v-for="cell in overviewRows.get(table.id)" :key="cell.time" class="p-1 text-center" :colspan="cell.colspan">
                      <button
                        type="button"
                        :title="occupiedTitle(table, cell.time)"
                        class="inline-flex h-9 w-full min-w-[3.2rem] items-center justify-center rounded-[5px] px-1 text-[0.68rem] font-medium transition disabled:cursor-not-allowed"
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

            <p class="mt-3 text-[0.8rem] text-lyktan-mute">
              {{ t('booking.roomHint') }}
              <a href="mailto:hej@butiklyktan.se" class="text-lyktan-accent hover:underline">hej@butiklyktan.se</a>.
            </p>
            </template>
          </div>
        </div>

        <div class="min-w-0 rounded-[18px] border border-lyktan-line bg-lyktan-surface p-6 sm:p-8">
          <div v-if="selectedTableId && selectedTime">
            <p class="eyebrow">{{ t('booking.yourDetails') }}</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
              {{ selectedTable?.name }} — {{ formatSelectedDate }} {{ t('booking.at') }} {{ selectedTime }}
            </h2>
            <p class="mt-2 text-[0.82rem] text-lyktan-mute">
              {{ t('booking.yoursUntil', { start: selectedTime, end: projectedEndTime }) }}
            </p>
            <p v-if="selectedTable?.priceKr" class="mt-2 text-[0.82rem] text-lyktan-mute">
              {{ t('booking.roomCost', { price: selectedTable.priceKr }) }}
            </p>

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
        </div>
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
