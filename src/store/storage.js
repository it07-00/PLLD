import { normalizeCompanyName } from '../utils/company.mjs'
import { vietnamDateTime } from '../utils/datetime.mjs'
import { validateRecords, normalizeRecord, normalizeSettings, decodeBackup, mergeRecords, sortRecords, activeRecords, excelIdentity, compareExcelRecords } from '../utils/records.mjs'
import { validateSession } from '../utils/session.mjs'

const KEY = 'envmonitor_worker_tests'
const SETTINGS_KEY = 'envmonitor_settings'
const DRAFT_KEY = 'envmonitor_draft'
const DEVICE_ID_KEY = 'envmonitor_device_id'

let syncDirty = false

function markSyncDirty() {
  syncDirty = true
}

function getDeviceId({ persist = true } = {}) {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      if (!persist) return 'dev-local'
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'dev-local'
  }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch { throw new Error('Không đọc được dữ liệu đã lưu. Hãy tải bản dữ liệu gốc và khôi phục từ bản sao lưu; dữ liệu cũ chưa bị ghi đè.') }
}

function write(entries) {
  const previous = entries.map(([key]) => [key, localStorage.getItem(key)])
  try {
    for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A failed write must not erase or partially replace a backup restore.
    for (const [key, value] of previous) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* Original value remains when a quota write fails. */ }
    }
    throw new Error('Không thể lưu dữ liệu: bộ nhớ đầy hoặc bị chặn. Hãy xuất bản sao lưu/kết quả tạm và thử lại.')
  }
}

