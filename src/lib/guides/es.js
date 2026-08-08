export const es = {
  title: 'Guías',
  subtitle: 'Cómo funciona cada parte del organizador, y cuándo ayuda.',
  close: 'Cerrar guías',
  sections: {
    core: 'Principal',
    productivity: 'Productividad',
    sync: 'Sincronización de calendario',
    ambient: 'Ambiente',
    sharing: 'Sincronización y compartir',
    setup: 'Configuración',
  },
  entries: {
    tasks: {
      title: 'Tareas',
      summary: 'Todo lo que toca esta semana, agrupado por asignatura.',
      body: [
        'Tareas muestra una semana a la vez, agrupada bajo la asignatura a la que pertenece cada tarea. Cada encabezado de asignatura lleva un anillo que muestra cuánto llevas hecho, y vaciar la semana entera desata confeti. Las flechas de arriba mueven entre semanas, y el encabezado nombra cualquier festivo que caiga dentro de esa semana.',
        'Pulsa el botón redondo + para abrir el formulario. Rellena Asignatura y Prioridad arriba, luego el título. También puedes escribir de forma natural: escribe "ensayo calculo mañana" y, al salir del campo, se rellenan la asignatura y la fecha límite por ti. Solo rellena los campos que aún no hayas fijado tú mismo.',
        'Hay dos campos de fecha con funciones distintas. Fecha límite coloca la tarea en el calendario y activa la alerta de vencimiento hoy. Desde la semana y Hasta la semana deciden en qué semanas de la lista de Tareas aparece. Fijar una fecha límite ajusta automáticamente el rango de semanas, pero solo hasta que elijas una semana tú mismo, momento a partir del cual tu elección se mantiene.',
        'Activa Repetir para algo recurrente. Elige Diario, Semanal o Mensual, fija Cada para repetir con menos frecuencia (cada 2 semanas, por ejemplo), y opcionalmente fija Hasta para detenerlo. Cada repetición se marca por separado, así que completar esta semana deja la siguiente intacta.',
        'En una fila de tarea, toca el círculo para completarla. Los iconos al lado, detrás de un menú en el móvil, añaden la tarea al tablero Kanban, la editan, la comparten con un equipo Collab, o la eliminan. Compartir va directo a tu equipo si solo tienes uno, o si no pregunta cuál.',
        'Las tareas que vencen hoy se reúnen en una franja encima de la lista. El icono del reloj fija una hora concreta de recordatorio, la X oculta esa tarea solo por hoy. Si las alertas aparecen en la app, como notificación, o ambas cosas, está en Ajustes, General, Alertas de fecha límite, que empieza en Ninguna. Pon el modo en Notificación o Ambas y también tendrás Hora de alerta del día siguiente, que por defecto es a las 18:00.',
        'Si una tarea se extiende varias semanas, Ajustes, General, Comportamiento de tareas de varias semanas decide si hay que marcarla una vez en total o una vez por semana.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Arrastra trabajo entre columnas hasta que esté hecho.',
      body: [
        'El tablero organiza el trabajo por etapa en vez de por fecha, lo cual sirve para cualquier cosa que avanza por pasos. Añade una tarjeta con Añadir tarjeta al final de una columna, luego pulsa Enter para guardar o Escape para cancelar.',
        'Arrastra tarjetas entre columnas, o usa las flechas izquierda y derecha del menú de la tarjeta. En un móvil, mantén pulsado brevemente antes de arrastrar. Llegar a la última columna cuenta como hecho y desata confeti. Las columnas se pliegan en el móvil con la flecha del encabezado.',
        'Abre una tarjeta con el icono de flecha para fijar una prioridad, una fecha límite, una asignatura, y una checklist. Añadir elemento construye la checklist. El diálogo guarda al cerrarlo, incluso al hacer clic fuera, así que no hay un botón de cancelar aparte.',
        'Las checklists pueden mostrarse en la parte frontal de una tarjeta. Ajustes, Kanban, Vista previa de checklist Kanban ofrece Ocultar en las tarjetas, que es la opción por defecto, Mostrar en todas las tarjetas, y Caso por caso. Con Caso por caso activas la vista previa en tarjetas concretas haciendo doble clic en ellas, lo que mantiene legibles las tarjetas cargadas mientras las detalladas quedan expandidas.',
        'Añadir a tareas coloca también una tarjeta en tu lista semanal de Tareas, para trabajo del tablero que también tiene una fecha límite. Añadir tareas al tablero automáticamente, en la misma sección de ajustes y desactivado por defecto, hace lo contrario con las tareas de esta semana.',
        'Borrar completadas elimina todo en la columna final; Borrar todo vacía el tablero. Ambas piden confirmación antes. Las columnas se renombran, se reordenan arrastrando el asa, y se añaden en Ajustes, Kanban, aunque las tres columnas originales no se pueden eliminar.',
      ],
    },
    grades: {
      title: 'Calificaciones',
      summary: 'Sigue componentes ponderados y lo que aún falta.',
      body: [
        'Primero define en qué se califica cada asignatura, en Ajustes, Componentes de nota. Añadir componente crea una fila al 25% por defecto, así que ajusta los pesos hasta que el total dé 100%. Se queda en rojo hasta entonces.',
        'En la pestaña Calificaciones, introduce las notas sobre 20 según las vas obteniendo. El número grande de cada tarjeta es tu nota acumulada, que solo cuenta lo que ya se ha calificado hasta ahora y se pone en rojo por debajo de 9,5.',
        'Cuando un componente tiene varias partes calificadas, pulsa + en su fila para dividirlo en partes. La primera pulsación crea dos partes y borra la nota del componente principal, y cada pulsación siguiente añade otra, con el peso del componente principal dividido a partes iguales entre ellas. Un componente dividido solo se califica a través de sus partes.',
        'El panel de abajo responde a la pregunta que de verdad importa: qué necesitas en todo lo que aún no está calificado para terminar donde quieres. Nota objetivo es 9,5 por defecto, el aprobado, y puedes subirla. Si alcanzar tu objetivo exigiera más de 20, dice que no es alcanzable en vez de mostrar un número imposible.',
        'El pie totaliza tu media del semestre ponderada por créditos y los créditos que vas camino de aprobar, contando una asignatura desde 9,5. Debajo de eso, los semestres anteriores llevan cada uno una nota final, y el cuadro de media del curso toma tu media anterior y cuántos semestres cubre, y luego proyecta dónde quedará el curso completo una vez se incluya este semestre.',
      ],
    },
    calendar: {
      title: 'Calendario',
      summary: 'Vistas de día, semana, mes y año de todo lo que tiene fecha.',
      body: [
        'Cuatro vistas comparten un mismo calendario. Día y semana dibujan una cuadrícula horaria para el detalle de la hora del día; mes y año muestran la forma del período. Tareas, eventos y festivos aparecen todos juntos, coloreados por asignatura.',
        'En la vista de día o semana, arrastra hacia abajo en la cuadrícula horaria para reservar tiempo. Las horas se ajustan a cuartos de hora y cualquier cosa más corta de 30 minutos se redondea a 30. El formulario del evento se abre con esas horas ya rellenas. Arrastra hacia los lados por las columnas de días para crear algo que abarque varios días.',
        'En la vista de mes o año cada día muestra hasta tres etiquetas y luego "+N más". Haz clic en el día para ver todo lo que tiene y para añadir un evento en esa fecha.',
        'El formulario del evento lleva un título, fecha, hora de inicio y fin, un color, y una nota opcional. Deja la hora de inicio vacía para un evento de todo el día. Activa Varios días para obtener un segundo campo de fecha para el fin. Si Google Calendar está conectado también tienes un interruptor por evento para enviarlo allí.',
        'Los títulos también se leen buscando fechas y horas, así que "reunion viernes 15h-17h" llega ya rellenado. Los eventos que vienen de Google Calendar o del calendario del grado son de solo lectura aquí, ya que la fuente es quien los controla.',
      ],
    },
    focus: {
      title: 'Enfoque',
      summary: 'Un temporizador con descansos ajustados a tu ritmo real.',
      body: [
        'Pulsa Iniciar y el reloj de la sesión empieza a correr. Pausar y Reiniciar siempre están ahí, y durante un descanso puedes saltarlo antes de tiempo.',
        'El icono de engranaje abre los ajustes de descanso, y los dos tipos funcionan de forma independiente, así que puedes usar uno, el otro, o ambos. Los Descansos por intervalo están activos por defecto con 25 minutos de trabajo y 5 minutos de descanso, el formato pomodoro habitual. Los Descansos programados saltan a horas fijas del día en su lugar, lo cual encaja con un horario que ya tiene huecos propios: fija una hora y un minuto, elige una duración, y pulsa + para añadirlo a la lista.',
        'El mismo panel te permite sustituir las palabras que se muestran durante el enfoque y el descanso por las tuyas propias.',
        'En Ajustes, Enfoque, Tras el descanso decide qué le hace un descanso a tu total en curso. Reiniciar temporizador vuelve a empezar el conteo, lo cual sirve para contar sesiones individuales; seguir contando lleva el total hacia adelante, lo cual sirve para medir un día entero. Modo de alerta de Enfoque añade una señal cuando cambia la fase: Ninguna, Vibración, Notificación, o Ambas.',
        'Cerrar la pestaña a mitad de sesión no infla tus números. Si vuelves mucho más tarde, el temporizador calcula que estuviste fuera y se pausa en vez de contar todo el hueco como enfoque.',
      ],
    },
    notes: {
      title: 'Notas',
      summary: 'Un editor completo con carpetas, búsqueda y matemáticas.',
      body: [
        'Las notas viven en carpetas que puedes anidar arrastrando una encima de otra. El botón + crea una nota, el botón de carpeta crea una carpeta, y hacer doble clic en el nombre de una carpeta la renombra. La búsqueda filtra mientras escribes, el icono de cuadrícula alterna entre disposición en lista y en mosaico, y las notas marcadas con estrella siempre se ordenan arriba del todo. Archivar es la alternativa más suave a eliminar: las notas archivadas salen del árbol y se agrupan detrás de su propio filtro.',
        'La barra de herramientas cubre negrita, cursiva, tachado, tres niveles de título, listas con viñetas, numeradas y de tareas, citas, tablas, bloques de código, separadores, enlaces, color de texto y tamaño de texto, además de deshacer y rehacer. Hay un botón de micrófono donde se admite el dictado.',
        'Escribe @ seguido de unas letras para enlazar una tarea por su nombre. Sugiere tareas pendientes que coincidan, las flechas del teclado recorren la lista, y Enter inserta el enlace, lo que mantiene una nota ligada al trabajo al que pertenece.',
        'Resolver matemáticas, en Ajustes, Apps, Notas, está desactivado hasta que lo actives. Con él activo, termina una línea con = y pulsa Enter para resolverla, incluidas inecuaciones y ecuaciones de segundo grado. Tres subopciones, todas activas en cuanto se enciende, controlan resolver para x, graficar una ecuación seleccionada, y si el desarrollo se muestra paso a paso o solo el resultado.',
        'Las notas se importan desde Markdown y texto plano, y se exportan como Markdown, texto plano, página web, Word, o impresión a PDF. Las notas de escritura a mano en Canvas necesitan la sincronización en la nube activada, ya que los dibujos son grandes y se guardan de forma remota. El Canvas tiene un lápiz y una goma, cinco grosores y cinco colores, uno de los cuales sigue tu tema. La goma borra un trazo entero en vez de solo una parte.',
      ],
    },
    goals: {
      title: 'Objetivos',
      summary: 'Mantén un hábito a largo plazo, un clic cada vez.',
      body: [
        'Un objetivo es algo que quieres seguir haciendo en lugar de terminar una sola vez. Cada objetivo muestra un único botón gris esperando a ser pulsado: al pulsarlo marcas el periodo actual como hecho, salta una pequeña celebración y ves cuánto dura tu racha.',
        'Al crear un objetivo eliges con qué frecuencia hay que pulsarlo, desde cada día hasta cada mes, y si quieres anotar unas palabras cada vez. Las notas merecen la pena cuando te importa cómo fue, y no solo que ocurriera.',
        'Tu historial se convierte en un calendario debajo. Empieza como un solo círculo y crece hacia fuera, saltando de línea cada lunes y abriendo un bloque nuevo cada mes, de modo que los primeros días siguen siendo legibles y las rachas largas se alejan solas. Los botones de la cabecera permiten repasar el progreso, deshacer el clic actual o eliminar el objetivo.',
      ],
    },
    eisenhower: {
      title: 'Matriz de Eisenhower',
      summary: 'Ordena tareas por urgencia frente a importancia.',
      body: [
        'La matriz divide el trabajo en dos ejes, urgente e importante, dando cuatro casillas: hazlo ya, prográmalo, delégalo, y descártalo. El valor está en separar lo que simplemente hace ruido de lo que de verdad importa, algo que una lista plana oculta.',
        'Tus tareas empiezan en la bandeja sin ordenar. Arrastra cada una a la casilla que le corresponde, y arrástrala a otro sitio cuando eso cambie. Cualquier cosa con más de una semana de retraso queda fuera de la cuadrícula, para que un backlog antiguo no entierre el panorama actual.',
        'Los nombres y colores de los cuadrantes se pueden cambiar en los ajustes de la app, algo que merece la pena si las etiquetas clásicas no encajan con cómo piensas sobre tu propio trabajo.',
      ],
    },
    quickAction: {
      title: 'Acción Rápida',
      summary: 'Escribe lo que quieres en lenguaje sencillo.',
      body: [
        'Pulsa Ctrl+K en cualquier lugar para abrirla, o activa el gesto de triple toque para móviles. Escribe una frase sencilla, pulsa Enter, y la app averigua lo que querías decir. El atajo se puede reasignar en los ajustes de la app.',
        'Para un solo elemento, "añade tarea ensayo para calculo mañana a las 15h" fija el título, la asignatura, la fecha y la hora de una vez. La prioridad y la repetición también funcionan: "añade tarea gimnasio cada lunes prioridad alta".',
        'Crea más que tareas. "añade tarjeta kanban refactorizar" crea una tarjeta en la primera columna, "añade tarjeta refactorizar en en curso" la coloca en una columna con nombre, y "añade evento de calendario clase 15h-17h" crea un evento con hora fija.',
        'Varias cosas de una vez es donde de verdad ahorra tiempo. "añade tareas alfa, beta, gamma" crea tres. "añade tareas ppt 1, 2, 3" entiende el prefijo compartido y crea ppt 1, ppt 2 y ppt 3. "añade tareas alfa y beta para mañana y 18/07 respectivamente" da a cada una su propia fecha en orden.',
        'También actúa sobre lo que ya existe, comparando tus palabras de forma aproximada con los títulos de tus tareas en vez de necesitar que sean exactos: "elimina compra", "comparte notas con grupo de estudio", "abrir ajustes", "iniciar enfoque 20m descanso 5m", "saltar descanso". Las calificaciones también funcionan, como en "nota 15 en parcial para calculo".',
        'Todo esto sigue el idioma de tu app, así que los comandos funcionan en el idioma que ya estés usando.',
      ],
    },
    googleCalendar: {
      title: 'Sincronización con Google Calendar',
      summary: 'Sincronización bidireccional con tu Google Calendar.',
      body: [
        'Conecta una vez pegando un ID de cliente de Google, siguiendo los pasos numerados en la app. Después de eso se sincroniza solo cada pocos minutos y siempre que vuelves a la ventana.',
        'La sincronización funciona en ambos sentidos. Los eventos de Google aparecen junto con todo lo demás, y los eventos que creas aquí se pueden enviar allí usando el interruptor del formulario del evento. Cuando el mismo evento cambia en ambos sitios, gana la edición más reciente. Eliminar un evento sincronizado aquí también lo elimina de Google.',
      ],
    },
    eiCalendar: {
      title: 'Calendario del grado',
      summary: 'Fechas oficiales del grado, importadas automáticamente.',
      body: [
        'Cuando tu semestre usa un preajuste de grado compatible, esto importa el calendario público del grado y lo filtra a tu año, para que veas solo los plazos que realmente te aplican a ti en vez de todos los años a la vez.',
        'Estas entradas son de solo lectura, porque el grado es quien las controla. Se actualizan cuando el grado se actualiza, lo que significa que las fechas oficiales llegan sin que copies nada.',
        'Disponible solo para el grado de EI.',
      ],
    },
    pomodoro: {
      title: 'Tomates Pomodoro',
      summary: 'Un tomate por cada sesión de enfoque completada.',
      body: [
        'Activa esto desde la cuadrícula de Apps y cada intervalo de enfoque completado suelta un tomate en la pestaña. Las sesiones más largas hacen crecer tomates más grandes, y abandonar una sesión a medias deja un tomate más pequeño y descolorido, para que el montón siga siendo un registro honesto en vez de una vitrina de trofeos. Hay un breve margen de gracia para cancelar una sesión recién terminada sin que cuente.',
        'Los tomates son físicos. Arrástralos y lánzalos y rebotan y se asientan, y en un móvil que lo permita, inclinar el dispositivo cambia hacia dónde caen. Mostrar superposición global en todas las pestañas hace que floten por toda la app en vez de solo en Enfoque.',
        'La insignia encima de la rueda abre las estadísticas. Ahí tienes totales del período y de siempre, recuentos de abandonados, rachas diarias actual y mejor, un gráfico de barras del enfoque por día de esta semana, y una tendencia de seis meses. Copiar resumen pone una versión en texto plano en tu portapapeles.',
        'Periodo de reinicio fija qué significa "este período": diario, semanal, que es la opción por defecto, mensual, o por semestre. Mostrar pomodoros del periodo y Seguir estadísticas del periodo son interruptores separados, así que puedes conservar las estadísticas sin la insignia, aunque apagar la insignia también detiene el seguimiento.',
      ],
    },
    standby: {
      title: 'Reposo',
      summary: 'Convierte un móvil apoyado en una pantalla de escritorio.',
      body: [
        'Reposo aparece por sí solo cuando un móvil se pone en horizontal, así que un móvil apoyado se convierte en una pantalla de escritorio sin que tengas que abrir nada. La pantalla se mantiene encendida mientras está activo.',
        'Elige entre uno y tres paneles y qué muestra cada uno: una rueda de reloj, la hora, tu calendario, el temporizador de enfoque, el tablero Kanban, o tareas por categoría. Cada panel puede llevar un segundo panel más pequeño debajo, que es como consigues un temporizador y tu lista de tareas lado a lado mientras trabajas.',
      ],
    },
    firebaseSync: {
      title: 'Sincronización en la nube',
      summary: 'Mantén varios dispositivos al día.',
      body: [
        'La sincronización en la nube conecta la app a un proyecto de Firebase que es tuyo, así que tus datos están en tu propia cuenta en vez de en el servicio de otra persona. La app te guía en cuatro pasos: crear un proyecto, activar Firestore, copiar la configuración desde los ajustes del proyecto, y pegarla. Comprueba la conexión antes de guardar.',
        'Una vez conectado, un cambio en un dispositivo llega a los demás en segundos. También elimina el límite de almacenamiento local, que es de lo que trata el aviso de almacenamiento cuando aparece, y es lo que necesitan las notas de Canvas para funcionar.',
        'La sincronización puede cifrarse de extremo a extremo, de modo que ni siquiera alguien capaz de leer tu base de datos pueda leer tus datos. Si te conectas sin ello, se te avisa y se te ofrece Activar el cifrado ahora. Esta contraseña es independiente del cifrado en el dispositivo: fijar una no fija la otra, y un dispositivo que desbloquee una puede seguir necesitando la otra.',
      ],
    },
    collab: {
      title: 'Collab',
      summary: 'Comparte tareas y tarjetas con otras personas.',
      body: [
        'Collab necesita primero que la sincronización en la nube funcione, y luego una configuración única en tu consola de Firebase: publicar las reglas de seguridad que te muestra la app, y activar el inicio de sesión anónimo. La guía recorre los cuatro pasos, y después activas collab desde el mismo panel.',
        'Crea un equipo, luego invita a gente con un enlace de invitación. Las invitaciones tienen su propia caducidad, un día por defecto, independiente de cuánto dura el equipo en sí. El enlace contiene la clave necesaria para leer el equipo, así que trátalo como una contraseña y envía uno nuevo si caduca.',
        'Dos ajustes por equipo deciden cómo se comporta, y solo el anfitrión puede cambiarlos. La Finalización de tareas compartidas es o bien alternar para todos, la opción por defecto, donde una persona la marca y se completa para todos, o bien finalización personal, donde cada miembro sigue la suya. Los Permisos de edición de tareas son o bien abiertos a cualquiera, la opción por defecto, o bien solo el anfitrión.',
        'El anfitrión puede renombrar el equipo, generar invitaciones, y eliminarlo. Los miembros pueden salir. En cualquier caso, si habías compartido tus propias tareas locales en el equipo, se te pregunta si quieres conservar esas copias en tu dispositivo o eliminarlas junto con él.',
      ],
    },
    dataTransfer: {
      title: 'Exportar e importar',
      summary: 'Mueve tus datos como un archivo.',
      body: [
        'Exportar JSON escribe todo a un archivo e Importar JSON lee uno de vuelta. Esto es una instantánea en vez de un enlace en vivo, lo que lo hace adecuado para copias de seguridad y para pasar a un dispositivo nuevo, y no adecuado para mantener dos dispositivos igualados. Usa la sincronización en la nube para eso.',
        'Con el cifrado activo, exportar ofrece una elección: el formato cifrado del organizador, o JSON simple legible por humanos. El legible es fácil de inspeccionar y está completamente desprotegido, así que trata ese archivo con cuidado.',
        'Para cantidades menores de datos también está Copiar enlace para compartir y un código QR, la forma más rápida de pasar una configuración a un dispositivo que tengas al lado. Los estados muy grandes no caben en un enlace y la app te lo indicará.',
      ],
    },
    settings: {
      title: 'Ajustes',
      summary: 'Semestre, asignaturas, apariencia y apps.',
      body: [
        'Trabaja de arriba abajo la primera vez. Fija el nombre del semestre y sus fechas de inicio y fin, y el número de semanas se calcula por ti. Luego añade asignaturas, cada una con créditos y un color, y cualquier festivo. La mayor parte de la app depende de esto, así que va primero. Cargar preajuste puede rellenar fechas y asignaturas para un grado conocido.',
        'Dos interruptores cambian para qué sirve la app. El Modo trabajo renombra las asignaturas como grupos y oculta las notas y los créditos, para usarlo fuera de un grado universitario. El Modo sin semestre elimina por completo el sistema de semestres y en su lugar cuenta simples semanas del año. General también tiene tres colores de tema, si las tareas nuevas aparecen en el calendario, cómo se marcan las tareas de varias semanas, y los ajustes de alerta de fecha límite.',
        'La Barra de navegación reordena pestañas arrastrando, las renombra, oculta las que no usas, y agrupa el resto en carpetas. Mostrar elige iconos, nombres, o ambos, y en un móvil la barra puede ir abajo o al lado.',
        'Apps es donde se activan y desactivan funciones, incluidas Notas, Pomodoro, Reposo, Eisenhower y las integraciones de calendario. Desactivar una app borra los datos de esa app, así que primero lo pregunta.',
        'El Cifrado bloquea los datos de este dispositivo tras una contraseña de al menos ocho caracteres, con una pista opcional y un código de recuperación de doce palabras que se muestra una sola vez. Guarda ese código en otro sitio, porque es la única forma de volver a entrar si olvidas la contraseña. Más tarde puedes cambiar la contraseña, generar un nuevo código de recuperación, o rotar la clave, lo que vuelve a cifrar todo y hace que los demás dispositivos tengan que desbloquear de nuevo.',
        'La zona de peligro al final elimina el semestre y sus tareas, notas y tablero, y borra los datos de pomodoro. Cada una pide confirmación antes.',
      ],
    },
  },
}
