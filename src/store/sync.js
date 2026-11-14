import { storage } from './storage'

const SYNC_CONFIG_KEY = 'envmonitor_sync_config'

const DEFAULT_CONFIG = {
  apiUrl: '',
  apiKey: '',
  autoSync: true,
  lastSyncAt: '',
  lastServerTime: 0,
  lastError: '',
}

let activeSyncPromise = null

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveSyncConfig(partial) {
  const next = { ...getSyncConfig(), ...partial }
  if (typeof next.apiUrl === 'string') next.apiUrl = next.apiUrl.trim()
  if (typeof next.apiKey === 'string') next.apiKey = next.apiKey.trim()
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(next))
  return next
}

export function isSyncConfigured(config = getSyncConfig()) {
  return Boolean(config.apiUrl && config.apiKey)
}

function buildEndpoint(apiUrl, action) {
  const trimmed = String(apiUrl || '').trim()
  if (!trimmed) throw new Error('Chưa nhập địa chỉ API')
  const url = new URL(trimmed)
  url.searchParams.set('action', action)
  return url.toString()
}

async function requestJson(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || `Lỗi máy chủ (${response.status})`)
    }
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Kết nối tới máy chủ quá thời gian chờ')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function testSyncConnection(apiUrl, apiKey) {
  const endpoint = buildEndpoint(apiUrl, 'ping')
  return requestJson(endpoint, {
    method: 'GET',
    headers: { 'X-Api-Key': String(apiKey || '').trim() },
  })
}

export async function syncWithServer({ forceFull = false } = {}) {
  if (activeSyncPromise) return activeSyncPromise

  const run = async () => {
    const config = getSyncConfig()
    if (!isSyncConfigured(config)) {
      return { ok: false, unconfigured: true }
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, offline: true, error: 'Đang ngoại tuyến' }
    }

    const endpoint = buildEndpoint(config.apiUrl, 'sync')
    const localRecords = storage.getAllRaw()
    const since = forceFull ? 0 : (Number(config.lastServerTime) || 0)

    const result = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.apiKey,
      },
      body: JSON.stringify({
        since,
        deviceId: storage.getDeviceId(),
        records: localRecords,
      }),
    })

    const merged = storage.applySyncMerge(result.records || [])
    const now = new Date().toISOString()
    saveSyncConfig({
      lastSyncAt: now,
      lastServerTime: Number(result.serverTime) || config.lastServerTime || 0,
      lastError: '',
    })

    return {
      ok: true,
      added: merged.added,
      updated: merged.updated,
      sent: localRecords.length,
      upserted: result.stats?.upserted ?? 0,
      syncedAt: now,
    }
  }

  activeSyncPromise = run()
    .catch(error => {
      saveSyncConfig({ lastError: error.message || 'Lỗi đồng bộ' })
      return { ok: false, error: error.message || 'Lỗi đồng bộ' }
    })
    .finally(() => {
      activeSyncPromise = null
    })

  return activeSyncPromise
}
