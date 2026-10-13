import tailwindcss from '@tailwindcss/vite'

const rawShopDomain = process.env.SHOPIFY_STORE_DOMAIN ?? ''
const normalizedShopName = rawShopDomain
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .replace(/\.myshopify\.com$/i, '')
  .trim()

const storefrontPublicToken = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ?? ''
const storefrontPrivateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? ''
const useMockStorefront = !normalizedShopName || (!storefrontPublicToken && !storefrontPrivateToken)

// Headers that let Netlify's CDN cache a page (s-maxage, then stale-while-revalidate)
// while browsers still ask the CDN again every time.
const cdnCache = (seconds: number, staleSeconds: number) => ({
  'cache-control': 'public, max-age=0, must-revalidate',
  'netlify-cdn-cache-control': `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Fonts are self-hosted (no Google round trips before the first paint).
  css: [
    '@fontsource-variable/figtree/index.css',
    '@fontsource/ibm-plex-mono/400.css',
    '@fontsource/ibm-plex-mono/500.css',
    './app/assets/css/main.css'
  ],
  modules: ['@nuxtjs/shopify', '@nuxtjs/i18n'],
  i18n: {
    // Messages are bundled directly via i18n.config.ts (plain static
    // imports) instead of the module's lazy per-locale `file:` loader —
    // that loader's dev-mode `?import` transform 404s for this project's
    // Vite setup, leaving t() silently falling back to raw keys client-side.
    locales: [
      { code: 'sv', language: 'sv-SE', name: 'Svenska' }
      // English is switched off for now — the site is Swedish only. To turn it
      // back on: restore the line below and remove the '/en' redirects in
      // routeRules. en.json and all translations are kept as they are.
      // { code: 'en', language: 'en-US', name: 'English' }
    ],
    defaultLocale: 'sv',
    strategy: 'prefix_except_default'
  },
  runtimeConfig: {
    public: {
      shopifyStoreDomain: rawShopDomain,
      shopifyStorefrontPublicToken: storefrontPublicToken
    }
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/images/logo/orange-solo.svg' },
        // Product photos come from Shopify's CDN.
        { rel: 'preconnect', href: 'https://cdn.shopify.com', crossorigin: '' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ],
      script: [
        {
          src: 'https://plausible.io/js/pa-k2Gasfpyo_eWit1Unqy2J.js',
          async: true
        },
        {
          innerHTML:
            'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()'
        }
      ]
    }
  },
  shopify: {
    name: normalizedShopName || 'mock-shop',
    errors: {
      throw: false
    },
    clients: {
      storefront: {
        apiVersion: '2026-01',
        ...(useMockStorefront
          ? {
              mock: true
            }
          : {
              ...(storefrontPublicToken
                ? {
                    publicAccessToken: storefrontPublicToken
                  }
                : {}),
              ...(storefrontPrivateToken
                ? {
                    privateAccessToken: storefrontPrivateToken
                  }
                : {})
            })
      }
    }
  },

  routeRules: {
    // English is off for now (see i18n.locales) — send old /en links to the Swedish page
    '/en': { redirect: { to: '/', statusCode: 302 } },
    '/en/**': { redirect: { to: '/**', statusCode: 302 } },
    '/riftbound-unleashed-prerelease': {
      headers: {
        'cache-control': 'no-store, max-age=0'
      }
    },
    // The pages are the same for every visitor (the cart is loaded in the browser), so
    // Netlify's CDN may serve them from cache: a fresh copy for a minute, then a stale
    // one while it refreshes in the background. Browsers always revalidate.
    '/': { headers: cdnCache(60, 3600) },
    '/butik': { headers: cdnCache(60, 3600) },
    '/butik/**': { headers: cdnCache(60, 3600) },
    '/events': { headers: cdnCache(60, 3600) },
    '/kontakt': { headers: cdnCache(300, 3600) },
    '/villkor': { headers: cdnCache(300, 3600) },
    '/medlem': { headers: cdnCache(300, 3600) },
    '/bordsbokning': { headers: cdnCache(300, 3600) },
    '/singelkort': { headers: cdnCache(300, 3600) },
    '/singelkort/**': { headers: cdnCache(300, 3600) },
    // Product pages show stock, so the CDN copy is short-lived (the page refreshes stock itself).
    '/produkter/**': {
      headers: {
        'cache-control': 'no-store, max-age=0',
        'netlify-cdn-cache-control': 'public, s-maxage=30, stale-while-revalidate=300'
      }
    }
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()]
  }
})
