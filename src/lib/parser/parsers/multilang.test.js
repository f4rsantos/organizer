import { describe, it, expect } from 'vitest'
import { parseTaskText } from '../nlpParse.js'
import { parseQuickAction } from '../quickActionParse.js'
import { getLocalePack } from '../locales/index.js'
import { parseFocusCommand } from './FocusParser.js'
import { parseGradeCommand } from './GradeParser.js'
import { parseNoteCommand } from './NoteParser.js'
import { STRINGS } from '../../strings/index.js'

const NOW = new Date(2026, 6, 15)
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'cs']

function parse(text, lang) {
  return parseTaskText(text, { lang, now: NOW })
}

const GRADE_CLASSES = [{ id: 'c1', name: 'calculus' }]

function runQuick(raw, lang, overrides = {}) {
  return parseQuickAction(raw, {
    now: NOW,
    lang,
    t: STRINGS[lang] ?? STRINGS.en,
    classes: GRADE_CLASSES,
    columns: [],
    teams: {},
    apps: { notes: true },
    ...overrides,
  })
}

const RELATIVE = {
  en: { today: 'today', tomorrow: 'tomorrow' },
  pt: { today: 'hoje', tomorrow: 'amanhã' },
  es: { today: 'hoy', tomorrow: 'mañana' },
  fr: { today: "aujourd'hui", tomorrow: 'demain' },
  de: { today: 'heute', tomorrow: 'morgen' },
  cs: { today: 'dnes', tomorrow: 'zítra' },
}

describe.each(LANGS)('relative dates (%s)', lang => {
  it('resolves today and tomorrow', () => {
    expect(parse(RELATIVE[lang].today, lang).date).toBe('2026-07-15')
    expect(parse(RELATIVE[lang].tomorrow, lang).date).toBe('2026-07-16')
  })
})

const WEEKDAY_MONDAY = {
  en: 'monday', pt: 'segunda', es: 'lunes', fr: 'lundi', de: 'montag', cs: 'pondělí',
}

describe.each(LANGS)('weekdays (%s)', lang => {
  it('resolves the next Monday', () => {
    expect(parse(WEEKDAY_MONDAY[lang], lang).date).toBe('2026-07-20')
  })
})

const SLASH_DATE = '18/07'

describe.each(LANGS)('slash dates (%s)', lang => {
  it('parses a slash date', () => {
    expect(parse(SLASH_DATE, lang).date).toBe('2026-07-18')
  })

  it('rejects an impossible slash date', () => {
    expect(parse('31/02', lang).date).toBeNull()
  })
})

const DURATIONS = {
  en: '2 hours', pt: '2 horas', es: '2 horas', fr: '2 heures', de: '2 stunden', cs: '2 hodiny',
}

describe.each(LANGS)('durations (%s)', lang => {
  it('reads two hours as 120 minutes', () => {
    expect(parse(DURATIONS[lang], lang).duration).toBe(120)
  })
})

const EVERY_MONDAY = {
  en: 'every monday',
  pt: 'todas segunda',
  es: 'cada lunes',
  fr: 'chaque lundi',
  de: 'jeden montag',
  cs: 'každé pondělí',
}

describe.each(LANGS)('recurrence (%s)', lang => {
  it('parses "every monday"', () => {
    expect(parse(EVERY_MONDAY[lang], lang).recurrence).toEqual({
      freq: 'weekly', interval: 1, weekday: 1,
    })
  })
})

const HIGH_PRIORITY = {
  en: 'high priority',
  pt: 'prioridade alta',
  es: 'prioridad alta',
  fr: 'priorité haute',
  de: 'hohe priorität',
  cs: 'vysoká priorita',
}

describe.each(LANGS)('priority (%s)', lang => {
  it('parses a high-priority phrase', () => {
    expect(parse(HIGH_PRIORITY[lang], lang).priority).toBe(1)
  })

  it('still parses the language-neutral pN form', () => {
    expect(parse('p2', lang).priority).toBe(2)
  })

  it('still parses the English phrase as a fallback', () => {
    expect(parse('high priority', lang).priority).toBe(1)
  })
})

const WEEK_NUMBER = {
  en: 'week 12', pt: 'semana 12', es: 'semana 12', fr: 'semaine 12', de: 'woche 12', cs: 'týden 12',
}

describe.each(LANGS)('week numbers (%s)', lang => {
  it('parses a week number', () => {
    expect(parse(WEEK_NUMBER[lang], lang).week).toBe(12)
  })
})

const TIMES = {
  en: 'at 15h', pt: 'às 15h', es: 'a las 15h', fr: 'à 15h', de: 'um 15h', cs: 'v 15h',
}

