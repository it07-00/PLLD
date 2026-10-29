export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: VIETNAM_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function vietnamDateTime(value = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(value).map(part => [part.type, part.value]))
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

export function vietnamWeekStart(today = vietnamDateTime().date) {
  const date = new Date(`${today}T00:00:00+07:00`)
  const day = new Date(`${today}T00:00:00Z`).getUTCDay()
  return vietnamDateTime(new Date(date.getTime() - ((day + 6) % 7) * 86400000)).date
}
