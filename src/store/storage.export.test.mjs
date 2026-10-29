import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import ExcelJS from 'exceljs'

const require = createRequire(import.meta.url)
let exportedBlob
const bundled = await build({
  entryPoints: [fileURLToPath(new URL('./storage.js', import.meta.url))],
  bundle: true, platform: 'node', format: 'cjs', write: false, external: ['exceljs'],
  plugins: [{
    name: 'capture-download',
    setup(builder) {
      builder.onResolve({ filter: /^file-saver$/ }, () => ({ path: 'file-saver', namespace: 'qa' }))
      builder.onLoad({ filter: /.*/, namespace: 'qa' }, () => ({ contents: 'export const saveAs = (...args) => globalThis.__plldExportCapture(...args)' }))
    },
  }],
})
const module = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, module, module.exports)
const { storage } = module.exports
globalThis.__plldExportCapture = blob => { exportedBlob = blob }
globalThis.alert = message => { throw new Error(message) }

const record = (id, companyName, tests, timeline = 'Đầu ca') => ({
  id, date: '2026-10-29',
  worker: { companyName, name: 'Nguyễn Văn A', code: '01', timeline, seniority: 0 }, tests: Object.keys(tests).length ? tests : { memory: { score: 3 } },
})

test('Excel contains each company without merging identical names/STT across companies', async () => {
  await storage.exportExcel([
    record(3, 'Công ty B', { memory: { score: 5 } }),
    record(2, 'Công ty A', { memory: { score: 4 } }, 'Cuối ca'),
    record(1, 'Công ty A', {
      visual: { rounds: [200, 210], avg: 205 }, sound: { rounds: [300], avg: 300 }, memory: { score: 3 },
    }),
  ])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await exportedBlob.arrayBuffer())
  const sheet = workbook.getWorksheet('KẾT QUẢ')
  assert.equal(sheet.getCell('V10').value, 'Tên công ty')
  assert.equal(sheet.getCell('V11').value, 'Công ty A')
  assert.equal(sheet.getCell('V14').value, 'Công ty A')
  assert.equal(sheet.getCell('V15').value, 'Công ty B')
  assert.equal(sheet.getCell('A14').master.address, 'A11')
  assert.equal(sheet.getCell('A15').isMerged, false)
  assert.equal(sheet.getCell('K11').value, 200)
  assert.equal(sheet.getCell('U11').value, 205)
  assert.equal(sheet.getCell('K12').value, 300)
  assert.equal(sheet.getCell('K13').value, 3)
  assert.equal(sheet.getCell('G11').value, 0)
})

test('Excel does not assign the current company to a legacy record', async () => {
  await storage.exportExcel([record(1, undefined, { memory: { score: 3 } })])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await exportedBlob.arrayBuffer())
  assert.ok(!workbook.getWorksheet('KẾT QUẢ').getCell('V11').value)
})

function mockLocalStorage(records) {
  const values = new Map([
    ['envmonitor_worker_tests', JSON.stringify(records)],
    ['envmonitor_settings', JSON.stringify({ companyName: 'Công ty A', defaultUnit: 'Xưởng 1' })],
  ])
  const writes = []
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { writes.push(key); values.set(key, value) },
    },
  })
  return { values, writes }
}

test('company deletion removes every matching test and preserves other companies, legacy data and settings', () => {
  const fake = mockLocalStorage([
    record(1, 'Công ty A', { memory: { score: 3 } }),
    record(2, '  CÔNG  TY A  '.normalize('NFD'), { sound: { rounds: [200], avg: 200 } }),
    record(3, 'Công ty AB', {}),
    record(4, 'Công ty B', {}),
    record(5, undefined, {}),
    record(6, '', {}),
  ])
  const settingsBefore = fake.values.get('envmonitor_settings')
  assert.equal(storage.deleteCompany('công ty a'), 2)
  assert.deepEqual(storage.getAll().map(r => r.id), [6, 5, 4, 3])
  assert.equal(fake.values.get('envmonitor_settings'), settingsBefore)
  assert.deepEqual(fake.writes, ['envmonitor_worker_tests'])
})

