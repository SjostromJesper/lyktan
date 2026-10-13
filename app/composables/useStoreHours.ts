import { openingHours } from '#shared/utils/openingHours'

export { openingHours }

const getStockholmParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    hour: Number(values.hour ?? '0'),
    minute: Number(values.minute ?? '0')
  }
}

export const useStoreHours = () => {
  const { t } = useI18n()
  const now = useState('store-hours-now', () => new Date())
  let interval: ReturnType<typeof window.setInterval> | undefined

  const weekdayLabel = (key: number) => t(`hours.weekday.${key}`)

  const todaySchedule = computed(() => {
    const stockholmDate = new Date(now.value.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))
    const day = stockholmDate.getDay()

    return openingHours.find((entry) => entry.key === day) ?? openingHours[0]
  })

  const todayKey = computed(() => todaySchedule.value.key)

  const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

  // "Öppet till 19:00" while open, otherwise "Stängt · öppnar 10:00" — or
  // "… öppnar i morgon 10:00" once today's closing time has passed.
  const openStatus = computed(() => {
    const schedule = todaySchedule.value
    const { hour, minute } = getStockholmParts(now.value)
    const currentMinutes = hour * 60 + minute
    const openMinutes = schedule.open * 60
    const closeMinutes = schedule.close * 60
    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes

    if (isOpen) {
      const message = t('hours.openUntil', { time: formatHour(schedule.close) })
      return { isOpen, label: t('hours.open'), message, text: message }
    }

    const opensToday = currentMinutes < openMinutes
    const nextDay = opensToday ? schedule : openingHours.find((entry) => entry.key === (schedule.key + 1) % 7) ?? schedule
    const message = t(opensToday ? 'hours.closedOpensAt' : 'hours.closedOpensTomorrow', { time: formatHour(nextDay.open) })

    return { isOpen, label: t('hours.closed'), message, text: message }
  })

  const groupedHours = computed(() => {
    const groups: { keys: number[]; labels: string[]; display: string }[] = []

    for (const entry of openingHours) {
      const last = groups[groups.length - 1]

      if (last && last.display === entry.display) {
        last.keys.push(entry.key)
        last.labels.push(weekdayLabel(entry.key))
      } else {
        groups.push({ keys: [entry.key], labels: [weekdayLabel(entry.key)], display: entry.display })
      }
    }

    return groups.map((group) => ({
      label: group.labels.length > 1 ? `${group.labels[0]}–${group.labels[group.labels.length - 1]}` : group.labels[0],
      display: group.display,
      isToday: group.keys.includes(todayKey.value)
    }))
  })

  const startClock = () => {
    if (import.meta.client && !interval) {
      // The page may have been rendered (or cached by the CDN) a while ago.
      now.value = new Date()
      interval = window.setInterval(() => {
        now.value = new Date()
      }, 60000)
    }
  }

  const stopClock = () => {
    if (interval) {
      window.clearInterval(interval)
      interval = undefined
    }
  }

  return {
    openingHours,
    todayKey,
    openStatus,
    groupedHours,
    startClock,
    stopClock
  }
}
