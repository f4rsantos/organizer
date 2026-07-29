export const en = {
  numbers: {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  },
  ordinals: {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7, '8th': 8, '9th': 9, '10th': 10
  },
  modifiers: {
    next: 'next',
    this: 'this',
    last: 'last',
    coming: 'next',
    following: 'next'
  },
  weekdays: {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
  },
  months: {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  },
  weekWords: ['week'],
  weekOfWords: ['week of'],
  relativeDates: {
    today: 0,
    tomorrow: 1,
    'day after tomorrow': 2,
    yesterday: -1
  },
  durations: {
    hour: 'hour', hours: 'hour', hr: 'hour', hrs: 'hour', h: 'hour',
    minute: 'minute', minutes: 'minute', min: 'minute', mins: 'minute', m: 'minute'
  },
  recurrences: {
    every: 'every',
    daily: { freq: 'daily', interval: 1 },
    weekly: { freq: 'weekly', interval: 1 },
    monthly: { freq: 'monthly', interval: 1 },
    yearly: { freq: 'yearly', interval: 1 },
    day: { freq: 'daily' }, days: { freq: 'daily' },
    week: { freq: 'weekly' }, weeks: { freq: 'weekly' },
    month: { freq: 'monthly' }, months: { freq: 'monthly' },
    year: { freq: 'yearly' }, years: { freq: 'yearly' },
  },
  time: {
    am: 'am',
    pm: 'pm',
    'half past': 30,
    'quarter past': 15,
    'quarter to': -15
  },
  atWords: ['at'],
  timeConnectors: ['and', 'h'],
  navVerbs: ['open', 'show', 'go to', 'view', 'navigate to'],
  focusWords: {
    start: ['start', 'begin', 'resume'],
    resume: ['resume'],
    stop: ['stop', 'pause', 'end'],
    reset: ['reset', 'restart'],
    skip: ['skip'],
    break: ['break'],
    focus: ['focus', 'timer', 'study', 'pomodoro'],
    minuteUnits: ['m', 'min', 'mins', 'minute', 'minutes'],
    hourUnits: ['h', 'hr', 'hrs', 'hour', 'hours'],
  },
  priorityWords: {
    1: ['high priority'],
    2: ['medium priority'],
    3: ['low priority'],
  },
  mutationVerbs: {
    'mark as done': { type: 'mut', action: 'complete' },
    'mark done': { type: 'mut', action: 'complete' },
    mark: { type: 'mut', action: 'complete' },
    complete: { type: 'mut', action: 'complete' },
    finish: { type: 'mut', action: 'complete' },
    delete: { type: 'mut', action: 'delete' },
    remove: { type: 'mut', action: 'delete' },
    move: { type: 'mut', action: 'move' },
    'move to': { type: 'mut', action: 'move' },
    share: { type: 'mut', action: 'share' },
    'share with': { type: 'mut', action: 'share' },
  },
  prepositions: {
    with: ['with'],
    for: ['for'],
    on: ['on'],
    in: ['in'],
    to: ['to'],
  },
  sharedWords: ['shared'],
  teamWords: ['team'],
  gradeWords: {
    grade: ['grade', 'set'],
    addComponent: ['add component', 'add grade component', 'new component'],
    weight: ['weight', 'worth'],
    forWords: ['for', 'in', 'to', 'on'],
  },
  noteWords: {
    note: ['note'],
    folder: ['folder'],
    addWords: ['add', 'new', 'create'],
  },
}