export function downloadJSON(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const storage = {
  getDeviceId,
  isSyncDirty: () => syncDirty,
  clearSyncDirty: () => { syncDirty = false },

  getAllRaw: () => {
    const records = validateRecords(read(KEY, []))
    if (new Set(records.map(r => String(r.id))).size !== records.length) throw new Error('Kho dữ liệu có mã hồ sơ trùng. Hãy tải dữ liệu gốc và khôi phục để loại trùng.')
    return sortRecords(records)
  },

  getAll: () => activeRecords(storage.getAllRaw()),

  save: (record) => {
    const now = new Date().toISOString()
    const normalized = normalizeRecord({
      ...record,
      updatedAt: record.updatedAt || now,
      deletedAt: null,
      deviceId: record.deviceId || getDeviceId(),
    })
    const all = storage.getAllRaw()
    const idx = all.findIndex(r => String(r.id) === String(normalized.id))
    if (idx >= 0) all[idx] = normalized
    else all.unshift(normalized)
    write([[KEY, sortRecords(all)]])
    markSyncDirty()
    return normalized
  },

  delete: (id) => {
    const now = new Date().toISOString()
    const deviceId = getDeviceId({ persist: false })
    const all = storage.getAllRaw().map(r =>
      String(r.id) === String(id) && !r.deletedAt
        ? { ...r, deletedAt: now, updatedAt: now, deviceId }
        : r
    )
    write([[KEY, all]])
    markSyncDirty()
  },

  deleteCompany: (companyName) => {
    const company = normalizeCompanyName(companyName)
    if (!company) return 0
    const now = new Date().toISOString()
    const deviceId = getDeviceId({ persist: false })
    let deleted = 0
    const all = storage.getAllRaw().map(record => {
      if (record.deletedAt || normalizeCompanyName(record.worker?.companyName) !== company) return record
      deleted++
      return { ...record, deletedAt: now, updatedAt: now, deviceId }
    })
    if (deleted) {
      write([[KEY, all]])
      markSyncDirty()
    }
    return deleted
  },

  exportJSON: () => {
    downloadJSON({ format: 'plld-backup', version: 2, exportedAt: new Date().toISOString(), timeZone: 'Asia/Ho_Chi_Minh', records: storage.getAll(), settings: storage.getSettings(), draft: storage.getDraft() }, `quan-trac-lao-dong-${vietnamDateTime().date}.json`)
  },

  exportRaw: () => downloadJSON({ format: 'plld-recovery', records: localStorage.getItem(KEY), settings: localStorage.getItem(SETTINGS_KEY), draft: localStorage.getItem(DRAFT_KEY) }, `plld-du-lieu-goc-${vietnamDateTime().date}.json`),

  assignCompany: (ids, companyName) => {
    const name = String(companyName || '').trim().replace(/\s+/g, ' ')
    if (!name || !ids.length) throw new Error('Chọn hồ sơ và nhập tên công ty')
    const selected = new Set(ids.map(String))
    const now = new Date().toISOString()
    const deviceId = getDeviceId()
    let count = 0
    const records = storage.getAllRaw().map(record => {
      if (record.deletedAt || !selected.has(String(record.id)) || normalizeCompanyName(record.worker.companyName)) return record
      count++
      return { ...record, updatedAt: now, deviceId, worker: { ...record.worker, companyName: name } }
    })
    if (count) {
      write([[KEY, records]])
      markSyncDirty()
    }
    return count
  },

  applySyncMerge: (remoteRecords) => {
    const incoming = validateRecords(remoteRecords || [])
    const existing = storage.getAllRaw()
    const merged = mergeRecords(existing, incoming)
    if (merged.added > 0 || merged.updated > 0) {
      write([[KEY, merged.records]])
    }
    return merged
  },

  getDraft: () => validateSession(read(DRAFT_KEY, null)),
  saveDraft: draft => write([[DRAFT_KEY, validateSession(draft)]]),
  clearDraft: () => localStorage.removeItem(DRAFT_KEY),

  exportExcel: async (records) => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const { saveAs } = await import('file-saver')
      const { LOGO_BASE64 } = await import('./logo')
      
      const data = [...(records || storage.getAll())].sort(compareExcelRecords)
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('KẾT QUẢ')
      
      const imageId = workbook.addImage({
        base64: 'data:image/png;base64,' + LOGO_BASE64,
        extension: 'png',
      })
      
      sheet.mergeCells('B2:B6')
      sheet.addImage(imageId, {
        tl: { col: 1.1, row: 1.1 }, // Column B, Row 2 (index 1)
        ext: { width: 100, height: 100 }
      })
      
      sheet.mergeCells('C2:J6')
      const infoCell = sheet.getCell('C2')
      infoCell.value = {
        richText: [
          { font: { bold: true, size: 14 }, text: 'CÔNG TY TNHH DỊCH VỤ VÀ KỸ THUẬT MÔI TRƯỜNG BẢO CHÂU\n' },
          { font: { size: 14 }, text: 'Đ/c: 180/40 Nguyễn Hữu Cảnh, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh, Việt Nam\n' },
          { font: { size: 14 }, text: 'Tel: +84 915 449 148\n' },
          { font: { size: 14 }, text: 'Email: info@baochauenvir.com' }
        ]
      }
      infoCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
      
      sheet.mergeCells('A8:V8')
      const titleCell = sheet.getCell('A8')
      titleCell.value = 'KẾT QUẢ BÀI TEST'
      sheet.getRow(8).height = 40
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      
      const headers = [
        'STT', 'Họ và tên', 'Chức danh', 'Ngày test', 'Tuổi', 'Giới', 
        'Thâm niên ', 'Trình độ văn hoá', 'Bộ phận làm việc', 'Thời điểm test',
        'Lần 1', 'Lần 2', 'Lần 3', 'Lần 4', 'Lần 5', 'Lần 6', 'Lần 7', 'Lần 8', 'Lần 9', 'Lần 10', 
        'Kết quả trung bình (ms)', 'Tên công ty'
      ]
      
      // Format header row (Row 10)
      const headerRow = sheet.getRow(10)
      headerRow.values = headers
      headerRow.font = { bold: true, size: 11 }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      headerRow.height = 85
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' }
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
      
      const mergeData = []
      let currentRow = 11
      
      data.forEach((r, idx) => {
        const startRow = currentRow
        const baseInfo = [
          r.worker.code, r.worker.name, r.worker.position || '', r.date, r.worker.age,
          r.worker.gender === 'female' ? 'Nữ' : 'Nam', 
          r.worker.seniority, r.worker.education, r.worker.unit, ''
        ]
        
        // Apply the same styling to every exported column.
        const styleRow = (row) => {
          for (let i = 1; i <= headers.length; i++) {
            const cell = row.getCell(i)
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            // Alignments
            if (i === 2 || i === 3 || i === 8 || i === 9 || i === 10 || i === 22) {
              cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' }
            }
          }
        }

        if (r.tests.visual) {
          const vRounds = r.tests.visual.rounds || []
          const vAvg = r.tests.visual.avg || 0
          const vArr = Array.from({length: 10}, (_, i) => vRounds[i] !== undefined ? vRounds[i] : '')
          const vRow = sheet.getRow(currentRow++)
          vRow.values = [...baseInfo, ...vArr, vAvg, r.worker.companyName || '']
          vRow.getCell(10).value = `Phản xạ thị vận động - ${r.worker.timeline}`
          styleRow(vRow)
        }
        
        if (r.tests.sound) {
          const sRounds = r.tests.sound.rounds || []
          const sAvg = r.tests.sound.avg || 0
          const sArr = Array.from({length: 10}, (_, i) => sRounds[i] !== undefined ? sRounds[i] : '')
          const sRow = sheet.getRow(currentRow++)
          sRow.values = [...baseInfo, ...sArr, sAvg, r.worker.companyName || '']
          sRow.getCell(10).value = `Phản xạ thính vận động - ${r.worker.timeline}`
          styleRow(sRow)
        }
        
        if (r.tests.memory) {
          const mScore = r.tests.memory.score || 0
          const mArr = [mScore, '', '', '', '', '', '', '', '', '']
          const mRow = sheet.getRow(currentRow++)
          mRow.values = [...baseInfo, ...mArr, '', r.worker.companyName || '']
          mRow.getCell(10).value = `Trí nhớ - ${r.worker.timeline}`
          styleRow(mRow)
        }
        
        const endRow = currentRow - 1
        if (endRow >= startRow) {
          mergeData.push({ identity: excelIdentity(r), start: startRow, end: endRow })
        }
      })
      
      // Perform Vertical Merging for identical workers
      const finalMergeGroups = []
      if (mergeData.length > 0) {
        let currentGroup = { ...mergeData[0] }
        for (let i = 1; i < mergeData.length; i++) {
          if (mergeData[i].identity === currentGroup.identity) {
            currentGroup.end = mergeData[i].end
          } else {
            finalMergeGroups.push(currentGroup)
            currentGroup = { ...mergeData[i] }
          }
        }
        finalMergeGroups.push(currentGroup)
      }
      
      finalMergeGroups.forEach(g => {
        if (g.start < g.end) {
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 22].forEach(col => {
            sheet.mergeCells(g.start, col, g.end, col)
          })
        }
      })
      
      // Set optimized Column Widths (1-based)
      sheet.getColumn(1).width = 4   // STT
      sheet.getColumn(2).width = 20  // Họ tên
      sheet.getColumn(3).width = 15  // Chức danh
      sheet.getColumn(4).width = 11  // Ngày
      sheet.getColumn(5).width = 5   // Tuổi
      sheet.getColumn(6).width = 5   // Giới
      sheet.getColumn(7).width = 6   // Thâm niên
      sheet.getColumn(8).width = 12  // Học vấn (wrap)
      sheet.getColumn(9).width = 12  // Bộ phận (wrap)
      sheet.getColumn(10).width = 20  // Thời điểm test
      for (let i = 11; i <= 20; i++) {
        sheet.getColumn(i).width = 6 // Lần 1-10 (Rất gọn)
      }
      sheet.getColumn(21).width = 10  // Avg
      sheet.getColumn(22).width = 28  // Tên công ty
      
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const dateStr = vietnamDateTime().date.split('-').reverse().join('-')
      saveAs(blob, `KẾT QUẢ PHÂN LOẠI LAO ĐỘNG ${dateStr}.xlsx`)
    } catch (err) {
      console.error(err)
      alert("Lỗi xuất Excel: " + err.message)
    }
  },

  importJSON: (file, { restoreSettings = true, replaceCorrupt = false } = {}) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const value = JSON.parse(e.target.result)
        if (value?.format === 'plld-draft' && value.version === 1) {
          const session = validateSession(value.session)
          if (!session) throw new Error('File không có phiên kiểm tra')
          write([[DRAFT_KEY, session]])
          resolve({ added: 0, skipped: 0, draftRestored: true })
          return
        }
        const incoming = decodeBackup(value)
        const draft = value?.format === 'plld-recovery' && value.draft ? JSON.parse(value.draft) : value?.draft
        const incomingDraft = draft ? validateSession(draft) : null
        const existing = replaceCorrupt ? [] : storage.getAllRaw()
        const merged = mergeRecords(existing, incoming.records)
        const entries = [[KEY, merged.records]]
        if (restoreSettings && incoming.settings || replaceCorrupt) entries.push([SETTINGS_KEY, incoming.settings || normalizeSettings({})])
        if (incomingDraft) entries.push([DRAFT_KEY, incomingDraft])
        write(entries)
        markSyncDirty()
        resolve({ added: merged.added, updated: merged.updated, skipped: merged.skipped, settingsRestored: restoreSettings && Boolean(incoming.settings), draftRestored: Boolean(incomingDraft) })
      } catch (error) { reject(new Error(`Không nhập dữ liệu: ${error.message}`)) }
    }
    reader.onerror = () => reject(new Error('Không đọc được file JSON'))
    reader.onabort = () => reject(new Error('Đã hủy đọc file JSON'))
    reader.readAsText(file)
  }),

  clear: () => localStorage.removeItem(KEY),

  // Settings
  getSettings: () => {
    return normalizeSettings(read(SETTINGS_KEY, {}))
  },

  saveSettings: (settings) => {
    // Refuse to replace corrupted settings without the recovery flow.
    storage.getSettings()
    write([[SETTINGS_KEY, normalizeSettings(settings)]])
  },
}
