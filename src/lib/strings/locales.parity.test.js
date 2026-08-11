import { describe, it, expect } from 'vitest'
import { en } from './en.js'
import { pt } from './pt.js'
import { es } from './es.js'
import { de } from './de.js'
import { fr } from './fr.js'
import { cs } from './cs.js'
import { af } from './af.js'
import { pirate } from './pirate.js'
import { HIDDEN_LANG_CODES } from '../langs.js'

const LOCALES = { pt, es, de, fr, cs, af, pirate }
const REFERENCE = Object.keys(en).sort()

const IN_TRANSLATION = new Set(HIDDEN_LANG_CODES)

const NOTES_EDITOR_KEYS = [
  'notesBold', 'notesItalic', 'notesStrike',
  'notesHeading1', 'notesHeading2', 'notesHeading3',
  'notesBulletList', 'notesOrderedList', 'notesTaskList',
  'notesQuote', 'notesInsertTable', 'notesCodeBlock', 'notesDivider',
  'notesAddLink', 'notesRemoveLink',
  'notesTextColor', 'notesColorReset',
  'notesTextSize', 'notesSizeNormal', 'notesSizeSmall', 'notesSizeLarge', 'notesSizeHuge',
  'notesUndo', 'notesRedo',
  'notesViewList', 'notesViewMosaic',
  'notesMathEnable', 'notesMathEnableDesc',
]

const POMODORO_KEYS = [
  'pomodoroMode', 'pomodoroModeDesc', 'pomodoroResetPeriod',
  'pomodoroResetDay', 'pomodoroResetWeek', 'pomodoroResetMonth', 'pomodoroResetSemester',
  'pomodoroTrackPeriodStats', 'pomodoroShowAbandoned', 'pomodoroShowPeriodPomodoros', 'pomodoroShowOverlay',
  'pomodoroStatsTitle', 'pomodoroTotal', 'pomodoroAbandoned', 'pomodoroFocusTime',
  'pomodoroPeriodTotal', 'pomodoroPeriodFocus', 'pomodoroVsSinceLast', 'pomodoroAllTime',
  'pomodoroTotalTimeLabel', 'pomodoroClose', 'pomodoroEraseStats',
  'pomodoroEraseStatsTitle', 'pomodoroEraseStatsDesc', 'pomodoroGraceCancel',
  'pomodoroStreakTitle', 'pomodoroCurrentStreak', 'pomodoroBestStreak',
  'pomodoroTrendTitle', 'pomodoroTrendNoData', 'pomodoroCopySummary', 'pomodoroCopiedSummary',
  'focusNotifTitle', 'focusNotifBreakBody', 'focusNotifFocusBody',
  'tasksNotifTitle', 'taskReminderTitle',
]

const EISENHOWER_KEYS = [
  'eisenhower', 'eisenhowerEnable', 'eisenhowerEnableDesc',
  'eisenhowerDoNow', 'eisenhowerSchedule', 'eisenhowerDelegate', 'eisenhowerEliminate',
  'eisenhowerUnsorted', 'eisenhowerUnsortedEmpty', 'eisenhowerEmpty',
  'eisenhowerAddTask', 'eisenhowerCustomize', 'eisenhowerResetDefaults',
  'eisenhowerCleanDone', 'eisenhowerCleanDoneTitle', 'eisenhowerCleanDoneDesc',
]

const GOALS_KEYS = [
  'goals', 'goalsEnable', 'goalsEnableDesc', 'goalsEmpty',
  'goalAdd', 'goalEdit', 'goalTitleLabel', 'goalTitlePlaceholder',
  'goalCadenceLabel', 'goalCadenceDesc',
  'goalCadenceDaily', 'goalCadence2Days', 'goalCadence3Days', 'goalCadenceWeekly', 'goalCadenceMonthly',
  'goalCadenceCustom', 'goalWeekdaysLabel', 'goalWeekdaysDesc', 'goalRestDay',
  'goalRequireNote', 'goalRequireNoteDesc', 'goalColor',
  'goalClickPrompt', 'goalDoneForNow', 'goalNotePrompt', 'goalNotePlaceholder',
  'goalSeeProgress', 'goalUndoToday', 'goalDelete', 'goalDeleteTitle', 'goalDeleteDesc',
  'goalCurrentStreak', 'goalBestStreak', 'goalTotalCheckIns', 'goalCompletionRate', 'goalNotesTitle',
  'goalToneLabel', 'goalToneDesc', 'goalTonePurpose', 'goalToneWarm', 'goalToneUpbeat',
  'goalToneGame', 'goalToneRandom', 'goalToneCustom', 'goalToneCustomPlaceholder',
  'goalTargetLabel', 'goalTargetDesc', 'goalTargetEndless', 'goalTargetCount', 'goalTargetDate',
  'goalTargetCountPlaceholder', 'goalTargetReached',
]

const GOAL_TONE_KEYS = ['purpose', 'warm', 'upbeat', 'game']
const GOAL_MILESTONE_KEYS = ['day1', 'early', 'week', 'month', 'daily', 'rescue']

const REMINDER_KEYS = [
  'defaultTabLabel', 'defaultTabDesc', 'defaultTabLast',
  'taskReminderOffsetsLabel', 'taskReminderOffsetsDesc',
  'taskReminderTimeLabel', 'taskReminderTimeDesc', 'taskReminderAddOffset',
]

function shapeOf(value) {
  if (typeof value === 'function') return 'function'
  if (Array.isArray(value)) return 'array'
  return 'value'
}

