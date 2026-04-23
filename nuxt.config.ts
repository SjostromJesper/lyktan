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
  modules: ['@nuxtjs/shopify'],
  app: {
    head: {
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
    '/riftbound-unleashed-prerelease': {
      headers: {
        'cache-control': 'no-store, max-age=0'
      }
    }
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
