import React, { useState, useMemo } from 'react'
import { Card, Button, Badge, Input, Select } from '../UI/UI'
import { Download, X } from 'lucide-react'
import RecordDetail from './RecordDetail'
import { storage } from '../../store/storage'
import styles from './History.module.css'
import { companyOptions, normalizeCompanyName } from '../../utils/company.mjs'
import { normalizeText } from '../../utils/records.mjs'

const PAGE_SIZE = 20

export default function History({ records, onDelete, onUpdate, selectedId, onNavigate }) {
  const [search, setSearch] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterRank, setFilterRank] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [viewingId, setViewingId] = useState(selectedId || null)

  const units = useMemo(() => {
    const s = new Set(records.map(r => r.worker.unit).filter(Boolean))
    return Array.from(s).sort()
  }, [records])

  const companies = useMemo(() => companyOptions(records), [records])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (search) {
        const q = normalizeText(search)
        if (![r.worker.name, r.worker.code, r.worker.companyName].some(value => normalizeText(value).includes(q))) return false
      }
      if (filterCompany && normalizeCompanyName(r.worker.companyName) !== filterCompany) return false
      if (filterUnit && r.worker.unit !== filterUnit) return false
      if (filterRank && r.overall.rank !== filterRank) return false
      if (dateFrom && r.date < dateFrom) return false
      if (dateTo && r.date > dateTo) return false
      return true
    })
  }, [records, search, filterCompany, filterUnit, filterRank, dateFrom, dateTo])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const pageData = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  if (viewingId) {
    const record = records.find(r => r.id === viewingId)
    if (record) {
      return <RecordDetail record={record} onBack={() => setViewingId(null)} onDelete={onDelete} onUpdate={onUpdate} />
    }
  }

  const rankColor = (rank) => {
    const map = { 'Xuất sắc': '#0F6E56', 'Tốt': '#185FA5', 'Khá': '#854F0B', 'Trung bình': '#BA7517', 'Kém': '#A32D2D' }
    return map[rank] || '#6b7280'
  }

  return (
    <div className={styles.history}>
      <Card className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <Input placeholder="Tìm tên, STT hoặc công ty..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} id="search-input" />
          <Select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(0) }} id="filter-company" aria-label="Lọc theo công ty">
            <option value="">Tất cả công ty</option>
            {companies.map(company => <option key={company.key} value={company.key}>{company.name}</option>)}
          </Select>
          <Select value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setPage(0) }} id="filter-unit">
            <option value="">Tất cả đơn vị</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Select value={filterRank} onChange={e => { setFilterRank(e.target.value); setPage(0) }} id="filter-rank">
            <option value="">Tất cả xếp loại</option>
            <option value="Xuất sắc">Xuất sắc</option>
            <option value="Tốt">Tốt</option>
            <option value="Khá">Khá</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Kém">Kém</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }} id="date-from" placeholder="Từ ngày" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }} id="date-to" placeholder="Đến ngày" />
        </div>
        <div className={styles.filterInfo} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>{filtered.length} kết quả</span>
          <Button variant="ghost" size="sm" className={styles.exportBtn} onClick={() => storage.exportExcel(filtered)}>
            <Download size={14} />
            Xuất Excel (.xlsx)
          </Button>
          {(search || filterCompany || filterUnit || filterRank || dateFrom || dateTo) && (
            <button className={styles.clearFilter} onClick={() => { setSearch(''); setFilterCompany(''); setFilterUnit(''); setFilterRank(''); setDateFrom(''); setDateTo(''); setPage(0) }}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </Card>

      <Card>
        {pageData.length === 0 ? (
          <div className={styles.emptyState}>Không có kết quả phù hợp</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Công ty</th>
                  <th>Đơn vị</th>
                  <th>Ngày</th>
                  <th>Thời điểm</th>
                  <th>Trí nhớ</th>
                  <th>Thính vận động</th>
                  <th>Thị vận động</th>
                  <th>Tổng</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((r, i) => (
                  <tr key={r.id} className={styles.row} style={{ borderLeftColor: rankColor(r.overall.rank) }}>
                    <td className={styles.stt}>{r.worker.code || '—'}</td>
                    <td className={styles.nameCell} onClick={() => setViewingId(r.id)}>{r.worker.name}</td>
                    <td>{r.worker.companyName || '—'}</td>
                    <td>{r.worker.unit || '—'}</td>
                    <td>{r.date}</td>
                    <td>{r.worker.timeline || '—'}</td>
                    <td>{r.tests.memory ? <Badge label={r.tests.memory.rank.label} color={r.tests.memory.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td>{r.tests.sound ? <Badge label={r.tests.sound.rank.label} color={r.tests.sound.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td>{r.tests.visual ? <Badge label={r.tests.visual.rank.label} color={r.tests.visual.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td><Badge label={r.overall.rank} color={r.overall.color} /></td>
                    <td>
                      <button className={styles.deleteBtn} onClick={() => { if (confirm(`Xóa kết quả của ${r.worker.name}?`)) onDelete(r.id) }} title="Xóa">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Trước</Button>
            <span className={styles.pageInfo}>Trang {currentPage + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>Sau →</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
