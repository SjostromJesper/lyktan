import sv from './locales/sv.json'
import en from './locales/en.json'

export default defineI18nConfig(() => ({
  legacy: false,
  messages: { sv, en }
}))
