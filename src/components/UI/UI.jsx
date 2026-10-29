import React, { useId } from 'react'
import styles from './UI.module.css'

export function Card({ children, className = '', style = {}, ...props }) {
  return <div className={`${styles.card} ${className}`} style={style} {...props}>{children}</div>
}

export function Button({ children, variant = 'primary', size = 'md', disabled, className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className={`${styles.inputGroup} ${className}`}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <input className={`${styles.input} ${error ? styles.inputError : ''}`} id={id} {...props} />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

export function Select({ label, id, children, className = '', ...props }) {
  return (
    <div className={`${styles.inputGroup} ${className}`}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <select className={styles.select} id={id} {...props}>{children}</select>
    </div>
  )
}

export function Badge({ label, color, className = '' }) {
  return (
    <span
      className={`${styles.badge} ${className}`}
      style={{ backgroundColor: `${color}18`, color, borderColor: `${color}40` }}
    >
      {label}
    </span>
  )
}

export function MetricCard({ title, value, subtitle, icon, color = '#185FA5' }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ backgroundColor: `${color}14`, color }}>
        {icon}
      </div>
      <div className={styles.metricContent}>
        <div className={styles.metricValue} style={{ color }}>{value}</div>
        <div className={styles.metricTitle}>{title}</div>
        {subtitle && <div className={styles.metricSubtitle}>{subtitle}</div>}
      </div>
    </div>
  )
}

const REGIONS = {
  FULL: '30,0 60,60 0,60',
  LEFT: '30,0 30,60 0,60',
  RIGHT: '30,0 60,60 30,60',
  TOP: '30,0 45,30 15,30',
  BOTTOM_TRAP: '15,30 45,30 60,60 0,60',
  BELOW_DIAG1: '0,60 45,30 60,60',
  ABOVE_DIAG1: '0,60 30,0 45,30',
  BELOW_DIAG2: '60,60 0,60 15,30',
  ABOVE_DIAG2: '60,60 15,30 30,0'
}

function getShapeDef(id) {
  const defs = [
    { fills: [{ p: 'RIGHT', f: '#000' }], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'BELOW_DIAG2', f: '#000' }], lines: [['60,60', '15,30']] },
    { fills: [{ p: 'ABOVE_DIAG1', f: '#000' }], lines: [['0,60', '45,30']] },
    { fills: [], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'FULL', f: 'url(#p-v)' }], lines: [] },
    { fills: [{ p: 'FULL', f: 'url(#p-d2)' }], lines: [] },
    { fills: [{ p: 'LEFT', f: 'url(#p-h)' }], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'RIGHT', f: 'url(#p-h)' }], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'TOP', f: 'url(#p-h)' }], lines: [['15,30', '45,30']] },
    { fills: [{ p: 'BELOW_DIAG1', f: 'url(#p-d1)' }], lines: [['0,60', '45,30']] },
    { fills: [], lines: [['0,60', '45,30']] },
    { fills: [], lines: [['60,60', '15,30']] },
    { fills: [{ p: 'BELOW_DIAG2', f: 'url(#p-d1)' }], lines: [['60,60', '15,30']] },
    { fills: [{ p: 'TOP', f: 'url(#p-d2)' }], lines: [['15,30', '45,30']] },
    { fills: [{ p: 'LEFT', f: 'url(#p-v)' }], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'RIGHT', f: 'url(#p-d1)' }], lines: [['30,0', '30,60']] },
    { fills: [{ p: 'BOTTOM_TRAP', f: 'url(#p-d2)' }], lines: [['15,30', '45,30']] },
    { fills: [], lines: [] }
  ]
  return defs[id] || defs[17]
}

export function Triangle({ shapeId = 17, selected, highlighted, missed, onClick, className = '' }) {
  const patternId = useId().replace(/:/g, '')
  const styleStr = `${styles.triangleWrap} ${selected ? styles.triSelected : ''} ${highlighted === 'correct' ? styles.triCorrect : ''} ${highlighted === 'wrong' ? styles.triWrong : ''} ${missed ? styles.triMissed : ''} ${className}`
  const def = getShapeDef(Number(shapeId))

  return (
    <div className={styleStr} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} aria-label={onClick ? `Hình số ${Number(shapeId) + 1}` : undefined} aria-pressed={onClick ? Boolean(selected) : undefined} onKeyDown={onClick ? e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); onClick() } } : undefined} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <svg width="120" height="120" viewBox="-4 -4 68 68">
        <defs>
          <pattern id={`${patternId}-p-v`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="2" y1="0" x2="2" y2="4" stroke="#000" strokeWidth="1.5"/>
          </pattern>
          <pattern id={`${patternId}-p-h`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="4" y2="2" stroke="#000" strokeWidth="1.5"/>
          </pattern>
          <pattern id={`${patternId}-p-d1`} width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="-1" y1="7" x2="7" y2="-1" stroke="#000" strokeWidth="1.5"/>
          </pattern>
          <pattern id={`${patternId}-p-d2`} width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="-1" y1="-1" x2="7" y2="7" stroke="#000" strokeWidth="1.5"/>
          </pattern>
        </defs>
        
        {def.fills.map((f, i) => (
          <polygon key={i} points={REGIONS[f.p]} fill={f.f.replace('url(#', `url(#${patternId}-`)} />
        ))}
        
        <polygon points={REGIONS.FULL} fill="none" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter" />
        
        {def.lines.map((l, i) => {
          const [p1, p2] = l
          const [x1, y1] = p1.split(',')
          const [x2, y2] = p2.split(',')
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth="2.5" />
        })}
      </svg>
    </div>
  )
}

export function DonutChart({ data, size = 160, strokeWidth = 24 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const total = data.reduce((s, d) => s + d.value, 0)

  let accumulated = 0
  const segments = data.map(d => {
    const pct = total > 0 ? d.value / total : 0
    const dashArray = `${pct * circumference} ${circumference}`
    const dashOffset = -accumulated * circumference
    accumulated += pct
    return { ...d, dashArray, dashOffset, pct }
  })

  return (
    <div className={styles.donutWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="700" fill="#111827">
          {total}
        </text>
        <text x={center} y={center + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
          kết quả
        </text>
      </svg>
      <div className={styles.donutLegend}>
        {data.map((d, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: d.color }} />
            <span>{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarChart({ data, height = 180, barColor }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div className={styles.barChart} style={{ height }}>
      <div className={styles.barChartInner}>
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 40)
          return (
            <div key={i} className={styles.barCol}>
              <div className={styles.barLabel}>{Math.round(d.value)}</div>
              <div
                className={styles.bar}
                style={{
                  height: barH,
                  backgroundColor: barColor || d.color || '#185FA5',
                }}
              />
              <div className={styles.barXLabel}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProgressBar({ value, max, color = '#185FA5', danger = false }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{
          width: `${pct}%`,
          backgroundColor: danger ? '#A32D2D' : color,
          transition: 'width 1s linear, background-color 0.3s',
        }}
      />
    </div>
  )
}
