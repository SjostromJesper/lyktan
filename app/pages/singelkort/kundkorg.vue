<script setup lang="ts">
import '~/assets/css/singelkort.css'
import { CONDITION_STYLES, cardFromLine, gameColor, rarityColor } from '~/utils/singlesCart'
import type { CartCard } from '~/utils/singlesCart'

definePageMeta({ layout: 'singles' })

const { t } = useI18n()
const localePath = useLocalePath()

// The singles section has its own Shopify cart, separate from the regular shop's.
const { cartItems, cartBusy, cartError, cartNotice, checkoutUrl, formatMoney, loadExistingCart, updateLineQuantity, addVariantsToCart, setCartAttributes } = useSinglesCart()
const maybe = useSinglesMaybe()

const tab = ref<'want' | 'maybe'>('want')

onMounted(async () => {
  maybe.load()
  await loadExistingCart()
  await maybe.refresh()
})

const kr = (n: number) => formatMoney(String(n), 'SEK')

// --- Want: the Shopify cart --------------------------------------------------
const wantCards = computed<CartCard[]>(() => cartItems.value.map(cardFromLine))
const maybeCards = computed(() => maybe.items.value)

const sum = (cards: CartCard[]) => cards.reduce((total, c) => total + c.price * c.quantity, 0)
const count = (cards: CartCard[]) => cards.reduce((total, c) => total + c.quantity, 0)

const wantSum = computed(() => sum(wantCards.value))
const maybeSum = computed(() => sum(maybeCards.value))
const wantCount = computed(() => count(wantCards.value))
const maybeCount = computed(() => count(maybeCards.value))

const wantGroups = computed(() => {
  const groups = new Map<string, CartCard[]>()
  for (const card of wantCards.value) {
    const name = card.game || t('singles.cart.otherGame')
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push(card)
  }
  return [...groups.entries()].map(([name, cards]) => ({ name, cards, count: count(cards) }))
})

const isLast = (card: CartCard) => card.stock !== null && card.quantity >= card.stock

const setQuantity = async (card: CartCard, next: number) => {
  if (!card.lineId) return
  const capped = card.stock !== null ? Math.min(next, card.stock) : next
  await updateLineQuantity(card.lineId, capped)
}

const removeWant = (card: CartCard) => card.lineId && updateLineQuantity(card.lineId, 0)

// --- Moving cards between the lists -----------------------------------------
const notice = ref('')

const toMaybe = async (card: CartCard) => {
  if (!card.lineId) return
  maybe.add({ ...card, lineId: null })
  await updateLineQuantity(card.lineId, 0)
  if (cartError.value) {
    // The cart didn't let go of the card, so don't also keep it in Maybe.
    maybe.remove(card.variantId)
    return
  }
  notice.value = t('singles.cart.movedToMaybe', { title: card.title })
}

const toWant = async (card: CartCard) => {
  if (!card.available || card.stock === 0) {
    notice.value = ''
    cartError.value = t('singles.cart.soldOutCard', { title: card.title })
    return
  }

  const quantity = card.stock !== null ? Math.min(card.quantity, card.stock) : card.quantity
  await addVariantsToCart([{ variantId: card.variantId, quantity }], t('singles.cart.movedToWant', { title: card.title }))
  if (!cartError.value) {
    maybe.remove(card.variantId)
    notice.value = t('singles.cart.movedToWant', { title: card.title })
  }
}

// Drag and drop between the two zones (desktop); arrow buttons do the same.
const dragging = ref<{ zone: 'want' | 'maybe', key: string } | null>(null)
const overZone = ref<'want' | 'maybe' | null>(null)

