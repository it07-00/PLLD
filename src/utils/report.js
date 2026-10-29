import { storage } from '../store/storage'
import { normalizeRecord } from './records.mjs'

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
const escapeValues = value => typeof value === 'string' ? escapeHTML(value) : Array.isArray(value) ? value.map(escapeValues) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeValues(item)])) : value

export function generateReportHTML(record) {
  record = escapeValues(normalizeRecord(record))
  const settings = storage.getSettings()
  const reportNum = `KTSK-${String(record.id).slice(-5).padStart(5, '0')}`
  const genderLabel = record.worker.gender === 'male' ? 'Nam' : 'Nữ'

  return `
    <div class="print-report">
      <div class="report-header">
        <div class="report-logo">
          ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="max-height:60px"/>` : '<div class="logo-placeholder">LOGO</div>'}
          <div class="company-name">${record.worker.companyName || 'Chưa có công ty'}</div>
        </div>
        <div class="report-title-block">
          <h1>PHIẾU KIỂM TRA SỨC KHỎE<br/>THẦN KINH TÂM LÝ</h1>
          <p class="report-num">Số: ${reportNum}</p>
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td><strong>Họ và tên:</strong> ${record.worker.name}</td>
          <td><strong>Số thứ tự:</strong> ${record.worker.code || '—'}</td>
          <td><strong>Tuổi:</strong> ${record.worker.age || '—'}</td>
          <td><strong>Giới tính:</strong> ${genderLabel}</td>
        </tr>
        <tr>
          <td><strong>Đơn vị:</strong> ${record.worker.unit || '—'}</td>
          <td><strong>Thời điểm:</strong> ${record.worker.timeline || '—'}</td>
          <td colspan="2"><strong>Công việc:</strong> ${record.worker.position || '—'}</td>
        </tr>
        <tr>
          <td><strong>Ngày KT:</strong> ${record.date}</td>
          <td colspan="3"><strong>Giờ:</strong> ${record.time}</td>
        </tr>
      </table>

      <h2 class="section-title">KẾT QUẢ TỪNG BÀI TEST</h2>
      <table class="result-table">
        <thead>
          <tr>
            <th>Bài test</th>
            <th>Kết quả</th>
            <th>Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          ${record.tests.memory ? `<tr>
            <td>1. Trí nhớ thị giác</td>
            <td>${record.tests.memory.score}/6 (${record.tests.memory.pct}%)</td>
            <td style="color:${record.tests.memory.rank.color};font-weight:600">${record.tests.memory.rank.label}</td>
          </tr>` : ''}
          ${record.tests.sound ? `<tr>
            <td>2. Phản xạ âm thanh</td>
            <td>${Math.round(record.tests.sound.avg)} ms (TB)</td>
            <td style="color:${record.tests.sound.rank.color};font-weight:600">${record.tests.sound.rank.label}</td>
          </tr>` : ''}
          ${record.tests.visual ? `<tr>
            <td>3. Phản xạ thị giác</td>
            <td>${Math.round(record.tests.visual.avg)} ms (TB)</td>
            <td style="color:${record.tests.visual.rank.color};font-weight:600">${record.tests.visual.rank.label}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div class="overall-box" style="border-color:${record.overall.color}">
        <div class="overall-label">ĐÁNH GIÁ TỔNG THỂ</div>
        <div class="overall-rank" style="color:${record.overall.color}">${record.overall.rank}</div>
      </div>

      <div class="recommendation-box">
        <strong>Kiến nghị phân loại công việc:</strong>
        <p>${record.overall.recommendation}</p>
      </div>

      <h2 class="section-title">CHI TIẾT PHẢN XẠ</h2>
      <div class="detail-grid">
        ${record.tests.sound ? `<div>
          <h3>Phản xạ âm thanh (ms)</h3>
          <table class="detail-table">
            ${record.tests.sound.rounds.map((r, i) => `<tr><td>Lượt ${i + 1}</td><td>${Math.round(r)} ms</td></tr>`).join('')}
            <tr class="avg-row"><td><strong>Trung bình</strong></td><td><strong>${Math.round(record.tests.sound.avg)} ms</strong></td></tr>
          </table>
        </div>` : ''}
        ${record.tests.visual ? `<div>
          <h3>Phản xạ thị giác (ms)</h3>
          <table class="detail-table">
            ${record.tests.visual.rounds.map((r, i) => `<tr><td>Lượt ${i + 1}</td><td>${Math.round(r)} ms</td></tr>`).join('')}
            <tr class="avg-row"><td><strong>Trung bình</strong></td><td><strong>${Math.round(record.tests.visual.avg)} ms</strong></td></tr>
          </table>
        </div>` : ''}
      </div>

      <h2 class="section-title">TIÊU CHÍ ĐÁNH GIÁ (THAM CHIẾU)</h2>
      <table class="criteria-table">
        <thead>
          <tr><th>Bài test</th><th>Xuất sắc</th><th>Tốt/Khá</th><th>Trung bình</th><th>Kém/Chậm</th></tr>
        </thead>
        <tbody>
          <tr><td>Trí nhớ thị giác</td><td>6/6</td><td>4-5/6</td><td>2-3/6</td><td>0-1/6</td></tr>
          <tr><td>Phản xạ âm thanh</td><td>&lt;200ms</td><td>&lt;280ms</td><td>&lt;380ms</td><td>≥380ms</td></tr>
          <tr><td>Phản xạ thị giác</td><td>&lt;250ms</td><td>&lt;350ms</td><td>&lt;450ms</td><td>≥450ms</td></tr>
        </tbody>
      </table>

      <div class="signature-block">
        <div class="sig-col">
          <p><strong>Người được kiểm tra</strong></p>
          <p class="sig-note">(Ký, ghi rõ họ tên)</p>
          <div class="sig-space"></div>
          <p>${record.worker.name}</p>
        </div>
        <div class="sig-col">
          <p><strong>Kỹ sư quan trắc</strong></p>
          <p class="sig-note">(Ký, ghi rõ họ tên)</p>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  `
}

