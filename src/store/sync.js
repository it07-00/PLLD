import { storage } from './storage'

const SYNC_CONFIG_KEY = 'envmonitor_sync_config'
const AUTH_SESSION_KEY = 'envmonitor_auth'
const DEFAULT_HOSTED_API = 'https://25percent.tech/api/index.php'

export function getDefaultApiUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, origin } = window.location
    if ((protocol === 'https:' || protocol === 'http:') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${origin}/api/index.php`
    }
  }
  return DEFAULT_HOSTED_API
}

const DEFAULT_CONFIG = {
  apiUrl: '',
  apiKey: '',
  autoSync: true,
  lastSyncAt: '',
  lastServerTime: 0,
  lastError: '',
}

let activeSyncPromise = null
let syncedInSession = false

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.token || !parsed.user) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
  syncedInSession = false
}

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_CONFIG, apiUrl: getDefaultApiUrl() }
    const parsed = JSON.parse(raw)
    const merged = { ...DEFAULT_CONFIG, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
    if (!merged.apiUrl) merged.apiUrl = getDefaultApiUrl()
    return merged
  } catch {
    return { ...DEFAULT_CONFIG, apiUrl: getDefaultApiUrl() }
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
  const auth = getAuthSession()
  const apiUrl = config.apiUrl || getDefaultApiUrl()
  return Boolean(apiUrl && (auth?.token || config.apiKey))
}

function buildEndpoint(apiUrl, action) {
  const trimmed = String(apiUrl || getDefaultApiUrl()).trim()
  if (!trimmed) throw new Error('Chưa nhập địa chỉ API')
  const url = new URL(trimmed)
  url.searchParams.set('action', action)
  return url.toString()
}

function authHeaders(config = getSyncConfig()) {
  const auth = getAuthSession()
  const headers = {}
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`
  if (config?.apiKey) headers['X-Api-Key'] = config.apiKey
  return headers
}

async function requestJson(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
      const err = new Error(data?.error || `Lỗi máy chủ (${response.status})`)
      err.status = response.status
      throw err
    }
    return data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Kết nối tới máy chủ quá thời gian chờ')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function loginWithServer({ username, password, apiUrl }) {
  const targetUrl = String(apiUrl || getSyncConfig().apiUrl || getDefaultApiUrl()).trim()
  const endpoint = buildEndpoint(targetUrl, 'login')
  const result = await requestJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: String(username || '').trim(), password: String(password || '') }),
  })
  saveSyncConfig({ apiUrl: targetUrl, autoSync: true, lastError: '' })
  return saveAuthSession({ token: result.token, user: result.user })
}

export async function changePassword({ currentPassword, newPassword }) {
  const config = getSyncConfig()
  const endpoint = buildEndpoint(config.apiUrl, 'change_password')
  return requestJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function fetchUsers() {
  const config = getSyncConfig()
  const endpoint = buildEndpoint(config.apiUrl, 'users')
  return requestJson(endpoint, { method: 'GET', headers: authHeaders(config) })
}

export async function createUser(payload) {
  const config = getSyncConfig()
  const endpoint = buildEndpoint(config.apiUrl, 'create_user')
  return requestJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify(payload),
  })
}

export async function toggleUserActive(userId) {
  const config = getSyncConfig()
  const endpoint = buildEndpoint(config.apiUrl, 'toggle_user')
  return requestJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify({ userId }),
  })
}

export async function resetUserPassword(userId, newPassword) {
  const config = getSyncConfig()
  const endpoint = buildEndpoint(config.apiUrl, 'reset_password')
  return requestJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify({ userId, newPassword }),
  })
}

export async function testSyncConnection(apiUrl, apiKey) {
  const endpoint = buildEndpoint(apiUrl, 'ping')
  const headers = authHeaders({ apiKey })
  if (apiKey) headers['X-Api-Key'] = String(apiKey).trim()
  return requestJson(endpoint, {
    method: 'GET',
    headers,
  })
}

export async function syncWithServer({ forceFull = false, pullOnlyIfClean = false } = {}) {
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
    const since = forceFull ? 0 : (Number(config.lastServerTime) || 0)
    const shouldSendLocal = forceFull || since === 0 || !syncedInSession || !pullOnlyIfClean || storage.isSyncDirty()
    const localRecords = shouldSendLocal ? storage.getAllRaw() : []

    const result = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(config),
      },
      body: JSON.stringify({
        since,
        deviceId: storage.getDeviceId(),
        records: localRecords,
      }),
    })

    const merged = storage.applySyncMerge(result.records || [])
    const now = new Date().toISOString()
    syncedInSession = true
    if (shouldSendLocal) {
      storage.clearSyncDirty()
    }
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
      return { ok: false, error: error.message || 'Lỗi đồng bộ', status: error.status }
    })
    .finally(() => {
      activeSyncPromise = null
    })

  return activeSyncPromise
}