describe.each(LANGS)('times (%s)', lang => {
  it('parses an hour behind the locale "at" word', () => {
    expect(parse(TIMES[lang], lang).startTime).toBe('15:00')
  })

  it('leaves no "at" word behind in the title', () => {
    expect(parse(TIMES[lang], lang).title).toBe('')
  })
})

const DELETE_VERB = {
  en: 'delete', pt: 'apagar', es: 'eliminar', fr: 'supprimer', de: 'löschen', cs: 'smaž',
}

describe.each(LANGS)('mutation verbs (%s)', lang => {
  it('recognises a delete verb', () => {
    const r = parse(`${DELETE_VERB[lang]} groceries`, lang)
    expect(r.action?.action).toBe('delete')
  })

  it('routes a delete-led phrase to a mutation, never a new task', () => {
    const [item] = parseQuickAction(`${DELETE_VERB[lang]} groceries`, {
      now: NOW, lang, t: {}, classes: [], columns: [], teams: {},
    })
    expect(item.kind).toBe('mutation')
    expect(item.action).toBe('delete')
  })
})

const GOAL_COMPLETE = {
  en: 'complete goal gym', pt: 'conclui objetivo gym', es: 'completar objetivo gym',
  fr: 'terminer objectif gym', de: 'erledige ziel gym', cs: 'dokonči cíl gym',
}

const GOAL_UNDO = {
  en: 'undo goal gym', pt: 'desfazer objetivo gym', es: 'deshacer objetivo gym',
  fr: 'annuler objectif gym', de: 'rückgängig ziel gym', cs: 'vrátit cíl gym',
}

describe.each(LANGS)('goal mutations (%s)', lang => {
  const opts = { now: NOW, lang, t: {}, classes: [], columns: [], teams: {}, apps: { goals: true } }

  it('completes a goal and flags it as goal-scoped', () => {
    const [item] = parseQuickAction(GOAL_COMPLETE[lang], opts)
    expect(item.kind).toBe('mutation')
    expect(item.action).toBe('complete')
    expect(item.goalScoped).toBe(true)
    expect(item.query).toBe('gym')
  })

  it('undoes a goal check-in', () => {
    const [item] = parseQuickAction(GOAL_UNDO[lang], opts)
    expect(item.kind).toBe('mutation')
    expect(item.action).toBe('undo')
    expect(item.goalScoped).toBe(true)
    expect(item.query).toBe('gym')
  })
})

const TEAM_SHARE = {
  en: 'share with study group',
  pt: 'partilhar com study group',
  es: 'compartir con study group',
  fr: 'partager avec study group',
  de: 'teilen mit study group',
  cs: 'sdílej s study group',
}

describe.each(LANGS)('team prepositions (%s)', lang => {
  it('attaches a team behind the locale "with" word', () => {
    const r = parseTaskText(TEAM_SHARE[lang], {
      lang, now: NOW, teams: { t1: { name: 'study group' } },
    })
    expect(r.teamId).toBe('t1')
  })
})

const COLUMN_PHRASE = {
  en: 'card on doing',
  pt: 'card no doing',
  es: 'card en doing',
  fr: 'card sur doing',
  de: 'card auf doing',
  cs: 'card na doing',
}

describe.each(LANGS)('column prepositions (%s)', lang => {
  it('attaches a column behind the locale preposition', () => {
    const r = parseTaskText(COLUMN_PHRASE[lang], {
      lang, now: NOW, columns: [{ id: 'col1', title: 'doing' }],
    })
    expect(r.columnId).toBe('col1')
  })

  it('does not attach a bare column name', () => {
    const r = parseTaskText('doing', {
      lang, now: NOW, columns: [{ id: 'col1', title: 'doing' }],
    })
    expect(r.columnId).toBeNull()
  })
})

describe('spelled-out clock offsets', () => {
  it('reads German "halb <n>" as half an hour before n', () => {
    expect(parse('halb 4', 'de').startTime).toBe('03:30')
    expect(parse('halb 1', 'de').startTime).toBe('00:30')
  })

  it('reads Czech "půl <n>" as half an hour before n', () => {
    expect(parse('půl 4', 'cs').startTime).toBe('03:30')
    expect(parse('pul 4', 'cs').startTime).toBe('03:30')
  })

  it('reads the German quarter forms', () => {
    expect(parse('viertel nach 3', 'de').startTime).toBe('03:15')
    expect(parse('viertel vor 4', 'de').startTime).toBe('03:45')
    expect(parse('dreiviertel 4', 'de').startTime).toBe('03:45')
  })

  it('reads the Czech "na" quarter forms as counting toward the hour', () => {
    expect(parse('čtvrt na 4', 'cs').startTime).toBe('03:15')
    expect(parse('tři čtvrtě na 4', 'cs').startTime).toBe('03:45')
  })

  it('applies a trailing pm after the borrow', () => {
    expect(parse('halb 4 pm', 'de').startTime).toBe('15:30')
  })

  it('reads the romance "e meia" forms as half past', () => {
    expect(parse('3 e meia', 'pt').startTime).toBe('03:30')
    expect(parse('y media 3 de la tarde', 'es').startTime).toBe('15:30')
  })
})

