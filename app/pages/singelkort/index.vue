<script setup lang="ts">
import '~/assets/css/singelkort.css'

type Variant = {
  id: string
  title: string
  availableForSale: boolean
  quantityAvailable: number | null
  selectedOptions: { name: string, value: string }[]
  price: { amount: string, currencyCode: string }
  compareAtPrice: { amount: string, currencyCode: string } | null
}

type SingleCard = {
  id: string
  title: string
  handle: string
  featuredImage: { url: string, altText: string | null } | null
  cardGame: { value: string } | null
  cardSet: { value: string } | null
  rarity: { value: string } | null
  collectorNumber: { value: string } | null
  variants: { nodes: Variant[] }
}

type CollectionResponse = {
  collection: { id: string, title: string, handle: string } | null
  products: SingleCard[]
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const SORT_OPTIONS = computed(() => [
  { value: 'name', label: t('sort.nameAsc') },
  { value: 'price-asc', label: t('sort.priceAsc') },
  { value: 'price-desc', label: t('sort.priceDesc') }
])

const CONDITION_KEYS: Record<string, string> = {
  Nyskick: 'singles.conditionMint',
  Utmärkt: 'singles.conditionExcellent',
  Bra: 'singles.conditionGood',
  Ok: 'singles.conditionOk',
  Dåligt: 'singles.conditionPoor'
}

const conditionLabel = (condition: string | null) => (condition && CONDITION_KEYS[condition] ? t(CONDITION_KEYS[condition]) : condition)

// Outline chip in the condition's own colour (see singelkort.css .cond-*)
const conditionClass = (condition: string | null) =>
  'cond cond-' + (condition || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const cards = ref<SingleCard[]>([])
const loading = ref(true)
const loadError = ref('')

const loadCards = async () => {
  loading.value = true
  loadError.value = ''

  try {
    const res = await $fetch<CollectionResponse>('/api/shopify/singelkort', { query: { lang: locale.value } })
    cards.value = res.products
  } catch (err: any) {
    loadError.value = err?.data?.statusMessage || t('singles.loadFailed')
    cards.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadCards)
watch(locale, loadCards)

// --- Per-card helpers ---
const cardVariants = (card: SingleCard) => card.variants?.nodes ?? []

const optionValue = (variant: Variant, optionName: string) =>
  variant.selectedOptions?.find((o) => o.name.toLowerCase() === optionName.toLowerCase())?.value ?? null

const cardConditions = (card: SingleCard) =>
  [...new Set(cardVariants(card).map((v) => optionValue(v, 'Skick')).filter((v): v is string => Boolean(v)))]

const cardHasFoil = (card: SingleCard) =>
  cardVariants(card).some((v) => optionValue(v, 'Foil') === 'Ja')

const cardIsInStock = (card: SingleCard) =>
  cardVariants(card).some((v) => v.availableForSale)

const cardStockCount = (card: SingleCard) =>
  cardVariants(card).reduce((sum, v) => sum + (v.availableForSale ? (v.quantityAvailable ?? 1) : 0), 0)

// The variant a grid tile represents — cheapest in-stock printing, or
// cheapest overall when the whole card is sold out.
const cardRepresentativeVariant = (card: SingleCard) => {
  const variants = cardVariants(card)
  const inStock = variants.filter((v) => v.availableForSale)
  const pool = inStock.length ? inStock : variants
  if (!pool.length) return null
  return pool.reduce((lowest, v) => Number(v.price.amount) < Number(lowest.price.amount) ? v : lowest, pool[0])
}

const cardLowestPrice = (card: SingleCard) => {
  const variant = cardRepresentativeVariant(card)
  return variant ? Number(variant.price.amount) : null
}

// --- Search ---
const search = ref('')

// --- Filters ---
const mobileFilterDrawerOpen = ref(false)
const selectedGames = ref<Set<string>>(new Set())
const selectedConditions = ref<Set<string>>(new Set())
const selectedSets = ref<Set<string>>(new Set())
const foilOnly = ref(false)
const inStockOnly = ref(true)
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)
const sortValue = ref(SORT_OPTIONS.value[0].value)
const viewMode = ref<'grid' | 'list'>('list')
const openDropdown = ref<'game' | 'set' | 'condition' | 'price' | null>(null)
const setSearch = ref('')

const toggleDropdown = (name: typeof openDropdown.value) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const gameCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const card of cards.value) {
    const game = card.cardGame?.value
    if (game) counts.set(game, (counts.get(game) ?? 0) + 1)
  }
  return counts
})

const setCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const card of cards.value) {
    const set = card.cardSet?.value
    if (set) counts.set(set, (counts.get(set) ?? 0) + 1)
  }
  return counts
})

const availableGames = computed(() => [...gameCounts.value.keys()].sort())
const availableSets = computed(() => [...setCounts.value.keys()].sort())
const availableConditions = computed(() =>
  [...new Set(cards.value.flatMap((c) => cardConditions(c)))].sort()
)

const filteredSets = computed(() => {
  const term = setSearch.value.trim().toLowerCase()
  if (!term) return availableSets.value
  return availableSets.value.filter((s) => s.toLowerCase().includes(term))
})

const toggleFromSet = (set: Set<string>, value: string) => {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const activeFilterCount = computed(() =>
  selectedGames.value.size + selectedConditions.value.size + selectedSets.value.size +
  (foilOnly.value ? 1 : 0) + (priceMin.value !== null || priceMax.value !== null ? 1 : 0)
)

const resetFilters = () => {
  selectedGames.value = new Set()
  selectedConditions.value = new Set()
  selectedSets.value = new Set()
  foilOnly.value = false
  inStockOnly.value = true
  priceMin.value = null
  priceMax.value = null
}

type Chip = { key: string, label: string, remove: () => void }

const activeChips = computed<Chip[]>(() => {
  const chips: Chip[] = []
  for (const g of selectedGames.value) chips.push({ key: `game-${g}`, label: g, remove: () => { selectedGames.value = toggleFromSet(selectedGames.value, g) } })
  for (const c of selectedConditions.value) chips.push({ key: `cond-${c}`, label: c, remove: () => { selectedConditions.value = toggleFromSet(selectedConditions.value, c) } })
  for (const s of selectedSets.value) chips.push({ key: `set-${s}`, label: s, remove: () => { selectedSets.value = toggleFromSet(selectedSets.value, s) } })
  if (foilOnly.value) chips.push({ key: 'foil', label: 'Foil', remove: () => { foilOnly.value = false } })
  if (priceMin.value !== null || priceMax.value !== null) {
    chips.push({ key: 'price', label: `${priceMin.value ?? 0}–${priceMax.value ?? '∞'} kr`, remove: () => { priceMin.value = null; priceMax.value = null } })
  }
  return chips
})

const inPriceRange = (amount: number) =>
  (priceMin.value === null || amount >= priceMin.value) && (priceMax.value === null || amount <= priceMax.value)

const filteredCards = computed(() => {
  const term = search.value.trim().toLowerCase()

  let result = cards.value.filter((card) => {
    if (term && !card.title.toLowerCase().includes(term) && !(card.collectorNumber?.value || '').toLowerCase().includes(term)) return false
    if (selectedGames.value.size && !selectedGames.value.has(card.cardGame?.value || '')) return false
    if (selectedSets.value.size && !selectedSets.value.has(card.cardSet?.value || '')) return false
    if (selectedConditions.value.size) {
      const conditions = cardConditions(card)
      if (!conditions.some((c) => selectedConditions.value.has(c))) return false
    }
    if (foilOnly.value && !cardHasFoil(card)) return false
    if (inStockOnly.value && !cardIsInStock(card)) return false
    if ((priceMin.value !== null || priceMax.value !== null) && !cardVariants(card).some((v) => inPriceRange(Number(v.price.amount)))) return false
    return true
  })

  if (sortValue.value === 'price-asc' || sortValue.value === 'price-desc') {
    const dir = sortValue.value === 'price-asc' ? 1 : -1
    result = [...result].sort((a, b) => dir * ((cardLowestPrice(a) ?? 0) - (cardLowestPrice(b) ?? 0)))
  } else {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title, locale.value))
  }

  return result
})

