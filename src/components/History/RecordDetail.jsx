import React from 'react'
import { Card, Button, Badge, BarChart } from '../UI/UI'
import { Brain, Volume2, Eye } from 'lucide-react'
import styles from './History.module.css'
import { printReport } from '../../utils/report'

export default function RecordDetail({ record, onBack, onDelete }) {
  const r = record

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
          <h4 className={styles.sectionTitle}>Thông tin người lao động</h4>
          <table className={styles.infoTable}>
            <tbody>
              <tr><td>Tên công ty</td><td>{r.worker.companyName || '—'}</td></tr>
              <tr><td>Số thứ tự</td><td>{r.worker.code || '—'}</td></tr>
              <tr><td>Chức danh</td><td>{r.worker.position || '—'}</td></tr>
              <tr><td>Tuổi</td><td>{r.worker.age || '—'}</td></tr>
              <tr><td>Giới tính</td><td>{r.worker.gender === 'male' ? 'Nam' : 'Nữ'}</td></tr>
              <tr><td>Thời điểm</td><td>{r.worker.timeline || '—'}</td></tr>
              <tr><td>Thâm niên</td><td>{r.worker.seniority != null ? `${r.worker.seniority} năm` : '—'}</td></tr>
              <tr><td>Trình độ VH</td><td>{r.worker.education || '—'}</td></tr>
            </tbody>
          </table>
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
