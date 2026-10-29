import React from 'react'
import { Card, Badge, Button, BarChart } from '../UI/UI'
import { Brain, Volume2, Eye, CheckCircle2, UserPlus, History } from 'lucide-react'
import { calcOverallRank, getRecommendation } from '../../utils/ranking'
import styles from './NewTest.module.css'
import { printReport } from '../../utils/report'

export default function Summary({ worker, testResults, record, saved = true, onRetrySave, onExportTemporary, onNewTest, onNavigate }) {
  const overall = calcOverallRank(
    testResults.memory ? testResults.memory.rank.label : null,
    testResults.sound ? testResults.sound.rank.label : null,
    testResults.visual ? testResults.visual.rank.label : null,
  )
  const recommendation = getRecommendation(overall.label)

  const hasSound = !!testResults.sound
  const hasVisual = !!testResults.visual
  const hasMemory = !!testResults.memory
  const chartCount = (hasSound ? 1 : 0) + (hasVisual ? 1 : 0)

  const soundChartData = hasSound
    ? testResults.sound.rounds.map((v, i) => ({
        label: `L${i + 1}`,
        value: v,
        color: '#185FA5',
      }))
    : []

  const visualChartData = hasVisual
    ? testResults.visual.rounds.map((v, i) => ({
        label: `L${i + 1}`,
        value: v,
        color: '#0F6E56',
      }))
    : []

  const resultCardCount = (hasSound ? 1 : 0) + (hasVisual ? 1 : 0) + (hasMemory ? 1 : 0)

  return (
    <div className={styles.summary}>
      <Card><strong>{worker.name}</strong> · {worker.companyName || 'Chưa có công ty'} · {worker.code || '—'} · {worker.timeline}</Card>
      <div className={styles.resultCards} style={{ gridTemplateColumns: `repeat(${resultCardCount}, 1fr)` }}>
        {hasSound && (
          <Card className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <span className={styles.resultIcon}><Volume2 size={22} /></span>
              <span className={styles.resultTitle}>Phản xạ thính vận động</span>
            </div>
            <div className={styles.resultScore}>{Math.round(testResults.sound.avg)} ms</div>
            <div className={styles.resultPct}>TB</div>
            <Badge label={testResults.sound.rank.label} color={testResults.sound.rank.color} />
          </Card>
        )}

        {hasVisual && (
          <Card className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <span className={styles.resultIcon}><Eye size={22} /></span>
              <span className={styles.resultTitle}>Phản xạ thị vận động</span>
            </div>
            <div className={styles.resultScore}>{Math.round(testResults.visual.avg)} ms</div>
            <div className={styles.resultPct}>TB</div>
            <Badge label={testResults.visual.rank.label} color={testResults.visual.rank.color} />
          </Card>
        )}

        {hasMemory && (
          <Card className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <span className={styles.resultIcon}><Brain size={22} /></span>
              <span className={styles.resultTitle}>Trí nhớ</span>
            </div>
            <div className={styles.resultScore}>{testResults.memory.score}/6</div>
            <div className={styles.resultPct}>{testResults.memory.pct}%</div>
            <Badge label={testResults.memory.rank.label} color={testResults.memory.rank.color} />
          </Card>
        )}
      </div>

      {chartCount > 0 && (
        <div className={styles.chartRow} style={{ gridTemplateColumns: chartCount === 1 ? '1fr' : '1fr 1fr' }}>
          {hasSound && (
            <Card>
              <h4 className={styles.miniTitle}>Chi tiết phản xạ thính vận động (ms)</h4>
              <BarChart data={soundChartData} height={140} barColor="#185FA5" />
            </Card>
          )}
          {hasVisual && (
            <Card>
              <h4 className={styles.miniTitle}>Chi tiết phản xạ thị vận động (ms)</h4>
              <BarChart data={visualChartData} height={140} barColor="#0F6E56" />
            </Card>
          )}
        </div>
      )}

      <Card className={styles.recommendCard}>
        <h4 className={styles.miniTitle}>Kiến nghị phân loại công việc</h4>
        <p className={styles.recommendText}>{recommendation}</p>
      </Card>

      <div className={styles.autoSavedNotice}>
        <CheckCircle2 size={16} />
        <span>{saved ? 'Kết quả đã được lưu tự động vào lịch sử.' : 'Chưa lưu được kết quả. Hãy thử lưu lại hoặc xuất kết quả tạm.'}</span>
      </div>

      <div className={styles.summaryActions}>
        {!saved && <><Button onClick={onRetrySave}>Thử lưu lại</Button><Button onClick={onExportTemporary}>Xuất kết quả tạm</Button></>}
        <Button variant="success" size="lg" disabled={!saved} onClick={onNewTest}><UserPlus size={16} /> Kiểm tra người mới</Button>
        {record && <Button onClick={() => printReport(record)}>In phiếu kiểm tra</Button>}
        <Button variant="ghost" size="lg" onClick={() => onNavigate('history')}><History size={16} /> Xem lịch sử</Button>
      </div>
    </div>
  )
}

