export function shapeKey(t) {
  return String(t.id)
}

export function generateTargets(count = 6) {
  const allIds = Array.from({ length: 18 }, (_, i) => i)
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  return allIds.slice(0, count).map(id => ({ id, key: String(id), isTarget: true }))
}

export function generateAllShapes(targets, distractorCount = 12) {
  const targetIds = new Set(targets.map(t => t.id))
  // The full pool is 18 items. If targets=6 and distractors=12, the pool matches exactly.
  const distractorIds = Array.from({ length: 18 }, (_, i) => i)
    .filter(id => !targetIds.has(id))
    .slice(0, distractorCount)

  const distractors = distractorIds.map(id => ({ id, key: String(id), isTarget: false }))
  const all = [...targets.map(t => ({ ...t, isTarget: true })), ...distractors]
  
  // Shuffle Fisher-Yates
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

export function scoreMemory(selected, targets) {
  const targetKeys = new Set(targets.map(t => shapeKey(t)))
  let correct = 0
  selected.forEach(s => {
    if (targetKeys.has(shapeKey(s))) correct++
  })
  return correct
}

export function rankMemory(score) {
  if (score >= 6) return { label: 'Xuất sắc', color: '#0F6E56' }
  if (score >= 4) return { label: 'Khá', color: '#854F0B' }
  if (score >= 2) return { label: 'Trung bình', color: '#BA7517' }
  return { label: 'Kém', color: '#A32D2D' }
}