describe('known collisions', () => {
  it('reads pt "segunda" as a weekday, not the ordinal two', () => {
    expect(parse('segunda', 'pt').date).toBe('2026-07-20')
  })

  it('reads pt "dia 20/07" as a date, not a daily recurrence', () => {
    const r = parse('dia 20/07', 'pt')
    expect(r.date).toBe('2026-07-20')
    expect(r.recurrence).toBeNull()
  })

  it('reads es "segunda semana de agosto" as a week anchor', () => {
    expect(parse('segunda semana de agosto', 'es').date).toBe('2026-08-10')
  })

  it('keeps fr "pause" working as both a stop and a break word', () => {
    const stop = parseQuickAction('pause focus', {
      now: NOW, lang: 'fr', t: {}, classes: [], columns: [], teams: {},
    })
    expect(stop[0].kind).toBe('focus')
    expect(stop[0].action).toBe('pause')
  })
})

describe('af locale', () => {
  it('parses its own vocabulary', () => {
    expect(parse('more', 'af').date).toBe('2026-07-16')
    expect(parse('hoog', 'af').priority).toBe(1)
  })

  it('accepts the accented spelling of tomorrow', () => {
    expect(parse('môre', 'af').date).toBe('2026-07-16')
  })

  it('accepts English too, via the shared fallback', () => {
    expect(parse('tomorrow', 'af').date).toBe('2026-07-16')
    expect(parse('high priority', 'af').priority).toBe(1)
  })
})

describe('inverted compound numbers', () => {
  it('reads an af compound as a duration', () => {
    expect(parse('vergadering vyfenveertig minute', 'af').duration).toBe(45)
  })

  it('reads the hyphenated af spelling', () => {
    expect(parse('vergadering vyf-en-veertig minute', 'af').duration).toBe(45)
  })

  it('reads the spaced af spelling', () => {
    expect(parse('vergadering vyf en veertig minute', 'af').duration).toBe(45)
  })

  it('still reads a plain af number', () => {
    expect(parse('vergadering twintig minute', 'af').duration).toBe(20)
  })

  it('reads an af compound above ninety', () => {
    expect(parse('vergadering negeennegentig minute', 'af').duration).toBe(99)
  })

  it('reads a de compound as a duration', () => {
    expect(parse('besprechung einundzwanzig minuten', 'de').duration).toBe(21)
  })

  it('still reads a plain de number', () => {
    expect(parse('besprechung zwolf minuten', 'de').duration).toBe(12)
  })
})

describe('locale fallback', () => {
  it('parses English input under a non-English locale', () => {
    expect(parse('tomorrow', 'pt').date).toBe('2026-07-16')
    expect(parse('high priority', 'de').priority).toBe(1)
    expect(parse('delete groceries', 'fr').action?.action).toBe('delete')
  })

  it('falls back to the English pack for an unknown language', () => {
    expect(getLocalePack('zz')).toBe(getLocalePack('en'))
    expect(parse('tomorrow', 'zz').date).toBe('2026-07-16')
  })
})

describe('accented locale keywords match', () => {
  it('reads the accented cs skip and break words', () => {
    expect(parseFocusCommand('přeskoč přestávka', getLocalePack('cs')))
      .toEqual({ action: 'skipBreak' })
  })

  it('still reads the unaccented cs aliases', () => {
    expect(parseFocusCommand('preskoc prestavka', getLocalePack('cs')))
      .toEqual({ action: 'skipBreak' })
  })

  it('reads the accented de skip word', () => {
    expect(parseFocusCommand('überspringen pause', getLocalePack('de')))
      .toEqual({ action: 'skipBreak' })
  })

  it('reads an accented cs focus word', () => {
    expect(parseFocusCommand('resetuj časovač', getLocalePack('cs'))?.action)
      .toBe('reset')
  })
})

describe.each(LANGS)('english fallback in the object-merge parsers (%s)', lang => {
  it('parses an English focus command', () => {
    expect(parseFocusCommand('start focus', getLocalePack(lang)))
      .toMatchObject({ action: 'start' })
  })

  it('parses an English grade command', () => {
    expect(parseGradeCommand('grade 15 in midterm for calculus', GRADE_CLASSES, getLocalePack(lang)))
      .toMatchObject({ type: 'setGrade', classId: 'c1', grade: 15 })
  })

  it('parses an English note command', () => {
    expect(parseNoteCommand('add note ideas', getLocalePack(lang)))
      .toMatchObject({ type: 'addNote' })
  })
})

