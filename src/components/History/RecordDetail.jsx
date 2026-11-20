import React, { useState } from 'react'
import { Card, Button, Badge, BarChart, Input, Select } from '../UI/UI'
import { Brain, Volume2, Eye, Pencil } from 'lucide-react'
import styles from './History.module.css'
import { printReport } from '../../utils/report'

export default function RecordDetail({ record, onBack, onDelete, onUpdate }) {
  const r = record
  const [editing, setEditing] = useState(false)
  const [workerForm, setWorkerForm] = useState(() => ({ ...r.worker }))
  const [editError, setEditError] = useState('')

  const startEdit = () => {
    setWorkerForm({ ...r.worker })
    setEditError('')
    setEditing(true)
  }

  const handleSaveWorker = (e) => {
    e.preventDefault()
    if (!String(workerForm.name || '').trim()) {
      setEditError('Vui lòng nhập họ tên người lao động')
      return
    }
    try {
      onUpdate?.({
        ...r,
        updatedAt: new Date().toISOString(),
        worker: {
          ...r.worker,
          ...workerForm,
          name: String(workerForm.name || '').trim(),
          code: String(workerForm.code || '').trim(),
          companyName: String(workerForm.companyName || '').trim(),
          position: String(workerForm.position || '').trim(),
          unit: String(workerForm.unit || '').trim(),
        },
      })
      setEditing(false)
      setEditError('')
    } catch (err) {
      setEditError(err.message || 'Không thể lưu thông tin')
    }
  }

  const soundChartData = r.tests.sound ? r.tests.sound.rounds.map((v, i) => ({ label: `L${i + 1}`, value: v })) : []
  const visualChartData = r.tests.visual ? r.tests.visual.rounds.map((v, i) => ({ label: `L${i + 1}`, value: v })) : []

  return (
    <div className={styles.detail}>
      <button className={styles.backBtn} onClick={onBack}>← Quay lại lịch sử</button>

      <Card className={styles.detailOverall} style={{ borderColor: r.overall.color, borderWidth: 2 }}>
        <div className={styles.detailOverallInner}>
          <div>
            <div className={styles.detailName}>{r.worker.name}</div>
            <div className={styles.detailMeta}>{r.worker.unit || ''} • {r.date} {r.time}</div>
          </div>
          <div className={styles.detailRank} style={{ color: r.overall.color }}>
            {r.overall.rank}
          </div>
        </div>
      </Card>

      <div className={styles.detailGrid2}>
        <Card>
          <div className={styles.sectionHeaderRow}>
            <h4 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Thông tin người lao động</h4>
            {onUpdate && !editing && (
              <Button variant="ghost" size="sm" onClick={startEdit}>
                <Pencil size={13} />
                Sửa thông tin
              </Button>
            )}
          </div>
          {editing ? (
            <form onSubmit={handleSaveWorker} className={styles.editWorkerForm}>
              <div className={styles.editWorkerGrid}>
                <Input label="Số thứ tự" id="edit-worker-code" value={workerForm.code || ''} onChange={e => setWorkerForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: 01" />
                <Input label="Họ và tên *" id="edit-worker-name" value={workerForm.name || ''} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} />
                <Input label="Tên công ty" id="edit-worker-company" value={workerForm.companyName || ''} onChange={e => setWorkerForm(f => ({ ...f, companyName: e.target.value }))} />
                <Input label="Đơn vị / Phân xưởng" id="edit-worker-unit" value={workerForm.unit || ''} onChange={e => setWorkerForm(f => ({ ...f, unit: e.target.value }))} />
                <Input label="Chức danh" id="edit-worker-position" value={workerForm.position || ''} onChange={e => setWorkerForm(f => ({ ...f, position: e.target.value }))} />
                <Select label="Thời điểm" id="edit-worker-timeline" value={workerForm.timeline || 'Đầu ca'} onChange={e => setWorkerForm(f => ({ ...f, timeline: e.target.value }))}>
                  <option value="Đầu ca">Đầu ca</option>
                  <option value="Giữa ca">Giữa ca</option>
                  <option value="Cuối ca">Cuối ca</option>
                </Select>
                <Input label="Tuổi" id="edit-worker-age" type="number" min="16" max="80" value={workerForm.age ?? ''} onChange={e => setWorkerForm(f => ({ ...f, age: e.target.value }))} />
                <Select label="Giới tính" id="edit-worker-gender" value={workerForm.gender || 'male'} onChange={e => setWorkerForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </Select>
                <Input label="Thâm niên (năm)" id="edit-worker-seniority" type="number" min="0" value={workerForm.seniority ?? ''} onChange={e => setWorkerForm(f => ({ ...f, seniority: e.target.value }))} />
                <Select label="Trình độ văn hoá" id="edit-worker-education" value={workerForm.education || 'Cấp 3'} onChange={e => setWorkerForm(f => ({ ...f, education: e.target.value }))}>
                  <option value="Cấp 2">Cấp 2</option>
                  <option value="Cấp 3">Cấp 3</option>
                  <option value="Trung cấp/Cao đẳng">Trung cấp/Cao đẳng</option>
                  <option value="Đại học">Đại học</option>
                  <option value="Khác">Khác</option>
                </Select>
              </div>
              {editError && <div className={styles.editError} role="alert">{editError}</div>}
              <div className={styles.editActions}>
                <Button type="submit" variant="primary" size="sm">Lưu thay đổi</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Hủy</Button>
              </div>
            </form>
          ) : (
            <table className={styles.infoTable}>
              <tbody>
                <tr><td>Tên công ty</td><td>{r.worker.companyName || '—'}</td></tr>
                <tr><td>Số thứ tự</td><td>{r.worker.code || '—'}</td></tr>
                <tr><td>Chức danh</td><td>{r.worker.position || '—'}</td></tr>
                <tr><td>Đơn vị</td><td>{r.worker.unit || '—'}</td></tr>
                <tr><td>Tuổi</td><td>{r.worker.age || '—'}</td></tr>
                <tr><td>Giới tính</td><td>{r.worker.gender === 'male' ? 'Nam' : 'Nữ'}</td></tr>
                <tr><td>Thời điểm</td><td>{r.worker.timeline || '—'}</td></tr>
                <tr><td>Thâm niên</td><td>{r.worker.seniority != null && r.worker.seniority !== '' ? `${r.worker.seniority} năm` : '—'}</td></tr>
                <tr><td>Trình độ VH</td><td>{r.worker.education || '—'}</td></tr>
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h4 className={styles.sectionTitle}>Kết quả bài test</h4>
          <div className={styles.testResultList}>
            {r.tests.sound && (
              <div className={styles.testResultRow}>
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}><Volume2 size={16} /> Phản xạ thính vận động</span>
                <span>{Math.round(r.tests.sound.avg)} ms TB</span>
                <Badge label={r.tests.sound.rank.label} color={r.tests.sound.rank.color} />
              </div>
            )}
            {r.tests.visual && (
              <div className={styles.testResultRow}>
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}><Eye size={16} /> Phản xạ thị vận động</span>
                <span>{Math.round(r.tests.visual.avg)} ms TB</span>
                <Badge label={r.tests.visual.rank.label} color={r.tests.visual.rank.color} />
              </div>
            )}
            {r.tests.memory && (
              <div className={styles.testResultRow}>
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}><Brain size={16} /> Trí nhớ</span>
                <span>{r.tests.memory.score}/6 ({r.tests.memory.pct}%)</span>
                <Badge label={r.tests.memory.rank.label} color={r.tests.memory.rank.color} />
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className={styles.detailGrid2}>
        {r.tests.sound && (
          <Card>
            <h4 className={styles.sectionTitle}>Chi tiết phản xạ thính vận động (ms)</h4>
            <BarChart data={soundChartData} height={130} barColor="#185FA5" />
            <div className={styles.statLine}>Min: {Math.round(r.tests.sound.min)} ms • Max: {Math.round(r.tests.sound.max)} ms • TB: {Math.round(r.tests.sound.avg)} ms</div>
          </Card>
        )}
        {r.tests.visual && (
          <Card>
            <h4 className={styles.sectionTitle}>Chi tiết phản xạ thị vận động (ms)</h4>
            <BarChart data={visualChartData} height={130} barColor="#0F6E56" />
            <div className={styles.statLine}>Min: {Math.round(r.tests.visual.min)} ms • Max: {Math.round(r.tests.visual.max)} ms • TB: {Math.round(r.tests.visual.avg)} ms</div>
          </Card>
        )}
      </div>

      <Card className={styles.recommendBox}>
        <h4 className={styles.sectionTitle}>Kiến nghị phân loại</h4>
        <p>{r.overall.recommendation}</p>
      </Card>

      <div className={styles.detailActions}>
        <Button onClick={() => printReport(r)}>In phiếu kiểm tra</Button>
        <Button variant="danger" onClick={() => { if (confirm('Xác nhận xóa?')) { onDelete(r.id); onBack() } }}>🗑️ Xóa kết quả</Button>
      </div>
    </div>
  )
}
