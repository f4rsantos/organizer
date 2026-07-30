export const fr = {
  title: 'Guides',
  subtitle: 'Comment chaque partie de l\'organizer fonctionne, et à quoi elle sert.',
  close: 'Fermer les guides',
  sections: {
    core: 'Essentiel',
    productivity: 'Productivité',
    sync: 'Synchronisation du calendrier',
    ambient: 'Ambiant',
    sharing: 'Sync et partage',
    setup: 'Configuration',
  },
  entries: {
    tasks: {
      title: 'Tâches',
      summary: 'Tout ce qui est dû cette semaine, groupé par matière.',
      body: [
        'Tâches affiche une semaine à la fois, groupée sous la matière à laquelle chaque tâche appartient. Chaque en-tête de matière porte un anneau montrant votre progression, et vider toute la semaine déclenche des confettis. Les flèches en haut passent d\'une semaine à l\'autre, et l\'en-tête indique le nom de toute vacance tombant dans la semaine.',
        'Appuyez sur le bouton rond + pour ouvrir le formulaire. Remplissez Matière et Priorité en haut, puis le titre. Vous pouvez aussi écrire naturellement : tapez « essai calcul demain » et lorsque vous quittez le champ, la matière et la date d\'échéance se remplissent toutes seules. Cela ne remplit que les champs que vous n\'avez pas déjà définis vous-même.',
        'Deux champs de date ont des rôles différents. La date d\'échéance place la tâche sur le calendrier et déclenche l\'alerte du jour même. De la semaine et Jusqu\'à la semaine décident dans quelles semaines de la liste Tâches elle apparaît. Définir une date d\'échéance ajuste automatiquement la plage de semaines, mais seulement jusqu\'à ce que vous choisissiez vous-même une semaine, après quoi votre choix reste.',
        'Activez Répéter pour quelque chose de récurrent. Choisissez Quotidien, Hebdomadaire ou Mensuel, réglez Tous les pour répéter moins souvent (toutes les 2 semaines, par exemple), et éventuellement réglez Jusqu\'à pour l\'arrêter. Chaque occurrence est cochée séparément, donc terminer cette semaine laisse la suivante intacte.',
        'Sur une ligne de tâche, appuyez sur le cercle pour la terminer. Les icônes à côté, derrière un menu sur mobile, ajoutent la tâche au tableau Kanban, la modifient, la partagent à une équipe Collab, ou la suppriment. Le partage va directement à votre équipe si vous n\'en avez qu\'une, sinon il demande laquelle.',
        'Les tâches dues aujourd\'hui se rassemblent dans une bannière au-dessus de la liste. L\'icône d\'horloge fixe une heure de rappel précise, le X masque cette tâche pour la journée seulement. Que les alertes apparaissent dans l\'app, sous forme de notification, ou les deux, se règle sous Réglages, Général, Alertes d\'échéance des tâches, qui commence à Aucune. Réglez le mode sur Notification ou Les deux et vous obtenez aussi Heure de l\'alerte du lendemain, qui vaut 18:00 par défaut.',
        'Si une tâche s\'étend sur plusieurs semaines, Réglages, Général, Comportement des tâches sur plusieurs semaines décide si elle doit être cochée une fois globalement ou une fois par semaine.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Faites glisser le travail entre les colonnes jusqu\'à ce qu\'il soit fait.',
      body: [
        'Le tableau organise le travail par étape plutôt que par date, ce qui convient à tout ce qui progresse par étapes. Ajoutez une carte avec Ajouter une carte au bas d\'une colonne, puis appuyez sur Entrée pour enregistrer ou Échap pour annuler.',
        'Faites glisser les cartes entre les colonnes, ou utilisez les flèches gauche et droite dans le menu de la carte. Sur téléphone, appuyez brièvement avant de glisser. Atteindre la dernière colonne compte comme terminé et déclenche des confettis. Les colonnes se replient sur mobile avec le chevron dans l\'en-tête.',
        'Ouvrez une carte avec l\'icône flèche pour définir une priorité, une date d\'échéance, une matière, et une checklist. Ajouter un élément construit la checklist. La boîte de dialogue enregistre quand vous la fermez, y compris en cliquant à l\'extérieur, donc il n\'y a pas d\'annulation séparée.',
        'Les checklists peuvent s\'afficher sur le devant d\'une carte. Réglages, Kanban, Aperçu de la checklist Kanban propose Masquer sur les cartes, qui est la valeur par défaut, Afficher sur toutes les cartes, et Au cas par cas. Avec Au cas par cas, vous activez l\'aperçu pour des cartes individuelles en double-cliquant dessus, ce qui garde les cartes chargées lisibles tandis que les cartes détaillées restent développées.',
        'Ajouter aux tâches place aussi une carte dans votre liste Tâches hebdomadaire, pour le travail du tableau qui a aussi une échéance. Ajouter automatiquement les tâches au tableau, dans la même section de réglages et désactivé par défaut, fait l\'inverse pour les tâches de cette semaine.',
        'Effacer les terminées supprime tout ce qui se trouve dans la dernière colonne ; Tout effacer vide le tableau. Les deux demandent confirmation d\'abord. Les colonnes se renomment, se réordonnent en faisant glisser la poignée, et s\'ajoutent sous Réglages, Kanban, bien que les trois colonnes d\'origine ne puissent pas être supprimées.',
      ],
    },
    grades: {
      title: 'Évaluations',
      summary: 'Suivez les composantes pondérées et ce qu\'il vous reste à faire.',
      body: [
        'Définissez d\'abord sur quoi chaque matière est notée, sous Réglages, Composantes de note. Ajouter une composante crée une ligne à 25% par défaut, donc ajustez les poids jusqu\'à ce que le total affiche 100%. Il reste rouge jusque-là.',
        'Sur l\'onglet Évaluations, saisissez les notes sur 20 au fur et à mesure. Le grand nombre sur chaque carte est votre score accumulé, qui ne compte que ce qui a été noté jusqu\'à présent et devient rouge sous 9,5.',
        'Quand une composante a plusieurs notes, appuyez sur + sur sa ligne pour la diviser en parties. Le premier appui crée deux parties et efface la note du parent, et chaque appui suivant en ajoute une autre, le poids du parent étant réparti également entre elles. Une composante divisée n\'est notée qu\'à travers ses parties.',
        'Le panneau en dessous répond à la question qui compte vraiment : ce dont vous avez besoin sur tout ce qui n\'est pas encore noté pour finir où vous voulez. Note visée vaut 9,5 par défaut, la moyenne, et vous pouvez la relever. Si atteindre votre objectif nécessiterait plus de 20, il affiche non atteignable plutôt qu\'un nombre impossible.',
        'Le pied de page totalise votre moyenne semestrielle pondérée par les crédits et les crédits que vous êtes en voie de valider, en comptant une matière à partir de 9,5. En dessous, les semestres précédents prennent chacun une note finale, et l\'encadré moyenne du cours prend votre moyenne précédente et le nombre de semestres qu\'elle couvre, puis projette où se situera le cours entier une fois ce semestre intégré.',
      ],
    },
    calendar: {
      title: 'Calendrier',
      summary: 'Vues jour, semaine, mois et année de tout ce qui est daté.',
      body: [
        'Quatre vues partagent un seul calendrier. Jour et semaine dessinent une grille horaire pour le détail de l\'heure ; mois et année montrent la forme du semestre. Tâches, événements et vacances apparaissent tous ensemble, colorés par matière.',
        'En vue jour ou semaine, faites glisser vers le bas sur la grille horaire pour bloquer du temps. Les heures s\'alignent au quart d\'heure et tout ce qui est plus court que 30 minutes est arrondi à 30. Le formulaire d\'événement s\'ouvre avec ces heures déjà remplies. Faites glisser latéralement sur les colonnes de jours pour créer quelque chose s\'étendant sur plusieurs jours.',
        'En vue mois ou année, chaque jour affiche jusqu\'à trois puces puis « +N de plus ». Cliquez sur le jour pour tout voir et ajouter un événement à cette date.',
        'Le formulaire d\'événement prend un titre, une date, une heure de début et de fin, une couleur, et une note facultative. Laissez l\'heure de début vide pour un événement toute la journée. Activez Plusieurs jours pour obtenir un deuxième champ de date pour la fin. Si Google Calendar est connecté, vous obtenez aussi un interrupteur par événement pour le pousser là-bas.',
        'Les titres sont aussi lus pour les dates et les heures, donc « réunion vendredi 15h-17h » arrive déjà rempli. Les événements venant de Google Calendar ou du calendrier du cursus sont en lecture seule ici, puisque la source les possède.',
      ],
    },
    focus: {
      title: 'Focus',
      summary: 'Un minuteur avec des pauses adaptées à votre façon de travailler.',
      body: [
        'Appuyez sur Démarrer et le chronomètre de session tourne. Pause et Réinitialiser sont toujours là, et pendant une pause vous pouvez la passer plus tôt.',
        'L\'icône d\'engrenage ouvre les réglages de pause, et les deux types fonctionnent indépendamment, donc vous pouvez utiliser l\'un, l\'autre, ou les deux. Les pauses par intervalle sont activées par défaut à 25 minutes de travail et 5 minutes de pause, la forme pomodoro habituelle. Les pauses programmées se déclenchent plutôt à des heures fixes de la journée, ce qui convient à un emploi du temps qui a déjà des trous : réglez une heure et une minute, choisissez une durée, et appuyez sur + pour l\'ajouter à la liste.',
        'Le même panneau vous permet de remplacer les mots affichés pendant le focus et la pause par les vôtres.',
        'Sous Réglages, Focus, Après la pause décide de ce qu\'une pause fait à votre total en cours. Réinitialiser le minuteur recommence le compte, ce qui convient pour compter des sessions individuelles ; continuer à compter reporte le total, ce qui convient pour mesurer une journée entière. Mode d\'alerte Focus ajoute un signal au changement de phase : Aucune, Vibration, Notification, ou Les deux.',
        'Fermer l\'onglet en pleine session ne gonfle pas vos chiffres. Si vous revenez bien plus tard, le minuteur comprend que vous étiez absent et se met en pause plutôt que de créditer tout l\'écart comme du focus.',
      ],
    },
    notes: {
      title: 'Notes',
      summary: 'Un éditeur riche avec dossiers, recherche et maths.',
      body: [
        'Les notes vivent dans des dossiers que vous pouvez imbriquer en faisant glisser l\'un sur l\'autre. Le bouton + crée une note, le bouton dossier crée un dossier, et double-cliquer sur un nom de dossier le renomme. La recherche filtre au fur et à mesure que vous tapez, l\'icône grille bascule entre les mises en page liste et mosaïque, et les notes favorites remontent toujours en haut. Archiver est l\'alternative douce à la suppression : les notes archivées quittent l\'arborescence et se rassemblent derrière leur propre filtre.',
        'La barre d\'outils couvre gras, italique, barré, trois niveaux de titre, listes à puces, numérotées et à cases à cocher, citations, tableaux, blocs de code, séparateurs, liens, couleur et taille du texte, plus annuler et rétablir. Il y a un bouton microphone là où la dictée est prise en charge.',
        'Tapez @ suivi de quelques lettres pour lier une tâche par son nom. Cela suggère les tâches ouvertes correspondantes, les flèches parcourent la liste, et Entrée insère le lien, ce qui garde une note liée au travail auquel elle appartient.',
        'La résolution mathématique, sous Réglages, Apps, Notes, est désactivée jusqu\'à ce que vous l\'activiez. Une fois activée, terminez une ligne par = et appuyez sur Entrée pour la résoudre, y compris les inéquations et les équations du second degré. Trois sous-options, toutes activées une fois la fonction activée, contrôlent la résolution en x, le tracé d\'une équation sélectionnée sous forme de graphique, et si le raisonnement s\'affiche étape par étape ou seulement le résultat.',
        'Les notes s\'importent depuis Markdown et texte brut, et s\'exportent en Markdown, texte brut, page web, Word, ou s\'impriment en PDF. Les notes en écriture manuscrite nécessitent la sync cloud activée, car les dessins sont volumineux et sont stockés à distance. Le canevas dispose d\'un stylo et d\'une gomme, cinq épaisseurs et cinq couleurs, dont une suit votre thème. La gomme efface un trait entier plutôt qu\'une partie.',
      ],
    },
    eisenhower: {
      title: 'Matrice d\'Eisenhower',
      summary: 'Triez les tâches par urgence face à importance.',
      body: [
        'La matrice découpe le travail selon deux axes, urgent et important, donnant quatre cases : à faire maintenant, à planifier, à déléguer, et à abandonner. L\'intérêt est de séparer ce qui est simplement bruyant de ce qui compte réellement, ce qu\'une liste plate dissimule.',
        'Vos tâches commencent dans le plateau non trié. Faites glisser chacune dans la case qui lui convient, et déplacez-la ailleurs quand cela change. Tout ce qui a plus d\'une semaine de retard reste hors de la grille, pour qu\'un vieux retard n\'enterre pas la situation actuelle.',
        'Les noms et couleurs des quadrants sont modifiables dans les réglages de l\'app, ce qui vaut la peine si les étiquettes classiques ne correspondent pas à votre façon de penser votre propre travail.',
      ],
    },
    quickAction: {
      title: 'Action rapide',
      summary: 'Tapez ce que vous voulez en langage courant.',
      body: [
        'Appuyez sur Ctrl+K n\'importe où pour l\'ouvrir, ou activez le geste triple-tap pour les téléphones. Tapez une phrase simple, appuyez sur Entrée, et l\'app comprend ce que vous vouliez dire. Le raccourci peut être réattribué dans les réglages de l\'app.',
        'Pour un seul élément, « ajoute tâche essai pour calculus demain à 15h » fixe le titre, la matière, la date et l\'heure en une fois. La priorité et la répétition fonctionnent aussi : « ajoute tâche sport tous les lundis priorité haute ».',
        'Cela crée plus que des tâches. « ajoute carte kanban refonte » fait une carte dans la première colonne, « ajoute carte refonte dans doing » la place dans une colonne nommée, et « ajoute événement du calendrier cours 15h-17h » fait un événement chronométré.',
        'Faire plusieurs choses à la fois, c\'est là que ça fait vraiment gagner du temps. « ajoute tâches alpha, beta, gamma » en fait trois. « ajoute tâches ppt 1, 2, 3 » comprend le préfixe commun et fait ppt 1, ppt 2 et ppt 3. « ajoute tâches alpha et beta pour demain et 18/07 respectivement » donne à chacune sa propre date dans l\'ordre.',
        'L\'app agit aussi sur ce qui existe déjà, en associant vos mots de façon approximative à vos titres de tâches plutôt que d\'exiger une correspondance exacte : « supprimer courses », « partager notes avec study group », « ouvrir réglages », « démarrer focus 20m pause 5m », « passer la pause ». Les notes fonctionnent aussi, comme dans « note 15 en partiel pour calculus ».',
        'Tout ceci suit la langue de votre app, donc les commandes fonctionnent dans la langue que vous utilisez déjà.',
      ],
    },
    googleCalendar: {
      title: 'Synchronisation Google Calendar',
      summary: 'Synchronisation bidirectionnelle avec votre calendrier Google.',
      body: [
        'Connectez-vous une fois en collant un identifiant client Google, en suivant les étapes numérotées dans l\'app. Ensuite, cela se synchronise tout seul toutes les quelques minutes et à chaque fois que vous revenez à la fenêtre.',
        'La synchronisation fonctionne dans les deux sens. Les événements de Google apparaissent avec tout le reste, et les événements que vous créez ici peuvent être poussés là-bas via l\'interrupteur du formulaire d\'événement. Quand le même événement a changé aux deux endroits, la modification la plus récente l\'emporte. Supprimer un événement synchronisé ici le retire aussi de Google.',
      ],
    },
    eiCalendar: {
      title: 'Calendrier du cursus',
      summary: 'Dates officielles du cursus, récupérées automatiquement.',
      body: [
        'Quand votre semestre utilise un préréglage de cursus pris en charge, cela récupère le calendrier public du cursus et le filtre à votre année, afin que vous ne voyiez que les échéances qui s\'appliquent réellement à vous plutôt que toutes les années à la fois.',
        'Ces entrées sont en lecture seule, car le cursus les possède. Elles se mettent à jour quand le cursus se met à jour, ce qui veut dire que les dates officielles arrivent sans que vous ayez rien à recopier.',
        'Disponible uniquement pour le cursus EI.',
      ],
    },
    pomodoro: {
      title: 'Tomates Pomodoro',
      summary: 'Une tomate pour chaque session de focus terminée.',
      body: [
        'Activez ceci depuis la grille Apps et chaque intervalle de focus terminé fait tomber une tomate dans l\'onglet. Les sessions plus longues font pousser de plus grosses tomates, et abandonner une session en cours de route laisse une tomate plus petite et délavée, de sorte que le tas reste un registre honnête plutôt qu\'une étagère à trophées. Il y a une courte période de grâce pour annuler une session qui vient de se terminer sans qu\'elle compte.',
        'Les tomates sont physiques. Faites-les glisser et lancez-les, elles rebondissent et se posent, et sur un téléphone qui le prend en charge, incliner l\'appareil change le sens de leur chute. Afficher la superposition globale sur tous les onglets leur permet de dériver dans toute l\'app plutôt que seulement dans Focus.',
        'Le badge au-dessus de la roue ouvre les statistiques. Là, vous obtenez des totaux pour la période et pour toujours, les comptes abandonnés, les séries quotidiennes actuelle et record, un graphique en barres du focus par jour cette semaine, et une tendance sur six mois. Copier le résumé met une version en texte brut dans votre presse-papiers.',
        'Période de réinitialisation définit ce que signifie « cette période » : quotidienne, hebdomadaire, ce qui est la valeur par défaut, mensuelle, ou par semestre. Afficher les pomodoros de la période et Suivre les stats de période sont des interrupteurs séparés, donc vous pouvez garder les statistiques sans le badge, bien que désactiver le badge arrête aussi le suivi.',
      ],
    },
    standby: {
      title: 'Veille',
      summary: 'Transformez un téléphone posé en affichage de bureau.',
      body: [
        'La veille apparaît d\'elle-même quand un téléphone est tourné en paysage, donc un téléphone posé devient un affichage de bureau sans que vous ayez rien à ouvrir. L\'écran est maintenu allumé pendant qu\'elle fonctionne.',
        'Choisissez un à trois volets et ce que chacun affiche : une roue d\'horloge, l\'heure, votre calendrier, le minuteur focus, le tableau Kanban, ou les tâches par catégorie. Chaque volet peut porter un deuxième panneau plus petit en dessous, ce qui permet d\'avoir un minuteur et votre liste de tâches côte à côte pendant que vous travaillez.',
      ],
    },
    firebaseSync: {
      title: 'Synchronisation cloud',
      summary: 'Gardez plusieurs appareils au même niveau.',
      body: [
        'La synchronisation cloud connecte l\'app à un projet Firebase que vous possédez, donc vos données se trouvent dans votre propre compte plutôt que dans le service de quelqu\'un d\'autre. L\'app vous guide en quatre étapes : créer un projet, activer Firestore, copier la configuration depuis les paramètres du projet, et la coller. Elle vérifie la connexion avant d\'enregistrer.',
        'Une fois connecté, un changement sur un appareil atteint les autres en quelques secondes. Cela lève aussi la limite de stockage local, ce dont parle l\'avertissement de stockage quand il apparaît, et c\'est ce dont les notes en écriture manuscrite ont besoin pour fonctionner.',
        'La synchronisation peut être chiffrée de bout en bout, de sorte que même quelqu\'un capable de lire votre base de données ne puisse pas lire vos données. Si vous vous connectez sans cela, vous êtes averti et on vous propose Chiffrer maintenant. Cette phrase secrète est distincte du chiffrement sur l\'appareil : en définir une ne définit pas l\'autre, et un appareil déverrouillant l\'une peut quand même avoir besoin de l\'autre.',
      ],
    },
    collab: {
      title: 'Collab',
      summary: 'Partagez tâches et cartes avec d\'autres personnes.',
      body: [
        'Collab a d\'abord besoin que la synchronisation cloud fonctionne, puis d\'une configuration unique dans votre console Firebase : publier les règles de sécurité que l\'app vous montre, et activer la connexion anonyme. Le guide vous accompagne dans les quatre étapes, et ensuite vous activez la collab depuis le même panneau.',
        'Créez une équipe, puis invitez des personnes via un lien d\'invitation. Les invitations ont leur propre expiration, un jour par défaut, distincte de la durée de vie de l\'équipe elle-même. Le lien contient la clé nécessaire pour lire l\'équipe, donc traitez-le comme un mot de passe et envoyez-en un nouveau s\'il expire.',
        'Deux réglages par équipe décident de son comportement, et seul l\'hôte peut les changer. L\'achèvement des tâches partagées est soit basculer pour tous, la valeur par défaut, où une personne cochant quelque chose l\'efface pour tout le monde, soit achèvement personnel, où chaque membre suit le sien. Les permissions de modification des tâches sont soit ouvertes à tout le monde, la valeur par défaut, soit réservées à l\'hôte.',
        'L\'hôte peut renommer l\'équipe, générer des invitations, et la supprimer. Les membres peuvent partir. Dans les deux cas, si vous aviez partagé vos propres tâches locales dans l\'équipe, on vous demande si vous voulez garder ces copies sur votre appareil ou les supprimer avec elle.',
      ],
    },
    dataTransfer: {
      title: 'Export et import',
      summary: 'Déplacez vos données sous forme de fichier.',
      body: [
        'Exporter JSON écrit tout dans un fichier et Importer JSON en relit un. C\'est un instantané plutôt qu\'un lien en direct, ce qui le rend adapté aux sauvegardes et au passage à un nouvel appareil, et inadapté au maintien de deux appareils synchronisés. Utilisez la synchronisation cloud pour cela.',
        'Avec le chiffrement activé, l\'export propose un choix : le format organizer chiffré, ou le JSON brut lisible par un humain. Le format lisible est facile à inspecter et complètement non protégé, donc traitez ce fichier avec précaution.',
        'Pour de plus petites quantités de données, il y a aussi Copier le lien de partage et un code QR, ce qui est le moyen le plus rapide de déplacer une configuration vers un appareil posé à côté de vous. Les états très volumineux ne tiendront pas dans un lien et l\'app vous le dira.',
      ],
    },
    settings: {
      title: 'Réglages',
      summary: 'Semestre, matières, apparence et apps.',
      body: [
        'Travaillez de haut en bas la première fois. Définissez le nom du semestre et ses dates de début et de fin, et le nombre de semaines est calculé pour vous. Ajoutez ensuite les matières, avec des crédits et une couleur chacune, et les vacances éventuelles. La majeure partie de l\'app se base là-dessus, donc cela vient en premier. Charger un préréglage peut remplir les dates et les matières pour un cursus connu.',
        'Deux interrupteurs changent l\'usage de l\'app. Le mode travail renomme les matières en groupes et masque les évaluations et les crédits, pour une utilisation en dehors d\'un cursus. Le mode sans semestre abandonne entièrement le système de semestre et compte de simples semaines annuelles à la place. Général contient aussi trois couleurs de thème, si les nouvelles tâches s\'affichent sur le calendrier, comment les tâches sur plusieurs semaines sont cochées, et les réglages d\'alerte d\'échéance.',
        'Barre de navigation réordonne les onglets en les faisant glisser, les renomme, masque ceux que vous n\'utilisez pas, et regroupe le reste en dossiers. Afficher choisit icônes, noms, ou les deux, et sur téléphone la barre peut se placer en bas ou sur le côté.',
        'Apps est l\'endroit où les fonctionnalités s\'activent et se désactivent, y compris Notes, Pomodoro, Veille, Eisenhower et les intégrations de calendrier. Désactiver une app efface les données de cette app, donc l\'app demande d\'abord confirmation.',
        'Chiffrement verrouille les données de cet appareil derrière une phrase secrète d\'au moins huit caractères, avec un indice facultatif et un code de récupération de douze mots affiché une seule fois. Enregistrez ce code ailleurs, car c\'est le seul moyen de revenir si la phrase secrète est oubliée. Plus tard, vous pouvez changer la phrase secrète, émettre un nouveau code de récupération, ou faire tourner la clé, ce qui rechiffre tout et fait que les autres appareils doivent se déverrouiller à nouveau.',
        'La zone sensible en bas supprime le semestre et ses tâches, évaluations et tableau, et efface les données pomodoro. Chacune demande confirmation d\'abord.',
      ],
    },
  },
}
