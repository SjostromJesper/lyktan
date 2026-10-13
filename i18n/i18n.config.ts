import sv from './locales/sv.json'

// English is switched off (see nuxt.config.ts), so its messages are not bundled for the
// browser. To turn it back on: import en from './locales/en.json' and add it to messages.
export default defineI18nConfig(() => ({
  legacy: false,
  messages: { sv }
}))
