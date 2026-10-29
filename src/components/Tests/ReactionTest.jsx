import React, { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Card, Button, BarChart } from '../UI/UI'
import { rankSound, rankVisual } from '../../utils/ranking'
import { Volume2, Eye } from 'lucide-react'
import styles from './Tests.module.css'

export default function ReactionTest({ kind, onComplete, onProgress, initialState, continueLabel }) {
  const [rounds, setRounds] = useState(initialState?.rounds || [])
  const [phase, setPhase] = useState((initialState?.rounds?.length || 0) >= 10 ? 'finished' : 'ready')
  const [error, setError] = useState('')
  const phaseRef = useRef(phase)
  const roundsRef = useRef(rounds)
  const timer = useRef(null)
  const frame = useRef(null)
  const startTime = useRef(0)
  const audio = useRef(null)
  const alive = useRef(true)
  const report = useRef(onProgress)
  report.current = onProgress
  const sound = kind === 'sound'
  const Icon = sound ? Volume2 : Eye
  const title = sound ? 'Phản xạ thính vận động' : 'Phản xạ thị vận động'
  const changePhase = useCallback(value => { phaseRef.current = value; setPhase(value) }, [])
  const cancel = useCallback(() => { clearTimeout(timer.current); cancelAnimationFrame(frame.current) }, [])

  const ensureAudio = async () => {
    if (!audio.current) {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) throw new Error('Thiết bị không hỗ trợ âm thanh. Hãy dùng trình duyệt khác.')
      audio.current = new Audio()
    }
    await audio.current.resume()
    if (audio.current.state !== 'running') throw new Error('Chưa bật được âm thanh. Hãy kiểm tra loa và thử lại.')
    return audio.current
  }
  const beep = ctx => {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain()
    oscillator.connect(gain); gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.01)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)
    oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + 0.2)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }
  const startRound = async () => {
    cancel()
    setError('')
    changePhase('preparing')
    try {
      if (sound) await ensureAudio()
      if (!alive.current || phaseRef.current !== 'preparing') return
      if (document.hidden || !document.hasFocus()) { changePhase('paused'); return }
      changePhase('waiting')
      timer.current = setTimeout(() => {
        frame.current = requestAnimationFrame(() => {
          if (phaseRef.current !== 'waiting') return
          if (sound && audio.current?.state !== 'running') { setError('Âm thanh bị tạm dừng. Hãy kiểm tra loa rồi tiếp tục.'); changePhase('paused'); return }
          // Commit the stimulus in the animation frame before starting measurement.
          flushSync(() => changePhase('active'))
          startTime.current = performance.now()
          if (sound) {
            try { beep(audio.current) }
            catch { setError('Không phát được tín hiệu âm thanh. Kiểm tra loa rồi thử lại lượt này.'); changePhase('paused') }
          }
        })
      }, 1500 + Math.random() * 2500)
    } catch (error) { if (alive.current) { setError(error.message); changePhase('ready') } }
  }
  const startRef = useRef(startRound)
  startRef.current = startRound
  const press = useCallback(() => {
    if (phaseRef.current === 'waiting') { cancel(); changePhase('too_early'); return }
    if (phaseRef.current !== 'active') return
    const next = [...roundsRef.current, Math.round(performance.now() - startTime.current)]
    roundsRef.current = next
    setRounds(next)
    changePhase(next.length >= 10 ? 'finished' : 'done_round')
    report.current?.({ rounds: next })
  }, [cancel, changePhase])

  useEffect(() => {
    const keydown = event => { if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) press() } }
    const pause = () => { if (['preparing', 'waiting', 'active'].includes(phaseRef.current)) { cancel(); changePhase('paused') } }
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('keydown', keydown)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility) }
  }, [press, cancel, changePhase])
  useEffect(() => {
    if (!['done_round', 'too_early'].includes(phase)) return
    const timeout = setTimeout(() => startRef.current(), phase === 'too_early' ? 2000 : 1200)
    return () => clearTimeout(timeout)
  }, [phase])
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; cancel(); const ctx = audio.current; audio.current = null; ctx?.close().catch(() => {}) }
  }, [cancel])

  const avg = rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : 0
  const rank = sound ? rankSound(avg) : rankVisual(avg)
  const chart = rounds.map((value, index) => ({ label: `L${index + 1}`, value }))
  return <Card className={styles.testCard}>
    <div className={styles.testHeader}><h2 className={styles.testTitle}><Icon size={22} /> {title}</h2><span className={styles.counter}>Lượt {Math.min(rounds.length + 1, 10)}/10</span></div>
    {error && <p role="alert">{error}</p>}
    {phase === 'ready' && <div className={styles.readyBox}><h3>Hướng dẫn</h3><p>{sound ? 'Khi nghe tiếng bíp' : 'Khi hình vuông xuất hiện'}, nhấn PHÍM DẤU CÁCH hoặc click vào ô nhanh nhất có thể. Không giữ phím; giữ cửa sổ kiểm tra ở phía trước.</p><div className={styles.readyActions}>{sound && <Button onClick={async () => { try { beep(await ensureAudio()); setError('') } catch (e) { setError(e.message) } }}>Kiểm tra loa</Button>}<Button onClick={startRound}>Bắt đầu ngay →</Button></div></div>}
    {phase === 'preparing' && <p>Đang chuẩn bị tín hiệu…</p>}
    {phase === 'paused' && <div className={styles.readyBox}><p>Đã tạm dừng do cửa sổ mất tập trung. Các lượt đã hoàn thành được giữ nguyên.</p><Button onClick={startRound}>Tiếp tục lượt này</Button></div>}
    {['waiting', 'active'].includes(phase) && <div className={styles.stimulusBox} style={{ backgroundColor: phase === 'waiting' ? '#fffbeb' : '#E1F5EE', borderColor: phase === 'waiting' ? '#f59e0b' : '#0F6E56' }} onClick={press}>{phase === 'waiting' ? <div className={styles.waitText}>Chờ tín hiệu...</div> : sound ? <div className={styles.goText}>NHẤN NGAY!</div> : <svg className={styles.visualStimulusSvg} viewBox="0 0 380 380"><rect x="4" y="4" width="372" height="372" rx="4" fill="#1E3932" /></svg>}</div>}
    {phase === 'too_early' && <div className={styles.roundResult}><p className={styles.earlyText}>⚠️ Nhấn quá sớm! Chuẩn bị thử lại lượt này…</p></div>}
    {phase === 'done_round' && <div className={styles.roundResult}><div className={styles.rtValue}>{rounds.at(-1)} ms</div><BarChart data={chart} height={120} /><p>Chuẩn bị lượt tiếp theo…</p></div>}
    {phase === 'finished' && <div className={styles.finishedResult}><div className={styles.resultBanner} style={{ borderColor: rank.color }}><div className={styles.resultScore}>{Math.round(avg)} ms</div><p>Min: {Math.min(...rounds)} ms — Max: {Math.max(...rounds)} ms</p></div><BarChart data={chart} height={200} /><div className={styles.submitRow}><Button onClick={() => onComplete({ rounds, avg, min: Math.min(...rounds), max: Math.max(...rounds), rank })}>{continueLabel || 'Hoàn thành →'}</Button></div></div>}
  </Card>
}
