import { rankSound, rankVisual, calcOverallRank, getRecommendation } from './ranking.js'
import { rankMemory } from './triangle.js'
import { normalizeCompanyName } from './company.mjs'

export const TEST_KEYS = ['sound', 'visual', 'memory']
const object = value => value && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
const number = value => ['number', 'string'].includes(typeof value) && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
export const normalizeText = value => text(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('vi')

export function normalizeTests(input, partial = false) {
  if (!object(input)) throw new Error('Thiếu dữ liệu bài kiểm tra')
  const tests = {}
  for (const key of TEST_KEYS) {
    if (input[key] == null) continue
    const test = input[key]
    if (!object(test)) throw new Error(`Bài ${key} không hợp lệ`)
    if (key === 'memory') {
      if (!Number.isInteger(test.score) || test.score < 0 || test.score > 6) throw new Error('Điểm trí nhớ phải từ 0 đến 6')
      tests.memory = { score: test.score, pct: Math.round(test.score / 6 * 100), rank: rankMemory(test.score) }
    } else {
      if (!Array.isArray(test.rounds) || !test.rounds.length || test.rounds.length > 10 || !test.rounds.every(number)) throw new Error(`Các lượt đo ${key} không hợp lệ`)
      const rounds = test.rounds.map(Number)
      const avg = rounds.reduce((sum, value) => sum + value, 0) / rounds.length
      tests[key] = { rounds, avg, min: Math.min(...rounds), max: Math.max(...rounds), rank: key === 'sound' ? rankSound(avg) : rankVisual(avg) }
    }
  }
  if (!partial && !Object.keys(tests).length) throw new Error('Hồ sơ không có kết quả kiểm tra')
  return tests
}

export function normalizeWorker(input) {
  if (!object(input) || !text(input.name)) throw new Error('Thiếu họ tên người lao động')
  const worker = Object.fromEntries(['name', 'code', 'companyName', 'position', 'unit', 'age', 'seniority', 'education'].map(key => [key, text(input[key])]))
  worker.companyName = worker.companyName.replace(/\s+/g, ' ')
  for (const key of ['age', 'seniority']) {
    if (worker[key] !== '' && !number(worker[key])) throw new Error(`${key === 'age' ? 'Tuổi' : 'Thâm niên'} không hợp lệ`)
    if (typeof input[key] === 'number') worker[key] = input[key]
  }
  worker.timeline = ['Đầu ca', 'Giữa ca', 'Cuối ca'].includes(input.timeline) ? input.timeline : 'Đầu ca'
  worker.gender = input.gender === 'female' ? 'female' : 'male'
  return worker
}

export function normalizeRecord(input) {
  if (!object(input) || !['string', 'number'].includes(typeof input.id) || !text(input.id)) throw new Error('Thiếu mã hồ sơ')
  if (typeof input.id === 'number' && !Number.isSafeInteger(input.id)) throw new Error('Mã hồ sơ không hợp lệ')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '') || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`)) || new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !== input.date) throw new Error('Ngày kiểm tra không hợp lệ')
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Giờ kiểm tra không hợp lệ')
  if (input.createdAt && (typeof input.createdAt !== 'string' || Number.isNaN(Date.parse(input.createdAt)))) throw new Error('Mốc thời gian hồ sơ không hợp lệ')
  const worker = normalizeWorker(input.worker)
  const tests = normalizeTests(input.tests)
  const rank = calcOverallRank(tests.memory?.rank.label, tests.sound?.rank.label, tests.visual?.rank.label)
  return {
    id: input.id, date: input.date, time: input.time || '', worker, tests,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    selectedTests: Object.fromEntries(TEST_KEYS.map(key => [key, Boolean(tests[key])])),
    overall: { rank: rank.label, color: rank.color, recommendation: getRecommendation(rank.label) },
  }
}

export function validateRecords(value) {
  if (!Array.isArray(value)) throw new Error('Danh sách hồ sơ phải là một mảng')
  return value.map((record, index) => {
    try { return normalizeRecord(record) }
    catch (error) { throw new Error(`Hồ sơ ${index + 1}: ${error.message}`) }
  })
}

export function sortRecords(records) {
  const timestamp = record => record.createdAt ? Date.parse(record.createdAt) : typeof record.id === 'number' ? record.id : 0
  return [...records].sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`) || timestamp(b) - timestamp(a) || String(b.id).localeCompare(String(a.id), undefined, { numeric: true }))
}

export function mergeRecords(existing, incoming) {
  const ids = new Set(existing.map(record => String(record.id)))
  const added = []
  let skipped = 0
  for (const record of incoming) {
    if (ids.has(String(record.id))) { skipped++; continue }
    ids.add(String(record.id))
    added.push(record)
  }
  return { records: sortRecords([...existing, ...added]), added: added.length, skipped }
}

export function normalizeSettings(value) {
  if (!object(value)) throw new Error('Cài đặt không hợp lệ')
  if (value.logo && (typeof value.logo !== 'string' || !/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/.test(value.logo))) throw new Error('Logo phải là ảnh PNG, JPEG, WebP, GIF hoặc SVG')
  return { companyName: text(value.companyName), defaultUnit: text(value.defaultUnit), logo: value.logo || '' }
}

export function decodeBackup(value) {
  if (Array.isArray(value)) return { records: validateRecords(value), settings: null }
  if (object(value) && value.format === 'plld-recovery') return { records: validateRecords(JSON.parse(value.records || '[]')), settings: normalizeSettings(JSON.parse(value.settings || '{}')) }
  if (!object(value) || value.format !== 'plld-backup' || value.version !== 2) throw new Error('Định dạng hoặc phiên bản sao lưu không được hỗ trợ')
  return { records: validateRecords(value.records), settings: value.settings == null ? null : normalizeSettings(value.settings) }
}

export function excelIdentity(record) {
  const w = record.worker
  return JSON.stringify([normalizeCompanyName(w.companyName), normalizeText(w.name), normalizeText(w.code), record.date, w.position || '', w.age ?? '', w.gender, w.seniority ?? '', w.education || '', w.unit || ''])
}

export function compareExcelRecords(a, b) {
  const aw = a.worker, bw = b.worker
  const compare = (left, right) => String(left || '').localeCompare(String(right || ''), 'vi', { numeric: true })
  const priority = { 'Đầu ca': 1, 'Giữa ca': 2, 'Cuối ca': 3 }
  return compare(normalizeCompanyName(aw.companyName), normalizeCompanyName(bw.companyName)) || compare(aw.code, bw.code) || compare(normalizeText(aw.name), normalizeText(bw.name)) || compare(a.date, b.date) || (priority[aw.timeline] || 99) - (priority[bw.timeline] || 99) || compare(a.time, b.time)
}
