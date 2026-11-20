const normalize = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')

export function findWorkerRecord(records, query, companyName) {
  const company = normalize(companyName)
  const code = normalize(query.code)
  const name = normalize(query.name)
  if (!company || (!code && !name)) return null

  // Never infer the company of an old record from today's settings.
  const matches = records.filter(({ worker }) => worker &&
    normalize(worker.companyName) === company &&
    (!code || normalize(worker.code) === code) &&
    (!name || normalize(worker.name) === name))

  // A reused STT or a shared name must not select a different person silently.
  const identities = new Set(matches.map(({ worker }) => JSON.stringify([
    normalize(worker.code), normalize(worker.name),
  ])))
  if (identities.size !== 1) return null
  return sortRecords(matches)[0] || null
}
import { sortRecords } from './records.mjs'


export function autofillWorker(form, worker, edited = new Set()) {
  const next = { ...form }
  for (const key of ['name', 'code', 'position', 'unit', 'age', 'gender', 'seniority', 'education']) {
    if (!edited.has(key)) next[key] = worker[key] ?? form[key]
  }
  next.timeline = 'Cuối ca'
  return next
}

export function nextWorkerCode(records, companyName) {
  const company = normalize(companyName)
  if (!company) return ''
  let max = 0
  for (const record of records) {
    if (normalize(record?.worker?.companyName) !== company) continue
    const code = String(record?.worker?.code ?? '').trim()
    if (!/^\d+$/.test(code)) continue
    const num = Number.parseInt(code, 10)
    if (num > max) max = num
  }
  return String(max + 1).padStart(2, '0')
}