const startDrag = (zone: 'want' | 'maybe', key: string, event: DragEvent) => {
  dragging.value = { zone, key }
  event.dataTransfer?.setData('text/plain', key)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const endDrag = () => {
  dragging.value = null
  overZone.value = null
}

const allowDrop = (zone: 'want' | 'maybe', event: DragEvent) => {
  if (dragging.value && dragging.value.zone !== zone) {
    event.preventDefault()
    overZone.value = zone
  }
}

const dropOn = async (zone: 'want' | 'maybe') => {
  const drag = dragging.value
  endDrag()
  if (!drag || drag.zone === zone) return

  if (zone === 'maybe') {
    const card = wantCards.value.find((c) => c.lineId === drag.key)
    if (card) await toMaybe(card)
  } else {
    const card = maybeCards.value.find((c) => c.variantId === drag.key)
    if (card) await toWant(card)
  }
}

// --- Summary -------------------------------------------------------------------
// Pickup in the shop is free; PostNord delivery within Sweden is priced in the
// checkout, so no price is shown here. The choice is saved on the cart so the
// order tells staff how the customer wants it delivered.
const shipping = ref('pickup')
const SHIPPING_OPTIONS = computed(() => [
  { id: 'pickup', name: t('singles.cart.shipPickup'), note: t('singles.cart.shipPickupNote'), price: t('singles.cart.free') },
  { id: 'letter', name: t('singles.cart.shipLetter'), note: t('singles.cart.shipLetterNote'), price: t('singles.cart.shipInCheckout') },
  { id: 'tracked', name: t('singles.cart.shipTracked'), note: t('singles.cart.shipTrackedNote'), price: t('singles.cart.shipInCheckout') }
])
const shippingPrice = computed(() => SHIPPING_OPTIONS.value.find((o) => o.id === shipping.value)?.price ?? '–')

const saveShipping = () => setCartAttributes([{ key: 'Leverans', value: SHIPPING_OPTIONS.value.find((o) => o.id === shipping.value)?.name ?? '' }])
watch(shipping, saveShipping)

const total = computed(() => wantSum.value)

const conditionSummary = computed(() => {
  const totals = new Map<string, number>()
  for (const card of wantCards.value) totals.set(card.condition, (totals.get(card.condition) ?? 0) + card.quantity)
  const max = Math.max(1, ...totals.values())
  return Object.entries(CONDITION_STYLES)
    .filter(([name]) => totals.has(name))
    .map(([name, style]) => ({ name, ...style, n: totals.get(name)!, width: `${(totals.get(name)! / max) * 100}%` }))
})

const goToCheckout = async () => {
  if (!checkoutUrl.value || wantCount.value < 1) return
  await saveShipping()
  window.location.href = checkoutUrl.value
}

// "Exportera som decklista": a plain "1 Name (SET) 123" text file of the Want list.
const exportDecklist = () => {
  const lines = wantCards.value.map((c) => `${c.quantity} ${c.title}${c.setCode ? ` (${c.setCode})` : ''}${c.number ? ` ${c.number}` : ''}${c.foil ? ' *F*' : ''}`)
  const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'decklista.txt'
  link.click()
  URL.revokeObjectURL(url)
}

useSeoMeta({
  title: () => `${t('singles.cart.title')} | ${t('singles.title')} | Butik Lyktan`,
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="lykta min-h-[60vh] pb-28 lg:pb-12">
    <!-- Rubrik -->
    <section class="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <div class="flex flex-col gap-2.5">
        <div class="num flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] sm:text-xs">
          <span style="color: #F2A93B">1 {{ t('singles.cart.stepCart') }}</span><span style="color: #4A525E">——</span>
          <span style="color: #6F7883">2 {{ t('singles.cart.stepDelivery') }}</span><span class="hidden sm:inline" style="color: #4A525E">——</span>
          <span class="hidden sm:inline" style="color: #6F7883">3 {{ t('singles.cart.stepPayment') }}</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <h1 class="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.02em]">{{ t('singles.cart.title') }}</h1>
          <span class="num text-sm" style="color: #9AA3AE">{{ t('singles.cart.counts', { want: wantCount, maybe: maybeCount }) }}</span>
        </div>
      </div>
      <div class="hidden gap-2 sm:flex">
        <button type="button" class="flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition hover:border-[#4A525E] disabled:opacity-50" style="background: #161B22; border-color: #2A313C" :disabled="!wantCount" @click="exportDecklist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>
          {{ t('singles.cart.exportDecklist') }}
        </button>
        <NuxtLink :to="localePath('/singelkort')" class="flex h-11 items-center rounded-xl border px-4 text-sm font-bold transition hover:border-[#4A525E]" style="background: #161B22; border-color: #2A313C">{{ t('singles.cart.keepShopping') }}</NuxtLink>
      </div>
    </section>

    <p v-if="cartError" class="mx-auto mt-4 w-full max-w-[1360px] px-4 text-sm text-[#F47067] sm:px-6 lg:px-10" role="alert">{{ cartError }}</p>
    <p v-else-if="notice" class="mx-auto mt-4 w-full max-w-[1360px] px-4 text-sm sm:px-6 lg:px-10" style="color: #9AA3AE" aria-live="polite">{{ notice }}</p>

    <!-- Mobil: Want / Maybe-flikar -->
    <div class="mx-auto mt-5 w-full max-w-[1360px] px-4 sm:px-6 lg:hidden" role="tablist" :aria-label="t('singles.cart.lists')">
      <div class="grid grid-cols-2 rounded-[14px] border p-1" style="background: #161B22; border-color: #2A313C">
        <button type="button" role="tab" :aria-selected="tab === 'want'" class="h-11 rounded-[10px] text-[15px] font-extrabold" :style="tab === 'want' ? 'background:#F2A93B;color:#0D1015' : 'background:transparent;color:#9AA3AE'" @click="tab = 'want'">Want <span class="num ml-1 text-xs">{{ wantCount }}</span></button>
        <button type="button" role="tab" :aria-selected="tab === 'maybe'" class="h-11 rounded-[10px] text-[15px] font-extrabold" :style="tab === 'maybe' ? 'background:#E8EAED;color:#0D1015' : 'background:transparent;color:#9AA3AE'" @click="tab = 'maybe'">Maybe <span class="num ml-1 text-xs">{{ maybeCount }}</span></button>
      </div>
    </div>

    <section class="mx-auto mt-6 grid w-full max-w-[1360px] items-start gap-5 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
      <!-- WANT -->
      <div
        class="rounded-[18px] lg:col-span-5"
        :class="[tab === 'want' ? 'block' : 'hidden lg:block', overZone === 'want' ? 'ring-2 ring-[#F2A93B]' : '']"
        @dragover="allowDrop('want', $event)"
        @dragleave="overZone = null"
        @drop.prevent="dropOn('want')"
      >
        <div class="flex items-center justify-between px-1 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 rounded-full" style="background: #F2A93B" />
            <h2 class="text-xl font-extrabold">Want</h2>
            <span class="num rounded-md px-2 py-[3px] text-xs" style="background: #1D232C; color: #C9CFD6">{{ t('singles.cart.cardCount', wantCount) }}</span>
          </div>
          <span class="num text-lg font-semibold">{{ kr(wantSum) }}</span>
        </div>
        <p class="px-1 pb-3 text-[13px]" style="color: #9AA3AE">{{ t('singles.cart.wantHint') }}</p>

        <div v-for="group in wantGroups" :key="group.name" class="mb-3.5 flex flex-col gap-2">
          <div class="num flex items-center gap-2 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style="color: #9AA3AE">
            <span class="h-[7px] w-[7px] rounded-full" :style="{ background: gameColor(group.name) }" />{{ group.name }} · {{ group.count }}
          </div>

          <div
            v-for="card in group.cards"
            :key="card.lineId!"
            class="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-[14px] border py-2.5 pl-1.5 pr-3 transition"
            :class="dragging?.key === card.lineId ? 'opacity-50' : ''"
            :style="{ background: '#161B22', borderColor: dragging?.key === card.lineId ? '#F2A93B' : '#2A313C' }"
            draggable="true"
            @dragstart="startDrag('want', card.lineId!, $event)"
            @dragend="endDrag"
          >
            <span aria-hidden="true" class="hidden w-[18px] cursor-grab justify-center lg:flex" style="color: #4A525E">
              <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor"><circle cx="4" cy="4" r="1.6" /><circle cx="10" cy="4" r="1.6" /><circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="4" cy="16" r="1.6" /><circle cx="10" cy="16" r="1.6" /></svg>
            </span>
            <span class="ml-1.5 block h-16 w-[46px] shrink-0 overflow-hidden rounded-md border lg:ml-0" style="background: #23262E; border-color: #2A313C">
              <img v-if="card.image" :src="shopifyImage(card.image, 160)" :alt="card.title" loading="lazy" class="h-full w-full object-cover" draggable="false">
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <NuxtLink :to="localePath(`/singelkort/${card.handle}`)" class="truncate text-[15px] font-bold hover:text-[#F2A93B]">{{ card.title }}</NuxtLink>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="num flex items-center gap-[5px] text-[11px]" style="color: #9AA3AE">
                  <span class="h-[7px] w-[7px] rounded-full" :style="{ background: rarityColor(card.rarity) }" />{{ card.setCode }}<template v-if="card.number"> #{{ card.number }}</template>
                </span>
                <span class="num rounded px-1.5 py-0.5 text-[11px] font-semibold" :style="{ background: CONDITION_STYLES[card.condition]?.bg, color: CONDITION_STYLES[card.condition]?.fg }">{{ CONDITION_STYLES[card.condition]?.code ?? '–' }}</span>
                <span class="num rounded px-1.5 py-0.5 text-[11px]" style="background: #1D232C; color: #C9CFD6">{{ card.language }}</span>
                <span v-if="card.foil" class="num rounded px-1.5 py-0.5 text-[11px] font-semibold" style="background: #1E1A2E; color: #C7B8FF">FOIL</span>
              </div>
              <span v-if="isLast(card)" class="text-xs" style="color: #E3B341">{{ t('singles.cart.lastCopy') }}</span>
            </div>

            <div class="flex items-center rounded-[10px] border p-0.5" style="background: #0D1015; border-color: #2A313C">
              <button type="button" :aria-label="t('singles.decreaseQty')" class="h-11 w-11 rounded-lg text-base disabled:opacity-40 lg:h-9 lg:w-8" :disabled="cartBusy" @click="setQuantity(card, card.quantity - 1)">−</button>
              <span class="num w-6 text-center text-sm font-semibold">{{ card.quantity }}</span>
              <button type="button" :aria-label="t('singles.increaseQty')" class="h-11 w-11 rounded-lg text-base disabled:opacity-40 lg:h-9 lg:w-8" :disabled="cartBusy || isLast(card)" @click="setQuantity(card, card.quantity + 1)">+</button>
            </div>

            <div class="flex w-[86px] flex-col items-end gap-0.5">
              <span class="num text-[15px] font-semibold">{{ kr(card.price * card.quantity) }}</span>
              <span class="num text-[11px]" style="color: #6F7883">{{ kr(card.price) }} /st</span>
            </div>

            <div class="flex gap-1.5 lg:flex-col lg:gap-1">
              <button type="button" :aria-label="t('singles.cart.moveToMaybe')" :title="t('singles.cart.moveToMaybe')" class="flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold lg:h-[30px] lg:w-9 lg:px-0" style="background: #161B22; border-color: #2A313C; color: #C9CFD6" :disabled="cartBusy" @click="toMaybe(card)">
                <span class="lg:hidden">{{ t('singles.cart.toMaybe') }}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
              </button>
              <button type="button" :aria-label="t('singles.cart.remove')" :title="t('singles.cart.remove')" class="grid h-11 w-11 place-items-center rounded-lg border lg:h-[30px] lg:w-9" style="border-color: #2A313C; color: #9AA3AE" :disabled="cartBusy" @click="removeWant(card)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="!wantCards.length" class="flex h-40 flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed px-4 text-center text-sm" style="border-color: #2A313C; color: #6F7883">
          <span>{{ maybeCards.length ? t('singles.cart.wantEmptyMaybe') : t('singles.cart.wantEmpty') }}</span>
          <NuxtLink :to="localePath('/singelkort')" class="btn btn-secondary">{{ t('singles.cart.keepShopping') }}</NuxtLink>
        </div>
      </div>

      <!-- MAYBE -->
      <div
        class="rounded-[18px] lg:col-span-4"
        :class="[tab === 'maybe' ? 'block' : 'hidden lg:block', overZone === 'maybe' ? 'ring-2 ring-[#9AA3AE]' : '']"
        @dragover="allowDrop('maybe', $event)"
        @dragleave="overZone = null"
        @drop.prevent="dropOn('maybe')"
      >
        <div class="flex items-center justify-between px-1 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="box-border h-2.5 w-2.5 rounded-full border-2" style="border-color: #9AA3AE" />
            <h2 class="text-xl font-extrabold">Maybe</h2>
            <span class="num rounded-md px-2 py-[3px] text-xs" style="background: #1D232C; color: #C9CFD6">{{ t('singles.cart.cardCount', maybeCount) }}</span>
          </div>
          <span class="num text-base font-semibold" style="color: #9AA3AE">{{ kr(maybeSum) }}</span>
        </div>
        <p class="px-1 pb-3 text-[13px]" style="color: #9AA3AE">{{ t('singles.cart.maybeHint') }}</p>

        <div class="flex flex-col gap-2">
          <div
            v-for="card in maybeCards"
            :key="card.variantId"
            class="flex items-center gap-3 rounded-[14px] border py-2.5 pl-1.5 pr-3"
            :class="dragging?.key === card.variantId ? 'opacity-50' : ''"
            :style="{ background: '#12161C', borderColor: dragging?.key === card.variantId ? '#F2A93B' : '#2A313C' }"
            draggable="true"
            @dragstart="startDrag('maybe', card.variantId, $event)"
            @dragend="endDrag"
          >
            <span aria-hidden="true" class="hidden w-[18px] cursor-grab justify-center lg:flex" style="color: #4A525E">
              <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor"><circle cx="4" cy="4" r="1.6" /><circle cx="10" cy="4" r="1.6" /><circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="4" cy="16" r="1.6" /><circle cx="10" cy="16" r="1.6" /></svg>
            </span>
            <span class="ml-1.5 block h-14 w-10 shrink-0 overflow-hidden rounded-[5px] border opacity-80 lg:ml-0" style="background: #23262E; border-color: #2A313C">
              <img v-if="card.image" :src="shopifyImage(card.image, 160)" :alt="card.title" loading="lazy" class="h-full w-full object-cover" draggable="false">
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <NuxtLink :to="localePath(`/singelkort/${card.handle}`)" class="truncate text-sm font-bold hover:text-[#F2A93B]" style="color: #C9CFD6">{{ card.title }}</NuxtLink>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="num text-[11px]" style="color: #9AA3AE">{{ card.setCode }} · {{ card.quantity }}×</span>
                <span class="num rounded px-1.5 py-0.5 text-[11px] font-semibold" :style="{ background: CONDITION_STYLES[card.condition]?.bg, color: CONDITION_STYLES[card.condition]?.fg }">{{ CONDITION_STYLES[card.condition]?.code ?? '–' }}</span>
                <span v-if="card.foil" class="num rounded px-1.5 py-0.5 text-[11px] font-semibold" style="background: #1E1A2E; color: #C7B8FF">FOIL</span>
                <span v-if="!card.available || card.stock === 0" class="text-[11px]" style="color: #F47067">{{ t('singles.soldOutShort') }}</span>
              </div>
            </div>
            <span class="num text-sm font-semibold" style="color: #C9CFD6">{{ kr(card.price * card.quantity) }}</span>
            <button type="button" :aria-label="t('singles.cart.moveToWant')" :title="t('singles.cart.moveToWant')" class="flex h-11 w-11 items-center justify-center rounded-lg border lg:h-9 lg:w-9" style="background: #161B22; border-color: #2A313C; color: #F2A93B" :disabled="cartBusy" @click="toWant(card)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>
            </button>
          </div>

          <div class="flex h-24 flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed px-4 text-center text-[13px]" :style="{ borderColor: overZone === 'maybe' ? '#9AA3AE' : '#2A313C', color: '#6F7883' }">
            <span class="font-bold" style="color: #9AA3AE">{{ t('singles.cart.dropHere') }}</span>
            <span>{{ t('singles.cart.dropHint') }}</span>
          </div>
        </div>
      </div>

      <!-- SAMMANFATTNING -->
      <aside class="flex flex-col gap-3.5 lg:col-span-3">
        <div class="flex flex-col gap-4 rounded-[20px] border p-[22px]" style="background: #161B22; border-color: #2A313C">
          <span class="text-lg font-extrabold">{{ t('singles.cart.summary') }}</span>
          <div class="flex flex-col gap-2.5 text-sm">
            <div class="flex justify-between"><span style="color: #9AA3AE">{{ t('singles.cart.cardsLine', { count: wantCount, unique: wantCards.length }) }}</span><span class="num">{{ kr(wantSum) }}</span></div>
            <div class="flex justify-between"><span style="color: #9AA3AE">{{ t('singles.cart.delivery') }}</span><span class="num">{{ shippingPrice }}</span></div>
          </div>

          <div role="radiogroup" :aria-label="t('singles.cart.delivery')" class="flex flex-col gap-1.5">
            <button
              v-for="option in SHIPPING_OPTIONS"
              :key="option.id"
              type="button"
              role="radio"
              :aria-checked="shipping === option.id"
              class="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
              :style="{ background: shipping === option.id ? '#1D232C' : 'transparent', borderColor: shipping === option.id ? '#F2A93B' : '#2A313C' }"
              @click="shipping = option.id"
            >
              <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full border-2" :style="{ borderColor: shipping === option.id ? '#F2A93B' : '#4A525E' }">
                <span v-if="shipping === option.id" class="h-2 w-2 rounded-full" style="background: #F2A93B" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-sm font-bold">{{ option.name }}</span><span class="text-xs" style="color: #9AA3AE">{{ option.note }}</span></span>
              <span class="num text-right text-[13px]">{{ option.price }}</span>
            </button>
          </div>

          <div class="flex items-baseline justify-between border-t pt-3.5" style="border-color: #2A313C">
            <span class="text-base font-extrabold">{{ t('singles.cart.total') }}</span>
            <span class="num text-[26px] font-semibold">{{ kr(total) }}</span>
          </div>
          <span class="-mt-2.5 text-right text-xs" style="color: #6F7883">{{ t('singles.cart.inclVat') }}</span>
          <button type="button" class="hidden h-[54px] rounded-[14px] text-base font-extrabold transition hover:brightness-110 disabled:opacity-50 lg:block" style="background: #F2A93B; color: #0D1015" :disabled="!wantCount || cartBusy" @click="goToCheckout">{{ t('singles.cart.checkout') }} →</button>
        </div>

        <div v-if="conditionSummary.length" class="flex flex-col gap-3 rounded-[18px] border px-5 py-[18px]" style="background: #12161C; border-color: #1E242D">
          <span class="num text-[11px] font-semibold uppercase tracking-[0.12em]" style="color: #9AA3AE">{{ t('singles.cart.conditionsInCart') }}</span>
          <div v-for="c in conditionSummary" :key="c.name" class="flex items-center gap-2.5 text-[13px]">
            <span class="num w-[34px] rounded py-0.5 text-center text-[11px] font-semibold" :style="{ background: c.bg, color: c.fg }">{{ c.code }}</span>
            <span class="flex h-1.5 flex-1 overflow-hidden rounded-[3px]" style="background: #1D232C"><span class="h-full" :style="{ width: c.width, background: c.fg }" /></span>
            <span class="num w-6 text-right" style="color: #C9CFD6">{{ c.n }}</span>
          </div>
        </div>
      </aside>
    </section>

    <!-- Mobil: fast kassarad -->
    <div class="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t px-4 py-3 lg:hidden" style="background: #12161C; border-color: #1E242D">
      <div class="flex flex-col leading-tight">
        <span class="text-xs" style="color: #9AA3AE">{{ t('singles.cart.totalInclVat') }}</span>
        <span class="num text-xl font-semibold">{{ kr(total) }}</span>
      </div>
      <button type="button" class="ml-auto h-12 rounded-xl px-6 text-[15px] font-extrabold disabled:opacity-50" style="background: #F2A93B; color: #0D1015" :disabled="!wantCount || cartBusy" @click="goToCheckout">{{ t('singles.cart.checkoutShort') }} →</button>
    </div>
  </main>
</template>
