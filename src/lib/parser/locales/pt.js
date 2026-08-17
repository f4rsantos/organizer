export const pt = {
  numbers: {
    zero: 0, um: 1, dois: 2, tres: 3, três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
    onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezasseis: 16, dezesseis: 16, dezassete: 17, dezessete: 17, dezoito: 18, dezanove: 19, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90
  },
  ordinals: {
    primeiro: 1, segunda: 2, segundo: 2, terceira: 3, terceiro: 3, quarta: 4, quarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6, setima: 7, setimo: 7, oitava: 8, oitavo: 8, nona: 9, nono: 9, decima: 10, decimo: 10,
    '1º': 1, '2º': 2, '3º': 3, '4º': 4, '5º': 5, '6º': 6, '7º': 7, '8º': 8, '9º': 9, '10º': 10
  },
  modifiers: {
    proxima: 'next', proximo: 'next', próxima: 'next', próximo: 'next',
    esta: 'this', este: 'this',
    passada: 'last', passado: 'last', ultima: 'last', ultimo: 'last', última: 'last', último: 'last',
    que: 'next'
  },
  weekdays: {
    domingo: 0, segunda: 1, terca: 2, terça: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, sábado: 6
  },
  months: {
    janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
  },
  atWords: ['as', 'às', 'ás', 'a', 'pelas'],
  timeConnectors: ['e', 'hora', 'horas'],
  weekWords: ['semana'],
  weekOfWords: ['semana de'],
  focusWords: {
    start: ['iniciar', 'comecar', 'começar', 'retomar'],
    resume: ['retomar'],
    stop: ['parar', 'pausar', 'terminar'],
    reset: ['reiniciar', 'resetar'],
    skip: ['saltar', 'pular'],
    break: ['pausa', 'intervalo'],
    focus: ['foco', 'temporizador', 'estudo', 'pomodoro'],
    minuteUnits: ['m', 'min', 'mins', 'minuto', 'minutos'],
    hourUnits: ['h', 'hora', 'horas'],
  },
  relativeDates: {
    hoje: 0,
    amanha: 1, amanhã: 1,
    'depois de amanha': 2, 'depois de amanhã': 2,
    ontem: -1
  },
  navVerbs: ['abrir', 'ir para', 'mostrar', 'ver', 'navegar para'],
  durations: {
    hora: 'hour', horas: 'hour', h: 'hour',
    minuto: 'minute', minutos: 'minute', min: 'minute', m: 'minute'
  },
  recurrences: {
    cada: 'every', todos: 'every', todas: 'every',
    diariamente: { freq: 'daily', interval: 1 },
    diario: { freq: 'daily', interval: 1 },
    semanalmente: { freq: 'weekly', interval: 1 },
    mensalmente: { freq: 'monthly', interval: 1 },
    anualmente: { freq: 'yearly', interval: 1 },
    dia: { freq: 'daily' }, dias: { freq: 'daily' },
    semana: { freq: 'weekly' }, semanas: { freq: 'weekly' },
    mes: { freq: 'monthly' }, mês: { freq: 'monthly' }, meses: { freq: 'monthly' },
    ano: { freq: 'yearly' }, anos: { freq: 'yearly' },
  },
  time: {
    'da manha': 'am',
    'da manhã': 'am',
    'de manha': 'am',
    'de manhã': 'am',
    'da tarde': 'pm',
    'de tarde': 'pm',
    'da noite': 'pm',
    'de noite': 'pm',
    'em ponto': 0,
    'e meia': 30,
    'e meio': 30,
    meia: 30,
    'e um quarto': 15,
    'e quarto': 15,
    'menos um quarto': -15,
    'menos quarto': -15
  },
  priorityWords: {
    1: ['prioridade alta', 'alta prioridade'],
    2: ['prioridade media', 'prioridade média', 'media prioridade', 'média prioridade'],
    3: ['prioridade baixa', 'baixa prioridade'],
  },
  mutationVerbs: {
    'marcar como feito': { type: 'mut', action: 'complete' },
    concluir: { type: 'mut', action: 'complete' },
    conclui: { type: 'mut', action: 'complete' },
    terminar: { type: 'mut', action: 'complete' },
    termina: { type: 'mut', action: 'complete' },
    apagar: { type: 'mut', action: 'delete' },
    apaga: { type: 'mut', action: 'delete' },
    eliminar: { type: 'mut', action: 'delete' },
    elimina: { type: 'mut', action: 'delete' },
    remover: { type: 'mut', action: 'delete' },
    remove: { type: 'mut', action: 'delete' },
    mover: { type: 'mut', action: 'move' },
    move: { type: 'mut', action: 'move' },
    partilhar: { type: 'mut', action: 'share' },
    partilha: { type: 'mut', action: 'share' },
    compartilhar: { type: 'mut', action: 'share' },
    desfazer: { type: 'mut', action: 'undo' },
    desfaz: { type: 'mut', action: 'undo' },
    anular: { type: 'mut', action: 'undo' },
    anula: { type: 'mut', action: 'undo' },
  },
  prepositions: {
    with: ['com'],
    for: ['para', 'por'],
    on: ['em', 'no', 'na', 'sobre'],
    in: ['em', 'no', 'na'],
    to: ['a', 'ao', 'para'],
  },
  sharedWords: ['partilhado', 'compartilhado'],
  teamWords: ['equipa', 'equipe'],
  gradeWords: {
    grade: ['nota', 'notas', 'avaliacao', 'avaliação', 'classificacao', 'classificação', 'define', 'definir'],
    addComponent: ['adicionar componente', 'adiciona componente', 'novo componente', 'nova componente', 'criar componente'],
    weight: ['peso', 'vale', 'valor'],
    forWords: ['para', 'de', 'em', 'no', 'na', 'a', 'ao'],
  },
  noteWords: {
    note: ['nota', 'notas', 'apontamento', 'apontamentos'],
    folder: ['pasta', 'pastas', 'diretorio', 'diretório'],
    addWords: ['adicionar', 'adiciona', 'adicione', 'criar', 'cria', 'crie', 'nova', 'novo'],
  },
  habitWords: {
    habit: ['hábito', 'habito', 'hábitos', 'habitos', 'objetivo', 'objetivos', 'meta', 'metas'],
    note: ['com a nota', 'com nota', 'nota'],
  },
}