const QUICK_ACTION_WORD_KEYS = [
  'quickActionTaskWords', 'quickActionTaskWordsPlural',
  'quickActionEventWords', 'quickActionEventWordsPlural',
  'quickActionCardWords', 'quickActionCardWordsPlural',
  'quickActionBoardWords', 'quickActionAddWords', 'quickActionAndWords',
  'quickActionForWords', 'quickActionOnWords',
  'quickActionRespectivelyWords', 'quickActionOrdinalWords',
]

const MAY_BE_EMPTY = new Set(['quickActionArticleWords'])

describe('no locale defines an unexpected key', () => {
  Object.entries(LOCALES).forEach(([name, strings]) => {
    it(`${name} has no orphan keys`, () => {
      const orphans = Object.keys(strings).filter(key => !(key in en))
      expect(orphans).toEqual([])
    })
  })
})

describe('parser-facing quick action words are defined everywhere', () => {
  Object.entries({ en, ...LOCALES }).forEach(([name, strings]) => {
    it(`${name} defines every quick action word list`, () => {
      const broken = [...QUICK_ACTION_WORD_KEYS, ...MAY_BE_EMPTY].filter(key => {
        const value = strings[key]
        if (!Array.isArray(value)) return true
        return !MAY_BE_EMPTY.has(key) && value.length === 0
      })
      expect(broken).toEqual([])
    })
  })
})

describe('every locale keeps the English value shape', () => {
  Object.entries(LOCALES).forEach(([name, strings]) => {
    it(`${name} matches function and array keys`, () => {
      const mismatched = REFERENCE
        .filter(key => key in strings)
        .filter(key => shapeOf(en[key]) !== shapeOf(strings[key]))
      expect(mismatched).toEqual([])
    })
  })
})

describe('pomodoro and eisenhower strings are defined everywhere', () => {
  Object.entries(LOCALES)
    .filter(([name]) => !IN_TRANSLATION.has(name))
    .forEach(([name, strings]) => {
      it(`${name} defines every pomodoro and eisenhower key`, () => {
        const missing = [...POMODORO_KEYS, ...EISENHOWER_KEYS]
          .filter(key => typeof strings[key] !== 'string' || !strings[key].trim())
        expect(missing).toEqual([])
      })
    })
})

const SHARED_WITH_ENGLISH = new Set([
  'pomodoro', 'pomodoroInsightsPerDaySuffix', 'pomodoroStreakDaySuffix',
  'eisenhowerCustomize', 'eisenhowerAddTask', 'eisenhowerCleanDone',
  'eisenhowerCleanDoneTitle', 'eisenhowerCleanDoneDesc', 'eisenhowerEnable',
  'eisenhowerEnableDesc', 'eisenhowerDoNow', 'eisenhowerSchedule', 'eisenhowerDelegate',
  'eisenhowerEliminate', 'eisenhowerUnsorted', 'eisenhowerUnsortedEmpty', 'eisenhowerEmpty',
  'eisenhowerResetDefaults', 'taskReminderTitle',
  'goalColor', 'goalNotesTitle',
])

describe('pomodoro and eisenhower strings are actually translated', () => {
  Object.entries(LOCALES)
    .filter(([name]) => !IN_TRANSLATION.has(name))
    .forEach(([name, strings]) => {
      it(`${name} does not copy English verbatim`, () => {
        const copied = [...POMODORO_KEYS, ...EISENHOWER_KEYS]
          .filter(key => !SHARED_WITH_ENGLISH.has(key))
          .filter(key => typeof en[key] === 'string' && en[key] === strings[key])
        expect(copied).toEqual([])
      })
    })
})

describe('goals and reminder strings are defined everywhere', () => {
  Object.entries(LOCALES)
    .filter(([name]) => !IN_TRANSLATION.has(name))
    .forEach(([name, strings]) => {
      it(`${name} defines every goals and reminder key`, () => {
        const missing = [...GOALS_KEYS, ...REMINDER_KEYS]
          .filter(key => typeof strings[key] !== 'string' || !strings[key].trim())
        expect(missing).toEqual([])
      })
    })
})

describe('goals and reminder strings are actually translated', () => {
  Object.entries(LOCALES)
    .filter(([name]) => !IN_TRANSLATION.has(name))
    .filter(([name]) => name !== 'pirate')
    .forEach(([name, strings]) => {
      it(`${name} does not copy English verbatim`, () => {
        const copied = [...GOALS_KEYS, ...REMINDER_KEYS]
          .filter(key => !SHARED_WITH_ENGLISH.has(key))
          .filter(key => typeof en[key] === 'string' && en[key] === strings[key])
        expect(copied).toEqual([])
      })
    })
})

describe('goal encouragement messages are complete everywhere', () => {
  Object.entries({ en, ...LOCALES }).forEach(([name, strings]) => {
    it(`${name} defines every tone and milestone`, () => {
      const missing = []
      for (const tone of GOAL_TONE_KEYS) {
        const set = strings.goalMessages?.[tone]
        if (!set) { missing.push(tone); continue }
        for (const milestone of GOAL_MILESTONE_KEYS) {
          if (typeof set[milestone] !== 'string' || !set[milestone].trim()) {
            missing.push(`${tone}.${milestone}`)
          }
        }
      }
      expect(missing).toEqual([])
    })
  })
})

describe('notes editor strings are translated everywhere', () => {
  Object.entries(LOCALES)
    .filter(([name]) => !IN_TRANSLATION.has(name))
    .forEach(([name, strings]) => {
      it(`${name} defines every notes editor key`, () => {
        const missing = NOTES_EDITOR_KEYS.filter(key => typeof strings[key] !== 'string' || !strings[key].trim())
        expect(missing).toEqual([])
      })
    })
})
