import test from 'node:test'
import assert from 'node:assert/strict'
import { findWorkerRecord, nextWorkerCode } from './workerLookup.mjs'

const record = (id, companyName, name = 'Nguyễn Văn A', code = '01') => ({
  id, worker: { companyName, name, code },
})

test('STT 01 autofills within a company and never crosses companies', () => {
  const a = record(1, 'Công ty A')
  const b = record(2, 'Công ty B', 'Trần Văn B')
  assert.equal(findWorkerRecord([b, a], { code: '01' }, 'Công ty A'), a)
  assert.equal(findWorkerRecord([a, b], { code: '01' }, 'Công ty B'), b)
  assert.equal(findWorkerRecord([a], { code: '01' }, 'Công ty B'), null)
})

test('name lookup works in the selected company only', () => {
  const a = record(1, 'A')
  assert.equal(findWorkerRecord([a], { name: 'Nguyễn Văn A' }, 'A'), a)
  assert.equal(findWorkerRecord([a], { name: 'Nguyễn Văn A' }, 'B'), null)
})

test('missing company, empty query and legacy records do not autofill', () => {
  assert.equal(findWorkerRecord([record(1, undefined)], { code: '01' }, 'A'), null)
  assert.equal(findWorkerRecord([record(1, '')], { code: '01' }, ''), null)
  assert.equal(findWorkerRecord([record(1, 'A')], {}, 'A'), null)
})

test('a typed name is never replaced by a different person with the same STT', () => {
  assert.equal(findWorkerRecord([record(1, 'A')], { code: '01', name: 'Trần Văn B' }, 'A'), null)
})

test('reused STT and duplicate names require enough information', () => {
  const a = record(1, 'A')
  const b = record(2, 'A', 'Trần Văn B')
  assert.equal(findWorkerRecord([a, b], { code: '01' }, 'A'), null)
  assert.equal(findWorkerRecord([a, b], { code: '01', name: 'Trần Văn B' }, 'A'), b)
  assert.equal(findWorkerRecord([a, record(3, 'A', a.worker.name, '02')], { name: a.worker.name }, 'A'), null)
})

test('normalizes spacing, case and Unicode and selects the latest record', () => {
  const older = record(1, 'Công ty A')
  const newer = record(2, 'Công ty A')
  assert.equal(findWorkerRecord([older, newer], { code: ' 01 ', name: ' NGUYỄN VĂN A ' },
    ' CÔNG  TY A '.normalize('NFD')), newer)
})

test('nextWorkerCode increments max numeric STT per company', () => {
  const list = [
    record(1, 'Công ty A', 'An', '01'),
    record(2, 'Công ty A', 'Bình', '09'),
    record(3, 'Công ty A', 'Cường', 'NV-12'),
    record(4, 'Công ty B', 'Dũng', '25'),
  ]
  assert.equal(nextWorkerCode(list, ' công ty   a '), '10')
  assert.equal(nextWorkerCode(list, 'Công ty B'), '26')
  assert.equal(nextWorkerCode(list, 'Công ty Mới'), '01')
  assert.equal(nextWorkerCode(list, ''), '')
})
