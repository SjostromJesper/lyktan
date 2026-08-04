export type RecurringEventRule = {
  weekday: number
  titel: string
  tid: string
  beskrivning: string
  kostnad: string
}

/**
 * The regular weekly schedule, defined once per weekday instead of once
 * per date. The site expands this into concrete upcoming dates on the
 * fly, so the schedule itself never needs manual date-by-date upkeep —
 * only real one-off events (Shopify products tagged "event") need adding by hand.
 */
export const recurringEvents: RecurringEventRule[] = [
  {
    weekday: 1,
    titel: 'Warhammer på måndag',
    tid: '18:00',
    beskrivning: 'Öppen figurspelskväll för Warhammer 40,000, Age of Sigmar och andra projekt du vill få till butiken.',
    kostnad: 'dagspass/medlem'
  },
  {
    weekday: 2,
    titel: 'Sorcery',
    tid: '18:00',
    beskrivning: 'Casual-spel, byten och häng för Sorcery-spelare.',
    kostnad: '50/200/350kr'
  },
  {
    weekday: 3,
    titel: 'Commander',
    tid: '18:00',
    beskrivning: 'Commander-kväll för dig som vill spela multiplayer och träffa andra Magic-spelare.',
    kostnad: 'dagspass/medlem'
  },
  {
    weekday: 3,
    titel: 'One Piece',
    tid: '18:00',
    beskrivning: 'Öppen spelkväll för One Piece TCG med casual-spel och communityhäng i butik.',
    kostnad: '50kr'
  },
  {
    weekday: 4,
    titel: 'Riftbound',
    tid: '18:00',
    beskrivning: 'Torsdagskväll för Riftbound med öppet spel och communityhäng.',
    kostnad: '50kr'
  },
  {
    weekday: 4,
    titel: 'Pokemon',
    tid: '18:00',
    beskrivning: 'Torsdagskväll för Pokemon TCG med öppet spel och communityhäng.',
    kostnad: '50kr'
  },
  {
    weekday: 5,
    titel: 'Friday Night Magic',
    tid: '18:00',
    beskrivning: 'Veckans Friday Night Magic i butiken.',
    kostnad: '250kr'
  }
]
