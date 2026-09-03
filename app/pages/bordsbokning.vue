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
    availabilityError.value = error?.data?.statusMessage || 'Kunde inte hämta lediga bord.'
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
    formError.value = 'Fyll i ditt namn.'
    return
  }

  if (!phone.value.trim() && !email.value.trim()) {
    formError.value = 'Ange telefonnummer eller e-post.'
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
      throw new Error('Kunde inte hitta förskottsprodukten.')
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
    formError.value = error?.data?.statusMessage || error?.message || 'Något gick fel, försök igen.'
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
  const formatted = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})

const occupiedTitle = (table: BookingTable, time: string) => {
  const occupied = occupiedAt(table.id, time)

  if (occupied?.type === 'room-locked') {
    return 'Rummet går bara att boka när alla andra bord är fullbokade den tiden.'
  }

  return occupied?.label ?? `${table.name} kl. ${time} — ledigt`
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

  return 'bg-lyktan-surface text-lyktan-ink hover:bg-black/[0.08]'
}

useSeoMeta({
  title: 'Boka bord | Butik Lyktan',
  description: 'Boka ett specifikt bord eller rummet i butiken för att spela kortspel, brädspel, rollspel eller miniatyrspel.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-10">
      <div>
        <p class="eyebrow">Bordsbokning</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Boka ett bord i butiken
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          Välj datum och tid, och klicka sedan på bordet du vill ha — bokningen bekräftas direkt.
        </p>
      </div>

      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="min-w-0 space-y-8">
          <div>
            <span class="eyebrow">Bokar du för miniatyrspel?</span>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition"
                :class="forMiniatures ? 'bg-lyktan-ink text-white' : 'bg-lyktan-surface text-lyktan-ink hover:bg-black/[0.08]'"
                @click="forMiniatures = true"
              >
                Ja
              </button>
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition"
                :class="!forMiniatures ? 'bg-lyktan-ink text-white' : 'bg-lyktan-surface text-lyktan-ink hover:bg-black/[0.08]'"
                @click="forMiniatures = false"
              >
                Nej
              </button>
            </div>
            <p v-if="forMiniatures" class="mt-2 text-[0.8rem] text-lyktan-mute">
              Det går bra att spela miniatyrspel på alla bord — de små borden visas här med bordsskiva på.
            </p>
          </div>

          <div class="grid gap-8 sm:flex sm:flex-wrap">
            <div class="min-w-0">
              <span class="eyebrow">Antal personer</span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="size in partySizeOptions"
                  :key="size"
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition"
                  :class="size === partySize ? 'bg-lyktan-ink text-white' : 'bg-lyktan-surface text-lyktan-ink hover:bg-black/[0.08]'"
                  @click="partySize = size"
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <div class="min-w-0">
              <label for="booking-date" class="eyebrow">Datum</label>
              <input
                id="booking-date"
                v-model="selectedDate"
                type="date"
                :min="today"
                class="mt-2 min-h-12 w-full max-w-xs rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
              >
            </div>
          </div>

          <div>
            <span class="eyebrow">Bordsöversikt {{ formatSelectedDate }}</span>

            <p v-if="loadingAvailability" class="mt-3 text-sm text-lyktan-mute">
              Hämtar lediga bord...
            </p>
            <p v-else-if="availabilityError" class="mt-3 text-sm text-lyktan-mute">
              {{ availabilityError }}
            </p>
            <p v-else-if="!slotTimes.length || !tables.length" class="mt-3 text-sm text-lyktan-mute">
              Inga bokningsbara bord den dagen.
            </p>

            <template v-else>
              <p class="mt-1 text-[0.8rem] text-lyktan-mute">
                Se vilka bord som är lediga hela dagen — klicka en ledig ruta för att boka den tiden direkt.
                <span class="sm:hidden">Svep i tabellen för fler tider →</span>
              </p>

              <div class="mt-3 overflow-x-auto rounded-xl border border-black/12">
              <table class="w-full min-w-[440px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 border-b border-r border-black/12 bg-lyktan-paper px-3 py-2 text-left text-[0.72rem] font-medium text-lyktan-mute">Bord</th>
                    <th v-for="time in slotTimes" :key="time" class="border-b border-black/12 px-2 py-2 text-center text-[0.72rem] font-medium text-lyktan-mute">
                      {{ time }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in tables" :key="table.id" class="border-b border-black/6 last:border-0">
                    <td class="sticky left-0 z-10 border-r border-black/12 bg-lyktan-paper px-3 py-2 text-sm font-medium text-lyktan-ink">{{ table.name }}</td>
                    <td v-for="cell in overviewRows.get(table.id)" :key="cell.time" class="p-1 text-center" :colspan="cell.colspan">
                      <button
                        type="button"
                        :title="occupiedTitle(table, cell.time)"
                        class="inline-flex h-9 w-full min-w-[3.2rem] items-center justify-center rounded-md px-1 text-[0.68rem] font-medium transition disabled:cursor-not-allowed"
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
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-lyktan-surface border border-black/12" /> Ledigt</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-lyktan-ink" /> Valt</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> Bokat</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-amber-200 bg-amber-50" /> Stående event</span>
              <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm border border-black/12 bg-black/[0.03]" /> Låst</span>
            </div>

            <p class="mt-3 text-[0.8rem] text-lyktan-mute">
              Rummet går bara att boka när alla andra bord är fullbokade den tiden. Vill du boka rummet för
              privat bruk? Kontakta <a href="mailto:hej@butiklyktan.se" class="text-lyktan-accent hover:underline">hej@butiklyktan.se</a>.
            </p>
            </template>
          </div>
        </div>

        <div class="min-w-0 rounded-2xl bg-lyktan-surface p-6 sm:p-8">
          <div v-if="selectedTableId && selectedTime">
            <p class="eyebrow">Dina uppgifter</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
              {{ selectedTable?.name }} — {{ formatSelectedDate }} kl. {{ selectedTime }}
            </h2>
            <p class="mt-2 text-[0.82rem] text-lyktan-mute">
              Bordet är ditt {{ selectedTime }}–{{ projectedEndTime }}.
            </p>
            <p v-if="selectedTable?.priceKr" class="mt-2 text-[0.82rem] text-lyktan-mute">
              Rummet kostar {{ selectedTable.priceKr }} kr, betalas i butiken.
            </p>

            <form class="mt-6 grid gap-4" @submit.prevent="openReview">
              <div>
                <label for="booking-name" class="eyebrow">Namn</label>
                <input
                  id="booking-name"
                  v-model="name"
                  type="text"
                  required
                  class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
                >
              </div>

              <div>
                <label for="booking-phone" class="eyebrow">Telefon</label>
                <input
                  id="booking-phone"
                  v-model="phone"
                  type="tel"
                  class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
                >
              </div>

              <div>
                <label for="booking-email" class="eyebrow">E-post</label>
                <input
                  id="booking-email"
                  v-model="email"
                  type="email"
                  class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
                >
              </div>

              <p class="text-[0.8rem] text-lyktan-mute">
                Ange telefonnummer eller e-post.
              </p>

              <div>
                <label for="booking-notes" class="eyebrow">Anteckning (valfritt)</label>
                <textarea
                  id="booking-notes"
                  v-model="notes"
                  rows="2"
                  placeholder="T.ex. vad ni tänkt spela"
                  class="mt-2 w-full rounded-lg border border-black/12 bg-white px-4 py-3 text-sm text-lyktan-ink"
                />
              </div>

              <p v-if="formError" class="text-sm text-lyktan-accent">
                {{ formError }}
              </p>

              <button type="submit" class="primary-cta" :disabled="!canSubmit">
                Granska bokning
              </button>
            </form>
          </div>

          <div v-else>
            <p class="eyebrow">Så funkar det</p>
            <h2 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
              Klicka en ledig ruta i bordsöversikten till vänster
            </h2>
            <p class="mt-3 text-sm leading-7 text-lyktan-mute">
              Röda bord är redan bokade, gula upptagna av ett stående event. När du valt ett ledigt bord fyller
              du i namn och kontaktuppgifter här, granskar bokningen och betalar ett förskott på {{ DEPOSIT_KR }} kr
              för att boka bordet. Är du medlem känner vi av det på dina uppgifter — då behövs inget förskott.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showReviewModal = false">
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <template v-if="confirmedBooking">
          <p class="eyebrow">Bokat!</p>
          <h2 class="mt-1 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            {{ confirmedBooking.tableName }} är bokat
          </h2>
          <p class="mt-3 text-sm leading-7 text-lyktan-mute">
            {{ formatSelectedDate }} kl. {{ confirmedBooking.startTime }}–{{ confirmedBooking.endTime }}.
            Som medlem behövde du inte betala något förskott — välkommen in!
          </p>
          <button type="button" class="primary-cta mt-6" @click="loadAvailability">
            Stäng
          </button>
        </template>

        <template v-else>
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <p class="eyebrow">Granska bokning</p>
              <h2 class="mt-1 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
                {{ selectedTable?.name }}
              </h2>
            </div>
            <button type="button" aria-label="Stäng" class="text-lyktan-mute hover:text-lyktan-ink" @click="showReviewModal = false">✕</button>
          </div>

          <dl class="grid gap-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">Datum & tid</dt>
              <dd class="text-right text-lyktan-ink">{{ formatSelectedDate }} kl. {{ selectedTime }}–{{ projectedEndTime }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">Antal personer</dt>
              <dd class="text-lyktan-ink">{{ partySize }}{{ forMiniatures ? ' · miniatyrspel' : '' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">Namn</dt>
              <dd class="text-right text-lyktan-ink">{{ name }}</dd>
            </div>
            <div v-if="phone" class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">Telefon</dt>
              <dd class="text-lyktan-ink">{{ phone }}</dd>
            </div>
            <div v-if="email" class="flex justify-between gap-4">
              <dt class="text-lyktan-mute">E-post</dt>
              <dd class="text-right text-lyktan-ink">{{ email }}</dd>
            </div>
            <div v-if="notes" class="flex justify-between gap-4">
              <dt class="shrink-0 text-lyktan-mute">Anteckning</dt>
              <dd class="text-right text-lyktan-ink">{{ notes }}</dd>
            </div>
          </dl>

          <div class="mt-5 space-y-2 rounded-xl bg-lyktan-surface p-4 text-sm leading-6 text-lyktan-mute">
            <p v-if="checkingMembership">Kollar om du är medlem…</p>
            <template v-else-if="isMemberBooking">
              <p>
                <strong class="text-lyktan-ink">Du är medlem</strong> — inget förskott behövs, bokningen bekräftas direkt.
              </p>
            </template>
            <template v-else>
              <p>
                Förskott för att boka bordet: <strong class="text-lyktan-ink">{{ DEPOSIT_KR }} kr</strong>, betalas nu.
                Återbetalas endast vid avbokning senast 24 timmar innan bokad tid.
              </p>
              <p>
                Resterande {{ remainderTotalKr }} kr ({{ remainderPerPersonKr }} kr/person) betalas i butiken.
              </p>
            </template>
          </div>

          <p v-if="formError" class="mt-3 text-sm text-lyktan-accent">
            {{ formError }}
          </p>

          <div class="mt-5 flex items-center gap-3">
            <button type="button" class="secondary-cta" :disabled="submitting" @click="showReviewModal = false">
              Tillbaka
            </button>
            <button type="button" class="primary-cta flex-1" :disabled="submitting || checkingMembership" @click="confirmAndPay">
              {{ submitting ? 'Skickar…' : (isMemberBooking ? 'Bekräfta bokning' : `Godkänn och betala ${DEPOSIT_KR} kr`) }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>
