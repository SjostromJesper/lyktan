// Display helpers for the singles cart (Want / Maybe). A card is described the
// same way whether it comes from a Shopify cart line (Want) or from the saved
// Maybe list, so both lists render with the same markup.

export type CartCard = {
  /** Cart line id (Want only) */
  lineId: string | null
  variantId: string
  title: string
  handle: string
  image: string | null
  game: string
  setCode: string
  number: string
  rarity: string
  condition: string
  foil: boolean
  language: string
  price: number
  currency: string
  /** Units available in the shop right now, null when unknown */
  stock: number | null
  available: boolean
  quantity: number
}

export const CONDITION_STYLES: Record<string, { code: string, bg: string, fg: string }> = {
  Nyskick: { code: 'NM', bg: '#13261A', fg: '#56D364' },
  Utmärkt: { code: 'EX', bg: '#0F2624', fg: '#3CCFB8' },
  Bra: { code: 'GD', bg: '#2A2410', fg: '#E3B341' },
  Ok: { code: 'LP', bg: '#2B1C10', fg: '#F0883E' },
  Dåligt: { code: 'PL', bg: '#2D1414', fg: '#F47067' }
}

const RARITY_COLORS: Record<string, string> = { common: '#D9D9D9', uncommon: '#8FB3D1', rare: '#E0C063', mythic: '#E8743B' }
export const rarityColor = (rarity: string) => RARITY_COLORS[rarity.toLowerCase().split(' ')[0] ?? ''] ?? '#9AA3AE'

const GAME_COLORS: Record<string, string> = { 'Magic: The Gathering': '#E8743B', 'Pokémon': '#F7D154', 'One Piece': '#E5484D', 'Riftbound': '#4FB8E8', 'Sorcery': '#B79CFF' }
export const gameColor = (game: string) => GAME_COLORS[game] ?? '#9AA3AE'

const LANGUAGE_CODES: Record<string, string> = {
  Engelska: 'EN', Svenska: 'SV', Tyska: 'DE', Franska: 'FR', Italienska: 'IT', Spanska: 'ES',
  Portugisiska: 'PT', Japanska: 'JA', Koreanska: 'KO', Ryska: 'RU'
}
export const languageCodeFor = (label?: string | null) => {
  if (!label) return 'EN'
  return LANGUAGE_CODES[label] ?? (label.startsWith('Kinesiska') ? 'ZH' : label.slice(0, 2).toUpperCase())
}

const optionOf = (merchandise: any, name: string) =>
  merchandise?.selectedOptions?.find((o: any) => o.name.toLowerCase() === name.toLowerCase())?.value ?? ''

/** Shopify cart line -> display model */
export const cardFromLine = (line: any): CartCard => {
  const m = line.merchandise ?? {}
  const p = m.product ?? {}

  return {
    lineId: line.id,
    variantId: m.id,
    title: p.title ?? '',
    handle: p.handle ?? '',
    image: m.image?.url ?? p.featuredImage?.url ?? null,
    game: p.cardGame?.value ?? '',
    setCode: p.setCode?.value ?? '',
    number: p.collectorNumber?.value ?? '',
    rarity: p.rarity?.value ?? '',
    condition: optionOf(m, 'Skick'),
    foil: optionOf(m, 'Foil') === 'Ja',
    language: languageCodeFor(p.cardLanguage?.value),
    price: Number(m.price?.amount ?? 0),
    currency: m.price?.currencyCode ?? 'SEK',
    stock: typeof m.quantityAvailable === 'number' ? m.quantityAvailable : null,
    available: m.availableForSale !== false,
    quantity: line.quantity
  }
}
