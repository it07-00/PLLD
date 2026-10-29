import React, { useEffect, useMemo, useState } from 'react'
import { Card, MetricCard, Badge, DonutChart } from '../UI/UI'
import { CalendarDays, CalendarRange, Users, FlaskConical, PieChart, ClipboardList } from 'lucide-react'
import styles from './Dashboard.module.css'
import { vietnamDateTime, vietnamWeekStart } from '../../utils/datetime.mjs'

export default function Dashboard({ records, onNavigate }) {
  const [today, setToday] = useState(() => vietnamDateTime().date)
  useEffect(() => {
    const refreshDate = () => setToday(vietnamDateTime().date)
    const timer = setInterval(refreshDate, 30000)
    window.addEventListener('focus', refreshDate)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refreshDate)
    }
  }, [])
  const stats = useMemo(() => {
    const weekAgo = vietnamWeekStart(today)
    const todayCount = records.filter(r => r.date === today).length
    const weekCount = records.filter(r => r.date >= weekAgo && r.date <= today).length
    const total = records.length
    const rankCounts = { 'Xuất sắc': 0, 'Tốt': 0, 'Khá': 0, 'Trung bình': 0, 'Kém': 0 }
    records.forEach(r => {
      if (rankCounts[r.overall?.rank] !== undefined) rankCounts[r.overall.rank]++
    })
    return { todayCount, weekCount, total, rankCounts }
  }, [records, today])

  const recent = records.slice(0, 10)

  const chartData = [
    { label: 'Xuất sắc', value: stats.rankCounts['Xuất sắc'], color: '#0F6E56' },
    { label: 'Tốt', value: stats.rankCounts['Tốt'], color: '#185FA5' },
    { label: 'Khá', value: stats.rankCounts['Khá'], color: '#854F0B' },
    { label: 'Trung bình', value: stats.rankCounts['Trung bình'], color: '#BA7517' },
    { label: 'Kém', value: stats.rankCounts['Kém'], color: '#A32D2D' },
  ]

  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        <MetricCard title="Hôm nay" value={stats.todayCount} icon={<CalendarDays size={20} />} color="#185FA5" />
        <MetricCard title="Tuần này" value={stats.weekCount} icon={<CalendarRange size={20} />} color="#0F6E56" />
        <MetricCard title="Tổng cộng" value={stats.total} icon={<Users size={20} />} color="#3C3489" />
      </div>

      <div className={styles.row}>
        <Card className={styles.chartCard}>
          <h3 className={styles.cardTitle}>Phân bố xếp loại</h3>
          {stats.total > 0 ? (
            <DonutChart data={chartData} />
          ) : (
            <div className={styles.emptyChart}>
              <span className={styles.emptyChartIcon}><PieChart size={20} /></span>
              <p className={styles.emptyChartTitle}>Chưa có dữ liệu phân bố</p>
              <p className={styles.emptyChartHint}>Kết quả xếp loại sẽ hiển thị sau khi hoàn thành bài kiểm tra đầu tiên.</p>
            </div>
          )}
        </Card>

        <Card className={styles.startCard}>
          <div className={styles.startContent}>
            <div className={styles.startIcon}><FlaskConical size={34} /></div>
            <h3>Bắt đầu kiểm tra</h3>
            <p>Kiểm tra thần kinh tâm lý cho người lao động mới</p>
            <button className={styles.startBtn} onClick={() => onNavigate('new-test')}>
              Bắt đầu kiểm tra mới
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className={styles.cardTitle}>Kết quả gần nhất</h3>
        {recent.length === 0 ? (
          <div className={styles.emptyTable}>
            <span className={styles.emptyTableIcon}><ClipboardList size={20} /></span>
            <p className={styles.emptyTableTitle}>Chưa có kết quả kiểm tra nào</p>
            <p className={styles.emptyTableHint}>Tạo hồ sơ kiểm tra đầu tiên để bắt đầu theo dõi dữ liệu người lao động.</p>
            <button className={styles.linkBtn} onClick={() => onNavigate('new-test')}>
              Thực hiện kiểm tra đầu tiên →
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Công ty</th>
                  <th>Đơn vị</th>
                  <th>Ngày</th>
                  <th>Trí nhớ</th>
                  <th>Thính vận động</th>
                  <th>Thị vận động</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id} onClick={() => onNavigate('history', r.id)} className={styles.clickRow}>
                    <td className={styles.nameCell}>{r.worker.name}</td>
                    <td>{r.worker.companyName || '—'}</td>
                    <td>{r.worker.unit || '—'}</td>
                    <td>{r.date}</td>
                    <td>{r.tests.memory ? <Badge label={r.tests.memory.rank.label} color={r.tests.memory.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td>{r.tests.sound ? <Badge label={r.tests.sound.rank.label} color={r.tests.sound.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td>{r.tests.visual ? <Badge label={r.tests.visual.rank.label} color={r.tests.visual.rank.color} /> : <span style={{color:'#aaa'}}>—</span>}</td>
                    <td><Badge label={r.overall.rank} color={r.overall.color} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