test('blank or unknown company cannot delete records or write storage', () => {
  const fake = mockLocalStorage([record(1, 'Công ty A', {}), record(2, undefined, {})])
  for (const company of ['', '   ', undefined, null, 'Công ty khác']) {
    assert.equal(storage.deleteCompany(company), 0)
  }
  assert.deepEqual(storage.getAll().map(r => r.id), [2, 1])
  assert.deepEqual(fake.writes, [])
})

test('deleting the last company leaves a valid empty record list', () => {
  mockLocalStorage([record(1, 'Công ty A', {})])
  assert.equal(storage.deleteCompany('Công ty A'), 1)
  assert.deepEqual(storage.getAll(), [])
  assert.equal(storage.deleteCompany('Công ty A'), 0)
})

test('saving beyond 500 records preserves every existing record', () => {
  mockLocalStorage(Array.from({ length: 600 }, (_, index) => record(index + 1, 'A', {})))
  storage.save(record(601, 'A', {}))
  assert.equal(storage.getAll().length, 601)
  assert.ok(storage.getAll().some(item => item.id === 1))
})

test('corrupt record storage is never treated as empty or overwritten', () => {
  const fake = mockLocalStorage([])
  fake.values.set('envmonitor_worker_tests', '{broken')
  assert.throws(() => storage.getAll(), /Không đọc/)
  assert.throws(() => storage.save(record(1, 'A', {})), /Không đọc/)
  assert.equal(fake.values.get('envmonitor_worker_tests'), '{broken')
})

test('quota failure preserves records and reports a useful error', () => {
  const fake = mockLocalStorage([record(1, 'A', {})])
  const before = fake.values.get('envmonitor_worker_tests')
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.throws(() => storage.save(record(2, 'A', {})), /bộ nhớ đầy/)
  assert.equal(fake.values.get('envmonitor_worker_tests'), before)
})

globalThis.FileReader = class {
  readAsText(file) { this.onload({ target: { result: file.text } }) }
}
const file = value => ({ text: JSON.stringify(value) })

test('invalid imports are rejected atomically before any storage write', async () => {
  const fake = mockLocalStorage([record(1, 'A', {})])
  const before = fake.values.get('envmonitor_worker_tests')
  await assert.rejects(storage.importJSON(file([record(2, 'A', {}), {}])), /Hồ sơ 2/)
  assert.equal(fake.values.get('envmonitor_worker_tests'), before)
  assert.deepEqual(fake.writes, [])
})

test('legacy JSON import deduplicates IDs inside the file and against existing data', async () => {
  mockLocalStorage([record(1, 'A', {})])
  const latest = { ...record(3, 'B', {}), date: '2026-10-30' }
  const result = await storage.importJSON(file([record('1', 'A', {}), record(2, 'B', {}), record(2, 'B', {}), latest]))
  assert.equal(result.added, 2)
  assert.equal(result.skipped, 2)
  assert.deepEqual(storage.getAll().map(item => item.id), [3, 2, 1])
})

test('full backup restores settings and logo with records', async () => {
  mockLocalStorage([])
  const settings = { companyName: 'B', defaultUnit: 'Xưởng B', logo: 'data:image/png;base64,YQ==' }
  const result = await storage.importJSON(file({ format: 'plld-backup', version: 2, records: [record(1, 'B', {})], settings }))
  assert.equal(result.settingsRestored, true)
  assert.deepEqual(storage.getSettings(), settings)
  assert.equal(storage.getAll().length, 1)
})

test('failed multi-key restore rolls back records when settings cannot be written', async () => {
  const fake = mockLocalStorage([record(1, 'A', {})])
  const before = new Map(fake.values)
  const originalSet = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = (key, value) => {
    if (key === 'envmonitor_settings' && value.includes('B')) throw new Error('quota')
    originalSet(key, value)
  }
  await assert.rejects(storage.importJSON(file({ format: 'plld-backup', version: 2, records: [record(2, 'B', {})], settings: { companyName: 'B' } })), /Không thể lưu/)
  assert.deepEqual(fake.values, before)
})

test('only selected legacy records are assigned to a company', () => {
  mockLocalStorage([record(1, undefined, {}), record(2, '', {}), record(3, 'A', {})])
  assert.equal(storage.assignCompany(['1', '3'], ' B '), 1)
  const records = storage.getAll()
  assert.equal(records.find(item => item.id === 1).worker.companyName, 'B')
  assert.equal(records.find(item => item.id === 2).worker.companyName, '')
  assert.equal(records.find(item => item.id === 3).worker.companyName, 'A')
})

