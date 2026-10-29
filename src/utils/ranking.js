const RANK_SCORE = {
  'Xuất sắc': 5, 'Tốt': 4, 'Khá': 3,
  'Trung bình': 2, 'Kém': 1, 'Chậm': 1
}

export function rankSound(avgMs) {
  if (avgMs < 200) return { label: 'Xuất sắc', color: '#0F6E56' }
  if (avgMs < 280) return { label: 'Tốt', color: '#185FA5' }
  if (avgMs < 380) return { label: 'Trung bình', color: '#854F0B' }
  return { label: 'Chậm', color: '#A32D2D' }
}

export function rankVisual(avgMs) {
  if (avgMs < 250) return { label: 'Xuất sắc', color: '#0F6E56' }
  if (avgMs < 350) return { label: 'Tốt', color: '#185FA5' }
  if (avgMs < 450) return { label: 'Trung bình', color: '#854F0B' }
  return { label: 'Chậm', color: '#A32D2D' }
}

export function calcOverallRank(memoryRank, soundRank, visualRank) {
  const ranks = [memoryRank, soundRank, visualRank].filter(r => r && RANK_SCORE[r] !== undefined)
  if (ranks.length === 0) return { label: 'Kém', color: '#A32D2D' }
  const avg = ranks.reduce((sum, r) => sum + RANK_SCORE[r], 0) / ranks.length
  if (avg >= 4.5) return { label: 'Xuất sắc', color: '#0F6E56' }
  if (avg >= 3.5) return { label: 'Tốt', color: '#185FA5' }
  if (avg >= 2.5) return { label: 'Khá', color: '#854F0B' }
  if (avg >= 1.5) return { label: 'Trung bình', color: '#BA7517' }
  return { label: 'Kém', color: '#A32D2D' }
}

export function getRecommendation(overallLabel) {
  const map = {
    'Xuất sắc': 'Đủ điều kiện tất cả vị trí, kể cả vận hành máy móc nguy hiểm và làm việc trên cao.',
    'Tốt': 'Đủ điều kiện hầu hết vị trí. Có thể vận hành máy móc dưới sự giám sát.',
    'Khá': 'Phù hợp công việc thông thường. Hạn chế vị trí đòi hỏi phản xạ cực nhanh.',
    'Trung bình': 'Chỉ phù hợp công việc nhẹ, ít nguy hiểm. Tăng tần suất giám sát định kỳ.',
    'Kém': 'Không phù hợp vận hành máy móc, làm việc trên cao, tiếp xúc hóa chất nguy hiểm. Đề nghị khám chuyên khoa.',
  }
  return map[overallLabel] || ''
}
