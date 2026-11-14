import { useState, useCallback, useEffect, useRef } from 'react'
import { storage } from '../store/storage'
import { getSyncConfig, isSyncConfigured, syncWithServer } from '../store/sync'

function initialSyncState() {
  const config = getSyncConfig()
  if (!isSyncConfigured(config)) return { status: 'unconfigured', lastSyncAt: '', lastError: '' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline', lastSyncAt: config.lastSyncAt || '', lastError: '' }
  }
  return { status: 'idle', lastSyncAt: config.lastSyncAt || '', lastError: config.lastError || '' }
}

export function useRecords() {
  const [snapshot, setSnapshot] = useState(() => {
    try { storage.getSettings(); return { records: storage.getAll(), error: '' } }
    catch (error) { return { records: [], error: error.message } }
  })
  const { records, error } = snapshot
  const [version, setVersion] = useState(0)
  const [syncState, setSyncState] = useState(initialSyncState)
  const syncTimerRef = useRef(null)

  const refresh = useCallback(() => {
    try { storage.getSettings(); setSnapshot({ records: storage.getAll(), error: '' }) }
    catch (error) { setSnapshot(previous => ({ ...previous, error: error.message })) }
    setVersion(v => v + 1)
  }, [])

  const refreshSyncBadge = useCallback(() => {
    const config = getSyncConfig()
    if (!isSyncConfigured(config)) {
      setSyncState({ status: 'unconfigured', lastSyncAt: '', lastError: '' })
    } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncState({ status: 'offline', lastSyncAt: config.lastSyncAt || '', lastError: '' })
    } else {
      setSyncState(prev => ({
        status: prev.status === 'syncing' ? 'syncing' : (config.lastError ? 'error' : 'idle'),
        lastSyncAt: config.lastSyncAt || '',
        lastError: config.lastError || '',
      }))
    }
  }, [])

  const triggerSync = useCallback(async ({ forceFull = false } = {}) => {
    const config = getSyncConfig()
    if (!isSyncConfigured(config)) {
      setSyncState({ status: 'unconfigured', lastSyncAt: '', lastError: '' })
      return { ok: false, unconfigured: true }
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncState({ status: 'offline', lastSyncAt: config.lastSyncAt || '', lastError: 'Đang ngoại tuyến' })
      return { ok: false, offline: true, error: 'Đang ngoại tuyến' }
    }

    setSyncState(prev => ({ ...prev, status: 'syncing', lastError: '' }))
    const result = await syncWithServer({ forceFull })
    const latestConfig = getSyncConfig()

    if (result.ok) {
      if (result.added > 0 || result.updated > 0) refresh()
      setSyncState({ status: 'idle', lastSyncAt: latestConfig.lastSyncAt || '', lastError: '' })
    } else if (result.offline) {
      setSyncState({ status: 'offline', lastSyncAt: latestConfig.lastSyncAt || '', lastError: '' })
    } else if (result.unconfigured) {
      setSyncState({ status: 'unconfigured', lastSyncAt: '', lastError: '' })
    } else {
      setSyncState({ status: 'error', lastSyncAt: latestConfig.lastSyncAt || '', lastError: result.error || 'Lỗi đồng bộ' })
    }
    return result
  }, [refresh])

  const scheduleAutoSync = useCallback(() => {
    const config = getSyncConfig()
    if (!isSyncConfigured(config) || !config.autoSync) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      triggerSync()
    }, 600)
  }, [triggerSync])

  useEffect(() => {
    const listener = () => refresh()
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }, [refresh])

  useEffect(() => {
    const config = getSyncConfig()
    if (isSyncConfigured(config) && config.autoSync) {
      triggerSync()
    }

    const onOnline = () => {
      const current = getSyncConfig()
      if (isSyncConfigured(current) && current.autoSync) triggerSync()
      else refreshSyncBadge()
    }
    const onOffline = () => refreshSyncBadge()

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [triggerSync, refreshSyncBadge])

  const saveRecord = useCallback((record) => {
    storage.save(record)
    refresh()
    scheduleAutoSync()
    return record
  }, [refresh, scheduleAutoSync])

  const deleteRecord = useCallback((id) => {
    storage.delete(id)
    refresh()
    scheduleAutoSync()
  }, [refresh, scheduleAutoSync])

  const deleteCompany = useCallback((companyName) => {
    const deleted = storage.deleteCompany(companyName)
    refresh()
    if (deleted > 0) scheduleAutoSync()
    return deleted
  }, [refresh, scheduleAutoSync])

  const exportData = useCallback(() => {
    storage.exportJSON()
  }, [])

  const importData = useCallback(async (file, options) => {
    const count = await storage.importJSON(file, options)
    refresh()
    scheduleAutoSync()
    return count
  }, [refresh, scheduleAutoSync])

  const clearAll = useCallback(() => {
    storage.clear()
    refresh()
  }, [refresh])

  return {
    records,
    error,
    version,
    syncState,
    refresh,
    refreshSyncBadge,
    triggerSync,
    scheduleAutoSync,
    saveRecord,
    deleteRecord,
    deleteCompany,
    exportData,
    importData,
    clearAll,
  }
}
