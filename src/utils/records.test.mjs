import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRecord, decodeBackup, sortRecords, mergeRecords, activeRecords } from './records.mjs'
import { unitStatistics } from './statistics.mjs'
import { autofillWorker } from './workerLookup.mjs'
import { validateSession } from './session.mjs'
import { vietnamWeekStart } from './datetime.mjs'
import { deleteCompanyAfterConfirmation } from './actions.mjs'

const record = (companyName, tests = { memory: { score: 3 } }) => normalizeRecord({ id: 'test', date: '2026-10-29', worker: { name: 'A', code: '01', unit: 'Xưởng A', companyName }, tests })

test('statistics separate companies with the same unit and count memory-only records', () => {
  const groups = unitStatistics([record('A'), record('B'), record(' a ', { visual: { rounds: [200, 300] } })])
  assert.equal(groups.length, 2)
  assert.equal(groups[0].count, 2)
  assert.equal(groups[0].soundAvg, null)
  assert.equal(groups[0].visualAvg, 250)
  assert.equal(groups[1].count, 1)
})

test('autofill preserves edited values, and switches to end of shift', () => {
  const next = autofillWorker({ name: 'A', age: '42', position: 'Vừa sửa', timeline: 'Đầu ca' }, { name: 'A', age: '30', position: 'Cũ', seniority: 0 }, new Set(['age', 'position']))
  assert.equal(next.age, '42')
  assert.equal(next.position, 'Vừa sửa')
  assert.equal(next.seniority, 0)
  assert.equal(next.timeline, 'Cuối ca')
})

test('invalid dates, scores, rounds and unsupported backup versions are rejected', () => {
  const valid = record('A')
  assert.throws(() => normalizeRecord({ ...valid, date: '2026-02-30' }))
  assert.throws(() => normalizeRecord({ ...valid, tests: { memory: { score: 7 } } }))
  assert.throws(() => normalizeRecord({ ...valid, tests: { visual: { rounds: [Infinity] } } }))
  assert.throws(() => decodeBackup({ format: 'plld-backup', version: 99, records: [] }))
})

test('Vietnam calendar week starts Monday including across a year boundary', () => {
  assert.equal(vietnamWeekStart('2026-10-29'), '2026-10-26')
  assert.equal(vietnamWeekStart('2026-11-01'), '2026-10-26')
  assert.equal(vietnamWeekStart('2027-01-01'), '2026-12-28')
})

test('invalid draft shapes or reaction rounds are rejected before restore', () => {
  const session = { id: 'x', worker: { ...record('A').worker, selectedTests: { memory: true } }, results: {}, progress: { memory: { phase: 'select', targets: [], allShapes: [], selected: [], timer: 60 } } }
  assert.throws(() => validateSession(session), /Thiếu hình/)
})

test('canceling company deletion never calls the mutation', () => {
  let called = false
  const company = { key: 'a', name: 'Công ty A', count: 3 }
  assert.equal(deleteCompanyAfterConfirmation(company, () => { called = true }, () => false), null)
  assert.equal(called, false)
  let prompt = ''
  assert.equal(deleteCompanyAfterConfirmation(company, key => { assert.equal(key, 'a'); return 3 }, message => { prompt = message; return true }), 3)
  assert.match(prompt, /Công ty A/)
  assert.match(prompt, /3 hồ sơ/)
})

test('records with UUID IDs are ordered by exact completion timestamp within the same minute', () => {
  const older = { ...record('A'), id: 'zz-old', createdAt: '2026-10-29T08:00:01Z', time: '15:00' }
  const newer = { ...record('A'), id: 'aa-new', createdAt: '2026-10-29T08:00:59Z', time: '15:00' }
  assert.deepEqual(sortRecords([older, newer]).map(item => item.id), ['aa-new', 'zz-old'])
})

test('mergeRecords updates newer versions and propagates soft deletes', () => {
  const base = normalizeRecord({
    id: 'sync-1',
    date: '2026-11-14',
    updatedAt: '2026-11-14T01:00:00.000Z',
    worker: { name: 'Nguyen Van A', code: '01', companyName: 'Bao Chau' },
    tests: { memory: { score: 3 } },
  })
  const staleIncoming = normalizeRecord({
    ...base,
    updatedAt: '2026-11-14T00:30:00.000Z',
    worker: { ...base.worker, name: 'Cu' },
  })
  const newerDeleted = normalizeRecord({
    ...base,
    updatedAt: '2026-11-14T02:00:00.000Z',
    deletedAt: '2026-11-14T02:00:00.000Z',
  })

  const first = mergeRecords([base], [staleIncoming])
  assert.equal(first.updated, 0)
  assert.equal(first.skipped, 1)
  assert.equal(first.records[0].worker.name, 'Nguyen Van A')

  const second = mergeRecords([base], [newerDeleted])
  assert.equal(second.updated, 1)
  assert.equal(activeRecords(second.records).length, 0)
})
