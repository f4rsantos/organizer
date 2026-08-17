export const de = {
  // 21-99 are single inverted compounds ("einundzwanzig" = 21); resolved
  // structurally by compoundNumbers.js rather than listed exhaustively.
  compoundJoiners: ['und'],
  numbers: {
    null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, funf: 5, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
    elf: 11, zwolf: 12, zwölf: 12, dreizehn: 13, vierzehn: 14, funfzehn: 15, fünfzehn: 15,
    sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
    zwanzig: 20, dreissig: 30, dreißig: 30, vierzig: 40, funfzig: 50, fünfzig: 50,
    sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90
  },
  ordinals: {
    erste: 1, erster: 1, erstes: 1, zweite: 2, zweiter: 2, dritte: 3, dritter: 3,
    vierte: 4, vierter: 4, funfte: 5, fünfte: 5, sechste: 6, siebte: 7, achte: 8, neunte: 9, zehnte: 10,
    '1.': 1, '2.': 2, '3.': 3, '4.': 4, '5.': 5, '6.': 6, '7.': 7, '8.': 8, '9.': 9, '10.': 10
  },
  modifiers: {
    nächster: 'next', nächste: 'next', nächstes: 'next',
    dieser: 'this', diese: 'this', dieses: 'this',
    letzter: 'last', letzte: 'last', letztes: 'last'
  },
  weekdays: {
    sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6
  },
  months: {
    januar: 0, februar: 1, marz: 2, märz: 2, april: 3, mai: 4, juni: 5,
    juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11
  },
  atWords: ['um', 'gegen'],
  timeConnectors: ['und', 'uhr', 'stunde', 'stunden'],
  weekWords: ['woche'],
  weekOfWords: ['woche vom', 'woche von'],
  focusWords: {
    start: ['starten', 'beginnen', 'fortsetzen'],
    resume: ['fortsetzen'],
    stop: ['stoppen', 'pausieren', 'beenden'],
    reset: ['zurucksetzen', 'zurücksetzen', 'neustarten'],
    skip: ['uberspringen', 'überspringen'],
    break: ['pause'],
    focus: ['fokus', 'timer', 'lernen', 'pomodoro'],
    minuteUnits: ['m', 'min', 'minute', 'minuten'],
    hourUnits: ['h', 'stunde', 'stunden'],
  },
  relativeDates: {
    heute: 0, morgen: 1, übermorgen: 2, gestern: -1
  },
  durations: {
    stunde: 'hour', stunden: 'hour', h: 'hour',
    minute: 'minute', minuten: 'minute', min: 'minute', m: 'minute'
  },
  recurrences: {
    jeden: 'every', jede: 'every', jedes: 'every',
    täglich: { freq: 'daily', interval: 1 },
    wöchentlich: { freq: 'weekly', interval: 1 },
    monatlich: { freq: 'monthly', interval: 1 },
    jährlich: { freq: 'yearly', interval: 1 },
    tag: { freq: 'daily' }, tage: { freq: 'daily' },
    woche: { freq: 'weekly' }, wochen: { freq: 'weekly' },
    monat: { freq: 'monthly' }, monate: { freq: 'monthly' },
    jahr: { freq: 'yearly' }, jahre: { freq: 'yearly' },
  },
  time: { am: 'am', pm: 'pm', halb: -30, viertel: 15, 'viertel vor': -15, 'viertel nach': 15, 'dreiviertel': -15 },
  quickActionForWords: ['für'],
  navVerbs: ['öffnen', 'gehe zu', 'zeigen', 'ansehen'],
  priorityWords: {
    1: ['hohe priorität', 'hohe prioritat'],
    2: ['mittlere priorität', 'mittlere prioritat'],
    3: ['niedrige priorität', 'niedrige prioritat'],
  },
  mutationVerbs: {
    'als erledigt markieren': { type: 'mut', action: 'complete' },
    erledigen: { type: 'mut', action: 'complete' },
    erledige: { type: 'mut', action: 'complete' },
    abschliessen: { type: 'mut', action: 'complete' },
    abschließen: { type: 'mut', action: 'complete' },
    löschen: { type: 'mut', action: 'delete' },
    loschen: { type: 'mut', action: 'delete' },
    lösche: { type: 'mut', action: 'delete' },
    losche: { type: 'mut', action: 'delete' },
    entfernen: { type: 'mut', action: 'delete' },
    entferne: { type: 'mut', action: 'delete' },
    verschieben: { type: 'mut', action: 'move' },
    verschiebe: { type: 'mut', action: 'move' },
    teilen: { type: 'mut', action: 'share' },
    teile: { type: 'mut', action: 'share' },
    rückgängig: { type: 'mut', action: 'undo' },
    rueckgaengig: { type: 'mut', action: 'undo' },
    widerrufen: { type: 'mut', action: 'undo' },
    widerrufe: { type: 'mut', action: 'undo' },
  },
  prepositions: {
    with: ['mit'],
    for: ['für', 'fur'],
    on: ['auf', 'an'],
    in: ['in', 'im'],
    to: ['zu', 'nach'],
  },
  sharedWords: ['geteilt'],
  teamWords: ['team'],
  gradeWords: {
    grade: ['note', 'noten', 'bewertung', 'setze', 'setzen', 'eintragen', 'trage ein'],
    addComponent: ['komponente hinzufügen', 'komponente hinzufuegen', 'neue komponente', 'komponente erstellen'],
    weight: ['gewicht', 'gewichtung', 'wert', 'zählt', 'zaehlt'],
    forWords: ['für', 'fuer', 'in', 'im', 'zu', 'auf', 'an', 'bei'],
  },
  noteWords: {
    note: ['notiz', 'notizen'],
    folder: ['ordner', 'verzeichnis'],
    addWords: ['hinzufügen', 'hinzufuegen', 'füge', 'fuege', 'erstelle', 'erstellen', 'neue', 'neuer', 'neues'],
  },
  habitWords: {
    habit: ['gewohnheit', 'gewohnheiten', 'ziel', 'ziele'],
    note: ['mit der notiz', 'mit notiz', 'notiz'],
  },
}
