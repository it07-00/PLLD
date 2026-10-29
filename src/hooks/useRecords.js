import { useState, useCallback, useEffect } from 'react'
import { storage } from '../store/storage'

export function useRecords() {
  const [snapshot, setSnapshot] = useState(() => {
    try { storage.getSettings(); return { records: storage.getAll(), error: '' } }
    catch (error) { return { records: [], error: error.message } }
  })
  const { records, error } = snapshot
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => {
    try { storage.getSettings(); setSnapshot({ records: storage.getAll(), error: '' }) }
    catch (error) { setSnapshot(previous => ({ ...previous, error: error.message })) }
    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    const listener = () => refresh()
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }, [refresh])

  const saveRecord = useCallback((record) => {
    storage.save(record)
    refresh()
    return record
  }, [refresh])

  const deleteRecord = useCallback((id) => {
    storage.delete(id)
    refresh()
  }, [refresh])

  const deleteCompany = useCallback((companyName) => {
    const deleted = storage.deleteCompany(companyName)
    refresh()
    return deleted
  }, [refresh])

  const exportData = useCallback(() => {
    storage.exportJSON()
  }, [])

  const importData = useCallback(async (file, options) => {
    const count = await storage.importJSON(file, options)
    refresh()
    return count
  }, [refresh])

  const clearAll = useCallback(() => {
    storage.clear()
    refresh()
  }, [refresh])

  return {
    records,
    error,
    version,
    refresh,
    saveRecord,
    deleteRecord,
    deleteCompany,
    exportData,
    importData,
    clearAll,
  }
}
