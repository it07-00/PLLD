import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { vietnamDateTime } from './datetime.mjs'

test('early morning in Vietnam is not saved as the previous UTC day', () => {
  assert.deepEqual(vietnamDateTime(new Date('2026-10-29T00:30:00+07:00')), { date: '2026-10-29', time: '00:30' })
  assert.deepEqual(vietnamDateTime(new Date('2026-10-29T06:59:59+07:00')), { date: '2026-10-29', time: '06:59' })
})

test('Vietnam midnight and year boundary use 00:00 and the new local date', () => {
  assert.deepEqual(vietnamDateTime(new Date('2026-12-31T16:59:59Z')), { date: '2026-12-31', time: '23:59' })
  assert.deepEqual(vietnamDateTime(new Date('2026-12-31T17:00:00Z')), { date: '2027-01-01', time: '00:00' })
})

test('Vietnam month and leap-day boundaries are preserved', () => {
  assert.deepEqual(vietnamDateTime(new Date('2028-02-28T17:00:00Z')), { date: '2028-02-29', time: '00:00' })
  assert.deepEqual(vietnamDateTime(new Date('2028-02-29T17:00:00Z')), { date: '2028-03-01', time: '00:00' })
})

test('date and time are independent of the computer timezone', () => {
  const moduleUrl = new URL('./datetime.mjs', import.meta.url).href
  const script = `import { vietnamDateTime } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(vietnamDateTime(new Date('2026-10-28T17:30:00Z'))))`
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' })
    assert.deepEqual(JSON.parse(output), { date: '2026-10-29', time: '00:30' })
  }
})