export function printReport(record) {
  const html = generateReportHTML(record)
  const printWindow = window.open('', '_blank')
  if (!printWindow) { alert('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup và thử lại.'); return false }
  printWindow.opener = null
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Phiếu kiểm tra - ${escapeHTML(record.worker.name)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; padding: 20mm 15mm; }
        .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .report-logo { text-align: center; }
        .logo-placeholder { width: 60px; height: 60px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; margin: 0 auto; }
        .company-name { font-weight: bold; font-size: 10pt; margin-top: 4px; }
        .report-title-block { text-align: center; }
        .report-title-block h1 { font-size: 14pt; margin-bottom: 4px; }
        .report-num { font-size: 10pt; color: #333; }
        .section-title { font-size: 11pt; font-weight: bold; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .info-table td { padding: 4px 8px; font-size: 10pt; border: 1px solid #ddd; }
        .result-table th, .result-table td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; font-size: 10pt; }
        .result-table th { background: #f0f0f0; }
        .overall-box { text-align: center; border: 3px solid; border-radius: 8px; padding: 12px; margin: 16px auto; max-width: 300px; }
        .overall-label { font-size: 10pt; font-weight: bold; margin-bottom: 4px; }
        .overall-rank { font-size: 22pt; font-weight: bold; }
        .recommendation-box { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin-bottom: 16px; background: #fafafa; }
        .recommendation-box p { margin-top: 4px; }
        .detail-grid { display: flex; gap: 20px; }
        .detail-grid > div { flex: 1; }
        .detail-grid h3 { font-size: 10pt; margin-bottom: 4px; }
        .detail-table td { padding: 3px 8px; border: 1px solid #ddd; font-size: 10pt; }
        .avg-row td { background: #f0f0f0; }
        .criteria-table th, .criteria-table td { padding: 4px 8px; border: 1px solid #ccc; font-size: 9pt; text-align: center; }
        .criteria-table th { background: #f0f0f0; }
        .signature-block { display: flex; justify-content: space-around; margin-top: 30px; }
        .sig-col { text-align: center; width: 200px; }
        .sig-note { font-size: 9pt; color: #666; font-style: italic; }
        .sig-space { height: 60px; }
        @page { size: A4; margin: 20mm 15mm; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `)
  printWindow.document.close()
  Promise.all(Array.from(printWindow.document.images, image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve })))
    .then(() => printWindow.document.fonts?.ready)
    .then(() => { if (!printWindow.closed) printWindow.print() })
  return true
}
