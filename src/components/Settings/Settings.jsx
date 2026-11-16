import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Button, Input, Select } from '../UI/UI'
import { storage } from '../../store/storage'
import {
  getSyncConfig,
  saveSyncConfig,
  testSyncConnection,
  changePassword,
  fetchUsers,
  createUser,
  toggleUserActive,
  resetUserPassword,
} from '../../store/sync'
import { normalizeCompanyName } from '../../utils/company.mjs'
import { deleteCompanyAfterConfirmation } from '../../utils/actions.mjs'
import {
  Download,
  Upload,
  TriangleAlert,
  CheckCircle2,
  Cloud,
  RefreshCw,
  ShieldCheck,
  LogOut,
  UserPlus,
  Building2,
  Database,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import styles from './Settings.module.css'

const TABS = [
  { key: 'account', label: 'Tài khoản', icon: ShieldCheck },
  { key: 'sync', label: 'Đồng bộ Cloud', icon: Cloud },
  { key: 'general', label: 'Thông tin mặc định', icon: Building2 },
  { key: 'data', label: 'Dữ liệu & Sao lưu', icon: Database },
]

export default function Settings({
  onExport,
  onImport,
  onClear,
  onDeleteCompany,
  onAssignCompany,
  records,
  authUser,
  onLogout,
  syncState,
  onSyncNow,
  onSyncConfigChange,
}) {
  const [activeTab, setActiveTab] = useState(authUser ? 'account' : 'general')

  // General settings
  const [settings, setSettings] = useState(() => storage.getSettings())
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef(null)

  // Sync settings
  const [syncForm, setSyncForm] = useState(() => getSyncConfig())
  const [showAdvancedSync, setShowAdvancedSync] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncErr, setSyncErr] = useState('')
  const [testingSync, setTestingSync] = useState(false)

  // Account & Users
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [users, setUsers] = useState([])
  const [usersErr, setUsersErr] = useState('')
  const [newUser, setNewUser] = useState({ username: '', fullName: '', password: '', role: 'staff' })
  const [userMsg, setUserMsg] = useState('')

  // Data & Backup
  const [importMsg, setImportMsg] = useState('')
  const [importErr, setImportErr] = useState('')
  const [restoreSettings, setRestoreSettings] = useState(true)
  const [legacyIds, setLegacyIds] = useState([])
  const [legacyCompany, setLegacyCompany] = useState('')
  const [legacyMsg, setLegacyMsg] = useState('')
  const [deleteCompany, setDeleteCompany] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')

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

  const loadUsers = async () => {
    if (authUser?.role !== 'admin') return
    try {
      const res = await fetchUsers()
      setUsers(res.users || [])
      setUsersErr('')
    } catch (error) {
      setUsersErr(error.message || 'Không tải được danh sách tài khoản.')
    }
  }

  useEffect(() => {
    if (authUser?.role === 'admin') loadUsers()
  }, [authUser?.role])

  const updateSetting = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }))
    setSaved(false)
  }

  const handleSaveSettings = () => {
    try {
      storage.saveSettings(settings)
      setSaved(true)
      setSaveError('')
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      setSaved(false)
      setSaveError(error.message)
    }
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) {
      setSaveError('Chọn ảnh PNG, JPEG, WebP, GIF hoặc SVG')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => updateSetting('logo', ev.target.result)
    reader.onerror = () => setSaveError('Không đọc được ảnh logo')
    reader.readAsDataURL(file)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg('')
    setPwErr('')
    if (pwForm.newPassword.length < 6) {
      setPwErr('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwErr('Mật khẩu xác nhận không khớp.')
      return
    }
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwMsg('Đổi mật khẩu thành công!')
    } catch (error) {
      setPwErr(error.message || 'Không thể đổi mật khẩu.')
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserMsg('')
    setUsersErr('')
    try {
      await createUser(newUser)
      setNewUser({ username: '', fullName: '', password: '', role: 'staff' })
      setUserMsg('Đã tạo tài khoản mới thành công.')
      await loadUsers()
    } catch (error) {
      setUsersErr(error.message || 'Không tạo được tài khoản.')
    }
  }

  const handleToggleUser = async (userId) => {
    try {
      await toggleUserActive(userId)
      await loadUsers()
    } catch (error) {
      setUsersErr(error.message || 'Không cập nhật được trạng thái tài khoản.')
    }
  }

  const handleResetUserPassword = async (user) => {
    const nextPw = prompt(`Nhập mật khẩu mới cho tài khoản "${user.username}" (tối thiểu 6 ký tự):`)
    if (!nextPw) return
    try {
      await resetUserPassword(user.id, nextPw)
      setUserMsg(`Đã đặt lại mật khẩu cho "${user.username}".`)
    } catch (error) {
      setUsersErr(error.message || 'Không đặt lại được mật khẩu.')
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
      setSyncErr('Vui lòng đăng nhập hoặc cấu hình máy chủ API trước khi đồng bộ.')
    } else {
      setSyncErr(res.error || 'Đồng bộ thất bại.')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportMsg('')
    setImportErr('')
    try {
      const result = await onImport(file, { restoreSettings })
      setSettings(storage.getSettings())
      setImportMsg(
        `Đã thêm ${result.added} hồ sơ, bỏ qua ${result.skipped} hồ sơ trùng.${result.settingsRestored ? ' Đã khôi phục cài đặt và logo.' : ''}${result.draftRestored ? ' Đã khôi phục phiên kiểm tra dở.' : ''}`
      )
    } catch (err) {
      setImportErr(err.message)
    }
    e.target.value = ''
  }

  const handleAssignCompany = () => {
    if (!legacyIds.length || !legacyCompany.trim()) return
    if (!confirm(`Gán ${legacyIds.length} hồ sơ đã chọn cho công ty "${legacyCompany.trim()}"?`)) return
    try {
      const count = onAssignCompany(legacyIds, legacyCompany)
      setLegacyMsg(`Đã gán ${count} hồ sơ cho công ty ${legacyCompany.trim()}.`)
      setLegacyIds([])
    } catch (error) {
      setLegacyMsg(error.message)
    }
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

  const handleClear = () => {
    if (confirm('Bạn có chắc muốn XÓA TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
      if (confirm('Xác nhận lần nữa: Xóa toàn bộ dữ liệu?')) {
        try {
          onClear()
          setDeleteCompany('')
          setDeleteMsg('Đã xóa toàn bộ hồ sơ.')
        } catch (error) {
          setDeleteMsg(error.message)
        }
      }
    }
  }

  const syncStatusText = syncState?.status === 'syncing'
    ? 'Đang đồng bộ dữ liệu...'
    : syncState?.status === 'offline'
      ? 'Đang ngoại tuyến (dữ liệu được lưu tạm trên máy)'
      : syncState?.status === 'error'
        ? 'Đồng bộ gặp lỗi'
        : 'Đã kết nối & sẵn sàng đồng bộ'

  const avatarLetter = (authUser?.fullName || authUser?.username || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className={styles.settings}>
      <nav className={styles.tabBar} aria-label="Danh mục cài đặt">
        {TABS.map(tab => {
          if (tab.key === 'account' && !authUser) return null
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tabBtn} ${active ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'account' && authUser && (
        <div className={styles.tabPanel}>
          <Card>
            <div className={styles.profileRow}>
              <div className={styles.profileLeft}>
                <div className={styles.avatar}>{avatarLetter}</div>
                <div>
                  <div className={styles.profileName}>{authUser.fullName || authUser.username}</div>
                  <div className={styles.profileMeta}>
                    <span>@{authUser.username}</span>
                    <span className={styles.roleBadge}>
                      {authUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut size={15} />
                Đăng xuất
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className={styles.sectionTitle}>
              <KeyRound size={17} />
              Đổi mật khẩu
            </h3>
            <p className={styles.sectionDesc}>Cập nhật mật khẩu định kỳ để bảo vệ dữ liệu kiểm tra.</p>
            <form onSubmit={handleChangePassword}>
              <div className={styles.formGrid3}>
                <Input
                  label="Mật khẩu hiện tại"
                  id="pw-current"
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                />
                <Input
                  label="Mật khẩu mới (tối thiểu 6 ký tự)"
                  id="pw-new"
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                />
                <Input
                  label="Nhập lại mật khẩu mới"
                  id="pw-confirm"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
              <div className={styles.formActions}>
                <Button type="submit" variant="primary" size="sm">Cập nhật mật khẩu</Button>
              </div>
            </form>
            {pwMsg && <div className={styles.msgSuccess}>{pwMsg}</div>}
            {pwErr && <div className={styles.msgError} role="alert">{pwErr}</div>}
          </Card>

          {authUser.role === 'admin' && (
            <Card>
              <h3 className={styles.sectionTitle}>
                <UserPlus size={17} />
                Quản lý tài khoản nhân viên
              </h3>
              <p className={styles.sectionDesc}>Tạo tài khoản cho nhân viên đi hiện trường, đặt lại mật khẩu hoặc khóa tài khoản khi cần.</p>
              <form onSubmit={handleCreateUser}>
                <div className={styles.formGrid}>
                  <Input
                    label="Tên đăng nhập"
                    id="new-user-name"
                    value={newUser.username}
                    onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                    placeholder="vd: nhanvien1"
                  />
                  <Input
                    label="Họ và tên"
                    id="new-user-fullname"
                    value={newUser.fullName}
                    onChange={e => setNewUser(u => ({ ...u, fullName: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                  />
                  <Input
                    label="Mật khẩu"
                    id="new-user-pw"
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <Select
                    label="Vai trò"
                    id="new-user-role"
                    value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </Select>
                </div>
                <div className={styles.formActions}>
                  <Button type="submit" variant="primary" size="sm">Tạo tài khoản</Button>
                </div>
              </form>
              {userMsg && <div className={styles.msgSuccess}>{userMsg}</div>}
              {usersErr && <div className={styles.msgError} role="alert">{usersErr}</div>}

              {users.length > 0 && (
                <div className={styles.userList}>
                  {users.map(u => (
                    <div key={u.id} className={styles.userRow}>
                      <div>
                        <div className={styles.userRowTitle}>
                          <strong>{u.fullName || u.username}</strong>
                          <span className={`${styles.statusBadge} ${u.isActive ? styles.statusActive : styles.statusLocked}`}>
                            {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </div>
                        <div className={styles.userRowMeta}>
                          @{u.username} · {u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                        </div>
                      </div>
                      <div className={styles.userRowActions}>
                        <Button variant="ghost" size="sm" onClick={() => handleResetUserPassword(u)}>Đặt lại MK</Button>
                        {u.id !== authUser.id && (
                          <Button variant="ghost" size="sm" onClick={() => handleToggleUser(u.id)}>
                            {u.isActive ? 'Khóa' : 'Mở khóa'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'sync' && (
        <div className={styles.tabPanel}>
          <Card>
            <h3 className={styles.sectionTitle}>
              <Cloud size={17} />
              Đồng bộ Online (Hosting iNET)
            </h3>
            <p className={styles.sectionDesc}>
              Dữ liệu vẫn lưu cục bộ khi mất mạng và tự động đồng bộ 2 chiều giữa các máy khi có Internet.
            </p>

            <div className={styles.syncStatusBox}>
              <div>
                <div className={styles.syncStatusTitle}>{syncStatusText}</div>
                <div className={styles.syncMeta}>
                  {syncState?.lastSyncAt
                    ? `Lần đồng bộ gần nhất: ${new Date(syncState.lastSyncAt).toLocaleString('vi-VN')}`
                    : 'Chưa đồng bộ lần nào trên thiết bị này'}
                </div>
              </div>
              <div className={styles.syncActions}>
                <Button variant="primary" size="sm" onClick={() => handleRunSync(false)} disabled={syncState?.status === 'syncing'}>
                  <RefreshCw size={14} />
                  {syncState?.status === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRunSync(true)} disabled={syncState?.status === 'syncing'}>
                  Đồng bộ lại toàn bộ
                </Button>
              </div>
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={Boolean(syncForm.autoSync)}
                onChange={e => {
                  const checked = e.target.checked
                  setSyncForm(s => ({ ...s, autoSync: checked }))
                  saveSyncConfig({ autoSync: checked })
                  onSyncConfigChange?.()
                }}
              />
              Tự động đồng bộ real-time khi mở app, có mạng lại và sau mỗi lần lưu hồ sơ
            </label>

            <div>
              <button
                type="button"
                className={styles.advancedBtn}
                onClick={() => setShowAdvancedSync(v => !v)}
              >
                {showAdvancedSync ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {showAdvancedSync ? 'Ẩn cấu hình máy chủ nâng cao' : 'Cấu hình máy chủ nâng cao (URL API / API Key)'}
              </button>
            </div>

            {showAdvancedSync && (
              <div className={styles.advancedBox}>
                <div className={styles.formGrid}>
                  <Input
                    label="Địa chỉ API trên iNET"
                    id="sync-api-url"
                    value={syncForm.apiUrl || ''}
                    onChange={e => { setSyncForm(s => ({ ...s, apiUrl: e.target.value })); setSyncMsg(''); setSyncErr('') }}
                    placeholder="https://25percent.tech/api/index.php"
                    className={styles.spanFull}
                  />
                  <Input
                    label="Mã bảo mật dự phòng (API Key - tùy chọn)"
                    id="sync-api-key"
                    type="password"
                    value={syncForm.apiKey || ''}
                    onChange={e => { setSyncForm(s => ({ ...s, apiKey: e.target.value })); setSyncMsg(''); setSyncErr('') }}
                    placeholder="Không bắt buộc nếu đã đăng nhập bằng tài khoản"
                    className={styles.spanFull}
                  />
                </div>
                <div className={styles.syncActions}>
                  <Button variant="primary" size="sm" onClick={handleSaveSync}>Lưu cấu hình</Button>
                  <Button variant="ghost" size="sm" onClick={handleTestSync} disabled={testingSync || !syncForm.apiUrl}>
                    {testingSync ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                  </Button>
                </div>
              </div>
            )}

            {syncMsg && <div className={styles.msgSuccess}>{syncMsg}</div>}
            {(syncErr || syncState?.lastError) && (
              <div className={styles.msgError} role="alert">{syncErr || syncState.lastError}</div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'general' && (
        <div className={styles.tabPanel}>
          <Card>
            <h3 className={styles.sectionTitle}>
              <Building2 size={17} />
              Thông tin mặc định
            </h3>
            <p className={styles.sectionDesc}>Các giá trị mặc định sẽ được tự động điền khi tạo kiểm tra mới và in báo cáo.</p>
            <div className={styles.formGrid}>
              <Input
                label="Tên đơn vị mặc định"
                id="default-unit"
                value={settings.defaultUnit || ''}
                onChange={e => updateSetting('defaultUnit', e.target.value)}
                placeholder="Phân xưởng A"
              />
              <Input
                label="Tên công ty / tổ chức"
                id="company-name"
                value={settings.companyName || ''}
                onChange={e => updateSetting('companyName', e.target.value)}
                placeholder="Công ty ABC"
              />
            </div>

            <div className={styles.logoSection}>
              <label className={styles.label}>Logo công ty (hiển thị trên báo cáo in)</label>
              <div className={styles.logoRow}>
                {settings.logo ? (
                  <div className={styles.logoPreview}>
                    <img src={settings.logo} alt="Logo" />
                    <button type="button" className={styles.removeLogo} onClick={() => updateSetting('logo', '')}>✕</button>
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

            <div className={styles.formActions}>
              <Button variant="primary" size="sm" onClick={handleSaveSettings}>Lưu cài đặt</Button>
              {saved && (
                <span className={styles.savedMsg}>
                  <CheckCircle2 size={15} />
                  Đã lưu!
                </span>
              )}
            </div>
            {saveError && <div className={styles.msgError} role="alert">{saveError}</div>}
          </Card>
        </div>
      )}

      {activeTab === 'data' && (
        <div className={styles.tabPanel}>
          <Card>
            <h3 className={styles.sectionTitle}>
              <Database size={17} />
              Sao lưu & Khôi phục dữ liệu
            </h3>
            <p className={styles.sectionDesc}>
              Hiện có <strong>{records.length}</strong> bản ghi đang hoạt động trong hệ thống. Xuất file JSON định kỳ để lưu trữ dự phòng.
            </p>

            <div className={styles.backupActions}>
              <div className={styles.backupItem}>
                <div className={styles.backupIcon}><Download size={18} /></div>
                <div>
                  <div className={styles.backupTitle}>Xuất dữ liệu (Backup)</div>
                  <div className={styles.backupDesc}>Sao lưu toàn bộ hồ sơ, cài đặt và logo thành file JSON</div>
                </div>
                <Button variant="primary" size="sm" onClick={onExport}>Xuất JSON</Button>
              </div>

              <label className={styles.checkboxLabel} style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={restoreSettings} onChange={e => setRestoreSettings(e.target.checked)} />
                Khôi phục cả cài đặt và logo từ file sao lưu
              </label>

              <div className={styles.backupItem}>
                <div className={styles.backupIcon}><Upload size={18} /></div>
                <div>
                  <div className={styles.backupTitle}>Nhập dữ liệu (Restore)</div>
                  <div className={styles.backupDesc}>Nhập file JSON đã xuất trước đó (tự động gộp, không trùng)</div>
                </div>
                <label className={styles.uploadBtn}>
                  Nhập JSON
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {importMsg && <div className={styles.msgSuccess}>{importMsg}</div>}
            {importErr && <div className={styles.msgError} role="alert">{importErr}</div>}
          </Card>

          {legacyRecords.length > 0 && (
            <Card>
              <h3 className={styles.sectionTitle}>Gán công ty cho hồ sơ cũ</h3>
              <p className={styles.sectionDesc}>
                Chọn đúng các hồ sơ thuộc cùng công ty. Giữ Ctrl để chọn nhiều hồ sơ; thông tin và kết quả kiểm tra được giữ nguyên.
              </p>
              <div className={styles.formGrid}>
                <Select
                  label="Hồ sơ chưa có công ty"
                  id="legacy-records"
                  multiple
                  size={6}
                  className={`${styles.legacySelect} ${styles.spanFull}`}
                  value={legacyIds}
                  onChange={e => setLegacyIds(Array.from(e.target.selectedOptions, option => option.value))}
                >
                  {legacyRecords.map(record => (
                    <option key={record.id} value={String(record.id)}>
                      {record.worker.code || '—'} · {record.worker.name} · {record.date} {record.time} · {record.worker.timeline} · {record.worker.unit || '—'}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Công ty của hồ sơ đã chọn"
                  id="legacy-company"
                  value={legacyCompany}
                  onChange={e => setLegacyCompany(e.target.value)}
                  list="settings-companies"
                  className={styles.spanFull}
                />
                <datalist id="settings-companies">
                  {companies.map(company => <option key={company.key} value={company.name} />)}
                </datalist>
              </div>
              <Button disabled={!legacyIds.length || !legacyCompany.trim()} onClick={handleAssignCompany} size="sm">
                Gán công ty cho {legacyIds.length} hồ sơ
              </Button>
              {legacyMsg && <div className={styles.msgSuccess} role="status">{legacyMsg}</div>}
            </Card>
          )}

          <Card className={styles.dangerCard}>
            <h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
              <TriangleAlert size={17} />
              Vùng nguy hiểm
            </h3>
            <div className={styles.dangerBlock}>
              <div className={styles.dangerSubTitle}>Xóa dữ liệu theo công ty</div>
              <p className={styles.sectionDesc}>
                Chọn công ty cần xóa hồ sơ kiểm tra. Hồ sơ chưa có tên công ty không nằm trong danh sách này.
              </p>
              <Select
                label="Công ty cần xóa dữ liệu"
                id="delete-company"
                value={deleteCompany}
                onChange={e => { setDeleteCompany(e.target.value); setDeleteMsg('') }}
              >
                <option value="">Chọn công ty</option>
                {companies.map(company => (
                  <option key={company.key} value={company.key}>{company.name} ({company.count} hồ sơ)</option>
                ))}
              </Select>
              {selectedCompany && (
                <p className={styles.companyDeleteCount}>
                  Sẽ xóa <strong>{selectedCompany.count}</strong> hồ sơ của <strong>{selectedCompany.name}</strong>.
                </p>
              )}
              <Button variant="danger" size="sm" onClick={handleDeleteCompany} disabled={!selectedCompany}>
                Xóa dữ liệu công ty đã chọn
              </Button>
              {deleteMsg && <p className={styles.companyDeleteCount} role="status">{deleteMsg}</p>}
            </div>

            <div className={styles.dangerBlock}>
              <div className={styles.dangerSubTitle}>Xóa toàn bộ dữ liệu trên thiết bị</div>
              <p className={styles.sectionDesc}>Xóa sạch toàn bộ dữ liệu kiểm tra lưu cục bộ. Hãy xuất JSON sao lưu trước khi thực hiện.</p>
              <Button variant="danger" size="sm" onClick={handleClear}>Xóa tất cả dữ liệu</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