test('Excel preserves different dates and different job information for the same worker', async () => {
  const first = record(1, 'A', {})
  first.date = '2026-10-28'
  const second = record(2, ' a ', {})
  const third = record(3, 'A', {})
  third.worker.position = 'Kỹ thuật viên'
  await storage.exportExcel([second, first, third])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await exportedBlob.arrayBuffer())
  const sheet = workbook.getWorksheet('KẾT QUẢ')
  assert.equal(sheet.getCell('D11').value, '2026-10-28')
  assert.equal(sheet.getCell('D12').value, '2026-10-29')
  assert.equal(sheet.getCell('D13').value, '2026-10-29')
  assert.equal(sheet.getCell('D12').isMerged, false)
  assert.equal(sheet.getCell('C13').value, 'Kỹ thuật viên')
})

test('draft progress survives storage roundtrip and a final record is saved idempotently', () => {
  mockLocalStorage([])
  const session = { id: 'draft-1', worker: { ...record(1, 'A', {}).worker, selectedTests: { sound: true } }, results: {}, progress: { sound: { rounds: [200, 210] } }, record: null }
  storage.saveDraft(session)
  assert.deepEqual(storage.getDraft().progress.sound.rounds, [200, 210])
  const completed = { ...record('draft-1', 'A', {}), tests: { sound: { rounds: [200, 210] } } }
  storage.save(completed)
  storage.save(completed)
  assert.equal(storage.getAll().length, 1)
})

test('restore checkbox can preserve current settings while merging full backup', async () => {
  mockLocalStorage([])
  await storage.importJSON(file({ format: 'plld-backup', version: 2, records: [record(1, 'B', {})], settings: { companyName: 'B' } }), { restoreSettings: false })
  assert.equal(storage.getSettings().companyName, 'Công ty A')
})

test('validated recovery replaces corrupt records and corrupt settings together', async () => {
  const fake = mockLocalStorage([])
  fake.values.set('envmonitor_worker_tests', '{broken')
  fake.values.set('envmonitor_settings', '{broken')
  await storage.importJSON(file([record(1, 'B', {})]), { replaceCorrupt: true })
  assert.equal(storage.getAll().length, 1)
  assert.equal(storage.getSettings().companyName, '')
})

test('full backup export includes settings, records and draft, then can be imported', async () => {
  mockLocalStorage([record(1, 'A', {})])
  let downloaded
  globalThis.document = { createElement: () => ({ click() {} }) }
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = blob => { downloaded = blob; return 'blob:qa' }
  URL.revokeObjectURL = () => {}
  try {
    storage.exportJSON()
    const backup = JSON.parse(await downloaded.text())
    assert.equal(backup.version, 2)
    assert.equal(backup.settings.defaultUnit, 'Xưởng 1')
    assert.equal(backup.records.length, 1)
    assert.equal(backup.draft, null)
    mockLocalStorage([])
    assert.equal((await storage.importJSON(file(backup))).added, 1)
  } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke }
})

test('print HTML uses the record company/position and escapes input; blocked popups are handled', async () => {
  mockLocalStorage([])
  const output = await build({ entryPoints: [fileURLToPath(new URL('../utils/report.js', import.meta.url))], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['exceljs', 'file-saver'] })
  const reportModule = { exports: {} }
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, reportModule, reportModule.exports)
  const data = record(1, 'Công ty trong hồ sơ', {})
  data.worker.name = '<img src=x onerror=alert(1)>'
  data.worker.position = '<Kỹ thuật>'
  const html = reportModule.exports.generateReportHTML(data)
  assert.ok(html.includes('Công ty trong hồ sơ'))
  assert.ok(html.includes('&lt;Kỹ thuật&gt;'))
  assert.ok(!html.includes('<img src=x'))
  let message = ''
  globalThis.window = { open: () => null }
  const previousAlert = globalThis.alert
  globalThis.alert = value => { message = value }
  try {
    assert.equal(reportModule.exports.printReport(data), false)
    assert.match(message, /chặn cửa sổ in/)
  } finally { globalThis.alert = previousAlert }
})