// --- List view: one row per matching variant ---
type Row = { key: string, card: SingleCard, variant: Variant, condition: string | null, foil: boolean }

const rows = computed<Row[]>(() => {
  return filteredCards.value.flatMap((card) =>
    cardVariants(card)
      .filter((v) => {
        const condition = optionValue(v, 'Skick')
        if (selectedConditions.value.size && !selectedConditions.value.has(condition || '')) return false
        if (foilOnly.value && optionValue(v, 'Foil') !== 'Ja') return false
        if (inStockOnly.value && !v.availableForSale) return false
        if ((priceMin.value !== null || priceMax.value !== null) && !inPriceRange(Number(v.price.amount))) return false
        return true
      })
      .map((v) => ({ key: v.id, card, variant: v, condition: optionValue(v, 'Skick'), foil: optionValue(v, 'Foil') === 'Ja' }))
  )
})

// --- Quantity steppers + batch add (list view) ---
const quantities = ref<Record<string, number>>({})

const quantityFor = (variantId: string) => quantities.value[variantId] ?? 0

const setQuantity = (row: Row, next: number) => {
  const max = row.variant.quantityAvailable ?? 99
  quantities.value = { ...quantities.value, [row.variant.id]: Math.max(0, Math.min(next, max)) }
}

const selectedRows = computed(() => rows.value.filter((r) => quantityFor(r.variant.id) > 0))
const selectedCount = computed(() => selectedRows.value.reduce((sum, r) => sum + quantityFor(r.variant.id), 0))
const selectedTotal = computed(() => selectedRows.value.reduce((sum, r) => sum + Number(r.variant.price.amount) * quantityFor(r.variant.id), 0))

const { formatMoney, addVariantsToCart, cartBusy } = useShopifyCart()

const addRow = async (row: Row) => {
  const qty = quantityFor(row.variant.id) || 1
  setQuantity(row, qty)
  await addVariantsToCart([{ variantId: row.variant.id, quantity: qty }], t('cart.itemAdded', { title: row.card.title }))
}

const addAllSelected = async () => {
  const lines = selectedRows.value.map((r) => ({ variantId: r.variant.id, quantity: quantityFor(r.variant.id) }))
  await addVariantsToCart(lines, t('cart.itemsAdded', { count: selectedCount.value }))
  quantities.value = {}
}

