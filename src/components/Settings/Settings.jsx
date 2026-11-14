import React, { useMemo, useState, useRef } from 'react'
import { Card, Button, Input, Select } from '../UI/UI'
import { storage } from '../../store/storage'
import { getSyncConfig, saveSyncConfig, testSyncConnection } from '../../store/sync'
import { normalizeCompanyName } from '../../utils/company.mjs'
import { deleteCompanyAfterConfirmation } from '../../utils/actions.mjs'
import { Download, Upload, TriangleAlert, CheckCircle2, Cloud, RefreshCw } from 'lucide-react'
import styles from './Settings.module.css'

export default function Settings({ onExport, onImport, onClear, onDeleteCompany, onAssignCompany, records, syncState, onSyncNow, onSyncConfigChange }) {
  const [settings, setSettings] = useState(() => storage.getSettings())
  const [syncForm, setSyncForm] = useState(() => getSyncConfig())
  const [syncMsg, setSyncMsg] = useState('')
  const [syncErr, setSyncErr] = useState('')
  const [testingSync, setTestingSync] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [deleteCompany, setDeleteCompany] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [restoreSettings, setRestoreSettings] = useState(true)
  const [legacyIds, setLegacyIds] = useState([])
  const [legacyCompany, setLegacyCompany] = useState('')
  const [legacyMsg, setLegacyMsg] = useState('')
  const legacyRecords = records.filter(record => !normalizeCompanyName(record.worker.companyName))
  const companies = useMemo(() => {
    const groups = new Map()
    for (const record of records) {
      const key = normalizeCompanyName(record.worker?.companyName)
      if (!key) continue
      if (!groups.has(key)) groups.set(key, { key, name: record.worker.companyName.trim(), count: 0 })
      groups.get(key).count++
    }
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [records])
  const selectedCompany = companies.find(company => company.key === deleteCompany)
  const fileRef = useRef(null)

  const update = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }))
    setSaved(false)
  }

  const handleSave = () => {
    try {
      storage.saveSettings(settings)
      setSaved(true)
      setSaveError('')
      setTimeout(() => setSaved(false), 2000)
    } catch (error) { setSaved(false); setSaveError(error.message) }
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) { setSaveError('Chọn ảnh PNG, JPEG, WebP, GIF hoặc SVG'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      update('logo', ev.target.result)
    }
    reader.onerror = () => setSaveError('Không đọc được ảnh logo')
    reader.readAsDataURL(file)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const result = await onImport(file, { restoreSettings })
      setSettings(storage.getSettings())
      setImportMsg(`✅ Đã thêm ${result.added} hồ sơ, bỏ qua ${result.skipped} hồ sơ trùng.${result.settingsRestored ? ' Đã khôi phục cài đặt và logo.' : ''}${result.draftRestored ? ' Đã khôi phục phiên kiểm tra dở.' : ''}`)
    } catch (err) {
      setImportMsg(`❌ ${err.message}`)
    }
    e.target.value = ''
  }

  const handleClear = () => {
    if (confirm('⚠️ Bạn có chắc muốn XÓA TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
      if (confirm('Xác nhận lần nữa: Xóa toàn bộ dữ liệu?')) {
        try {
          onClear()
          setDeleteCompany('')
          setDeleteMsg('Đã xóa toàn bộ hồ sơ.')
        } catch (error) { setDeleteMsg(error.message) }
      }
    }
  }

  const handleAssignCompany = () => {
    if (!legacyIds.length || !legacyCompany.trim()) return
    if (!confirm(`Gán ${legacyIds.length} hồ sơ đã chọn cho công ty "${legacyCompany.trim()}"?`)) return
    try {
      const count = onAssignCompany(legacyIds, legacyCompany)
      setLegacyMsg(`Đã gán ${count} hồ sơ cho công ty ${legacyCompany.trim()}.`)
      setLegacyIds([])
    } catch (error) { setLegacyMsg(error.message) }
  }

  const handleDeleteCompany = () => {
    if (!selectedCompany) return
    try {
      const deleted = deleteCompanyAfterConfirmation(selectedCompany, onDeleteCompany)
      if (deleted === null) return
      setDeleteMsg(`Đã xóa ${deleted} hồ sơ của công ty ${selectedCompany.name}.`)
      setDeleteCompany('')
    } catch {
      setDeleteMsg('Không thể xóa dữ liệu. Vui lòng thử lại.')
    }
  }

  const handleSaveSync = () => {
    const savedCfg = saveSyncConfig({
      apiUrl: syncForm.apiUrl,
      apiKey: syncForm.apiKey,
      autoSync: Boolean(syncForm.autoSync),
    })
    setSyncForm(savedCfg)
    setSyncErr('')
    setSyncMsg('Đã lưu cấu hình đồng bộ.')
    onSyncConfigChange?.()
  }

  const handleTestSync = async () => {
    setTestingSync(true)
    setSyncMsg('')
    setSyncErr('')
    try {
      const res = await testSyncConnection(syncForm.apiUrl, syncForm.apiKey)
      setSyncMsg(`Kết nối thành công! Máy chủ đang lưu ${res.activeRecords ?? 0} hồ sơ.`)
    } catch (error) {
      setSyncErr(error.message || 'Không kết nối được máy chủ.')
    } finally {
      setTestingSync(false)
    }
  }

  const handleRunSync = async (forceFull = false) => {
    saveSyncConfig({
      apiUrl: syncForm.apiUrl,
      apiKey: syncForm.apiKey,
      autoSync: Boolean(syncForm.autoSync),
    })
    onSyncConfigChange?.()
    setSyncMsg('')
    setSyncErr('')
    const res = await onSyncNow?.({ forceFull })
    setSyncForm(getSyncConfig())
    if (!res) return
    if (res.ok) {
      setSyncMsg(`Đồng bộ hoàn tất: nhận mới ${res.added}, cập nhật ${res.updated}, đã đẩy lên ${res.upserted} hồ sơ.`)
    } else if (res.unconfigured) {
      setSyncErr('Vui lòng nhập đầy đủ Địa chỉ API và Mã bảo mật trước khi đồng bộ.')
    } else {
      setSyncErr(res.error || 'Đồng bộ thất bại.')
    }
  }

  return (
    <div className={styles.settings}>
      <Card>
        <h3 className={styles.sectionTitle}>
          <Cloud size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Đồng bộ Online (Hosting iNET)
        </h3>
        <p className={styles.sectionDesc}>
          Dữ liệu vẫn lưu cục bộ khi mất mạng và tự động đồng bộ 2 chiều giữa các máy qua hosting iNET khi có Internet.
        </p>
        <div className={styles.formGrid}>
          <Input
            label="Địa chỉ API trên iNET"
            id="sync-api-url"
            value={syncForm.apiUrl || ''}
            onChange={e => { setSyncForm(s => ({ ...s, apiUrl: e.target.value })); setSyncMsg(''); setSyncErr('') }}
            placeholder="https://tenmiencuaban.com/api/index.php"
            className={styles.spanFull}
          />
          <Input
            label="Mã bảo mật (API Key)"
            id="sync-api-key"
            type="password"
            value={syncForm.apiKey || ''}
            onChange={e => { setSyncForm(s => ({ ...s, apiKey: e.target.value })); setSyncMsg(''); setSyncErr('') }}
            placeholder="Nhập mã bảo mật trùng với config.php"
            className={styles.spanFull}
          />
        </div>
        <label className={styles.syncCheck}>
          <input
            type="checkbox"
            checked={Boolean(syncForm.autoSync)}
            onChange={e => setSyncForm(s => ({ ...s, autoSync: e.target.checked }))}
          />
          Tự động đồng bộ khi mở app, khi có mạng lại và sau mỗi lần lưu hồ sơ
        </label>
        <div className={styles.syncActions}>
          <Button variant="primary" size="sm" onClick={handleSaveSync}>Lưu cấu hình</Button>
          <Button variant="ghost" size="sm" onClick={handleTestSync} disabled={testingSync || !syncForm.apiUrl || !syncForm.apiKey}>
            {testingSync ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleRunSync(false)} disabled={syncState?.status === 'syncing'}>
            <RefreshCw size={14} style={{ marginRight: 4 }} />
            {syncState?.status === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleRunSync(true)} disabled={syncState?.status === 'syncing'}>
            Đồng bộ lại toàn bộ
          </Button>
        </div>
        {syncState?.lastSyncAt && (
          <div className={styles.syncMeta}>
            Lần đồng bộ gần nhất: {new Date(syncState.lastSyncAt).toLocaleString('vi-VN')}
          </div>
        )}
        {syncMsg && <div className={styles.importMsg} style={{ marginTop: 10 }}>{syncMsg}</div>}
        {(syncErr || syncState?.lastError) && (
          <div className={styles.syncErrorMsg} role="alert">{syncErr || syncState.lastError}</div>
        )}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>Thông tin mặc định</h3>
        <p className={styles.sectionDesc}>Các giá trị mặc định sẽ được tự động điền khi tạo kiểm tra mới</p>
        <div className={styles.formGrid}>
          <Input
            label="Tên đơn vị mặc định"
            id="default-unit"
            value={settings.defaultUnit || ''}
            onChange={e => update('defaultUnit', e.target.value)}
            placeholder="Phân xưởng A"
          />
          <Input
            label="Tên công ty / tổ chức"
            id="company-name"
            value={settings.companyName || ''}
            onChange={e => update('companyName', e.target.value)}
            placeholder="Công ty ABC"
            className={styles.spanFull}
          />
        </div>

        <div className={styles.logoSection}>
          <label className={styles.label}>Logo công ty (hiển thị trên báo cáo in)</label>
          <div className={styles.logoRow}>
            {settings.logo ? (
              <div className={styles.logoPreview}>
                <img src={settings.logo} alt="Logo" />
                <button className={styles.removeLogo} onClick={() => update('logo', '')}>✕</button>
              </div>
            ) : (
              <div className={styles.logoPlaceholder}>
                <span className={styles.logoPlaceholderTitle}>Chưa có logo</span>
                <span className={styles.logoPlaceholderHint}>PNG, JPG</span>
              </div>
            )}
            <div className={styles.logoActions}>
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                {settings.logo ? 'Đổi logo' : 'Tải lên logo'}
              </Button>
              <span className={styles.logoHelp}>Logo sẽ được dùng trong file báo cáo xuất ra.</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
          </div>
        </div>

        <div className={styles.saveRow}>
          <Button variant="primary" onClick={handleSave}>Lưu cài đặt</Button>
          {saved && (
            <span className={styles.savedMsg}>
              <CheckCircle2 size={15} />
              Đã lưu!
            </span>
          )}
        </div>
        {saveError && <p role="alert">{saveError}</p>}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>Sao lưu & Khôi phục dữ liệu</h3>
        <p className={styles.sectionDesc}>
          Hiện có <strong>{records.length}</strong> bản ghi trong hệ thống.
          Hãy xuất file JSON định kỳ để tránh mất dữ liệu khi xóa cache trình duyệt.
        </p>

        <div className={styles.backupActions}>
          <div className={styles.backupItem}>
            <div className={styles.backupIcon}><Download size={20} /></div>
            <div>
              <div className={styles.backupTitle}>Xuất dữ liệu (Backup)</div>
              <div className={styles.backupDesc}>Sao lưu toàn bộ hồ sơ, cài đặt và logo; không giới hạn 500 hồ sơ</div>
            </div>
            <Button variant="primary" size="sm" onClick={onExport}>
              Xuất JSON
            </Button>
          </div>

          <label><input type="checkbox" checked={restoreSettings} onChange={e => setRestoreSettings(e.target.checked)} /> Khôi phục cả cài đặt và logo từ file sao lưu mới</label>

          <div className={styles.backupItem}>
            <div className={styles.backupIcon}><Upload size={20} /></div>
            <div>
              <div className={styles.backupTitle}>Nhập dữ liệu (Restore)</div>
              <div className={styles.backupDesc}>Nhập file JSON đã xuất trước đó (tự động gộp, không trùng)</div>
            </div>
            <label className={styles.uploadBtn}>
              Nhập JSON
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>

          {importMsg && <div className={styles.importMsg}>{importMsg}</div>}
        </div>
      </Card>

      {legacyRecords.length > 0 && <Card>
        <h3 className={styles.sectionTitle}>Gán công ty cho hồ sơ cũ</h3>
        <p className={styles.sectionDesc}>Chọn đúng các hồ sơ thuộc cùng công ty. Giữ Ctrl để chọn nhiều hồ sơ; thông tin và kết quả kiểm tra được giữ nguyên.</p>
        <Select label="Hồ sơ chưa có công ty" id="legacy-records" multiple size={6} className={styles.legacySelect} value={legacyIds} onChange={e => setLegacyIds(Array.from(e.target.selectedOptions, option => option.value))}>
          {legacyRecords.map(record => <option key={record.id} value={String(record.id)}>{record.worker.code || '—'} · {record.worker.name} · {record.date} {record.time} · {record.worker.timeline} · {record.worker.unit || '—'}</option>)}
        </Select>
        <Input label="Công ty của hồ sơ đã chọn" id="legacy-company" value={legacyCompany} onChange={e => setLegacyCompany(e.target.value)} list="settings-companies" />
        <datalist id="settings-companies">{companies.map(company => <option key={company.key} value={company.name} />)}</datalist>
        <Button disabled={!legacyIds.length || !legacyCompany.trim()} onClick={handleAssignCompany}>Gán công ty cho {legacyIds.length} hồ sơ</Button>
        {legacyMsg && <p role="status">{legacyMsg}</p>}
      </Card>}

      <Card className={styles.dangerCard}>
        <h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
          <TriangleAlert size={18} />
          Vùng nguy hiểm
        </h3>
        <div className={styles.companyDelete}>
          <h4 className={styles.sectionTitle}>Xóa dữ liệu theo công ty</h4>
          <p className={styles.sectionDesc}>Chọn công ty cần xóa hồ sơ kiểm tra. Hồ sơ chưa có tên công ty không nằm trong danh sách này.</p>
          <Select label="Công ty cần xóa dữ liệu" id="delete-company" value={deleteCompany} onChange={e => { setDeleteCompany(e.target.value); setDeleteMsg('') }}>
            <option value="">Chọn công ty</option>
            {companies.map(company => <option key={company.key} value={company.key}>{company.name} ({company.count} hồ sơ)</option>)}
          </Select>
          {selectedCompany && <p className={styles.companyDeleteCount}>Sẽ xóa <strong>{selectedCompany.count}</strong> hồ sơ của <strong>{selectedCompany.name}</strong>.</p>}
          <Button variant="danger" size="sm" onClick={handleDeleteCompany} disabled={!selectedCompany}>Xóa dữ liệu công ty đã chọn</Button>
          {deleteMsg && <p className={styles.companyDeleteCount} role="status">{deleteMsg}</p>}
        </div>
        <p className={styles.sectionDesc}>Xóa toàn bộ dữ liệu kiểm tra. Hãy xuất backup trước khi thực hiện.</p>
        <Button variant="danger" size="sm" onClick={handleClear}>Xóa tất cả dữ liệu</Button>
      </Card>
    </div>
  )
}
