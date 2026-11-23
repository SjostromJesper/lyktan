// Samtycke till marknadsföringscookies (Meta Pixel). Valet sparas i webbläsaren (localStorage) och gäller tills
// besökaren ändrar det via "Cookie-inställningar" i sidfoten. Utan ett val laddas ingen tredjepartsspårning.
export type ConsentChoice = 'granted' | 'denied' | null

const STORAGE_KEY = 'lyktan-consent-v1'

export const useConsent = () => {
  const marketing = useState<ConsentChoice>('consent-marketing', () => null)
  const bannerOpen = useState<boolean>('consent-banner-open', () => false)

  // Körs bara i webbläsaren, efter hydreringen, så att serverns HTML alltid är utan banner.
  const load = () => {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch { /* privat läge: inget sparat val */ }
    marketing.value = stored === 'granted' || stored === 'denied' ? stored : null
    bannerOpen.value = marketing.value === null
  }

  const choose = (choice: 'granted' | 'denied') => {
    marketing.value = choice
    bannerOpen.value = false
    try { localStorage.setItem(STORAGE_KEY, choice) } catch { /* sparas inte i privat läge */ }
  }

  const reopen = () => { bannerOpen.value = true }

  return { marketing, bannerOpen, load, choose, reopen }
}
