import { normalizeWorker, normalizeTests, normalizeRecord, TEST_KEYS } from './records.mjs'

export function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function validateSession(input) {
  if (input === null) return null
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !input.id || !input.worker || !input.progress || typeof input.progress !== 'object' || Array.isArray(input.progress)) throw new Error('Bản nháp không hợp lệ. Hãy tải dữ liệu gốc trước khi xóa bản nháp hỏng.')
  const selectedTests = Object.fromEntries(TEST_KEYS.map(key => [key, input.worker.selectedTests?.[key] === true]))
  if (!Object.values(selectedTests).some(Boolean)) throw new Error('Bản nháp không có bài kiểm tra')
  const results = normalizeTests(input.results, true)
  if (Object.keys(results).some(key => !selectedTests[key])) throw new Error('Kết quả nháp không thuộc bài đã chọn')
  const progress = {}
  for (const key of TEST_KEYS) {
    const value = input.progress[key]
    if (!value) continue
    if (key !== 'memory') {
      if (!Array.isArray(value.rounds) || value.rounds.length > 10 || !value.rounds.every(n => Number.isFinite(n) && n >= 0)) throw new Error('Các lượt đo trong bản nháp không hợp lệ')
      progress[key] = { rounds: value.rounds }
    } else {
      const validShapes = shapes => Array.isArray(shapes) && shapes.every(shape => Number.isInteger(shape.id) && shape.id >= 0 && shape.id < 18) && new Set(shapes.map(s => s.id)).size === shapes.length
      if (!['ready', 'memorize', 'select', 'result'].includes(value.phase) || !validShapes(value.targets) || !validShapes(value.allShapes) || !validShapes(value.selected) || value.selected.length > 6 || !Number.isInteger(value.timer) || value.timer < 0 || value.timer > 60) throw new Error('Bài trí nhớ trong bản nháp không hợp lệ')
      if (value.phase !== 'ready' && (value.targets.length !== 6 || value.phase !== 'memorize' && value.allShapes.length !== 18)) throw new Error('Thiếu hình trong bản nháp trí nhớ')
      progress.memory = value
    }
  }
  const worker = { ...normalizeWorker(input.worker), selectedTests }
  return { id: input.id, worker, results, progress, record: input.record ? normalizeRecord(input.record) : null }
}
