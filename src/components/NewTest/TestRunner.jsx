import React, { useCallback, useRef, useState } from 'react'
import MemoryTest from '../Tests/MemoryTest'
import SoundTest from '../Tests/SoundTest'
import VisualTest from '../Tests/VisualTest'
import { Button } from '../UI/UI'
import styles from './NewTest.module.css'

const TESTS = [
  { key: 'sound', name: 'Phản xạ thính vận động', Component: SoundTest },
  { key: 'visual', name: 'Phản xạ thị vận động', Component: VisualTest },
  { key: 'memory', name: 'Trí nhớ', Component: MemoryTest },
]

export default function TestRunner({ onComplete, selectedTests, initialResults = {}, initialProgress = {}, onProgress }) {
  const [results, setResults] = useState(initialResults)
  const resultsRef = useRef(results)
  const progressRef = useRef(initialProgress)
  const notify = useRef(onProgress)
  notify.current = onProgress
  const active = TESTS.filter(test => !selectedTests || selectedTests[test.key])
  const current = active.find(test => !results[test.key])
  const updateProgress = useCallback((key, value) => {
    progressRef.current = { ...progressRef.current, [key]: value }
    notify.current?.(resultsRef.current, progressRef.current)
  }, [])
  const finish = (key, value) => {
    const next = { ...resultsRef.current, [key]: value }
    resultsRef.current = next
    setResults(next)
    notify.current?.(next, progressRef.current)
    if (active.every(test => next[test.key])) onComplete(next)
  }
  if (!current) return <Button onClick={() => onComplete(results)}>Lưu kết quả đã hoàn thành</Button>
  const next = active[active.indexOf(current) + 1]
  const Component = current.Component
  return <div className={styles.testRunner}>
    <div className={styles.testProgress}>{active.map((test, index) => <div key={test.key} className={`${styles.testStep} ${test === current ? styles.testStepActive : ''} ${results[test.key] ? styles.testStepDone : ''}`}><div className={styles.stepNum}>{results[test.key] ? '✓' : index + 1}</div><span className={styles.stepLabel}>{test.name}</span></div>)}</div>
    <div className={styles.testArea}><Component key={current.key} initialState={initialProgress[current.key]} onProgress={value => updateProgress(current.key, value)} onComplete={value => finish(current.key, value)} continueLabel={next ? `Tiếp tục — ${next.name} →` : 'Hoàn thành — Xem kết quả →'} /></div>
  </div>
}
