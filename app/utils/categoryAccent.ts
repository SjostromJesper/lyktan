// Colour details per product category. The site is white; colour lives in
// small details — a dot before a category name, a tinted tile, an underline —
// and each category keeps the same colour everywhere.
export type CategoryAccent = { color: string, tint: string }

const ACCENTS = {
  kort: { color: '#FE4D01', tint: '#FFF1EA' },   // kortspel / TCG — brand orange
  mini: { color: '#2F6FEB', tint: '#EDF3FF' },   // miniatyrspel
  brad: { color: '#12915F', tint: '#E9F7F0' },   // brädspel / sällskapsspel
  roll: { color: '#8A4FE0', tint: '#F4EEFF' },   // rollspel
  event: { color: '#E09A00', tint: '#FFF6DC' },  // event
  other: { color: '#15171C', tint: '#F5F4F1' }
} satisfies Record<string, CategoryAccent>

const RULES: [RegExp, keyof typeof ACCENTS][] = [
  [/kort|card|tcg|magic|pok[eé]mon|lorcana|riftbound|one piece|yu-?gi|flesh|singel/i, 'kort'],
  [/miniatyr|miniature|warhammer|moonstone|40k|age of sigmar|kill team|marvel crisis|färg|paint/i, 'mini'],
  [/rollspel|role|rpg|d&d|dungeons|pathfinder|drakar/i, 'roll'],
  [/event|turnering|tournament|prerelease|release/i, 'event'],
  [/bräd|board|sällskap|familj|party|strategi/i, 'brad']
]

export const categoryAccent = (label?: string | null): CategoryAccent => {
  if (label) {
    for (const [pattern, key] of RULES) if (pattern.test(label)) return ACCENTS[key]
  }
  return ACCENTS.other
}

// For lists of collections with unknown names: keyword match first, then
// cycle the palette so neighbouring tiles never share a colour.
const CYCLE = [ACCENTS.kort, ACCENTS.mini, ACCENTS.brad, ACCENTS.roll, ACCENTS.event]
export const categoryAccentAt = (label: string, index: number): CategoryAccent => {
  const match = categoryAccent(label)
  return match === ACCENTS.other ? CYCLE[index % CYCLE.length] : match
}
