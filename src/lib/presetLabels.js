const YEAR_LABEL = {
  en: { '1a': '1st Year', '2a': '2nd Year', '3a': '3rd Year', s: 'General', summer: 'Summer' },
  pt: { '1a': '1º Ano',   '2a': '2º Ano',   '3a': '3º Ano',   s: 'Geral',   summer: 'Verão' },
}

const SEM_LABEL = {
  en: { '1s': '1st Sem', '2s': '2nd Sem', s1: '1st Sem', s2: '2nd Sem' },
  pt: { '1s': '1º Sem',  '2s': '2º Sem',  s1: '1º Sem',  s2: '2º Sem'  },
}

function yearKey(key) {
  if (key === 'summer') return 'summer'
  return key === 's1' || key === 's2' ? 's' : key.slice(0, 2)
}

function semKey(key) {
  if (key === 'summer') return 'summer'
  return key === 's1' || key === 's2' ? key : key.slice(2)
}

export function presetYearLabel(key, lang) {
  return (YEAR_LABEL[lang] ?? YEAR_LABEL.en)[yearKey(key)]
}

export function presetSemLabel(key, lang) {
  return (SEM_LABEL[lang] ?? SEM_LABEL.en)[semKey(key)]
}

export function presetFullLabel(key, lang) {
  return [presetYearLabel(key, lang), presetSemLabel(key, lang)].filter(Boolean).join(' · ')
}
