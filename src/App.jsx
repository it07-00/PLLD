import React, { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Layout/Sidebar'
import Topbar from './components/Layout/Topbar'
import Dashboard from './components/Dashboard/Dashboard'
import WorkerForm from './components/NewTest/WorkerForm'
import TestRunner from './components/NewTest/TestRunner'
import Summary from './components/NewTest/Summary'
import History from './components/History/History'
import Stats from './components/Stats/Stats'
import Settings from './components/Settings/Settings'
import Login from './components/Auth/Login'
import { useRecords } from './hooks/useRecords'
import { Button, Card } from './components/UI/UI'
import { storage, downloadJSON } from './store/storage'
import { getAuthSession, clearAuthSession } from './store/sync'
import { normalizeRecord } from './utils/records.mjs'
import { newId } from './utils/session.mjs'
import { vietnamDateTime } from './utils/datetime.mjs'
import layoutStyles from './components/Layout/Layout.module.css'
import './App.css'

function loadSession() {
  try { return { session: storage.getDraft(), error: '' } }
  catch (error) { return { session: null, error: error.message } }
}

export default function App() {
  const [authSession, setAuthSession] = useState(() => getAuthSession())
  const [page, setPage] = useState('dashboard')
  const [initialDraft] = useState(loadSession)
  const [session, setSession] = useState(initialDraft.session)
  const sessionRef = useRef(session)
  const [draftError, setDraftError] = useState(initialDraft.error)
  const [actionError, setActionError] = useState('')
  const [summaryRecord, setSummaryRecord] = useState(null)
  const [selectedRecordId, setSelectedRecordId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 768 : true))
  const { records, error, syncState, refresh, refreshSyncBadge, triggerSync, scheduleAutoSync, saveRecord, deleteRecord, deleteCompany, exportData, importData, clearAll } = useRecords()
  const isImmersiveMode = page === 'new-test' && session && !session.record

  useEffect(() => {
    const warn = event => { if (sessionRef.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  useEffect(() => {
    const syncDraft = event => {
      if (event.key !== 'envmonitor_draft') return
      const next = loadSession()
      sessionRef.current = next.session
      setSession(next.session)
      setDraftError(next.error)
      setPage('dashboard')
      setSummaryRecord(null)
    }
    window.addEventListener('storage', syncDraft)
    return () => window.removeEventListener('storage', syncDraft)
  }, [])

  const persistSession = next => {
    sessionRef.current = next
    setSession(next)
    try { storage.saveDraft(next); setDraftError('') }
    catch (error) { setDraftError(error.message) }
  }

  const navigate = (nextPage, id) => {
    if (page === 'new-test' && sessionRef.current && nextPage !== 'new-test' && !confirm('Phiên kiểm tra chưa hoàn tất. Tiến độ được giữ trong bản nháp; bạn muốn chuyển trang?')) return
    setPage(nextPage)
    setSelectedRecordId(nextPage === 'history' ? id || null : null)
    if (nextPage === 'new-test') setSummaryRecord(null)
    if (typeof window !== 'undefined' && window.innerWidth <= 640) setIsSidebarOpen(false)
  }

  const safe = action => {
    try { const result = action(); setActionError(''); return result }
    catch (error) { setActionError(error.message); return false }
  }

  const start = worker => {
    if (draftError && !sessionRef.current) { setActionError('Hãy tải dữ liệu gốc và xử lý bản nháp hỏng trước khi bắt đầu phiên mới.'); return }
    persistSession({ id: newId(), worker, results: {}, progress: {}, record: null })
    setSummaryRecord(null)
    try { document.documentElement.requestFullscreen?.()?.catch(() => {}) } catch { /* Optional browser feature. */ }
  }

  const saveComplete = record => {
    try {
      saveRecord(record)
      storage.clearDraft()
      sessionRef.current = null
      setSession(null)
      setSummaryRecord(record)
      setDraftError('')
      setActionError('')
    } catch (error) { setActionError(error.message) }
    try { if (document.fullscreenElement) document.exitFullscreen()?.catch(() => {}) } catch { /* Optional browser feature. */ }
  }

  const complete = results => {
    const current = sessionRef.current
    if (!current) return
    const { selectedTests, ...worker } = current.worker
    const now = new Date()
    const record = normalizeRecord({ id: current.id, ...vietnamDateTime(now), createdAt: now.toISOString(), worker, tests: results })
    persistSession({ ...current, results, record })
    saveComplete(record)
  }

  const discardSession = () => {
    if (!confirm('Xóa phiên kiểm tra đang dở? Kết quả chưa lưu của phiên này sẽ bị xóa.')) return
    safe(() => { storage.clearDraft(); sessionRef.current = null; setSession(null); setDraftError('') })
  }

  const exportSession = () => safe(() => {
    const current = sessionRef.current
    if (!current) return
    const value = current.record ? { format: 'plld-backup', version: 2, records: [current.record], settings: null } : { format: 'plld-draft', version: 1, session: current }
    downloadJSON(value, `plld-ket-qua-tam-${vietnamDateTime().date}.json`)
  })

  const importBackup = async (file, options) => {
    if (sessionRef.current) throw new Error('Hãy hoàn tất hoặc xuất và xóa phiên đang dở trước khi nhập bản sao lưu.')
    const result = await importData(file, options)
    const next = loadSession()
    sessionRef.current = next.session
    setSession(next.session)
    setDraftError(next.error)
    return result
  }

  const recover = async event => {
    const file = event.target.files[0]
    if (!file) return
    if (!confirm('Khôi phục file đã chọn sẽ thay kho hồ sơ/cài đặt đang lỗi bằng dữ liệu trong file. Hãy tải dữ liệu gốc trước khi xác nhận.')) { event.target.value = ''; return }
    try { await importData(file, { replaceCorrupt: true, restoreSettings: true }); setActionError(''); refresh() }
    catch (error) { setActionError(error.message) }
    event.target.value = ''
  }

  const renderPage = () => {
    if (error) return <Card>
      <h2>Không đọc được kho dữ liệu</h2><p role="alert">{error}</p>
      <p>Hãy tải dữ liệu gốc để giữ bản phục hồi, sau đó chọn bản sao lưu JSON hợp lệ.</p>
      <Button onClick={() => safe(storage.exportRaw)}>Tải dữ liệu gốc</Button>
      <label className="file-action">Khôi phục bản sao lưu <input aria-label="Khôi phục kho dữ liệu" type="file" accept=".json" onChange={recover} /></label>
    </Card>
    if (page === 'new-test') {
      const record = session?.record || summaryRecord
      if (record) return <Summary worker={record.worker} testResults={record.tests} record={record} saved={!session} onRetrySave={() => saveComplete(record)} onExportTemporary={exportSession} onNewTest={() => { if (session) return; setSummaryRecord(null) }} onNavigate={navigate} />
      if (session) return <TestRunner key={session.id} selectedTests={session.worker.selectedTests} initialResults={session.results} initialProgress={session.progress} onComplete={complete} onProgress={(results, progress) => { const current = sessionRef.current; if (current) persistSession({ ...current, results, progress }) }} />
      return <WorkerForm records={records} onSubmit={start} />
    }
    if (page === 'history') return <History records={records} selectedId={selectedRecordId} onDelete={id => safe(() => deleteRecord(id))} onNavigate={navigate} />
    if (page === 'stats') return <Stats records={records} />
    if (page === 'settings') return <Settings records={records} authUser={authSession?.user} onLogout={handleLogout} syncState={syncState} onSyncNow={triggerSync} onSyncConfigChange={refreshSyncBadge} onExport={() => safe(exportData)} onImport={importBackup} onClear={clearAll} onDeleteCompany={deleteCompany} onAssignCompany={(ids, name) => { const count = storage.assignCompany(ids, name); refresh(); if (count) scheduleAutoSync(); return count }} />
    return <Dashboard records={records} onNavigate={navigate} />
  }

  const handleLoginSuccess = (nextSession) => {
    setAuthSession(nextSession)
    refreshSyncBadge()
    triggerSync()
  }

  const handleLogout = () => {
    if (sessionRef.current && !confirm('Phiên kiểm tra chưa hoàn tất. Bạn vẫn muốn đăng xuất?')) return
    clearAuthSession()
    setAuthSession(null)
    setPage('dashboard')
    refreshSyncBadge()
  }

  if (!authSession) {
    return <Login onSuccess={handleLoginSuccess} />
  }

  const syncLabel = syncState.status === 'syncing'
    ? 'Đang đồng bộ...'
    : syncState.status === 'offline'
      ? 'Ngoại tuyến'
      : syncState.status === 'error'
        ? 'Lỗi đồng bộ (Thử lại)'
        : syncState.status === 'unconfigured'
          ? 'Cài đặt đồng bộ'
          : 'Đồng bộ ngay'

  const syncButton = (
    <Button
      variant={syncState.status === 'error' ? 'danger' : 'ghost'}
      size="sm"
      disabled={syncState.status === 'syncing'}
      onClick={() => (syncState.status === 'unconfigured' ? navigate('settings') : triggerSync())}
      title={syncState.lastError || (syncState.lastSyncAt ? `Đồng bộ gần nhất: ${new Date(syncState.lastSyncAt).toLocaleString('vi-VN')}` : 'Đồng bộ dữ liệu với hosting iNET')}
    >
      {syncLabel}
    </Button>
  )

  return <>
    {!isImmersiveMode && <Sidebar currentPage={page} onNavigate={navigate} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} authUser={authSession.user} onLogout={handleLogout} />}
    <div className={`${layoutStyles.mainArea} ${!isSidebarOpen ? layoutStyles.mainExpanded : ''} ${isImmersiveMode ? layoutStyles.mainImmersive : ''}`}>
      {!isImmersiveMode && <Topbar currentPage={page} onToggleSidebar={() => setIsSidebarOpen(value => !value)} actions={<>{syncButton}{page === 'dashboard' ? <Button onClick={() => navigate('new-test')}>+ Kiểm tra mới</Button> : page === 'history' ? <Button onClick={() => safe(exportData)}>Xuất JSON</Button> : null}</>} />}
      <div className={isImmersiveMode ? layoutStyles.contentImmersive : layoutStyles.content}>
        {actionError && <div className="app-notice" role="alert">{actionError}<Button onClick={() => setActionError('')}>Đóng thông báo</Button></div>}
        {draftError && <div className="app-notice" role="alert">{draftError}<Button onClick={() => safe(storage.exportRaw)}>Tải dữ liệu gốc</Button>{session ? <Button onClick={exportSession}>Xuất phiên đang làm</Button> : <Button onClick={discardSession}>Xóa bản nháp hỏng</Button>}</div>}
        {session && <div className="app-notice"><span>Phiên đang dở: {session.worker.name} · {session.worker.companyName}</span><div className="app-notice-actions">{page !== 'new-test' && <Button size="sm" onClick={() => navigate('new-test')}>Tiếp tục phiên kiểm tra</Button>}<Button variant="ghost" size="sm" onClick={exportSession}>Xuất kết quả tạm</Button><Button variant="ghost" size="sm" onClick={discardSession}>Xóa phiên nháp</Button></div></div>}
        {renderPage()}
      </div>
    </div>
  </>
}
