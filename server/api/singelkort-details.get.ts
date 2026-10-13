// Extra facts for a single's product page that Shopify doesn't hold: rules text,
// type line and mana cost from Scryfall, plus today's Cardmarket price guide
// (admin panel's `tcg_prices`, converted to SEK with the same rate it uses).
// Matched to the printing by game + set code + collector number.
//
// Cached for an hour per card — Scryfall asks for light, cached use of its API,
// and the price guide only changes once a day.
type ScryfallFace = { mana_cost?: string, type_line?: string, oracle_text?: string, power?: string, toughness?: string, loyalty?: string }

const SCRYFALL_HEADERS = { 'User-Agent': 'ButikLyktan-web/1.0 (hej@butiklyktan.se)', Accept: 'application/json' }

const fetchScryfall = async (sourceId: string) => {
  const res = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(sourceId)}`, { headers: SCRYFALL_HEADERS }).catch(() => null)
  if (!res?.ok) return null

  const card = (await res.json()) as ScryfallFace & { card_faces?: ScryfallFace[] }
  const faces = card.card_faces?.length ? card.card_faces : [card]
  const first = faces[0] ?? card

  return {
    manaCost: first.mana_cost || card.mana_cost || '',
    typeLine: card.type_line || first.type_line || '',
    oracleText: faces.map((f) => f.oracle_text).filter(Boolean).join('\n\n'),
    power: first.power ?? null,
    toughness: first.toughness ?? null,
    loyalty: first.loyalty ?? null
  }
}

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const game = String(query.game || 'mtg') === 'pokemon' ? 'pokemon' : 'mtg'
  const setCode = String(query.set || '').trim().toLowerCase().slice(0, 12)
  const number = String(query.number || '').trim().slice(0, 12)

  const empty = { card: null, prices: null }

  if (!setCode || !number) return empty

  const supabase = useSupabaseAdmin()

  const { data: row } = await supabase
    .from('tcg_cards')
    .select('source_id, cardmarket_id')
    .eq('game', game)
    .ilike('set_code', setCode)
    .eq('collector_number', number)
    .limit(1)
    .maybeSingle()

  if (!row) return empty

  const [scryfall, priceRow, settings] = await Promise.all([
    game === 'mtg' ? fetchScryfall(row.source_id) : Promise.resolve(null),
    row.cardmarket_id
      ? supabase.from('tcg_prices').select('trend, avg1, avg7, avg30, trend_foil, avg30_foil').eq('cardmarket_id', row.cardmarket_id).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    supabase.from('scan_settings').select('eur_sek').eq('id', 1).maybeSingle().then((r) => r.data)
  ])

  const rate = Number(settings?.eur_sek) || 0
  const sek = (eur: number | null | undefined) => (eur != null && rate ? Math.round(Number(eur) * rate) : null)

  return {
    card: scryfall,
    prices: priceRow
      ? { trend: sek(priceRow.trend), trendFoil: sek(priceRow.trend_foil), avg1: sek(priceRow.avg1), avg7: sek(priceRow.avg7), avg30: sek(priceRow.avg30), avg30Foil: sek(priceRow.avg30_foil) }
      : null
  }
}, {
  maxAge: 60 * 60,
  swr: true,
  getKey: (event) => {
    const q = getQuery(event)
    return `${q.game}-${q.set}-${q.number}`
  }
})