useSeoMeta({
  title: 'Singelkort | Butik Lyktan',
  description: () => t('singles.seoDescription'),
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="lykta min-h-screen pb-24">
    <div class="page-shell px-4 pt-8 sm:px-6">
      <nav class="label mb-2 !text-[11.5px]">
        <NuxtLink :to="localePath('/')" class="hover:underline">{{ t('singles.breadcrumbHome') }}</NuxtLink> / {{ t('singles.title') }}
      </nav>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[clamp(1.9rem,4vw,2.5rem)]">{{ t('singles.title') }}</h1>
          <p class="mt-2 max-w-[52ch] text-[15px] leading-6" style="color: var(--color-neutral-700)">
            {{ t('singles.intro') }}
          </p>
        </div>

        <div class="hidden gap-2 sm:flex">
          <button type="button" class="btn" :class="viewMode === 'grid' ? 'btn-selected' : 'btn-secondary'" @click="viewMode = 'grid'">▦ {{ t('singles.grid') }}</button>
          <button type="button" class="btn" :class="viewMode === 'list' ? 'btn-selected' : 'btn-secondary'" @click="viewMode = 'list'">☰ {{ t('singles.list') }}</button>
        </div>
      </div>

      <!-- Desktop filter row -->
      <div
        class="relative mt-6 hidden items-center gap-2 rounded-[10px] border p-2 sm:flex"
        style="background: var(--color-surface); border-color: var(--color-divider)"
      >
        <input
          v-model="search"
          type="search"
          :placeholder="t('singles.searchPlaceholder')"
          class="input flex-1"
        >

        <div class="relative">
          <button type="button" class="btn btn-secondary" @click="toggleDropdown('game')">
            {{ t('singles.game') }} <span v-if="selectedGames.size">({{ selectedGames.size }})</span> ▾
          </button>
          <div
            v-if="openDropdown === 'game'"
            class="card elev-lg absolute left-0 top-[calc(100%+8px)] z-20 grid w-60 gap-1.5"
          >
            <label v-for="game in availableGames" :key="game" class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                :checked="selectedGames.has(game)"
                style="accent-color: var(--color-accent); width: 15px; height: 15px"
                @change="selectedGames = toggleFromSet(selectedGames, game)"
              >
              {{ game }}
              <span class="ml-auto text-[12px]" style="color: var(--color-neutral-600)">{{ gameCounts.get(game) }}</span>
            </label>
          </div>
        </div>

        <div class="relative">
          <button type="button" class="btn btn-secondary" @click="toggleDropdown('set')">
            {{ t('singles.set') }} <span v-if="selectedSets.size">({{ selectedSets.size }})</span> ▾
          </button>
          <div
            v-if="openDropdown === 'set'"
            class="card elev-lg absolute left-0 top-[calc(100%+8px)] z-20 grid w-64 gap-2"
          >
            <input v-model="setSearch" type="search" :placeholder="t('singles.searchSet')" class="input">
            <div class="grid max-h-52 gap-1.5 overflow-y-auto">
              <label v-for="set in filteredSets" :key="set" class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  :checked="selectedSets.has(set)"
                  style="accent-color: var(--color-accent); width: 15px; height: 15px"
                  @change="selectedSets = toggleFromSet(selectedSets, set)"
                >
                {{ set }}
                <span class="ml-auto text-[12px]" style="color: var(--color-neutral-600)">{{ setCounts.get(set) }}</span>
              </label>
              <p v-if="!filteredSets.length" class="text-sm" style="color: var(--color-neutral-600)">{{ t('singles.noSetsMatch') }}</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <button type="button" class="btn btn-secondary" @click="toggleDropdown('condition')">
            {{ t('singles.condition') }} <span v-if="selectedConditions.size">({{ selectedConditions.size }})</span> ▾
          </button>
          <div
            v-if="openDropdown === 'condition'"
            class="card elev-lg absolute left-0 top-[calc(100%+8px)] z-20 flex w-56 flex-wrap gap-1.5"
          >
            <button
              v-for="condition in availableConditions"
              :key="condition"
              type="button"
              class="tag"
              :class="selectedConditions.has(condition) ? 'tag-accent' : 'tag-outline'"
              @click="selectedConditions = toggleFromSet(selectedConditions, condition)"
            >
              {{ conditionLabel(condition) }}
            </button>
          </div>
        </div>

        <div class="relative">
          <button type="button" class="btn btn-secondary" @click="toggleDropdown('price')">
            {{ t('singles.price') }} ▾
          </button>
          <div
            v-if="openDropdown === 'price'"
            class="card elev-lg absolute left-0 top-[calc(100%+8px)] z-20 grid w-56 gap-2"
          >
            <label class="field">
              <span>{{ t('singles.priceMin') }}</span>
              <input v-model.number="priceMin" type="number" min="0" class="input" placeholder="0">
            </label>
            <label class="field">
              <span>{{ t('singles.priceMax') }}</span>
              <input v-model.number="priceMax" type="number" min="0" class="input" placeholder="1500">
            </label>
          </div>
        </div>

        <button type="button" class="btn" :class="inStockOnly ? 'btn-selected' : 'btn-secondary'" @click="inStockOnly = !inStockOnly">
          {{ t('singles.inStock') }} {{ inStockOnly ? '✓' : '' }}
        </button>

        <!-- backdrop to close an open dropdown on outside click -->
        <button
          v-if="openDropdown"
          type="button"
          class="fixed inset-0 z-10 cursor-default"
          style="background: transparent"
          :aria-label="t('singles.closeFilter')"
          @click="openDropdown = null"
        />
      </div>

      <!-- Mobile filter strip -->
      <div class="mt-6 grid gap-2 sm:hidden">
        <input v-model="search" type="search" :placeholder="t('singles.searchPlaceholderShort')" class="input">
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button type="button" class="btn btn-selected shrink-0" style="min-height: 44px" @click="mobileFilterDrawerOpen = true">
            {{ t('shop.filter') }} <span v-if="activeFilterCount">· {{ activeFilterCount }}</span>
          </button>
          <button type="button" class="btn shrink-0" :class="inStockOnly ? 'btn-selected' : 'btn-secondary'" style="min-height: 44px" @click="inStockOnly = !inStockOnly">
            {{ t('singles.inStock') }} {{ inStockOnly ? '✓' : '' }}
          </button>
        </div>
      </div>

      <!-- Active filter chips -->
      <div v-if="!loading && !loadError" class="mt-4 flex flex-wrap items-center gap-1.5 text-[13px]" style="color: var(--color-neutral-700)">
        <span class="num">{{ t('singles.cardCount', filteredCards.length) }}</span>
        <template v-if="activeChips.length">
          <span style="color: var(--color-neutral-400)">·</span>
          <button v-for="chip in activeChips" :key="chip.key" type="button" class="tag tag-accent" @click="chip.remove">
            {{ chip.label }} ✕
          </button>
          <button type="button" class="text-[13px] font-semibold" style="color: var(--color-accent-700)" @click="resetFilters">{{ t('shop.clearFilters') }}</button>
        </template>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">
        <div v-for="i in 8" :key="i" class="grid gap-2">
          <div class="organic-skeleton aspect-[5/7]" style="border-radius: var(--radius-md)" />
          <div class="organic-skeleton h-3 w-3/4 rounded-full" />
          <div class="organic-skeleton h-3 w-1/3 rounded-full" />
        </div>
      </div>

      <p v-else-if="loadError" class="mt-6 text-sm" style="color: var(--color-accent-700)">{{ loadError }}</p>

      <div v-else-if="!cards.length" class="card mt-6 p-10 text-center">
        <p class="card-kicker">{{ t('singles.noneYet') }}</p>
        <h3 class="mt-2 text-xl">{{ t('singles.stockingSoon') }}</h3>
        <p class="mt-2 text-sm" style="color: var(--color-neutral-600)">{{ t('singles.checkBackSoon') }}</p>
      </div>

      <template v-else-if="!filteredCards.length">
        <div class="card mt-6 p-10 text-center">
          <p class="card-kicker">{{ t('singles.noMatches') }}</p>
          <h3 class="mt-2 text-xl">{{ t('shop.noProductsMatch') }}</h3>
          <button type="button" class="btn btn-selected mt-4" @click="resetFilters">{{ t('shop.clearFilters') }}</button>
        </div>
      </template>

      <!-- Grid view -->
      <div v-else-if="viewMode === 'grid'" class="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">
        <NuxtLink v-for="card in filteredCards" :key="card.id" :to="localePath(`/singelkort/${card.handle}`)" class="grid gap-1.5">
          <div
            class="relative overflow-hidden"
            style="aspect-ratio: 5/7; border-radius: var(--radius-md); background: var(--color-neutral-100); box-shadow: inset 0 0 0 1px var(--color-divider)"
          >
            <img
              v-if="card.featuredImage?.url"
              :src="card.featuredImage.url"
              :alt="card.featuredImage.altText || card.title"
              class="washed h-full w-full object-contain p-2"
            >
            <div v-else class="grid h-full w-full place-items-center text-2xl font-bold" style="color: var(--color-neutral-500); font-family: var(--font-heading)">
              {{ card.title.slice(0, 2).toUpperCase() }}
            </div>
            <span v-if="cardHasFoil(card)" class="tag tag-accent absolute left-2 top-2">{{ t('singles.foil') }}</span>
            <span v-if="!cardIsInStock(card)" class="tag tag-neutral absolute right-2 top-2">{{ t('singles.soldOutShort') }}</span>
          </div>
          <div>
            <div class="truncate text-[11px]" style="color: var(--color-neutral-600)">
              {{ [card.cardGame?.value, card.cardSet?.value].filter(Boolean).join(' · ') }}
            </div>
            <div class="truncate text-[14px] font-bold leading-snug">{{ card.title }}</div>
            <div class="mt-0.5 flex items-baseline gap-1.5">
              <span class="num text-[15px] font-medium" :style="{ color: cardIsInStock(card) ? 'var(--color-text)' : 'var(--color-neutral-600)' }">
                {{ cardLowestPrice(card) !== null ? formatMoney(String(cardLowestPrice(card)), cardVariants(card)[0]?.price.currencyCode || 'SEK') : '—' }}
              </span>
              <span class="text-[11px]" style="color: var(--color-neutral-600)">
                {{ cardIsInStock(card) ? t('singles.stockAndCondition', { count: cardStockCount(card), condition: conditionLabel(cardConditions(card)[0]) || '' }) : t('singles.watch') }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- List view -->
      <div v-else class="mt-4">
        <div
          class="hidden gap-3 px-3 pb-2 text-[11px] font-bold uppercase sm:grid"
          style="grid-template-columns: 56px 1fr 150px 110px 90px 90px 130px; letter-spacing: .07em; color: var(--color-neutral-600)"
        >
          <div /><div>{{ t('singles.card') }}</div><div>{{ t('singles.set') }}</div><div>{{ t('singles.condition') }}</div><div>{{ t('singles.stock') }}</div><div>{{ t('singles.price') }}</div><div />
        </div>

        <div class="lykta-table">
          <div
            v-for="row in rows"
            :key="row.key"
            class="lykta-row grid items-center gap-3 p-3 sm:grid-cols-[56px_1fr_150px_110px_90px_90px_130px]"
            :class="{ 'opacity-60': !row.variant.availableForSale }"
          >
            <NuxtLink :to="localePath(`/singelkort/${row.card.handle}`)" class="hidden sm:block">
              <div
                class="overflow-hidden"
                style="aspect-ratio: 5/7; border-radius: var(--radius-sm); background: var(--color-neutral-200); box-shadow: inset 0 0 0 1px var(--color-divider)"
              >
                <img v-if="row.card.featuredImage?.url" :src="row.card.featuredImage.url" :alt="row.card.title" class="washed h-full w-full object-contain">
              </div>
            </NuxtLink>

            <NuxtLink :to="localePath(`/singelkort/${row.card.handle}`)" class="min-w-0">
              <div class="truncate text-[15px] font-bold">
                {{ row.card.title }}
                <span v-if="row.foil" class="tag tag-accent align-middle text-[10px]">{{ t('singles.foil') }}</span>
              </div>
              <div class="truncate text-[12px]" style="color: var(--color-neutral-600)">
                {{ row.card.cardGame?.value }}<template v-if="row.card.collectorNumber?.value"> · <span class="num">{{ row.card.collectorNumber.value }}</span></template><template v-if="row.card.rarity?.value"> · {{ row.card.rarity.value }}</template>
              </div>
            </NuxtLink>

            <div class="hidden truncate text-[13px] sm:block">{{ row.card.cardSet?.value }}</div>

            <div>
              <span :class="conditionClass(row.condition)">{{ conditionLabel(row.condition) }}</span>
            </div>

            <div
              class="num text-[13px] font-medium"
              :style="{ color: !row.variant.availableForSale ? 'var(--color-neutral-600)' : (row.variant.quantityAvailable ?? 2) <= 1 ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)' }"
            >
              {{ row.variant.availableForSale ? t('singles.stockCount', { count: row.variant.quantityAvailable ?? '—' }) : t('singles.soldOutShort') }}
            </div>

            <div class="num text-[15px] font-medium">{{ formatMoney(row.variant.price.amount, row.variant.price.currencyCode) }}</div>

            <div class="flex items-center gap-1.5">
              <template v-if="row.variant.availableForSale">
                <div class="num flex items-center gap-2 rounded-[7px] px-2.5 py-1 text-[13px]" style="border: 1px solid var(--color-divider); background: var(--color-surface)">
                  <button type="button" class="leading-none" @click="setQuantity(row, quantityFor(row.variant.id) - 1)">−</button>
                  <span class="w-4 text-center">{{ quantityFor(row.variant.id) }}</span>
                  <button type="button" class="leading-none" @click="setQuantity(row, quantityFor(row.variant.id) + 1)">+</button>
                </div>
                <button
                  type="button"
                  class="btn btn-primary btn-icon"
                  :disabled="cartBusy"
                  @click="addRow(row)"
                >
                  +
                </button>
              </template>
              <button v-else type="button" class="btn btn-secondary text-[13px]">{{ t('singles.watch') }}</button>
            </div>
          </div>

          <p v-if="!rows.length" class="p-6 text-center text-sm" style="color: var(--color-neutral-600)">
            {{ t('singles.noListMatches') }}
          </p>
        </div>

        <div
          v-if="selectedCount > 0"
          class="sticky bottom-4 mt-4 flex items-center justify-between rounded-[10px] border px-4 py-3"
          style="background: var(--color-surface); border-color: var(--color-divider); box-shadow: var(--shadow-md)"
        >
          <div class="text-[14px]">
            <strong>{{ t('singles.cardsSelected', selectedCount) }}</strong>
            <span class="num" style="color: var(--color-neutral-700)"> · {{ formatMoney(String(selectedTotal), 'SEK') }}</span>
          </div>
          <button type="button" class="btn btn-primary" :disabled="cartBusy" @click="addAllSelected">{{ t('singles.addAllToCart') }}</button>
        </div>
      </div>
    </div>

    <!-- Mobile filter drawer -->
    <div v-if="mobileFilterDrawerOpen" class="fixed inset-0 z-30 flex items-end sm:hidden" style="background: color-mix(in srgb, var(--color-neutral-900) 50%, transparent)" @click.self="mobileFilterDrawerOpen = false">
      <div class="lykta w-full p-4" style="background: var(--color-surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-xl">{{ t('shop.filter') }}</h4>
          <button type="button" class="text-[13px] font-bold" style="color: var(--color-accent-700)" @click="resetFilters">{{ t('shop.clearFilters') }}</button>
        </div>

        <h6 class="mb-2">{{ t('singles.game') }}</h6>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="game in availableGames"
            :key="game"
            type="button"
            class="btn"
            :class="selectedGames.has(game) ? 'btn-selected' : 'btn-secondary'"
            style="min-height: 44px"
            @click="selectedGames = toggleFromSet(selectedGames, game)"
          >
            {{ game }}
          </button>
        </div>

        <h6 class="mb-2">{{ t('singles.condition') }}</h6>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="condition in availableConditions"
            :key="condition"
            type="button"
            class="btn"
            :class="selectedConditions.has(condition) ? 'btn-selected' : 'btn-secondary'"
            style="min-height: 44px"
            @click="selectedConditions = toggleFromSet(selectedConditions, condition)"
          >
            {{ conditionLabel(condition) }}
          </button>
        </div>

        <label class="flex items-center gap-2.5 text-[15px]" style="min-height: 44px">
          <input v-model="inStockOnly" type="checkbox" style="accent-color: var(--color-accent); width: 18px; height: 18px">
          {{ t('singles.inStock') }}
        </label>
        <label class="flex items-center gap-2.5 text-[15px]" style="min-height: 44px">
          <input v-model="foilOnly" type="checkbox" style="accent-color: var(--color-accent); width: 18px; height: 18px">
          {{ t('singles.foilOnly') }}
        </label>

        <button type="button" class="btn btn-selected btn-block" style="min-height: 48px" @click="mobileFilterDrawerOpen = false">
          {{ t('singles.showCount', filteredCards.length) }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.organic-skeleton {
  background: linear-gradient(90deg, var(--color-neutral-200) 0%, var(--color-neutral-100) 50%, var(--color-neutral-200) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
