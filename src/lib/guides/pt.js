export const pt = {
  title: 'Guias',
  subtitle: 'Como funciona cada parte do organizador, e quando é útil.',
  close: 'Fechar guias',
  sections: {
    core: 'Principal',
    productivity: 'Produtividade',
    sync: 'Sincronização de calendário',
    ambient: 'Ambiente',
    sharing: 'Sincronização e partilha',
    setup: 'Configuração',
  },
  entries: {
    tasks: {
      title: 'Tarefas',
      summary: 'Tudo o que é para esta semana, agrupado por disciplina.',
      body: [
        'Tarefas mostra uma semana de cada vez, agrupada sob a disciplina a que cada tarefa pertence. Cada cabeçalho de disciplina tem um anel que mostra o quanto já foi feito, e limpar a semana toda faz aparecer confetis. As setas no topo movem-se entre semanas, e o cabeçalho indica qualquer feriado que caia dentro dessa semana.',
        'Prime o botão redondo + para abrir o formulário. Preenche Disciplina e Prioridade no topo, depois o título. Também podes simplesmente escrever de forma natural: escreve "ensaio calculo amanha" e, quando sais do campo, ele preenche a disciplina e a data limite por ti. Só preenche os campos que ainda não tenhas definido.',
        'Há dois campos de data com funções diferentes. Data limite coloca a tarefa no calendário e ativa o alerta de prazo hoje. Da semana e Até à semana decidem em que semanas da lista de Tarefas ela aparece. Definir uma data limite ajusta automaticamente o intervalo de semanas, mas só até escolheres uma semana à mão, altura a partir da qual a tua escolha se mantém.',
        'Ativa Repetir para algo recorrente. Escolhe Diariamente, Semanalmente ou Mensalmente, define Cada para repetir com menos frequência (de 2 em 2 semanas, por exemplo), e opcionalmente define Até para a parar. Cada ocorrência é marcada em separado, por isso concluir esta semana não afeta a próxima.',
        'Numa linha de tarefa, toca no círculo para a concluir. Os ícones ao lado, atrás de um menu no telemóvel, adicionam a tarefa ao quadro Kanban, editam-na, partilham-na com uma equipa Collab, ou eliminam-na. Partilhar vai diretamente para a tua equipa se só tiveres uma, caso contrário pergunta qual.',
        'As tarefas para hoje juntam-se numa faixa acima da lista. O ícone do relógio define uma hora específica de lembrete, o X oculta essa tarefa só por hoje. Se os alertas aparecem na app, como notificação, ou ambos, está em Definições, Geral, Alertas de prazo das tarefas, que começa em Nenhum. Define o modo para Notificação ou Ambos e também tens Hora do alerta para amanhã, que por defeito é às 18:00.',
        'Se uma tarefa se estender por várias semanas, Definições, Geral, Comportamento de tarefas multi-semana decide se precisa de ser marcada uma vez no total ou uma vez por semana.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Arrasta trabalho entre colunas até estar feito.',
      body: [
        'O quadro organiza o trabalho por etapa em vez de por data, o que serve bem para qualquer coisa que avança por passos. Adiciona um cartão com Adicionar cartão no fundo de uma coluna, depois prime Enter para guardar ou Escape para cancelar.',
        'Arrasta cartões entre colunas, ou usa as setas esquerda e direita no menu do cartão. Num telemóvel, mantém premido brevemente antes de arrastar. Chegar à última coluna conta como concluído e faz aparecer confetis. As colunas encolhem no telemóvel com o chevron no cabeçalho.',
        'Abre um cartão com o ícone de seta para definir uma prioridade, uma data limite, uma disciplina, e uma lista de verificação. Adicionar item constrói a lista de verificação. A janela guarda quando a fechas, incluindo ao clicar fora, por isso não há um botão de cancelar separado.',
        'As listas de verificação podem aparecer na frente do cartão. Definições, Kanban, Pré-visualização da checklist no Kanban oferece Ocultar nos cartões, que é a opção por defeito, Mostrar em todos os cartões, e Caso a caso. Com Caso a caso, ativas a pré-visualização em cartões individuais fazendo duplo clique neles, o que mantém os cartões cheios legíveis enquanto os detalhados ficam expandidos.',
        'Adicionar às tarefas coloca também um cartão na tua lista semanal de Tarefas, para trabalho do quadro que também tem um prazo. Adicionar tarefas ao quadro automaticamente, na mesma secção de definições e desativado por defeito, faz o inverso para as tarefas desta semana.',
        'Limpar concluídos remove tudo na coluna final; Apagar tudo esvazia o quadro. Ambos pedem confirmação primeiro. As colunas são renomeadas, reordenadas arrastando a pega, e adicionadas em Definições, Kanban, embora as três colunas originais não possam ser eliminadas.',
      ],
    },
    grades: {
      title: 'Avaliações',
      summary: 'Acompanha componentes ponderados e o que ainda falta.',
      body: [
        'Primeiro define em que cada disciplina é avaliada, em Definições, Componentes de avaliação. Adicionar componente cria uma linha a 25% por defeito, por isso ajusta os pesos até o total dar 100%. Fica a vermelho até isso acontecer.',
        'No separador Avaliações, insere as notas em vinte à medida que as recebes. O número grande em cada cartão é a tua nota acumulada, que conta apenas o que já foi avaliado até agora e fica a vermelho abaixo de 9,5.',
        'Quando um componente tem várias partes avaliadas, prime + na sua linha para o dividir em partes. A primeira vez cria duas partes e limpa a nota do componente principal, e cada vez seguinte adiciona outra, com o peso do componente principal dividido igualmente entre elas. Um componente dividido só é avaliado através das suas partes.',
        'O painel por baixo responde à pergunta que realmente importa: o que precisas em tudo o que ainda não foi avaliado para terminar onde queres. Nota alvo é por defeito 9,5, a nota mínima de aprovação, e podes aumentá-la. Se atingir o teu alvo exigisse mais de 20, diz que não é possível em vez de mostrar um número impossível.',
        'O rodapé totaliza a tua média do semestre ponderada por créditos e os créditos que estás em vias de passar, contando uma disciplina a partir de 9,5. Abaixo disso, os semestres anteriores têm cada um uma nota final, e a caixa da média do curso pega na tua média anterior e em quantos semestres ela cobre, e depois projeta onde ficará o curso todo quando este semestre for incluído.',
      ],
    },
    calendar: {
      title: 'Calendário',
      summary: 'Vistas de dia, semana, mês e ano de tudo o que tem data.',
      body: [
        'Quatro vistas partilham um só calendário. Dia e semana desenham uma grelha de horas para o detalhe da hora do dia; mês e ano mostram a forma do período. Tarefas, eventos e feriados aparecem todos juntos, coloridos pela disciplina.',
        'Na vista de dia ou semana, arrasta para baixo na grelha de horas para reservar tempo. As horas ajustam-se a quartos de hora e qualquer coisa mais curta que 30 minutos é arredondada para 30. O formulário do evento abre já com essas horas preenchidas. Arrasta para os lados pelas colunas dos dias para criar algo que se estenda por vários dias.',
        'Na vista de mês ou ano cada dia mostra até três etiquetas e depois "+N mais". Clica no dia para ver tudo o que tem e para adicionar um evento a essa data.',
        'O formulário do evento tem um título, data, hora de início e de fim, uma cor, e uma nota opcional. Deixa a hora de início vazia para um evento de dia inteiro. Ativa Vários dias para obter um segundo campo de data para o fim. Se o Google Calendar estiver ligado, tens também um interruptor por evento para o enviar para lá.',
        'Os títulos também são lidos à procura de datas e horas, por isso "reuniao sexta 15h-17h" chega já preenchido. Os eventos vindos do Google Calendar ou do calendário do curso são só de leitura aqui, já que a fonte é quem os controla.',
      ],
    },
    focus: {
      title: 'Foco',
      summary: 'Um temporizador com pausas ajustadas ao teu ritmo real.',
      body: [
        'Prime Iniciar e o relógio da sessão começa a contar. Pausar e Reiniciar estão sempre disponíveis, e durante uma pausa podes saltá-la mais cedo.',
        'O ícone de engrenagem abre as definições de pausa, e os dois tipos funcionam de forma independente, por isso podes usar um, o outro, ou ambos. As Pausas por intervalo estão ativas por defeito com 25 minutos de trabalho e 5 minutos de pausa, o formato pomodoro habitual. As Pausas agendadas disparam em horas fixas do dia, o que serve bem um horário que já tem intervalos próprios: define uma hora e um minuto, escolhe uma duração, e prime + para a adicionar à lista.',
        'O mesmo painel permite substituir as palavras mostradas durante o foco e a pausa pelas tuas próprias.',
        'Em Definições, Foco, Após pausa decide o que uma pausa faz ao teu total em curso. Reiniciar timer recomeça a contagem, o que serve para contar sessões individuais; continuar a contar transporta o total para a frente, o que serve para medir um dia inteiro. Modo de alerta no foco acrescenta um sinal quando a fase muda: Nenhum, Vibração, Notificação, ou Ambos.',
        'Fechar o separador a meio de uma sessão não infla os teus números. Se voltares muito mais tarde, o temporizador percebe que estiveste ausente e entra em pausa em vez de contar o intervalo todo como foco.',
      ],
    },
    notes: {
      title: 'Notas',
      summary: 'Um editor rico com pastas, pesquisa e matemática.',
      body: [
        'As notas vivem em pastas que podes aninhar arrastando uma para cima de outra. O botão + cria uma nota, o botão de pasta cria uma pasta, e duplo clique no nome de uma pasta renomeia-a. A pesquisa filtra à medida que escreves, o ícone de grelha alterna entre disposição em lista e em mosaico, e as notas com estrela ordenam-se sempre para o topo. Arquivar é a alternativa mais suave a eliminar: as notas arquivadas saem da árvore e juntam-se atrás do seu próprio filtro.',
        'A barra de ferramentas cobre negrito, itálico, rasurado, três níveis de título, listas com marcadores, numeradas e de verificação, citações, tabelas, blocos de código, separadores, ligações, cor do texto e tamanho do texto, além de anular e refazer. Há um botão de microfone onde a ditado é suportado.',
        'Escreve @ seguido de algumas letras para ligar uma tarefa pelo nome. Sugere tarefas por concluir correspondentes, as setas do teclado percorrem-nas, e Enter insere a ligação, o que mantém uma nota associada ao trabalho a que pertence.',
        'A resolução de matemática, em Definições, Apps, Notas, está desativada até a ativares. Com ela ativa, termina uma linha com = e prime Enter para a resolver, incluindo inequações e equações do 2.º grau. Três sub-opções, todas ativas assim que ligada, controlam a resolução em ordem a x, o traçar de uma equação selecionada como gráfico, e se o desenvolvimento é mostrado passo a passo ou apenas o resultado.',
        'As notas importam de Markdown e texto simples, e exportam como Markdown, texto simples, página web, Word, ou impressão para PDF. As notas de escrita à mão em Canvas precisam da sincronização na nuvem ativada, já que os desenhos são grandes e ficam guardados remotamente. O Canvas tem uma caneta e uma borracha, cinco espessuras e cinco cores, uma das quais segue o teu tema. A borracha remove um traço inteiro em vez de parte dele.',
      ],
    },
    eisenhower: {
      title: 'Matriz de Eisenhower',
      summary: 'Ordena tarefas por urgência face à importância.',
      body: [
        'A matriz divide o trabalho em dois eixos, urgente e importante, dando quatro caixas: fazer agora, agendar, delegar, e descartar. O valor está em separar o que é apenas barulhento do que realmente importa, algo que uma lista simples esconde.',
        'As tuas tarefas começam no tabuleiro por ordenar. Arrasta cada uma para a caixa que lhe cabe, e arrasta-a para outro sítio quando isso mudar. Qualquer coisa com mais de uma semana de atraso fica fora da grelha, para que um backlog antigo não sepulte o panorama atual.',
        'Os nomes e as cores dos quadrantes podem ser alterados nas definições da app, o que vale a pena fazer se as etiquetas clássicas não corresponderem à forma como pensas sobre o teu próprio trabalho.',
      ],
    },
    quickAction: {
      title: 'Ação Rápida',
      summary: 'Escreve o que queres em linguagem simples.',
      body: [
        'Prime Ctrl+K em qualquer lugar para a abrir, ou ativa o gesto de toque triplo para telemóveis. Escreve uma frase simples, prime Enter, e ela percebe o que quiseste dizer. O atalho pode ser reatribuído nas definições da app.',
        'Para um único item, "adiciona tarefa ensaio para calculo amanha as 15h" define o título, a disciplina, a data e a hora de uma só vez. Prioridade e repetição também funcionam: "adiciona tarefa ginasio cada segunda prioridade alta".',
        'Cria mais do que tarefas. "adiciona cartao kanban refazer" cria um cartão na primeira coluna, "adiciona cartao refazer em em curso" coloca-o numa coluna com nome, e "adiciona evento do calendario aula 15h-17h" cria um evento com hora marcada.',
        'Várias coisas de uma vez é onde poupa mesmo tempo. "adiciona tarefas alpha, beta, gama" cria três. "adiciona tarefas ppt 1, 2, 3" percebe o prefixo partilhado e cria ppt 1, ppt 2 e ppt 3. "adiciona tarefas alpha e beta para amanha e 18/07 respetivamente" dá a cada uma a sua própria data pela ordem indicada.',
        'Também atua sobre o que já existe, comparando as tuas palavras de forma aproximada com os títulos das tuas tarefas em vez de precisar que sejam exatos: "apaga compras", "partilha notas com grupo de estudo", "abrir definicoes", "iniciar foco 20m pausa 5m", "saltar pausa". As avaliações também funcionam, como em "nota 15 no teste para calculo".',
        'Tudo isto segue o idioma da tua app, por isso os comandos funcionam no idioma que já estiveres a usar.',
      ],
    },
    googleCalendar: {
      title: 'Sincronização com o Google Calendar',
      summary: 'Sincronização nos dois sentidos com o teu Google Calendar.',
      body: [
        'Liga uma vez colando um ID de cliente Google, seguindo os passos numerados na app. Depois disso sincroniza sozinho a cada poucos minutos e sempre que voltas à janela.',
        'A sincronização funciona nos dois sentidos. Os eventos do Google aparecem junto com tudo o resto, e os eventos que crias aqui podem ser enviados para lá usando o interruptor no formulário do evento. Quando o mesmo evento muda nos dois lados, a edição mais recente prevalece. Eliminar um evento sincronizado aqui remove-o também do Google.',
      ],
    },
    eiCalendar: {
      title: 'Calendário do curso',
      summary: 'Datas oficiais do curso, importadas automaticamente.',
      body: [
        'Quando o teu semestre usa um preset de curso suportado, isto importa o calendário público do curso e filtra-o para o teu ano, para veres apenas os prazos que realmente se aplicam a ti em vez de todos os anos de uma vez.',
        'Estas entradas são só de leitura, porque o curso é quem as controla. Atualizam-se quando o curso atualiza, o que significa que as datas oficiais chegam sem teres de copiar nada.',
        'Disponível apenas para o curso de EI.',
      ],
    },
    pomodoro: {
      title: 'Tomates Pomodoro',
      summary: 'Um tomate por cada sessão de foco concluída.',
      body: [
        'Ativa isto na grelha de Apps e cada intervalo de foco concluído deixa cair um tomate no separador. Sessões mais longas fazem crescer tomates maiores, e abandonar uma sessão a meio deixa um tomate mais pequeno e desbotado, para que o monte se mantenha um registo honesto em vez de uma prateleira de troféus. Há um curto período de tolerância para cancelar uma sessão mesmo terminada sem que ela conte.',
        'Os tomates são físicos. Arrasta-os e atira-os e eles saltam e assentam, e num telemóvel que o suporte, inclinar o aparelho muda para que lado caem. Mostrar sobreposição global em todos os separadores deixa-os passear pela app toda em vez de só em Foco.',
        'O emblema por cima da roda abre as estatísticas. Aí tens totais para o período e para sempre, contagens de abandonados, sequências diárias atual e melhor, um gráfico de barras do foco por dia desta semana, e uma tendência de seis meses. Copiar resumo põe uma versão em texto simples na tua área de transferência.',
        'Período de reset define o que significa "este período": diário, semanal, que é a opção por defeito, mensal, ou por semestre. Mostrar pomodoros do período e Guardar estatísticas do período são interruptores separados, por isso podes manter as estatísticas sem o emblema, embora desligar o emblema também pare o registo.',
      ],
    },
    standby: {
      title: 'Repouso',
      summary: 'Transforma um telemóvel apoiado num ecrã de secretária.',
      body: [
        'O Repouso aparece sozinho quando um telemóvel é virado para a horizontal, por isso um telemóvel apoiado torna-se um ecrã de secretária sem teres de abrir nada. O ecrã mantém-se aceso enquanto está ativo.',
        'Escolhe entre um e três painéis e o que cada um mostra: uma roda de relógio, a hora, o teu calendário, o temporizador de foco, o quadro Kanban, ou tarefas por categoria. Cada painel pode ter um segundo painel mais pequeno por baixo, o que te permite ter um temporizador e a tua lista de tarefas lado a lado enquanto trabalhas.',
      ],
    },
    firebaseSync: {
      title: 'Sincronização na nuvem',
      summary: 'Mantém vários dispositivos alinhados.',
      body: [
        'A sincronização na nuvem liga a app a um projeto Firebase que é teu, por isso os teus dados ficam na tua própria conta em vez de no serviço de outra pessoa. A app guia-te em quatro passos: criar um projeto, ativar o Firestore, copiar a configuração das definições do projeto, e colá-la. Verifica a ligação antes de guardar.',
        'Uma vez ligado, uma alteração num dispositivo chega aos outros em segundos. Também levanta o limite de armazenamento local, que é do que trata o aviso de armazenamento quando aparece, e é o que as notas Canvas precisam para funcionar.',
        'A sincronização pode ser encriptada de ponta a ponta, para que mesmo alguém capaz de ler a tua base de dados não consiga ler os teus dados. Se ligares sem isso és avisado e é-te oferecido Encriptar agora. Esta palavra-passe é separada da encriptação no dispositivo: definir uma não define a outra, e um dispositivo que desbloqueie uma pode ainda precisar da outra.',
      ],
    },
    collab: {
      title: 'Collab',
      summary: 'Partilha tarefas e cartões com outras pessoas.',
      body: [
        'O Collab precisa primeiro que a sincronização na nuvem esteja a funcionar, depois de uma configuração única na tua consola Firebase: publicar as regras de segurança que a app te mostra, e ativar o início de sessão anónimo. O guia percorre os quatro passos, e depois disso ativas o collab no mesmo painel.',
        'Cria uma equipa, depois convida pessoas com uma ligação de convite. Os convites têm o seu próprio prazo de validade, um dia por defeito, separado de quanto tempo a equipa em si dura. A ligação contém a chave necessária para ler a equipa, por isso trata-a como uma palavra-passe e envia uma nova se ela expirar.',
        'Duas definições por equipa decidem como esta se comporta, e só o anfitrião as pode alterar. A Conclusão de tarefas partilhadas é ou alternar para todos, a opção por defeito, em que uma pessoa a marcar limpa a tarefa para todos, ou conclusão pessoal, em que cada membro acompanha a sua própria. As Permissões de edição de tarefas são ou abertas a qualquer membro, a opção por defeito, ou apenas para o anfitrião.',
        'O anfitrião pode renomear a equipa, gerar convites, e eliminá-la. Os membros podem sair. De qualquer forma, se tinhas partilhado as tuas próprias tarefas locais na equipa, é-te perguntado se queres manter essas cópias no teu dispositivo ou removê-las junto com ela.',
      ],
    },
    dataTransfer: {
      title: 'Exportar e importar',
      summary: 'Move os teus dados como um ficheiro.',
      body: [
        'Exportar JSON escreve tudo para um ficheiro e Importar JSON lê um de volta. Isto é um instantâneo em vez de uma ligação ao vivo, o que o torna certo para cópias de segurança e para mudar para um dispositivo novo, e errado para manter dois dispositivos sincronizados. Usa a sincronização na nuvem para isso.',
        'Com a encriptação ativa, exportar oferece uma escolha: o formato encriptado do organizador, ou JSON simples legível por humanos. O legível é fácil de inspecionar e completamente desprotegido, por isso trata esse ficheiro com cuidado.',
        'Para quantidades menores de dados há também Copiar link de partilha e um código QR, que é a forma mais rápida de mudar uma configuração para um dispositivo ao teu lado. Estados muito grandes não cabem numa ligação e a app avisa-te disso.',
      ],
    },
    settings: {
      title: 'Definições',
      summary: 'Semestre, disciplinas, aparência e apps.',
      body: [
        'Trabalha de cima para baixo na primeira vez. Define o nome do semestre e as suas datas de início e fim, e o número de semanas é calculado por ti. Depois adiciona disciplinas, cada uma com créditos e uma cor, e quaisquer feriados. A maior parte da app depende disto, por isso vem primeiro. Carregar preset pode preencher datas e disciplinas para um curso conhecido.',
        'Dois interruptores mudam para que serve a app. O Modo trabalho renomeia disciplinas para grupos e oculta avaliações e créditos, para usar fora de um curso académico. O Modo sem semestres elimina por completo o sistema de semestres e conta em vez disso semanas simples do ano. Geral também tem três cores de tema, se as tarefas novas aparecem no calendário, como as tarefas de várias semanas são marcadas, e as definições de alerta de prazo.',
        'A Barra de navegação reordena separadores arrastando, renomeia-os, oculta os que não usas, e agrupa o resto em pastas. Mostrar escolhe ícones, nomes, ou ambos, e num telemóvel a barra pode ficar em baixo ou ao lado.',
        'Apps é onde as funcionalidades são ativadas e desativadas, incluindo Notas, Pomodoro, Repouso, Eisenhower e as integrações de calendário. Desativar uma app apaga os dados dessa app, por isso pergunta primeiro.',
        'A Encriptação bloqueia os dados deste dispositivo atrás de uma palavra-passe de pelo menos oito caracteres, com uma dica opcional e um código de recuperação de doze palavras mostrado uma única vez. Guarda esse código noutro sítio, porque é a única forma de voltar a entrar se te esqueceres da palavra-passe. Mais tarde podes mudar a palavra-passe, emitir um novo código de recuperação, ou rodar a chave, o que volta a encriptar tudo e faz com que os outros dispositivos tenham de desbloquear novamente.',
        'A zona de perigo no fundo elimina o semestre e as suas tarefas, avaliações e quadro, e limpa os dados de pomodoro. Cada uma pede confirmação primeiro.',
      ],
    },
  },
}
