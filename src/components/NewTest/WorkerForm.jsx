import React, { useRef, useState } from 'react'
import { Input, Select, Button, Card } from '../UI/UI'
import { storage } from '../../store/storage'
import { findWorkerRecord, autofillWorker, nextWorkerCode } from '../../utils/workerLookup.mjs'
import { companyOptions } from '../../utils/company.mjs'
import { normalizeText } from '../../utils/records.mjs'
import { Volume2, Eye, Brain } from 'lucide-react'
import styles from './NewTest.module.css'

const TEST_OPTIONS = [
  { key: 'sound', name: 'Phản xạ thính vận động', desc: '10 lần đo phản xạ âm thanh', icon: Volume2 },
  { key: 'visual', name: 'Phản xạ thị vận động', desc: '10 lần đo phản xạ hình ảnh', icon: Eye },
  { key: 'memory', name: 'Trí nhớ', desc: 'Ghi nhớ và chọn lại 6 hình tam giác', icon: Brain },
]

export default function WorkerForm({ onSubmit, records = [] }) {
  const settings = storage.getSettings()
  const autofilled = useRef(null)
  const edited = useRef(new Set())
  const companies = companyOptions(records)
  const emptyWorker = { name: '', code: '', position: '', unit: settings.defaultUnit || '', timeline: 'Đầu ca', age: '', gender: 'male', seniority: '', education: 'Cấp 3' }
  const [form, setForm] = useState({
    companyName: (settings.companyName || '').trim(),
    name: '',
    code: '',
    position: '',
    unit: settings.defaultUnit || '',
    timeline: 'Đầu ca',
    age: '',
    gender: 'male',
    seniority: '',
    education: 'Cấp 3',
  })
  const [selectedTests, setSelectedTests] = useState({ sound: true, visual: true, memory: true })
  const [errors, setErrors] = useState({})
  const [autofillMsg, setAutofillMsg] = useState('')

  const update = (key, val) => {
    const identityChanged = ['name', 'code', 'companyName'].includes(key) && normalizeText(val) !== normalizeText(form[key])
    const reset = identityChanged && autofilled.current
    if (reset) { autofilled.current = null; edited.current.clear() }
    if (!['name', 'code', 'companyName'].includes(key)) edited.current.add(key)
    setForm(f => {
      return reset ? { ...f, ...emptyWorker, companyName: f.companyName, [key]: val } : { ...f, [key]: val }
    })
    setAutofillMsg('')
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const toggleTest = (key) => {
    setSelectedTests(prev => ({ ...prev, [key]: !prev[key] }))
    if (errors.tests) setErrors(e => ({ ...e, tests: '' }))
  }

  const handleAutoFill = () => {
    if (!form.code.trim() && !form.name.trim()) return
    const companyName = form.companyName.trim()
    if (!companyName) {
      setAutofillMsg('Vui lòng nhập tên công ty để dùng tự điền.')
      return
    }
    const lastRecord = findWorkerRecord(storage.getAll(), form, companyName)
    if (!lastRecord) return
    const identity = JSON.stringify([normalizeText(companyName), normalizeText(lastRecord.worker.name), normalizeText(lastRecord.worker.code)])
    if (autofilled.current === identity) return
    autofilled.current = identity
    setForm(f => autofillWorker(f, lastRecord.worker, edited.current))
    setAutofillMsg(`✅ Đã tự điền hồ sơ công ty ${companyName}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên'
    if (!form.companyName.trim()) errs.companyName = 'Vui lòng nhập tên công ty'
    const hasAnyTest = Object.values(selectedTests).some(v => v)
    if (!hasAnyTest) errs.tests = 'Vui lòng chọn ít nhất 1 bài test'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const companyName = form.companyName.trim()
    let finalCode = form.code.trim()
    if (!finalCode) {
      const existing = findWorkerRecord(records, form, companyName)
      finalCode = existing?.worker?.code?.trim() || nextWorkerCode(records, companyName)
    }

    onSubmit({ ...form, companyName, code: finalCode, selectedTests })
  }

  const suggestedCode = nextWorkerCode(records, form.companyName)

  return (
    <Card className={styles.formCard}>
      <h2 className={styles.formTitle}>Thông tin người lao động</h2>
      <p className={styles.formDesc}>Nhập đầy đủ thông tin trước khi bắt đầu kiểm tra</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.identityGrid}>
          <Input
            label="Tên công ty *"
            id="worker-company"
            value={form.companyName}
            onChange={e => update('companyName', e.target.value)}
            onBlur={handleAutoFill}
            placeholder="Nhập tên công ty"
            list="worker-companies"
            error={errors.companyName}
            className={styles.identityField}
          />
          <Input
            label="Họ và tên *"
            id="worker-name"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            onBlur={handleAutoFill}
            error={errors.name}
            placeholder="Nguyễn Văn A"
            className={styles.identityField}
          />
          <Input
            label="Số thứ tự"
            id="worker-code"
            value={form.code}
            onChange={e => update('code', e.target.value)}
            onBlur={handleAutoFill}
            placeholder={suggestedCode ? `Tự động: ${suggestedCode}` : 'VD: 01'}
            className={styles.identityField}
          />
        </div>
        <datalist id="worker-companies">{companies.map(company => <option key={company.key} value={company.name} />)}</datalist>

        {autofillMsg && <div className={`${styles.autofillMsg} ${autofillMsg.startsWith('✅') ? styles.msgSuccess : ''}`} role="status">{autofillMsg}</div>}

        <div className={styles.formGrid}>
          <Input label="Chức danh" id="worker-position" value={form.position} onChange={e => update('position', e.target.value)} placeholder="Công nhân, Kỹ thuật viên..." className={styles.fieldWide} />
          <Input label="Đơn vị / Phân xưởng" id="worker-unit" value={form.unit} onChange={e => update('unit', e.target.value)} placeholder="Phân xưởng A" className={styles.fieldWide} />
          <div className={styles.compactRow}>
            <Select label="Thời điểm" id="worker-timeline" value={form.timeline} onChange={e => update('timeline', e.target.value)}>
              <option value="Đầu ca">Đầu ca</option>
              <option value="Giữa ca">Giữa ca</option>
              <option value="Cuối ca">Cuối ca</option>
            </Select>
            <Input label="Tuổi" id="worker-age" type="number" min="16" max="80" value={form.age} onChange={e => update('age', e.target.value)} placeholder="32" />
            <Select label="Giới tính" id="worker-gender" value={form.gender} onChange={e => update('gender', e.target.value)}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </Select>
            <Input label="Thâm niên (năm)" id="worker-seniority" type="number" min="0" value={form.seniority} onChange={e => update('seniority', e.target.value)} placeholder="0" />
            <Select label="Trình độ văn hoá" id="worker-education" value={form.education} onChange={e => update('education', e.target.value)}>
              <option value="Cấp 2">Cấp 2</option>
              <option value="Cấp 3">Cấp 3</option>
              <option value="Trung cấp/Cao đẳng">Trung cấp/Cao đẳng</option>
              <option value="Đại học">Đại học</option>
              <option value="Khác">Khác</option>
            </Select>
          </div>
        </div>

        <div className={styles.testSelectSection}>
          <div className={styles.testSelectLabel}>Chọn bài test *</div>
          <div className={styles.testSelectGrid}>
            {TEST_OPTIONS.map(opt => {
              const Icon = opt.icon
              const active = selectedTests[opt.key]
              return (
                <div
                  key={opt.key}
                  className={`${styles.testSelectItem} ${active ? styles.testSelectActive : ''}`}
                  onClick={() => toggleTest(opt.key)}
                  role="checkbox"
                  aria-checked={active}
                  tabIndex={0}
                  onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); toggleTest(opt.key) } }}
                >
                  <div className={styles.testSelectCheckbox}>{active ? '✓' : ''}</div>
                  <div className={styles.testSelectInfo}>
                    <span className={styles.testSelectName}>{opt.name}</span>
                    <span className={styles.testSelectDesc}>{opt.desc}</span>
                  </div>
                  <Icon size={20} className={styles.testSelectIcon} />
                </div>
              )
            })}
          </div>
          {errors.tests && <div className={styles.testSelectError}>{errors.tests}</div>}
        </div>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" size="lg">Bắt đầu kiểm tra →</Button>
        </div>
      </form>
    </Card>
  )
}

