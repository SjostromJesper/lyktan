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
  const now = useState('store-hours-now', () => new Date())
  let interval: ReturnType<typeof window.setInterval> | undefined

  const todaySchedule = computed(() => {
    const stockholmDate = new Date(now.value.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))
    const day = stockholmDate.getDay()

    return openingHours.find((entry) => entry.key === day) ?? openingHours[0]
  })

  const todayKey = computed(() => todaySchedule.value.key)

  const openStatus = computed(() => {
    const schedule = todaySchedule.value
    const { hour, minute } = getStockholmParts(now.value)
    const currentMinutes = hour * 60 + minute
    const openMinutes = schedule.open * 60
    const closeMinutes = schedule.close * 60
    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes

    return {
      isOpen,
      label: isOpen ? 'Öppet' : 'Stängt',
      message: isOpen ? `${schedule.label} ${schedule.display}` : `${schedule.label} stängt just nu`
    }
  })

  const groupedHours = computed(() => {
    const groups: { keys: number[]; labels: string[]; display: string }[] = []

    for (const entry of openingHours) {
      const last = groups[groups.length - 1]

      if (last && last.display === entry.display) {
        last.keys.push(entry.key)
        last.labels.push(entry.label)
      } else {
        groups.push({ keys: [entry.key], labels: [entry.label], display: entry.display })
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
