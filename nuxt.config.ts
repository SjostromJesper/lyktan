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

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['./app/assets/css/main.css'],
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
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap' },
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
    '/produkter/**': {
      headers: {
        'cache-control': 'no-store, max-age=0'
      }
    }
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()]
  }
})
