import React, { useMemo } from 'react'
import { Card, MetricCard, DonutChart, Badge } from '../UI/UI'
import { Users, AlertTriangle } from 'lucide-react'
import styles from './Stats.module.css'
import { unitStatistics } from '../../utils/statistics.mjs'

export default function Stats({ records }) {
  const stats = useMemo(() => {
    const total = records.length
    const rankCounts = { 'Xuất sắc': 0, 'Tốt': 0, 'Khá': 0, 'Trung bình': 0, 'Kém': 0 }
    const monthCounts = {}
    const needWatch = []

    records.forEach(r => {
      if (rankCounts[r.overall?.rank] !== undefined) rankCounts[r.overall.rank]++
      // monthly
      const month = r.date?.slice(0, 7) || 'N/A'
      monthCounts[month] = (monthCounts[month] || 0) + 1
      // need watch
      if (r.overall?.rank === 'Trung bình' || r.overall?.rank === 'Kém') {
        needWatch.push(r)
      }
    })

    const monthData = Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0]))
    const unitStats = unitStatistics(records)

    return { total, rankCounts, monthData, unitStats, needWatch }
  }, [records])

  const chartData = [
    { label: 'Xuất sắc', value: stats.rankCounts['Xuất sắc'], color: '#0F6E56' },
    { label: 'Tốt', value: stats.rankCounts['Tốt'], color: '#185FA5' },
    { label: 'Khá', value: stats.rankCounts['Khá'], color: '#854F0B' },
    { label: 'Trung bình', value: stats.rankCounts['Trung bình'], color: '#BA7517' },
    { label: 'Kém', value: stats.rankCounts['Kém'], color: '#A32D2D' },
  ]

  return (
    <div className={styles.stats}>
      <div className={styles.topRow}>
        <MetricCard title="Tổng lượt kiểm tra" value={stats.total} icon={<Users size={22} />} color="#185FA5" />
        <MetricCard title="Cần theo dõi" value={stats.needWatch.length} icon={<AlertTriangle size={22} />} color="#A32D2D" />
      </div>

      <div className={styles.grid2}>
        <Card>
          <h3 className={styles.cardTitle}>Phân bố xếp loại</h3>
          {stats.total > 0 ? (
            <DonutChart data={chartData} />
          ) : (
            <div className={styles.emptyState}>Chưa có dữ liệu</div>
          )}
        </Card>

        <Card>
          <h3 className={styles.cardTitle}>Số lượng theo tháng</h3>
          {stats.monthData.length === 0 ? (
            <div className={styles.emptyState}>Chưa có dữ liệu</div>
          ) : (
            <div className={styles.monthBars}>
              {stats.monthData.map(([month, count]) => {
                const maxCount = Math.max(...stats.monthData.map(d => d[1]), 1)
                const pct = (count / maxCount) * 100
                return (
                  <div key={month} className={styles.monthRow}>
                    <span className={styles.monthLabel}>{month}</span>
                    <div className={styles.monthBarWrap}>
                      <div className={styles.monthBar} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.monthCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {stats.unitStats.length > 0 && (
        <Card>
          <h3 className={styles.cardTitle}>Phản xạ trung bình theo đơn vị</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Công ty</th>
                  <th>Đơn vị</th>
                  <th>Số lượng</th>
                  <th>TB Âm thanh (ms)</th>
                  <th>TB Thị giác (ms)</th>
                </tr>
              </thead>
              <tbody>
                {stats.unitStats.map(u => (
                  <tr key={u.key}>
                    <td>{u.companyName}</td>
                    <td className={styles.unitName}>{u.unit}</td>
                    <td>{u.count}</td>
                    <td>{u.soundAvg ?? '—'}</td>
                    <td>{u.visualAvg ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {stats.needWatch.length > 0 && (
        <Card>
          <h3 className={styles.cardTitle}>⚠️ Danh sách cần theo dõi</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Công ty</th>
                  <th>Đơn vị</th>
                  <th>Ngày</th>
                  <th>Xếp loại</th>
                  <th>Kiến nghị</th>
                </tr>
              </thead>
              <tbody>
                {stats.needWatch.map(r => (
                  <tr key={r.id}>
                    <td className={styles.unitName}>{r.worker.name}</td>
                    <td>{r.worker.companyName || '—'}</td>
                    <td>{r.worker.unit || '—'}</td>
                    <td>{r.date}</td>
                    <td><Badge label={r.overall.rank} color={r.overall.color} /></td>
                    <td className={styles.recText}>{r.overall.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
