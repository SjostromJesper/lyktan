// Classifies a kortspel-collection product by game, from its Shopify tags.
// Used to build the "Magic: The Gathering / Pokémon / …" sub-filter pills
// wherever the kortspel collection is browsed (homepage, category page).
export const classifyCardGame = (product: { tags?: string[] }, fallbackLabel: string): string => {
  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase())
  if (tags.some((tag) => tag.includes('pokemon'))) return 'Pokémon'
  if (tags.some((tag) => tag.includes('magic') || tag.includes('mtg'))) return 'Magic: The Gathering'
  return fallbackLabel
}
