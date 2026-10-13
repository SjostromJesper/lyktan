<script setup lang="ts">
import '~/assets/css/singelkort.css'

definePageMeta({ layout: 'singles' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const handle = computed(() => String(route.params.handle || ''))
const productResponse = useState<{ handle?: string | null; product?: any | null } | null>('shopify-single', () => null)
const error = ref<Error | null>(null)
const loadingProduct = ref(false)
let inventoryRefreshInterval: ReturnType<typeof window.setInterval> | undefined

const loadProduct = async (force = false) => {
  if (!handle.value) return

  const isSameProductAlreadyShown = productResponse.value?.handle === handle.value
  if (!isSameProductAlreadyShown) loadingProduct.value = true

  try {
    const query: Record<string, unknown> = { lang: locale.value }
    if (force) query.t = Date.now()
    productResponse.value = await $fetch(`/api/shopify/product/${handle.value}`, { query, cache: 'no-store' })
    error.value = null
  } catch (caughtError: any) {
    error.value = caughtError
    productResponse.value = null
  } finally {
    loadingProduct.value = false
  }
}

if (import.meta.server) {
  await loadProduct()
}

watch([handle, locale], () => loadProduct())

const product = computed(() => productResponse.value?.product ?? null)
const variants = computed<any[]>(() => product.value?.variants?.nodes ?? [])

// --- Variant helpers ---------------------------------------------------------
const optionValue = (variant: any, optionName: string) =>
  variant.selectedOptions?.find((o: any) => o.name.toLowerCase() === optionName.toLowerCase())?.value ?? null

// Shopify's Swedish condition options, in the Cardmarket scale the design shows.
const CONDITIONS: Record<string, { code: string, bg: string, fg: string, order: number }> = {
  Nyskick: { code: 'NM', bg: '#13261A', fg: '#56D364', order: 0 },
  Utmärkt: { code: 'EX', bg: '#0F2624', fg: '#3CCFB8', order: 1 },
  Bra: { code: 'GD', bg: '#2A2410', fg: '#E3B341', order: 2 },
  Ok: { code: 'LP', bg: '#2B1C10', fg: '#F0883E', order: 3 },
  Dåligt: { code: 'PL', bg: '#2B1514', fg: '#F47067', order: 4 }
}

const CONDITION_KEYS: Record<string, string> = {
  Nyskick: 'singles.conditionMint',
  Utmärkt: 'singles.conditionExcellent',
  Bra: 'singles.conditionGood',
  Ok: 'singles.conditionOk',
  Dåligt: 'singles.conditionPoor'
}

const conditionLabel = (condition: string | null) => (condition && CONDITION_KEYS[condition] ? t(CONDITION_KEYS[condition]) : condition)

const LANGUAGE_CODES: Record<string, string> = {
  Engelska: 'EN', Svenska: 'SV', Tyska: 'DE', Franska: 'FR', Italienska: 'IT', Spanska: 'ES',
  Portugisiska: 'PT', Japanska: 'JA', Koreanska: 'KO', Ryska: 'RU'
}

const languageCode = computed(() => {
  const value = product.value?.cardLanguage?.value as string | undefined
  if (!value) return 'EN'
  return LANGUAGE_CODES[value] ?? (value.startsWith('Kinesiska') ? 'ZH' : value.slice(0, 2).toUpperCase())
})

const stockOf = (variant: any) => (variant.availableForSale ? (variant.quantityAvailable ?? 1) : 0)

const hasFoil = computed(() => variants.value.some((v) => optionValue(v, 'Foil') === 'Ja'))
const hasNormal = computed(() => variants.value.some((v) => optionValue(v, 'Foil') !== 'Ja'))

const foil = ref(false)
watch(variants, () => {
  if (foil.value && !hasFoil.value) foil.value = false
  if (!foil.value && !hasNormal.value && hasFoil.value) foil.value = true
}, { immediate: true })

// One row per condition for the chosen finish, best condition first.
const rows = computed(() =>
  variants.value
    .filter((v) => (optionValue(v, 'Foil') === 'Ja') === foil.value)
    .sort((a, b) => (CONDITIONS[optionValue(a, 'Skick') ?? '']?.order ?? 9) - (CONDITIONS[optionValue(b, 'Skick') ?? '']?.order ?? 9))
)

const quantities = ref<Record<string, number>>({})
const qtyFor = (variant: any) => quantities.value[variant.id] ?? (stockOf(variant) > 0 ? 1 : 0)
const setQty = (variant: any, next: number) => {
  const stock = stockOf(variant)
  quantities.value = { ...quantities.value, [variant.id]: Math.min(stock, Math.max(stock > 0 ? 1 : 0, next)) }
}

const activeVariantId = ref('')
const activeVariant = computed(() => {
  const picked = rows.value.find((v) => v.id === activeVariantId.value)
  return picked ?? rows.value.find((v) => stockOf(v) > 0) ?? rows.value[0] ?? null
})
watch(foil, () => { activeVariantId.value = '' })

// Each variant is a specific physical copy with its own scan.
const shownImage = computed(() => activeVariant.value?.image ?? product.value?.featuredImage ?? null)

const stockTotal = computed(() => rows.value.reduce((sum, v) => sum + stockOf(v), 0))
const fromPrice = computed(() => {
  const pool = rows.value.filter((v) => stockOf(v) > 0)
  const list = pool.length ? pool : rows.value
  return list.length ? Math.min(...list.map((v) => Number(v.price.amount))) : null
})

const { addVariantsToCart, loadingVariantId, formatMoney } = useSinglesCart()

const money = (amount: number | string | null | undefined) =>
  amount == null ? '–' : formatMoney(String(amount), rows.value[0]?.price?.currencyCode || variants.value[0]?.price?.currencyCode || 'SEK')

const addToCart = async (variant: any) => {
  const quantity = qtyFor(variant)
  if (!variant?.id || quantity < 1 || !product.value) return
  loadingVariantId.value = variant.id
  try {
    await addVariantsToCart([{ variantId: variant.id, quantity }], t('cart.itemAdded', { title: product.value.title }))
  } finally {
    loadingVariantId.value = ''
  }
  await loadProduct(true)
  quantities.value = {}
}

// --- Rarity, mana and card facts ---------------------------------------------
const RARITY_COLORS: Record<string, string> = { common: '#D9D9D9', uncommon: '#8FB3D1', rare: '#E0C063', mythic: '#E8743B' }
const rarityKey = computed(() => String(product.value?.rarity?.value ?? '').toLowerCase().split(' ')[0] ?? '')
const rarityColor = computed(() => RARITY_COLORS[rarityKey.value] ?? '#9AA3AE')
const rarityLabel = computed(() => (rarityKey.value === 'mythic' ? 'Mythic' : product.value?.rarity?.value ?? ''))

type Details = {
  card: { manaCost: string, typeLine: string, oracleText: string, power: string | null, toughness: string | null, loyalty: string | null } | null
  prices: { trend: number | null, trendFoil: number | null, avg1: number | null, avg7: number | null, avg30: number | null, avg30Foil: number | null } | null
}

const details = ref<Details | null>(null)

const loadDetails = async () => {
  const setCode = product.value?.setCode?.value
  const number = product.value?.collectorNumber?.value
  const game = product.value?.cardGame?.value?.startsWith('Pok') ? 'pokemon' : 'mtg'
  details.value = null
  if (!setCode || !number) return
  details.value = await $fetch<Details>('/api/singelkort-details', { query: { game, set: setCode, number } }).catch(() => null)
}

watch(() => product.value?.id, loadDetails, { immediate: true })

const PIP_STYLES: Record<string, string> = {
  W: 'background:#F1EBCF;color:#0D1015',
  U: 'background:#B7DCF2;color:#0D1015',
  B: 'background:#1A1714;border:2px solid #4A525E;color:#C9CFD6',
  R: 'background:#F3AE98;color:#0D1015',
  G: 'background:#A5D2AF;color:#0D1015'
}

const manaPips = computed(() =>
  [...(details.value?.card?.manaCost ?? '').matchAll(/\{([^}]+)\}/g)].map((m) => {
    const symbol = m[1] ?? ''
    return { symbol, style: PIP_STYLES[symbol] ?? 'background:#C9C3B6;color:#0D1015', text: PIP_STYLES[symbol] ? '' : symbol.replace('/', '') }
  })
)

const powerToughness = computed(() => {
  const c = details.value?.card
  if (!c) return ''
  if (c.power != null && c.toughness != null) return `${c.power}/${c.toughness}`
  return c.loyalty ? `${c.loyalty}` : ''
})

const trendPrice = computed(() => (foil.value ? details.value?.prices?.trendFoil : details.value?.prices?.trend) ?? null)

// Price history isn't stored yet, so the curve is the guide's own averages leading up to today.
const chart = computed(() => {
  const p = details.value?.prices
  if (!p) return null
  const raw = foil.value ? [p.avg30Foil, p.trendFoil] : [p.avg30, p.avg7, p.avg1, p.trend]
  const labels = foil.value ? ['Snitt 30 d', 'Trend'] : ['Snitt 30 d', 'Snitt 7 d', 'Igår', 'Trend']
  const points = raw.map((v, i) => ({ v, label: labels[i]! })).filter((x): x is { v: number, label: string } => x.v != null)
  if (points.length < 2) return null

  const min = Math.min(...points.map((x) => x.v))
  const max = Math.max(...points.map((x) => x.v))
  const span = max - min || 1
  const coords = points.map((x, i) => ({
    x: (i / (points.length - 1)) * 800,
    y: 20 + (1 - (x.v - min) / span) * 110,
    ...x
  }))
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  return { coords, line, area: `${line} L800 160 L0 160 Z` }
})

// --- Other printings + more from the set -------------------------------------
type ListCard = { id: string, title: string, handle: string, featuredImage: { url: string } | null, cardSet: { value: string } | null, setCode?: { value: string } | null, collectorNumber: { value: string } | null, variants: { nodes: any[] } }
const allCards = ref<ListCard[]>([])

const loadAllCards = async () => {
  const res = await $fetch<{ products: ListCard[] }>('/api/shopify/singelkort', { query: { lang: locale.value } }).catch(() => ({ products: [] as ListCard[] }))
  allCards.value = res.products
}

onMounted(loadAllCards)

const cardPrice = (card: ListCard) => {
  const list = card.variants.nodes.filter((v) => v.availableForSale)
  const pool = list.length ? list : card.variants.nodes
  return pool.length ? Math.min(...pool.map((v) => Number(v.price.amount))) : null
}

const otherPrintings = computed(() =>
  allCards.value.filter((c) => c.title === product.value?.title && c.handle !== handle.value).slice(0, 2)
)

const moreFromSet = computed(() =>
  allCards.value.filter((c) => c.handle !== handle.value && c.cardSet?.value && c.cardSet.value === product.value?.cardSet?.value).slice(0, 6)
)

onMounted(() => {
  loadProduct(true)
  inventoryRefreshInterval = window.setInterval(() => loadProduct(true), 30000)
})

onBeforeUnmount(() => {
  if (inventoryRefreshInterval) window.clearInterval(inventoryRefreshInterval)
})

useSeoMeta({
  title: () => product.value?.title ? `${product.value.title} | Singelkort | Butik Lyktan` : 'Singelkort | Butik Lyktan',
  description: () => details.value?.card?.oracleText?.slice(0, 160) || product.value?.description || t('singles.seoDescription'),
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="lykta min-h-[60vh] px-4 pb-20 pt-5 sm:px-6 lg:px-10">
    <div class="mx-auto w-full max-w-[1360px]">
      <!-- Brödsmulor -->
      <nav class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" style="color: #9AA3AE" aria-label="Brödsmulor">
        <NuxtLink :to="localePath('/singelkort')" class="transition hover:text-[#F2A93B]">{{ t('singles.title') }}</NuxtLink>
        <template v-if="product?.cardGame?.value">
          <span>/</span><span>{{ product.cardGame.value }}</span>
        </template>
        <template v-if="product?.cardSet?.value">
          <span>/</span><span>{{ product.cardSet.value }}</span>
        </template>
        <template v-if="product">
          <span>/</span><span style="color: #E8EAED">{{ product.title }}</span>
        </template>
      </nav>

      <!-- Laddar -->
      <div v-if="loadingProduct" class="mt-6 grid gap-10 lg:grid-cols-12" aria-hidden="true">
        <div class="lg:col-span-4"><div class="organic-skeleton w-full rounded-[20px]" style="aspect-ratio: 63/88" /></div>
        <div class="grid content-start gap-4 lg:col-span-8">
          <div class="organic-skeleton h-3 w-40 rounded-full" />
          <div class="organic-skeleton h-10 w-3/5 rounded-full" />
          <div class="organic-skeleton h-24 w-full rounded-2xl" />
        </div>
      </div>

      <div v-else-if="error" class="mt-6 rounded-[18px] border p-8" style="background: #12161C; border-color: #1E242D">
        <p class="label">{{ t('product.apiError') }}</p>
        <h1 class="mt-3 text-2xl">{{ t('singles.cardLoadFailed') }}</h1>
        <p class="mt-4 text-sm" style="color: #9AA3AE">{{ error.message }}</p>
      </div>

      <template v-else-if="product">
        <section class="mt-6 grid items-start gap-8 lg:grid-cols-12 lg:gap-x-10">
          <!-- Bild -->
          <div class="mx-auto flex w-full max-w-[300px] flex-col gap-4 sm:max-w-[360px] lg:col-span-4 lg:max-w-none">
            <div
              class="relative flex items-center justify-center overflow-hidden rounded-[20px] border"
              :style="{ aspectRatio: '63 / 88', background: foil ? '#241F33' : '#161B22', borderColor: foil ? '#4B3F7A' : '#2A313C' }"
            >
              <img
                v-if="shownImage?.url"
                :src="shopifyImage(shownImage.url, 800)"
                :srcset="shopifySrcset(shownImage.url, [420, 800, 1100])"
                sizes="(min-width: 1024px) 30vw, 300px"
                fetchpriority="high"
                :alt="shownImage.altText || product.title"
                class="h-full w-full object-cover"
              >
              <span v-else class="text-[13px]" style="color: #6F7883">Kortbild saknas</span>
              <span
                v-if="foil"
                class="num absolute left-3.5 top-3.5 rounded-[7px] border px-[9px] py-1 text-[11px] font-semibold tracking-[0.08em]"
                style="background: #0D1015; color: #C7B8FF; border-color: #4B3F7A"
              >FOIL</span>
            </div>

            <div v-if="hasFoil && hasNormal" role="group" aria-label="Utförande" class="grid grid-cols-2 rounded-[14px] border p-1" style="background: #161B22; border-color: #2A313C">
              <button
                type="button"
                class="h-11 rounded-[10px] text-sm font-bold transition"
                :style="!foil ? 'background:#2A313C;color:#E8EAED' : 'background:transparent;color:#9AA3AE'"
                :aria-pressed="!foil"
                @click="foil = false"
              >Normal</button>
              <button
                type="button"
                class="h-11 rounded-[10px] text-sm font-bold transition"
                :style="foil ? 'background:#2A313C;color:#E8EAED' : 'background:transparent;color:#9AA3AE'"
                :aria-pressed="foil"
                @click="foil = true"
              >Foil</button>
            </div>

            <div v-if="otherPrintings.length" class="flex flex-col gap-2.5">
              <span class="num text-[11px] font-semibold uppercase tracking-[0.12em]" style="color: #9AA3AE">Andra utgåvor</span>
              <div class="grid grid-cols-3 gap-2.5">
                <div class="flex flex-col gap-1.5 rounded-xl border-2 p-2" style="background: #161B22; border-color: #F2A93B">
                  <span class="block overflow-hidden rounded-md" style="aspect-ratio: 63/88; background: #23262E">
                    <img v-if="product.featuredImage?.url" :src="shopifyImage(product.featuredImage.url, 240)" :alt="product.title" loading="lazy" class="h-full w-full object-cover">
                  </span>
                  <span class="num text-[11px]">{{ [product.setCode?.value, product.collectorNumber?.value && `#${product.collectorNumber.value}`].filter(Boolean).join(' ') }}</span>
                </div>
                <NuxtLink
                  v-for="other in otherPrintings"
                  :key="other.id"
                  :to="localePath(`/singelkort/${other.handle}`)"
                  class="flex flex-col gap-1.5 rounded-xl border-2 p-2 transition hover:border-[#4A525E]"
                  style="background: #161B22; border-color: #2A313C"
                >
                  <span class="block overflow-hidden rounded-md" style="aspect-ratio: 63/88; background: #23262E">
                    <img v-if="other.featuredImage?.url" :src="shopifyImage(other.featuredImage.url, 240)" :alt="other.title" loading="lazy" class="h-full w-full object-cover">
                  </span>
                  <span class="num text-[11px]" style="color: #9AA3AE">{{ [other.setCode?.value, other.collectorNumber?.value && `#${other.collectorNumber.value}`].filter(Boolean).join(' ') }}</span>
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span v-if="product.setCode?.value || product.collectorNumber?.value" class="num rounded-[7px] px-[9px] py-1 text-xs font-semibold" style="background: #1D232C; color: #C9CFD6">
                  {{ [product.setCode?.value, product.collectorNumber?.value && `#${product.collectorNumber.value}`].filter(Boolean).join(' · ') }}
                </span>
                <span v-if="rarityLabel" class="flex items-center gap-1.5 text-[13px] font-bold" :style="{ color: rarityColor }">
                  <span class="h-[9px] w-[9px] rounded-full" :style="{ background: rarityColor }" />{{ rarityLabel }}
                </span>
                <span v-if="product.cardSet?.value" class="text-[13px]" style="color: #9AA3AE">{{ product.cardSet.value }}</span>
                <span v-if="product.cardLanguage?.value && languageCode !== 'EN'" class="text-[13px]" style="color: #9AA3AE">· {{ product.cardLanguage.value }}</span>
              </div>

              <div class="flex items-start justify-between gap-5">
                <h1 class="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">{{ product.title }}</h1>
                <div v-if="manaPips.length" class="flex shrink-0 gap-[5px] pt-1.5" :aria-label="`Manakostnad ${details?.card?.manaCost}`">
                  <span
                    v-for="(pip, i) in manaPips"
                    :key="i"
                    class="grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-extrabold sm:h-7 sm:w-7 sm:text-sm"
                    :style="pip.style"
                    :title="pip.symbol"
                  >{{ pip.text }}</span>
                </div>
              </div>

              <div v-if="details?.card?.typeLine" class="flex justify-between gap-4 text-[15px]" style="color: #C9CFD6">
                <span>{{ details.card.typeLine }}</span>
                <span v-if="powerToughness" class="num font-semibold">{{ powerToughness }}</span>
              </div>

              <div
                v-if="details?.card?.oracleText"
                class="whitespace-pre-line rounded-[14px] border px-[18px] py-4 text-sm leading-[1.6]"
                style="background: #12161C; border-color: #1E242D; color: #9AA3AE"
              >{{ details.card.oracleText }}</div>
              <div v-else-if="product.description" class="text-sm leading-7" style="color: #9AA3AE">{{ product.description }}</div>
            </div>

            <!-- Siffror -->
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              <div v-for="stat in [
                { label: 'Från', value: money(fromPrice) },
                { label: 'Trendpris', value: trendPrice != null ? money(trendPrice) : '–' },
                { label: 'I lager', value: `${stockTotal} st` }
              ]" :key="stat.label" class="flex flex-col gap-1 rounded-xl border p-3 sm:gap-1.5 sm:rounded-2xl sm:p-[18px]" style="background: #161B22; border-color: #2A313C">
                <span class="num text-[10px] uppercase tracking-[0.1em] sm:text-[11px]" style="color: #9AA3AE">{{ stat.label }}</span>
                <span class="num text-base font-semibold sm:text-[26px]">{{ stat.value }}</span>
              </div>
            </div>

            <!-- Erbjudanden: tabell på desktop -->
            <div class="hidden overflow-hidden rounded-[18px] border xl:block" role="table" aria-label="Exemplar" style="border-color: #1E242D">
              <div role="row" class="num grid h-11 items-center gap-3 px-[18px] text-[11px] font-semibold uppercase tracking-[0.1em]" style="grid-template-columns: 160px 56px minmax(0,1fr) 96px 128px 140px; background: #12161C; color: #9AA3AE">
                <span>Skick</span><span>Språk</span><span>Lager</span><span class="text-right">Pris</span><span>Antal</span><span />
              </div>
              <div
                v-for="v in rows"
                :key="v.id"
                role="row"
                class="grid h-[68px] cursor-pointer items-center gap-3 border-t px-[18px] text-sm transition"
                :class="activeVariant?.id === v.id ? 'bg-[#12161C]' : ''"
                style="grid-template-columns: 160px 56px minmax(0,1fr) 96px 128px 140px; border-color: #1E242D"
                @click="activeVariantId = v.id"
              >
                <span class="flex items-center gap-2.5">
                  <span class="num rounded-md px-2 py-1 text-xs font-semibold" :style="{ background: CONDITIONS[optionValue(v, 'Skick')]?.bg, color: CONDITIONS[optionValue(v, 'Skick')]?.fg }">{{ CONDITIONS[optionValue(v, 'Skick')]?.code ?? '–' }}</span>
                  <span style="color: #C9CFD6">{{ conditionLabel(optionValue(v, 'Skick')) }}</span>
                </span>
                <span class="num" style="color: #C9CFD6">{{ languageCode }}</span>
                <span :style="{ color: stockOf(v) ? '#56D364' : '#9AA3AE' }">{{ stockOf(v) ? `${stockOf(v)} st` : 'Slut i lager' }}</span>
                <span class="num text-right text-[17px] font-semibold">{{ money(v.price.amount) }}</span>
                <div class="flex items-center gap-0.5 rounded-xl border p-0.5" style="background: #0D1015; border-color: #2A313C" @click.stop>
                  <button type="button" aria-label="Minska antal" class="h-10 w-10 rounded-[10px] text-lg disabled:opacity-40" :disabled="stockOf(v) < 1" @click="setQty(v, qtyFor(v) - 1)">−</button>
                  <span class="num w-10 text-center font-semibold">{{ qtyFor(v) }}</span>
                  <button type="button" aria-label="Öka antal" class="h-10 w-10 rounded-[10px] text-lg disabled:opacity-40" :disabled="stockOf(v) < 1" @click="setQty(v, qtyFor(v) + 1)">+</button>
                </div>
                <button
                  v-if="stockOf(v) > 0"
                  type="button"
                  class="h-11 rounded-xl text-sm font-extrabold transition hover:brightness-110 disabled:opacity-60"
                  style="background: #F2A93B; color: #0D1015"
                  :disabled="loadingVariantId === v.id"
                  @click.stop="addToCart(v)"
                >{{ loadingVariantId === v.id ? t('product.adding') : 'Lägg i kundvagn' }}</button>
                <a
                  v-else
                  :href="`mailto:hej@butiklyktan.se?subject=${encodeURIComponent(`Bevaka ${product.title} (${conditionLabel(optionValue(v, 'Skick'))}${foil ? ', foil' : ''})`)}`"
                  class="grid h-11 place-items-center rounded-xl border text-sm font-extrabold transition hover:border-[#9AA3AE]"
                  style="border-color: #4A525E; color: #E8EAED"
                  @click.stop
                >Bevaka</a>
              </div>
            </div>

            <!-- Erbjudanden: kort på mobil -->
            <div class="flex flex-col gap-2.5 xl:hidden">
              <span class="text-[17px] font-extrabold">Välj exemplar</span>
              <div
                v-for="v in rows"
                :key="v.id"
                class="flex flex-col gap-3 rounded-2xl border p-3.5"
                :style="`background:#161B22;border-color:${activeVariant?.id === v.id ? '#4A525E' : '#2A313C'}`"
                @click="activeVariantId = v.id"
              >
                <div class="flex items-center gap-2">
                  <span class="num rounded-md px-2 py-[3px] text-xs font-semibold" :style="{ background: CONDITIONS[optionValue(v, 'Skick')]?.bg, color: CONDITIONS[optionValue(v, 'Skick')]?.fg }">{{ CONDITIONS[optionValue(v, 'Skick')]?.code ?? '–' }}</span>
                  <span class="text-sm" style="color: #C9CFD6">{{ conditionLabel(optionValue(v, 'Skick')) }}</span>
                  <span class="num text-xs" style="color: #9AA3AE">· {{ languageCode }}</span>
                  <span class="num ml-auto text-base font-semibold">{{ money(v.price.amount) }}</span>
                </div>
                <div class="flex items-center gap-2.5" @click.stop>
                  <span class="w-20 text-[13px]" :style="{ color: stockOf(v) ? '#56D364' : '#9AA3AE' }">{{ stockOf(v) ? `${stockOf(v)} st` : 'Slut i lager' }}</span>
                  <div class="flex items-center rounded-xl border p-0.5" style="background: #0D1015; border-color: #2A313C">
                    <button type="button" aria-label="Minska antal" class="h-10 w-10 rounded-[10px] text-lg disabled:opacity-40" :disabled="stockOf(v) < 1" @click="setQty(v, qtyFor(v) - 1)">−</button>
                    <span class="num w-7 text-center font-semibold">{{ qtyFor(v) }}</span>
                    <button type="button" aria-label="Öka antal" class="h-10 w-10 rounded-[10px] text-lg disabled:opacity-40" :disabled="stockOf(v) < 1" @click="setQty(v, qtyFor(v) + 1)">+</button>
                  </div>
                  <button
                    v-if="stockOf(v) > 0"
                    type="button"
                    class="h-11 grow rounded-xl text-sm font-extrabold disabled:opacity-60"
                    style="background: #F2A93B; color: #0D1015"
                    :disabled="loadingVariantId === v.id"
                    @click="addToCart(v)"
                  >{{ loadingVariantId === v.id ? t('product.adding') : 'Lägg i kundvagn' }}</button>
                  <a
                    v-else
                    :href="`mailto:hej@butiklyktan.se?subject=${encodeURIComponent(`Bevaka ${product.title}`)}`"
                    class="grid h-11 grow place-items-center rounded-xl border text-sm font-extrabold"
                    style="border-color: #4A525E; color: #E8EAED"
                  >Bevaka</a>
                </div>
              </div>
            </div>

            <p v-if="!rows.length" class="text-sm" style="color: #9AA3AE">Inga exemplar att visa för det här utförandet.</p>

            <div class="flex flex-col gap-1.5 text-[13px] sm:flex-row sm:flex-wrap sm:gap-x-5" style="color: #9AA3AE">
              <span v-for="point in ['Hämta i butiken samma dag', 'Skickas i toploader med PostNord', 'Skick bedömt enligt Cardmarket']" :key="point" class="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FB950" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>{{ point }}
              </span>
            </div>

            <!-- Prisutveckling -->
            <div v-if="chart" class="flex flex-col gap-3.5 rounded-[18px] border p-4 sm:px-6 sm:py-[22px]" style="background: #12161C; border-color: #1E242D">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="text-[15px] font-extrabold sm:text-[17px]">Prisutveckling</span>
                <span class="num text-[11px]" style="color: #6F7883">Cardmarkets trendpris och snitt, omräknat till kr · historik byggs upp framöver</span>
              </div>
              <svg width="100%" height="160" viewBox="0 0 800 160" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 40 H800 M0 80 H800 M0 120 H800" stroke="#1E242D" stroke-width="1" vector-effect="non-scaling-stroke" />
                <path :d="chart.area" fill="#F2A93B" fill-opacity="0.12" />
                <path :d="chart.line" fill="none" stroke="#F2A93B" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
              </svg>
              <div class="num flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px]" style="color: #9AA3AE">
                <span v-for="c in chart.coords" :key="c.label">{{ c.label }} · {{ money(Math.round(c.v)) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Mer från setet -->
        <section v-if="moreFromSet.length" class="mt-14 flex flex-col gap-5">
          <h2 class="text-lg font-extrabold sm:text-2xl">Mer från {{ product.cardSet?.value }}</h2>
          <div class="-mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            <NuxtLink v-for="card in moreFromSet" :key="card.id" :to="localePath(`/singelkort/${card.handle}`)" class="flex w-[118px] shrink-0 flex-col gap-1.5 sm:w-auto sm:gap-2">
              <span class="block overflow-hidden rounded-lg border sm:rounded-xl" style="aspect-ratio: 63/88; background: #161B22; border-color: #2A313C">
                <img v-if="card.featuredImage?.url" :src="shopifyImage(card.featuredImage.url, 320)" :alt="card.title" loading="lazy" class="h-full w-full object-cover">
              </span>
              <span class="truncate text-xs font-bold sm:text-sm">{{ card.title }}</span>
              <span class="num text-[13px] font-semibold sm:text-[15px]">{{ money(cardPrice(card)) }}</span>
            </NuxtLink>
          </div>
        </section>
      </template>

      <div v-else class="mt-6 rounded-[18px] border p-8" style="background: #12161C; border-color: #1E242D">
        <p class="label">{{ t('singles.noCard') }}</p>
        <h1 class="mt-3 text-2xl">{{ t('singles.noCardTitle') }}</h1>
        <p class="mt-4 text-sm" style="color: #9AA3AE">{{ t('singles.noCardText') }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.organic-skeleton {
  background: linear-gradient(90deg, #1D232C 0%, #161B22 50%, #1D232C 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
