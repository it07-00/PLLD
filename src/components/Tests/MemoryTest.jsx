import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, Button, Triangle } from '../UI/UI'
import { generateTargets, generateAllShapes, shapeKey, scoreMemory, rankMemory } from '../../utils/triangle'
import { Brain } from 'lucide-react'
import styles from './Tests.module.css'

const PHASES = { READY: 'ready', MEMORIZE: 'memorize', SELECT: 'select', RESULT: 'result' }

export default function MemoryTest({ onComplete, onProgress, initialState, continueLabel }) {
  const restored = initialState?.phase === 'memorize' ? null : initialState
  const [phase, setPhase] = useState(restored?.phase || PHASES.READY)
  const [targets, setTargets] = useState(restored?.targets || [])
  const [allShapes, setAllShapes] = useState(restored?.allShapes || [])
  const [selected, setSelected] = useState(restored?.selected || [])
  const [timer, setTimer] = useState(restored?.timer ?? 10)
  const [paused, setPaused] = useState(restored?.phase === PHASES.SELECT)
  const notify = useRef(onProgress)
  notify.current = onProgress
  const timerRef = useRef(null)

  const startTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const t = generateTargets(6)
    setTargets(t)
    setSelected([])
    setAllShapes([])
    setPaused(false)
    setPhase(PHASES.MEMORIZE)
    setTimer(10)
  }, [])

  const submitSelection = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase(PHASES.RESULT)
  }, [])

  useEffect(() => {
    if (paused || ![PHASES.MEMORIZE, PHASES.SELECT].includes(phase)) return
    timerRef.current = setInterval(() => setTimer(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, paused])

  useEffect(() => {
    if (paused || timer !== 0) return
    if (phase === PHASES.MEMORIZE) {
      setAllShapes(generateAllShapes(targets, 12)); setPhase(PHASES.SELECT); setTimer(60)
    } else if (phase === PHASES.SELECT) submitSelection()
  }, [timer, phase, paused, targets, submitSelection])

  useEffect(() => { notify.current?.({ phase, targets, allShapes, selected, timer }) }, [phase, targets, allShapes, selected, timer])

  useEffect(() => {
    const pause = () => { if ([PHASES.MEMORIZE, PHASES.SELECT].includes(phase)) setPaused(true) }
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility) }
  }, [phase])

  const toggleShape = (shape) => {
    if (paused || phase !== PHASES.SELECT) return
    const key = shapeKey(shape)
    const already = selected.find(s => shapeKey(s) === key)
    if (already) {
      setSelected(selected.filter(s => shapeKey(s) !== key))
    } else if (selected.length < 6) {
      setSelected([...selected, shape])
    }
  }

  const score = phase === PHASES.RESULT ? scoreMemory(selected, targets) : 0
  const pct = phase === PHASES.RESULT ? Math.round((score / 6) * 100) : 0
  const rank = phase === PHASES.RESULT ? rankMemory(score) : { color: '#000', label: '' }

  const handleFinish = () => {
    onComplete({ score, pct, rank })
  }

  const targetKeys = new Set(targets.map(t => shapeKey(t)))
  const selectedKeys = new Set(selected.map(s => shapeKey(s)))

  return (
    <Card className={styles.testCard}>
      <div className={styles.testHeader}>
        <h2 className={styles.testTitle}><Brain size={22} style={{verticalAlign:'middle',marginRight:8}} />Trí nhớ</h2>
        {phase === PHASES.SELECT && (
          <span className={styles.counter}>Đã chọn: {selected.length}/6</span>
        )}
      </div>

      {phase === PHASES.READY && (
        <div className={styles.readyBox}>
          <h3>Hướng dẫn</h3>
          <p>Bạn sẽ được xem 6 hình tam giác trong 10 giây. Sau đó, hãy chọn lại chính xác 6 hình đó trong 18 hình được hiển thị.</p>
          <div className={styles.readyActions}>
            <Button variant="primary" size="lg" onClick={startTest}>Bắt đầu ngay →</Button>
          </div>
        </div>
      )}

      {paused && <div className={styles.readyBox}><p>Đã tạm dừng do cửa sổ mất tập trung.</p><Button onClick={phase === PHASES.MEMORIZE ? startTest : () => setPaused(false)}>{phase === PHASES.MEMORIZE ? 'Bắt đầu lại lượt ghi nhớ' : 'Tiếp tục chọn hình'}</Button></div>}

      {!paused && (phase === PHASES.MEMORIZE || phase === PHASES.SELECT) && (
        <div className={styles.timerContainer}>
          <div className={styles.timerBar}>
            <div 
              className={styles.timerFill} 
              style={{ 
                width: `${(timer / (phase === PHASES.MEMORIZE ? 10 : 60)) * 100}%`, 
                backgroundColor: timer <= 5 ? '#A32D2D' : (phase === PHASES.MEMORIZE ? '#185FA5' : '#0F6E56')
              }} 
            />
          </div>
          <div className={styles.timerText} style={{ color: timer <= 5 ? '#A32D2D' : '#374151' }}>
            {phase === PHASES.MEMORIZE ? `⏱ Ghi nhớ: ${timer}s` : `⏱ Thời gian còn lại: ${timer}s`}
          </div>
        </div>
      )}

      {!paused && phase === PHASES.MEMORIZE && (
        <div className={styles.shapeGrid6}>
          {targets.map((t, i) => (
            <Triangle key={i} shapeId={t.id} />
          ))}
        </div>
      )}

      {!paused && phase === PHASES.SELECT && (
        <div>
          <p className={styles.instruction}>Chọn 6 hình bạn đã ghi nhớ:</p>

          <div className={styles.shapeGrid18}>
            {allShapes.map((s, i) => (
              <Triangle
                key={i}
                shapeId={s.id}
                selected={selectedKeys.has(shapeKey(s))}
                className={styles.triangleSmall}
                onClick={() => toggleShape(s)}
              />
            ))}
          </div>
          <div className={styles.submitRow}>
            <Button variant="primary" size="lg" disabled={selected.length !== 6} onClick={submitSelection}>
              Nộp kết quả
            </Button>
          </div>
        </div>
      )}

      {phase === PHASES.RESULT && (
        <div>
          <div className={styles.resultBanner} style={{ borderColor: rank.color }}>
            <div className={styles.resultScore} style={{ color: rank.color }}>{score}/6</div>
            <div className={styles.resultPct}>{pct}% chính xác</div>
          </div>
          <p className={styles.instruction}>Kết quả chi tiết:</p>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dotCorrect}></span> Chọn đúng</span>
            <span className={styles.legendItem}><span className={styles.dotWrong}></span> Chọn sai</span>
            <span className={styles.legendItem}><span className={styles.dotMissed}></span> Bỏ sót</span>
          </div>
          <div className={`${styles.shapeGrid18} ${styles.shapeGrid18Result}`}>
            {allShapes.map((s, i) => {
              const key = shapeKey(s)
              const isTarget = targetKeys.has(key)
              const wasSelected = selectedKeys.has(key)
              
              let statusClass = ''
              let highlighted = null
              let missed = false
              
              if (wasSelected && isTarget) {
                statusClass = styles.resultCorrect
                highlighted = 'correct'
              } else if (wasSelected && !isTarget) {
                statusClass = styles.resultWrong
                highlighted = 'wrong'
              } else if (!wasSelected && isTarget) {
                statusClass = styles.resultMissed
                missed = true
              }

              return (
                <div key={i} className={`${styles.resultItem} ${statusClass}`}>
                  <Triangle 
                    shapeId={s.id} 
                    highlighted={highlighted} 
                    missed={missed} 
                    className={styles.resultTriangle}
                  />
                </div>
              )
            })}
          </div>
          <div className={styles.submitRow}>
            <Button variant="primary" size="lg" onClick={handleFinish} style={{ whiteSpace: 'nowrap', padding: '0 36px' }}>{continueLabel || 'Hoàn thành — Xem kết quả →'}</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
