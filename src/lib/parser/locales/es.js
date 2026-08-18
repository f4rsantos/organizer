export const es = {
  numbers: {
    cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90
  },
  ordinals: {
    primero: 1, primera: 1, segundo: 2, segunda: 2, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, septimo: 7, septima: 7, octavo: 8, octava: 8, noveno: 9, novena: 9, decimo: 10, decima: 10,
    '1º': 1, '2º': 2, '3º': 3, '4º': 4, '5º': 5, '6º': 6, '7º': 7, '8º': 8, '9º': 9, '10º': 10
  },
  modifiers: {
    proxima: 'next', proximo: 'next', próxima: 'next', próximo: 'next',
    esta: 'this', este: 'this',
    pasada: 'last', pasado: 'last', ultima: 'last', ultimo: 'last', última: 'last', último: 'last',
  },
  weekdays: {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6
  },
  months: {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  },
  atWords: ['a', 'las', 'la', 'sobre'],
  timeConnectors: ['y', 'hora', 'horas'],
  weekWords: ['semana'],
  weekOfWords: ['semana de'],
  focusWords: {
    start: ['iniciar', 'empezar', 'empieza', 'comenzar', 'comienza', 'reanudar'],
    resume: ['reanudar'],
    stop: ['detener', 'parar', 'pausar', 'terminar'],
    reset: ['reiniciar', 'resetear'],
    skip: ['saltar', 'omitir'],
    break: ['descanso', 'pausa'],
    focus: ['enfoque', 'temporizador', 'estudio', 'pomodoro'],
    minuteUnits: ['m', 'min', 'mins', 'minuto', 'minutos'],
    hourUnits: ['h', 'hora', 'horas'],
  },
  relativeDates: {
    hoy: 0,
    mañana: 1, manana: 1,
    'pasado mañana': 2, 'pasado manana': 2,
    ayer: -1
  },
  navVerbs: ['abrir', 'ir a', 'mostrar', 'ver', 'navegar a'],
  durations: {
    hora: 'hour', horas: 'hour', h: 'hour',
    minuto: 'minute', minutos: 'minute', min: 'minute', m: 'minute'
  },
  recurrences: {
    cada: 'every', todos: 'every', todas: 'every',
    diariamente: { freq: 'daily', interval: 1 },
    diario: { freq: 'daily', interval: 1 },
    semanalmente: { freq: 'weekly', interval: 1 },
    mensualmente: { freq: 'monthly', interval: 1 },
    anualmente: { freq: 'yearly', interval: 1 },
    dia: { freq: 'daily' }, dias: { freq: 'daily' },
    semana: { freq: 'weekly' }, semanas: { freq: 'weekly' },
    mes: { freq: 'monthly' }, meses: { freq: 'monthly' },
    año: { freq: 'yearly' }, años: { freq: 'yearly' },
  },
  time: {
    am: 'am',
    pm: 'pm',
    media: 30,
    'y media': 30,
    cuarto: 15,
    'y cuarto': 15,
    'menos cuarto': -15,
    'de la manana': 'am',
    'de la mañana': 'am',
    'de la tarde': 'pm',
    'de la noche': 'pm',
    'en punto': 0
  },
  priorityWords: {
    1: ['prioridad alta', 'alta prioridad'],
    2: ['prioridad media', 'media prioridad'],
    3: ['prioridad baja', 'baja prioridad'],
  },
  mutationVerbs: {
    'marcar como hecho': { type: 'mut', action: 'complete' },
    completar: { type: 'mut', action: 'complete' },
    completa: { type: 'mut', action: 'complete' },
    terminar: { type: 'mut', action: 'complete' },
    termina: { type: 'mut', action: 'complete' },
    eliminar: { type: 'mut', action: 'delete' },
    elimina: { type: 'mut', action: 'delete' },
    borrar: { type: 'mut', action: 'delete' },
    borra: { type: 'mut', action: 'delete' },
    quitar: { type: 'mut', action: 'delete' },
    mover: { type: 'mut', action: 'move' },
    mueve: { type: 'mut', action: 'move' },
    compartir: { type: 'mut', action: 'share' },
    comparte: { type: 'mut', action: 'share' },
    asignar: { type: 'mut', action: 'assign' },
    asigna: { type: 'mut', action: 'assign' },
    'asignar a': { type: 'mut', action: 'assign' },
    deshacer: { type: 'mut', action: 'undo' },
    deshaz: { type: 'mut', action: 'undo' },
    desmarcar: { type: 'mut', action: 'undo' },
    desmarca: { type: 'mut', action: 'undo' },
  },
  prepositions: {
    with: ['con'],
    for: ['para', 'por'],
    on: ['en', 'sobre'],
    in: ['en'],
    to: ['a', 'hacia'],
  },
  sharedWords: ['compartido'],
  teamWords: ['equipo'],
  gradeWords: {
    grade: ['nota', 'notas', 'calificacion', 'calificación', 'calificaciones', 'pon', 'poner', 'establecer'],
    addComponent: ['anadir componente', 'añadir componente', 'agregar componente', 'nuevo componente', 'crear componente'],
    weight: ['peso', 'vale', 'valor', 'ponderacion', 'ponderación'],
    forWords: ['para', 'de', 'en', 'a', 'por'],
  },
  noteWords: {
    note: ['nota', 'notas', 'apunte', 'apuntes'],
    folder: ['carpeta', 'carpetas', 'directorio'],
    addWords: ['anadir', 'añadir', 'anade', 'añade', 'agregar', 'agrega', 'crear', 'crea', 'nueva', 'nuevo'],
  },
  habitWords: {
    habit: ['hábito', 'habito', 'hábitos', 'habitos', 'objetivo', 'objetivos', 'meta', 'metas'],
    note: ['con la nota', 'con nota', 'nota'],
  },
}
