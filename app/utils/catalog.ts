export type CatalogSubcategory = {
  slug: string
  label: string
  description?: string
}

export type CatalogSystem = {
  slug: string
  label: string
  subcategories: CatalogSubcategory[]
}

export type CatalogCategory = {
  slug: string
  label: string
  systems: CatalogSystem[]
}

export type CatalogLocation = {
  categorySlug: string
  systemSlug: string
  subcategorySlug: string
}

export const catalogStructure: CatalogCategory[] = [
  {
    slug: 'bradspel',
    label: 'Bradspel',
    systems: [
      {
        slug: 'strategispel',
        label: 'Strategispel',
        subcategories: [
          { slug: 'eurogames', label: 'Eurogames' },
          { slug: 'ameritrash', label: 'Ameritrash' }
        ]
      },
      {
        slug: 'familjespel',
        label: 'Familjespel',
        subcategories: [
          { slug: 'snabba-spel', label: 'Snabba spel' },
          { slug: 'partyspel', label: 'Partyspel' }
        ]
      }
    ]
  },
  {
    slug: 'rollspel',
    label: 'Rollspel',
    systems: [
      {
        slug: 'dungeons-dragons',
        label: 'Dungeons & Dragons',
        subcategories: [
          { slug: 'regelbocker', label: 'Regelbocker' },
          { slug: 'aventyr', label: 'Aventyr' }
        ]
      },
      {
        slug: 'pathfinder',
        label: 'Pathfinder',
        subcategories: [
          { slug: 'core', label: 'Core' },
          { slug: 'supplements', label: 'Supplements' }
        ]
      }
    ]
  },
  {
    slug: 'figurspel',
    label: 'Figurspel',
    systems: [
      {
        slug: 'warhammer-40k',
        label: 'Warhammer 40K',
        subcategories: [
          { slug: 'adeptus-custodes', label: 'Adeptus Custodes' },
          { slug: 'astra-militarum', label: 'Astra Militarum' }
        ]
      },
      {
        slug: 'age-of-sigmar',
        label: 'Age of Sigmar',
        subcategories: [
          { slug: 'sylvaneth', label: 'Sylvaneth' },
          { slug: 'stormcast-eternals', label: 'Stormcast Eternals' }
        ]
      },
      {
        slug: 'moonstone',
        label: 'Moonstone',
        subcategories: [
          { slug: 'commonwealth', label: 'Commonwealth' },
          { slug: 'dominion', label: 'Dominion' },
          { slug: 'shade', label: 'Shade' }
        ]
      }
    ]
  },
  {
    slug: 'kortspel',
    label: 'Kortspel',
    systems: [
      {
        slug: 'magic-the-gathering',
        label: 'Magic: The Gathering',
        subcategories: [
          { slug: 'secrets-of-strixhaven', label: 'Secrets of Strixhaven' }
        ]
      },
      {
        slug: 'pokemon',
        label: 'Pokemon',
        subcategories: [
          { slug: 'chaos-rising', label: 'Chaos Rising' }
        ]
      },
      {
        slug: 'sorcery',
        label: 'Sorcery',
        subcategories: [
          { slug: 'arthurian-legends', label: 'Arthurian Legends' }
        ]
      }
    ]
  }
]

export const productCatalogLocations: Record<string, CatalogLocation> = {
  angerboda: {
    categorySlug: 'kortspel',
    systemSlug: 'sorcery',
    subcategorySlug: 'arthurian-legends'
  },
  'bootys-bilge': {
    categorySlug: 'kortspel',
    systemSlug: 'sorcery',
    subcategorySlug: 'arthurian-legends'
  },
  'pokemon-chaos-rising-prerelease': {
    categorySlug: 'kortspel',
    systemSlug: 'pokemon',
    subcategorySlug: 'chaos-rising'
  },
  'secrets-of-strixhaven-booster-pack': {
    categorySlug: 'kortspel',
    systemSlug: 'magic-the-gathering',
    subcategorySlug: 'secrets-of-strixhaven'
  },
  'secrets-of-strixhaven-bundle': {
    categorySlug: 'kortspel',
    systemSlug: 'magic-the-gathering',
    subcategorySlug: 'secrets-of-strixhaven'
  },
  'secrets-of-strixhaven-display-box': {
    categorySlug: 'kortspel',
    systemSlug: 'magic-the-gathering',
    subcategorySlug: 'secrets-of-strixhaven'
  }
}

export const getCatalogLocation = (handle?: string | null) => {
  if (!handle) {
    return null
  }

  return productCatalogLocations[handle] ?? null
}

export const findCatalogCategory = (slug?: string | null) =>
  catalogStructure.find((category) => category.slug === slug) ?? null

export const findCatalogSystem = (categorySlug?: string | null, systemSlug?: string | null) => {
  const category = findCatalogCategory(categorySlug)
  return category?.systems.find((system) => system.slug === systemSlug) ?? null
}

export const findCatalogSubcategory = (
  categorySlug?: string | null,
  systemSlug?: string | null,
  subcategorySlug?: string | null
) => {
  const system = findCatalogSystem(categorySlug, systemSlug)
  return system?.subcategories.find((subcategory) => subcategory.slug === subcategorySlug) ?? null
}

export const buildButikLink = (
  categorySlug: string,
  systemSlug?: string | null,
  subcategorySlug?: string | null
) => {
  const params = new URLSearchParams({ category: categorySlug })

  if (systemSlug) {
    params.set('system', systemSlug)
  }

  if (subcategorySlug) {
    params.set('sub', subcategorySlug)
  }

  return `/butik?${params.toString()}`
}
