export const normalizeCompanyName = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')

export function companyOptions(records) {
  const groups = new Map()
  for (const { worker } of records) {
    const key = normalizeCompanyName(worker.companyName)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { key, name: worker.companyName.trim().replace(/\s+/g, ' '), count: 0 })
    groups.get(key).count++
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}
