/**
 * Maps our app locale ('sv' | 'en') to a Shopify Storefront API
 * LanguageCode for the `@inContext(language: ...)` directive. Falls back
 * to SV (the site's default locale) for anything unrecognized.
 */
export const toShopifyLanguage = (lang: unknown): 'SV' | 'EN' =>
  String(lang || '').toLowerCase() === 'en' ? 'EN' : 'SV'