describe('grade commands', () => {
  const GRADE_SET = {
    en: 'grade 15 in midterm for calculus',
    pt: 'nota 15 em midterm para calculus',
    es: 'nota 15 en midterm para calculus',
    fr: 'note 15 dans midterm pour calculus',
    de: 'note 15 in midterm für calculus',
    cs: 'známka 15 v midterm pro calculus',
  }

  it.each(LANGS)('sets a grade (%s)', lang => {
    expect(parseGradeCommand(GRADE_SET[lang], GRADE_CLASSES, getLocalePack(lang)))
      .toMatchObject({ type: 'setGrade', classId: 'c1', componentName: 'midterm', grade: 15 })
  })

  const ADD_COMPONENT = {
    en: 'add component final to calculus weight 30%',
    pt: 'adicionar componente final para calculus peso 30%',
    es: 'agregar componente final para calculus peso 30%',
    fr: 'ajouter composant final pour calculus poids 30%',
    de: 'komponente hinzufügen final für calculus gewicht 30%',
    cs: 'přidej komponentu final pro calculus váha 30%',
  }

  it.each(LANGS)('adds a weighted component (%s)', lang => {
    expect(parseGradeCommand(ADD_COMPONENT[lang], GRADE_CLASSES, getLocalePack(lang)))
      .toMatchObject({ type: 'addComponent', classId: 'c1', componentName: 'final', weight: 0.3 })
  })
})

describe('note commands', () => {
  const NOTE_ADD = {
    en: 'add note ideas',
    pt: 'adicionar nota ideas',
    es: 'agregar nota ideas',
    fr: 'ajouter note ideas',
    de: 'notiz hinzufügen ideas',
    cs: 'přidej poznámku ideas',
  }

  it.each(LANGS)('adds a note (%s)', lang => {
    expect(parseNoteCommand(NOTE_ADD[lang], getLocalePack(lang)))
      .toEqual({ type: 'addNote', title: 'ideas' })
  })

  const FOLDER_ADD = {
    en: 'new folder uni',
    pt: 'nova pasta uni',
    es: 'nueva carpeta uni',
    fr: 'nouveau dossier uni',
    de: 'neuer ordner uni',
    cs: 'nová složka uni',
  }

  it.each(LANGS)('adds a folder (%s)', lang => {
    expect(parseNoteCommand(FOLDER_ADD[lang], getLocalePack(lang)))
      .toEqual({ type: 'addFolder', name: 'uni' })
  })
})

describe('note and grade word collisions', () => {
  it.each([
    ['pt', 'nota 15 em midterm para calculus'],
    ['es', 'nota 15 en midterm para calculus'],
    ['fr', 'note 15 dans midterm pour calculus'],
    ['de', 'note 15 in midterm für calculus'],
  ])('reads a bare grade phrase as a grade, not a note (%s)', (lang, phrase) => {
    const locale = getLocalePack(lang)
    expect(parseNoteCommand(phrase, locale)).toBeNull()
    expect(parseGradeCommand(phrase, GRADE_CLASSES, locale)?.type).toBe('setGrade')
  })

  it.each([
    ['pt', 'adicionar nota ideas'],
    ['es', 'agregar nota ideas'],
    ['fr', 'ajouter note ideas'],
  ])('reads an add-led phrase as a note, not a grade (%s)', (lang, phrase) => {
    const locale = getLocalePack(lang)
    expect(parseNoteCommand(phrase, locale)?.type).toBe('addNote')
    expect(runQuick(phrase, lang)[0].kind).toBe('noteAction')
  })
})

describe('locale time connectors', () => {
  const CONNECTOR = {
    en: 'at 15 and 30',
    pt: 'às 15 e 30',
    es: 'a las 15 y 30',
    fr: 'à 15 et 30',
    de: 'um 15 und 30',
    cs: 'v 15 a 30',
  }

  it.each(LANGS)('reads an hour-connector-minute phrase (%s)', lang => {
    expect(parse(CONNECTOR[lang], lang).startTime).toBe('15:30')
  })

  it.each(LANGS)('leaves no connector behind in the title (%s)', lang => {
    expect(parse(CONNECTOR[lang], lang).title).toBe('')
  })
})

describe('navigation verbs come from the locale pack', () => {
  const NAV_SETTINGS = {
    en: 'open settings',
    pt: 'abrir definições',
    es: 'abrir ajustes',
    fr: 'ouvrir réglages',
    de: 'öffnen einstellungen',
    cs: 'otevřít nastavení',
  }

  it.each(LANGS)('navigates to settings (%s)', lang => {
    expect(runQuick(NAV_SETTINGS[lang], lang)[0])
      .toMatchObject({ kind: 'navigation', target: 'settings' })
  })

  it('still accepts an English verb under a non-English locale', () => {
    expect(runQuick('open definições', 'pt')[0])
      .toMatchObject({ kind: 'navigation', target: 'settings' })
  })
})
