import { normalizeCompanyName } from './company.mjs'
import { normalizeText } from './records.mjs'

export function unitStatistics(records) {
  const groups = new Map()
  for (const record of records) {
    const w = record.worker
    const key = JSON.stringify([normalizeCompanyName(w.companyName), normalizeText(w.unit)])
    if (!groups.has(key)) groups.set(key, { key, companyName: w.companyName || 'Chưa có công ty', unit: w.unit || 'Khác', count: 0, sound: [], visual: [] })
    const group = groups.get(key)
    group.count++
    for (const type of ['sound', 'visual']) {
      const avg = record.tests[type]?.avg
      if (typeof avg === 'number' && Number.isFinite(avg)) group[type].push(avg)
    }
  }
  const average = values => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
  return [...groups.values()].map(group => ({ ...group, soundAvg: average(group.sound), visualAvg: average(group.visual) }))
}
