export const pirate = {
  title: 'Charts',
  subtitle: 'How every part o\' this here organizer works, and when it be worth usin\'.',
  close: 'Close the charts',
  sections: {
    core: 'The Core',
    productivity: 'Gettin\' Things Done',
    sync: 'Almanac sync',
    ambient: 'Ambient',
    sharing: 'Sync and sharin\'',
    setup: 'Riggin\' Up',
  },
  entries: {
    tasks: {
      title: 'Chores',
      summary: 'Everythin\' owed this fortnight, mustered by crew.',
      body: [
        'Chores shows one fortnight at a time, mustered under the crew each chore belongs to. Every crew header carries a ring showin\' how far through it ye be, and clearin\' the whole fortnight sets off confetti fit fer a homecomin\'. The arrows up top move ye between fortnights, and the header names any shore leave fallin\' inside it.',
        'Press the round + button to open the form. Fill in Crew and Rank at the top, then the title. Ye can also just talk plain: write "essay calculus tomorrow" and when ye leave the field it fills in the crew and reckonin\' day fer ye. It only fills in what ye have not already set yerself.',
        'Two day fields do different jobs. Reckonin\' day places the chore on the almanac and drives the due-this-day alert. From fortnight and To fortnight decide which fortnights of the Chores list it shows up in. Settin\' a reckonin\' day moves the fortnight range to match automatic-like, but only till ye pick a fortnight yerself, after which yer choice sticks.',
        'Turn on Repeat fer somethin\' recurrin\'. Choose Daily, Weekly or Monthly, set Every to repeat less often than that (every 2 weeks, say), and if ye like, set Until to stop it. Each occurrence be ticked off separate, so finishin\' this fortnight leaves the next one untouched.',
        'On a chore row, tap the circle to mark it plundered. The marks alongside, behind a menu on a phone, add the chore to the Plank Board, amend it, share it to a Crewmates crew, or send it to Davy Jones. Sharin\' goes straight to yer crew if ye only got one, otherwise it asks which.',
        'Chores due this day collect in a banner above the list. The bell mark sets a particular reminder time, the X hides that chore fer today only. Whether alerts show on deck, as a signal flag, or both is under Ship\'s Orders, General, Chore reckoning-day alerts, which starts at None. Set the mode to Signal flag or Both and ye also get Morrow alert bell, which starts at 18:00.',
        'If a chore spans several fortnights, Ship\'s Orders, General, Chore span behaviour decides whether it needs tickin\' once overall or once per fortnight.',
      ],
    },
    kanban: {
      title: 'Plank Board',
      summary: 'Drag work across the planks till it be done.',
      body: [
        'The board sorts work by stage rather than by day, which suits anythin\' that moves through steps. Add a parchment with Add parchment at the bottom of a column, then press Enter to stow it or Escape to belay.',
        'Drag parchments between columns, or use the haul-larboard and haul-starboard marks in the parchment menu. On a phone, press and hold a spell before draggin\'. Reachin\' the last column counts as plundered and sets off confetti. Columns fold up on mobile with the chevron in the header.',
        'Open a parchment with the arrow mark to set a rank, a reckonin\' day, a crew, and a tally. Add mark builds the tally. The log stows itself when ye close it, even by clickin\' outside it, so there be no separate belay button.',
        'Tallies can show right on the front of a parchment. Ship\'s Orders, Plank Board, Plank Board tally peek offers Hide on parchments, which be the default, Show on all parchments, and Case by case. With Case by case ye turn the peek on for particular parchments by double-clickin\' them, which keeps busy parchments readable while the detailed ones stay unfurled.',
        'Add to chores puts a parchment in yer fortnightly Chores list too, fer board work that also has a reckonin\' day. Auto-add booty to th\' board, in the same corner o\' Ship\'s Orders and lowered by default, does the reverse fer this fortnight\'s chores.',
        'Toss the plundered clears everythin\' in the final column; Scuttle all empties the whole board. Both ask fer yer say-so first. Columns get renamed, reordered by draggin\' the grip, and added under Ship\'s Orders, Plank Board, though the three original columns cannot be scuttled.',
      ],
    },
    grades: {
      title: 'Booty',
      summary: 'Track weighted booty pieces and what ye still be needin\'.',
      body: [
        'First chart what each crew be graded on, under Ship\'s Orders, Booty pieces. Add booty piece makes a row worth 25% by default, so adjust the weights till the runnin\' total reads 100%. It stays red as blood till it does.',
        'On the Booty tab, log scores out of 20 as ye earn \'em. The big number on each parchment be yer hoarded score, which only counts what has been reckoned so far and turns red below 9.5.',
        'When one booty piece has several reckoned bits, press + on its row to split it into parts. The first press makes two parts and clears the parent\'s score, and each further press adds another, with the parent\'s weight split even between \'em. A split booty piece be reckoned only through its parts.',
        'The panel below answers the question that truly matters: what ye be needin\' on everythin\' still unreckoned to finish where ye want. Aimed booty be 9.5 by default, a passin\' mark, and ye can raise it. If reachin\' yer aim would take more than 20, it says not reachable rather than showin\' an impossible number.',
        'The footer totals yer credit-weighted voyage average and the ECTS ye be on track to plunder, countin\' a crew from 9.5 up. Below that, past voyages each take a final booty score, and the course average box takes yer previous average and how many voyages it covers, then charts where the whole course lands once this voyage be folded in.',
      ],
    },
    calendar: {
      title: 'Almanac',
      summary: 'Sun-turn, sennight, moon, and voyage views o\' everythin\' with a day.',
      body: [
        'Four views share one almanac. Sun-turn and sennight draw an hourly grid fer time-o\'-day detail; moon and voyage show the shape o\' the whole term. Chores, happenins, and shore leave all show together, coloured by crew.',
        'In sun-turn or sennight view, drag down the hourly grid to block out time. Times snap to quarter bells and anythin\' shorter than 30 minutes gets rounded up to 30. The happenin\' form opens with those times already filled in. Drag sideways across the day columns to make somethin\' spannin\' several days.',
        'In moon or voyage view each day shows up to three chips and then "+N more". Click the day to see everythin\' on it and to add a happenin\' to that day.',
        'The happenin\' form takes a title, day, start and end time, a colour, and an optional scrawl. Leave the start time empty fer an all-day happenin\'. Turn on Many a day to get a second day field fer the end. If Google Calendar be moored, ye also get a per-happenin\' switch to send it there.',
        'Titles be read fer days and times too, so "meetin\' friday 15h-17h" arrives already filled in. Happenins comin\' from Google Calendar or the course almanac be read-only here, since the source owns \'em.',
      ],
    },
    focus: {
      title: 'Steady Aim',
      summary: 'A glass with grog-breaks that fit how ye truly work.',
      body: [
        'Press Set sail and the watch bell starts runnin\'. Drop anchor and Reset be always there, and durin\' a grog-break ye can skip it early.',
        'The gear mark opens grog settings, and the two kinds work independent-like, so ye can use one or both. Interval grog be hoisted by default at 25 minutes o\' work and 5 minutes o\' grog, the usual pomodoro shape. Scheduled grog fires at fixed bells o\' the day instead, which suits a watch schedule that already has gaps in it: set an hour and minute, choose a length, and press + to add it to the list.',
        'The same panel lets ye swap the cries shown durin\' Steady Aim and grog fer yer own.',
        'Under Ship\'s Orders, Steady Aim, After grog decides what a grog-break does to yer runnin\' total. Reset the glass starts the count again, which suits countin\' single watches; keep the glass runnin\' carries the total forward, which suits measurin\' a whole day. Steady Aim alert mode adds a signal when the watch changes: None, Rumble, Signal flag, or Both.',
        'Closin\' the tab mid-watch does not swell yer numbers. If ye come back much later, the glass works out ye were away and drops anchor rather than creditin\' the whole gap as steady aim.',
      ],
    },
    notes: {
      title: 'Scrolls',
      summary: 'A rich quill with chests, search, and reckonin\'.',
      body: [
        'Scrolls live in chests ye can nest by draggin\' one onto another. The + button makes a scroll, the chest button makes a chest, and double-clickin\' a chest name renames it. Search filters as ye type, the grid mark switches between list and mosaic layouts, and prized scrolls always sort to the top. Archive be the gentler way than scuttlin\': archived scrolls leave the tree and gather behind their own filter.',
        'The toolbar covers bold as brass, leanin\' like a mast, struck through, three grand-to-wee title levels, shot lists, numbered and ship\'s checklists, quoted yarns, tables, cipher blocks, rope dividers, tied lines, ink colour and ink size, plus belay that and at it again. There be a mic button where dictatin\' be supported.',
        'Type @ followed by a few letters to tie a chore by name. It suggests matchin\' open chores, arrow keys move through \'em, and Enter ties the line, which keeps a scroll bound to the work it belongs to.',
        'Reckonin\' the numbers, under Ship\'s Orders, Riggin\', Scrolls, be lowered till ye hoist it. With it hoisted, end a line with = and press Enter to solve it, includin\' inequalities and squares. Three sub-settings, all hoisted once enabled, steer huntin\' down x, chartin\' a marked equation as a curve, and whether the reckonin\' shows step by step or just the prize.',
        'Scrolls import from Markdown and plain text, and export as Markdown, plain text, web page, Word, or print to PDF. Canvas scrolls fer quill work need cloud sync hoisted, since drawins be large and be stowed remotely. The canvas has a quill and eraser, five widths and five colours, one o\' which follows yer ship colours. The eraser removes a whole stroke rather than part o\' one.',
      ],
    },
    eisenhower: {
      title: 'Eisenhower matrix',
      summary: 'Sort chores by urgency against import.',
      body: [
        'The matrix splits work along two lines, urgent and important, givin\' four quarters: do it now, chart it fer later, hand it to a hand, and let it sink. The worth be in tellin\' apart what be merely loud from what truly matters, which a flat list hides from ye.',
        'Yer chores start in the unsorted hold. Drag each into the quarter that fits, and drag it elsewhere when that changes. Anythin\' more than a fortnight past its reckonin\' day stays out the grid, so an old backlog don\'t bury the current picture.',
        'The quarter names and colours be yers to change in the app\'s Ship\'s Orders, worth doin\' if the classic labels don\'t match how ye think about yer own work.',
      ],
    },
    quickAction: {
      title: 'Quick Action',
      summary: 'Type what ye want in plain speech.',
      body: [
        'Press Ctrl+K anywhere to open it, or hoist the triple-tap gesture fer phones. Type a plain sentence, press Enter, and it works out what ye meant. The shortcut can be rebound in the app\'s Ship\'s Orders.',
        'Fer a single item, "add task essay for calculus tomorrow at 3pm" sets the title, crew, day and time in one go. Rank and repeatin\' work too: "add task gym every monday high priority".',
        'It makes more than chores. "add kanban card refactor" makes a parchment in the first column, "add card refactor on doing" puts it in a named column, and "add calendar event lecture 15h-17h" makes a timed happenin\'.',
        'Several things at once be where it truly saves time. "add tasks alpha, beta, gamma" makes three. "add tasks ppt 1, 2, 3" understands the shared prefix and makes ppt 1, ppt 2 and ppt 3. "add tasks alpha and beta for tomorrow and 18/07 respectively" gives each its own day in order.',
        'It also acts on what already exists, matchin\' yer words loosely against yer chore titles rather than needin\' \'em exact: "delete groceries", "share notes with study group", "open settings", "start focus 20m 5m break", "skip break". Booty works too, as in "grade 15 in midterm for calculus".',
        'Everythin\' here follows yer app tongue, though this here pirate tongue leans on the same English words under the hood, plus a few o\' its own like "fer", "upon", and "an\'" — so the commands above work just as they be written.',
      ],
    },
    googleCalendar: {
      title: 'Google Calendar sync',
      summary: 'Two-way sync with yer Google almanac.',
      body: [
        'Moor once by pastin\' a Google client ID, followin\' the numbered steps in the app. After that it syncs itself every few minutes and whenever ye come back to the window.',
        'Sync runs both ways. Happenins from Google appear alongside everythin\' else, and happenins ye make here can be pushed across usin\' the switch in the happenin\' form. When the same happenin\' changed in both places, the newer edit wins. Sendin\' a synced happenin\' to Davy Jones here removes it from Google as well.',
      ],
    },
    eiCalendar: {
      title: 'Course almanac',
      summary: 'Official course days, pulled in automatic-like.',
      body: [
        'When yer voyage uses a supported course chart, this pulls in the public course almanac and filters it to yer year, so ye see only the reckonin\' days that truly apply to ye instead o\' every year at once.',
        'These entries be read-only, because the course owns \'em. They update when the course updates, which means official days arrive without ye copyin\' anythin\' across yerself.',
        'Available only to the EI course.',
      ],
    },
    pomodoro: {
      title: 'Pomodoro tomatas',
      summary: 'A tomata fer every finished Steady Aim watch.',
      body: [
        'Hoist this from the Riggin\' grid and every finished steady-aim interval drops a tomata into the tab. Longer watches grow bigger ones, and abandonin\' a watch part way leaves a smaller faded tomata, so the pile stays an honest record rather than a trophy shelf. There be a short grace spell to belay a just-finished watch without it countin\'.',
        'The tomatas be physical. Drag and fling \'em and they bounce and settle, and on a phone that supports it, tiltin\' the device changes which way they fall. Show global overlay over all tabs lets \'em drift across the whole ship instead o\' just Steady Aim.',
        'The badge above the wheel opens the tallies. There ye get totals fer the spell and all time, marooned counts, current and best daily streaks, a bar chart o\' aim per day this fortnight, and a six-moon trend. Copy summary puts a plain-text version on yer clipboard.',
        'Reset spell sets what "this spell" means: daily, fortnightly, which be the default, monthly, or per voyage. Show spell tomatas and Track spell tallies be separate switches, so ye can keep the tallies without the badge, though lowerin\' the badge also stops the trackin\'.',
      ],
    },
    standby: {
      title: 'Anchored',
      summary: 'Turn a docked spyglass into a desk watch.',
      body: [
        'Anchored watch appears on its own when a phone be turned to landscape, so a propped-up spyglass becomes a desk watch without ye openin\' anythin\'. The screen stays awake while it runs.',
        'Choose one to three panes and what each shows: a clock wheel, the bells, yer almanac, the steady-aim glass, the Plank Board, or chores by crew. Each pane can carry a smaller second pane underneath, which be how ye get a glass and yer chore list side by side while ye work.',
      ],
    },
    firebaseSync: {
      title: 'Cloud sync',
      summary: 'Keep several vessels in step.',
      body: [
        'Cloud sync moors the app to a Firebase project ye own, so yer data sits in yer own account rather than someone else\'s service. The app walks ye through it in four steps: create a project, hoist Firestore, copy the config from project settings, and paste it in. It tests the mooring before stowin\'.',
        'Once moored, a change on one vessel reaches the others within seconds. It also lifts the local hold limit, which is what the storage warnin\' be about when it shows, and it be what canvas scrolls need to work at all.',
        'Sync can be locked end-to-end so that even a soul able to read yer database cannot read yer booty. If ye moor without it ye be warned and offered Encrypt now. This secret words be separate from on-device encryption: settin\' one does not set the other, and a vessel unlockin\' one may still need the other.',
      ],
    },
    collab: {
      title: 'Crewmates',
      summary: 'Share chores and parchments with other hands.',
      body: [
        'Crewmates needs cloud sync workin\' first, then a one-time riggin\' in yer Firebase console: publish the security rules the app shows ye, and hoist anonymous sign-in. The guide walks through all four steps, and after that ye hoist crew from the same panel.',
        'Muster a crew, then share hands in with a bottle link. Invites carry their own expiry, one day by default, separate from how long the crew itself lasts. The bottle carries the key needed to read the crew, so treat it like a password and cast a fresh one if it expires.',
        'Two settings per crew decide how it behaves, and only the cap\'n can change \'em. Shared chore completion be either toggle for all hands, the default, where one hand tickin\' somethin\' clears it fer everyone, or personal completion, where each hand tracks their own. Chore edit rights be either open to any hand, the default, or cap\'n only.',
        'The cap\'n can rename the crew, cast invites, and scuttle it. Hands can abandon ship. Either way, if ye had shared yer own local chores into the crew, it asks whether to keep those copies in yer own hold or send \'em down along with it.',
      ],
    },
    dataTransfer: {
      title: 'Export and import',
      summary: 'Move yer booty as a file.',
      body: [
        'Export JSON writes everythin\' to a file and Import JSON reads one back in. This be a snapshot rather than a live line, which makes it right fer backups and fer movin\' to a new vessel, and wrong fer keepin\' two vessels matched. Use cloud sync fer that.',
        'With encryption hoisted, export offers a choice: the encrypted organizer format, or human-readable plain JSON. The readable one be easy to inspect and completely unprotected, so treat that file with care.',
        'Fer smaller amounts o\' booty there be also Copy the message-in-a-bottle and a QR Mark, which be the quickest way to move a rig to a vessel sittin\' next to ye. Very large states won\'t fit in a bottle and it\'ll tell ye so.',
      ],
    },
    settings: {
      title: "Ship's Orders",
      summary: 'Voyage, crews, colours, and riggin\'.',
      body: [
        'Work top to bottom the first time. Set the voyage name and its set-sail and make-port days, and the fortnight count be worked out fer ye. Then muster crews, with ECTS and a colour each, and any shore leave. Most o\' the app keys off these, so they come first. Load chart can fill days and crews in fer a known course.',
        'Two switches change what the app be for. Work mode renames crews to bands and hides booty and ECTS, fer usin\' it outside a degree. No voyage mode drops the voyage system entirely and counts plain year fortnights instead. General also holds three ship colours, whether new chores show on the almanac, how multi-fortnight chores be ticked, and the reckoning-day alert settings.',
        'Helm bar reorders tabs by draggin\', renames \'em, hides the ones ye don\'t use, and groups the rest into chests. Show chooses marks, names, or both, and on a phone the rail can sit at the bottom or down the side.',
        'Riggin\' be where features get hoisted and lowered, includin\' Scrolls, Pomodoro, Anchored watch, Eisenhower matrix and the almanac integrations. Lowerin\' an app scuttles that app\'s data, so it asks first.',
        'Encryption locks this vessel\'s booty behind secret words of at least eight characters, with an optional memory jog and a twelve-word recovery chant shown once. Stow that chant somewhere else, because it be the only way back aboard if the secret words be forgotten. Later ye can change the secret words, forge a new recovery chant, or swap the encryption key, which locks everythin\' again and makes other vessels unlock afresh.',
        'The cursed waters at the bottom scuttle the voyage and its chores, booty and board, and clear pomodoro data. Each one asks fer yer say-so first.',
      ],
    },
  },
}
