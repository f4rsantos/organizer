export const en = {
  title: 'Guides',
  subtitle: 'How each part of the organizer works, and when it helps.',
  close: 'Close guides',
  sections: {
    core: 'Core',
    productivity: 'Productivity',
    sync: 'Calendar sync',
    ambient: 'Ambient',
    sharing: 'Sync and sharing',
    setup: 'Setup',
  },
  entries: {
    tasks: {
      title: 'Tasks',
      summary: 'Everything due this week, grouped by class.',
      body: [
        'Tasks shows one week at a time, grouped under the class each task belongs to. Every class header carries a ring showing how far through it you are, and clearing the whole week sets off confetti. The arrows at the top move between weeks, and the header names any holiday falling inside the week.',
        'Press the round + button to open the form. Fill in Class and Priority at the top, then the title. You can also just write naturally: type "essay calculus tomorrow" and when you leave the field it fills in the class and due date for you. It only fills fields you have not already set yourself.',
        'Two date fields do different jobs. Due date places the task on the calendar and drives the due-today alert. From week and To week decide which weeks of the Tasks list it appears in. Setting a due date moves the week range to match automatically, but only until you pick a week yourself, after which your choice sticks.',
        'Turn on Repeat for something recurring. Choose Daily, Weekly or Monthly, set Every to repeat less often than that (every 2 weeks, for example), and optionally set Until to stop it. Each occurrence is ticked off separately, so completing this week leaves next week untouched.',
        'On a task row, tap the circle to complete it. The icons alongside, behind a menu on mobile, add the task to the Kanban board, edit it, share it to a Collab team, or delete it. Sharing goes straight to your team if you only have one, otherwise it asks which.',
        'Tasks due today collect in a banner above the list. The clock icon sets a specific reminder time, the X hides that task for the day only. Whether alerts appear in-app, as a notification, or both is under Settings, General, Task due-date alerts, which starts at None. Set the mode to Notification or Both and you also get Next-day alert time, which defaults to 18:00.',
        'If a task spans several weeks, Settings, General, Task span behaviour decides whether it needs ticking once overall or once per week.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Drag work across columns until it is done.',
      body: [
        'The board organises work by stage rather than by date, which suits anything that moves through steps. Add a card with Add card at the bottom of a column, then press Enter to save or Escape to cancel.',
        'Drag cards between columns, or use the left and right arrows in the card menu. On a phone, press and hold briefly before dragging. Reaching the last column counts as done and sets off confetti. Columns collapse on mobile with the chevron in the header.',
        'Open a card with the arrow icon to set a priority, a due date, a class, and a checklist. Add item builds the checklist. The dialog saves when you close it, including by clicking outside, so there is no separate cancel.',
        'Checklists can show on the front of a card. Settings, Kanban, Kanban checklist preview offers Hide on cards, which is the default, Show on all cards, and Case by case. With Case by case you turn the preview on for individual cards by double-clicking them, which keeps busy cards readable while detailed ones stay expanded.',
        'Add to tasks puts a card in your weekly Tasks list as well, for board work that also has a deadline. Auto-add tasks to board, in the same settings section and off by default, does the reverse for this week\'s tasks.',
        'Clear done removes everything in the final column; Wipe all empties the board. Both confirm first. Columns are renamed, reordered by dragging the grip handle, and added under Settings, Kanban, though the three original columns cannot be deleted.',
      ],
    },
    grades: {
      title: 'Grades',
      summary: 'Track weighted components and what you still need.',
      body: [
        'First define what each class is graded on, under Settings, Grade components. Add component creates a row at 25% by default, so adjust the weights until the running total reads 100%. It turns red until it does.',
        'On the Grades tab, enter scores out of 20 as you get them. The large number on each card is your accumulated score, which counts only what has been graded so far and turns red below 9.5.',
        'When one component has several graded pieces, press + on its row to split it into parts. The first press creates two parts and clears the parent score, and each further press adds another, with the parent weight divided evenly between them. A split component is graded only through its parts.',
        'The panel underneath answers the question that actually matters: what do you need on everything still ungraded to finish where you want. Target grade defaults to 9.5, a pass, and you can raise it. If reaching your target would need more than 20, it says not achievable rather than showing an impossible number.',
        'The footer totals your credit-weighted semester average and the credits you are on track to pass, counting a class from 9.5 up. Below that, past semesters take a final grade each, and the course average box takes your previous average and how many semesters it covers, then projects where the whole course lands once this semester is folded in.',
      ],
    },
    calendar: {
      title: 'Calendar',
      summary: 'Day, week, month, and year views of everything dated.',
      body: [
        'Four views share one calendar. Day and week draw an hour grid for time-of-day detail; month and year show the shape of the term. Tasks, events, and holidays all appear together, coloured by class.',
        'In day or week view, drag down the hour grid to block out time. Times snap to quarter hours and anything shorter than 30 minutes is rounded up to 30. The event form opens with those times filled in. Drag sideways across day columns to create something spanning several days.',
        'In month or year view each day shows up to three chips and then "+N more". Click the day to see everything on it and to add an event to that date.',
        'The event form takes a title, date, start and end time, a colour, and an optional note. Leave the start time empty for an all-day event. Turn on Multiple days to get a second date field for the end. If Google Calendar is connected you also get a per-event switch to push it there.',
        'Titles are read for dates and times too, so "meeting friday 15h-17h" arrives already filled in. Events coming from Google Calendar or the course calendar are read-only here, since the source owns them.',
      ],
    },
    focus: {
      title: 'Focus',
      summary: 'A timer with breaks that fit how you actually work.',
      body: [
        'Press Start and the session clock runs. Pause and Reset are always there, and during a break you can skip it early.',
        'The gear icon opens break settings, and the two kinds work independently, so you can use either or both. Interval breaks are on by default at 25 minutes of work and 5 minutes of break, the usual pomodoro shape. Scheduled breaks fire at fixed times of day instead, which fits a timetable that already has gaps in it: set an hour and minute, choose a length, and press + to add it to the list.',
        'The same panel lets you replace the words shown during focus and break with your own.',
        'Under Settings, Focus, After break decides what a break does to your running total. Reset timer starts the count again, which suits counting single sessions; keep counting carries the total forward, which suits measuring a whole day. Focus alert mode adds a signal when the phase changes: None, Vibration, Notification, or Both.',
        'Closing the tab mid-session does not inflate your numbers. If you come back much later, the timer works out that you were away and pauses rather than crediting the whole gap as focus.',
      ],
    },
    notes: {
      title: 'Notes',
      summary: 'A rich editor with folders, search, and maths.',
      body: [
        'Notes live in folders you can nest by dragging one onto another. The + button makes a note, the folder button makes a folder, and double-clicking a folder name renames it. Search filters as you type, the grid icon switches between list and mosaic layouts, and starred notes always sort to the top. Archive is the gentler alternative to deleting: archived notes leave the tree and collect behind their own filter.',
        'The toolbar covers bold, italic, strikethrough, three heading levels, bullet, numbered and checkbox lists, quotes, tables, code blocks, dividers, links, text colour and text size, plus undo and redo. There is a microphone button where dictation is supported.',
        'Type @ followed by a few letters to link a task by name. It suggests matching open tasks, arrow keys move through them, and Enter inserts the link, which keeps a note tied to the work it belongs to.',
        'Maths solving, under Settings, Apps, Notes, is off until you turn it on. With it on, end a line with = and press Enter to solve it, including inequalities and quadratics. Three sub-options, all on once enabled, control solving for x, plotting a selected equation as a graph, and whether the working is shown step by step or only the answer.',
        'Notes import from Markdown and plain text, and export as Markdown, plain text, web page, Word, or print to PDF. Canvas notes for handwriting need cloud sync switched on, since drawings are large and are stored remotely. The canvas has a pen and eraser, five widths and five colours, one of which follows your theme. The eraser removes a whole stroke rather than part of one.',
      ],
    },
    eisenhower: {
      title: 'Eisenhower matrix',
      summary: 'Sort tasks by urgency against importance.',
      body: [
        'The matrix splits work along two axes, urgent and important, giving four boxes: do it now, schedule it, delegate it, and drop it. The value is in separating what is merely loud from what actually matters, which a flat list hides.',
        'Your tasks start in the unsorted tray. Drag each into the box that fits, and drag it somewhere else when that changes. Anything more than a week overdue stays out of the grid, so an old backlog does not bury the current picture.',
        'The quadrant names and colours are yours to change in the app\'s settings, which is worth doing if the classic labels do not match how you think about your own work.',
      ],
    },
    quickAction: {
      title: 'Quick Action',
      summary: 'Type what you want in plain language.',
      body: [
        'Press Ctrl+K anywhere to open it, or turn on the triple-tap gesture for phones. Type a plain sentence, press Enter, and it works out what you meant. The shortcut can be rebound in the app\'s settings.',
        'For a single item, "add task essay for calculus tomorrow at 3pm" sets the title, class, date and time in one go. Priority and repetition work too: "add task gym every monday high priority".',
        'It creates more than tasks. "add kanban card refactor" makes a card in the first column, "add card refactor on doing" puts it in a named column, and "add calendar event lecture 15h-17h" makes a timed event.',
        'Several things at once is where it saves real time. "add tasks alpha, beta, gamma" makes three. "add tasks ppt 1, 2, 3" understands the shared prefix and makes ppt 1, ppt 2 and ppt 3. "add tasks alpha and beta for tomorrow and 18/07 respectively" gives each its own date in order.',
        'It also acts on what already exists, matching your words loosely against your task titles rather than needing them exactly: "delete groceries", "share notes with study group", "open settings", "start focus 20m 5m break", "skip break". Grades work too, as in "grade 15 in midterm for calculus".',
        'Everything here follows your app language, so the commands work in whichever language you are already using.',
      ],
    },
    googleCalendar: {
      title: 'Google Calendar sync',
      summary: 'Two-way sync with your Google calendar.',
      body: [
        'Connect once by pasting a Google client ID, following the numbered steps in the app. After that it syncs by itself every few minutes and whenever you come back to the window.',
        'Sync runs both ways. Events from Google appear alongside everything else, and events you create here can be pushed across using the switch in the event form. When the same event changed in both places, the newer edit wins. Deleting a synced event here removes it from Google as well.',
      ],
    },
    eiCalendar: {
      title: 'Course calendar',
      summary: 'Official course dates, pulled in automatically.',
      body: [
        'When your semester uses a supported course preset, this pulls in the public course calendar and filters it to your year, so you see only the deadlines that actually apply to you instead of every year at once.',
        'These entries are read-only, because the course owns them. They update when the course updates, which means official dates arrive without you copying anything across.',
        'Available only to the EI course.',
      ],
    },
    pomodoro: {
      title: 'Pomodoro tomatoes',
      summary: 'A tomato for every finished focus session.',
      body: [
        'Turn this on from the Apps grid and every completed focus interval drops a tomato into the tab. Longer sessions grow larger ones, and abandoning a session part way leaves a smaller faded tomato, so the pile stays an honest record rather than a trophy shelf. There is a short grace period to cancel a just-finished session without it counting.',
        'The tomatoes are physical. Drag and fling them and they bounce and settle, and on a phone that supports it, tilting the device changes which way they fall. Show global overlay over all tabs lets them drift across the whole app instead of only Focus.',
        'The badge above the wheel opens the stats. There you get totals for the period and all time, abandoned counts, current and best daily streaks, a bar chart of focus per day this week, and a six-month trend. Copy summary puts a plain-text version on your clipboard.',
        'Reset period sets what "this period" means: daily, weekly, which is the default, monthly, or per semester. Show period pomodoros and Track period stats are separate switches, so you can keep the statistics without the badge, though turning the badge off also stops the tracking.',
      ],
    },
    standby: {
      title: 'Standby',
      summary: 'Turn a docked phone into a desk display.',
      body: [
        'Standby appears on its own when a phone is turned to landscape, so a propped-up phone becomes a desk display without you opening anything. The screen is kept awake while it runs.',
        'Choose one to three panels and what each shows: a clock wheel, the time, your calendar, the focus timer, the Kanban board, or tasks by category. Each panel can carry a smaller second pane underneath, which is how you get a timer and your task list side by side while you work.',
      ],
    },
    firebaseSync: {
      title: 'Cloud sync',
      summary: 'Keep several devices in step.',
      body: [
        'Cloud sync connects the app to a Firebase project you own, so your data sits in your own account rather than someone else\'s service. The app walks you through it in four steps: create a project, enable Firestore, copy the config from project settings, and paste it in. It checks the connection before saving.',
        'Once connected, a change on one device reaches the others within seconds. It also lifts the local storage limit, which is what the storage warning is about when it appears, and it is what canvas notes need in order to work.',
        'Sync can be end-to-end encrypted so that even someone able to read your database cannot read your data. If you connect without it you are warned and offered Encrypt now. This passphrase is separate from on-device encryption: setting one does not set the other, and a device unlocking one may still need the other.',
      ],
    },
    collab: {
      title: 'Collab',
      summary: 'Share tasks and cards with other people.',
      body: [
        'Collab needs cloud sync working first, then a one-time setup in your Firebase console: publish the security rules the app shows you, and turn on anonymous sign-in. The guide walks through all four steps, and afterwards you enable collab from the same panel.',
        'Create a team, then share people in with an invite link. Invites carry their own expiry, one day by default, separate from how long the team itself lasts. The link contains the key needed to read the team, so treat it like a password and send a fresh one if it expires.',
        'Two settings per team decide how it behaves, and only the host can change them. Shared task completion is either toggle for everyone, the default, where one person ticking something clears it for all, or personal completion, where each member tracks their own. Task edit permissions are either open to everyone, the default, or host only.',
        'The host can rename the team, generate invites, and delete it. Members can leave. Either way, if you had shared your own local tasks into the team, it asks whether to keep those copies on your device or remove them along with it.',
      ],
    },
    dataTransfer: {
      title: 'Export and import',
      summary: 'Move your data as a file.',
      body: [
        'Export JSON writes everything to a file and Import JSON reads one back. This is a snapshot rather than a live link, which makes it right for backups and for moving to a new device, and wrong for keeping two devices matched. Use cloud sync for that.',
        'With encryption on, export offers a choice: the encrypted organizer format, or human-readable plain JSON. The readable one is easy to inspect and completely unprotected, so treat that file carefully.',
        'For smaller amounts of data there is also Copy share link and a QR code, which is the quickest way to move a setup to a device sitting next to you. Very large states will not fit in a link and it will tell you so.',
      ],
    },
    settings: {
      title: 'Settings',
      summary: 'Semester, classes, appearance, and apps.',
      body: [
        'Work top to bottom the first time. Set the semester name and its start and end dates, and the week count is worked out for you. Then add classes, with credits and a colour each, and any holidays. Most of the app keys off these, so they come first. Load preset can fill dates and classes in for a known course.',
        'Two switches change what the app is for. Work mode renames classes to groups and hides grades and credits, for using it outside a degree. No semester mode drops the semester system entirely and counts plain year weeks instead. General also holds three theme colours, whether new tasks show on the calendar, how multi-week tasks are ticked, and the due-date alert settings.',
        'Navbar reorders tabs by dragging, renames them, hides the ones you do not use, and groups the rest into folders. Show chooses icons, names, or both, and on a phone the bar can sit at the bottom or down the side.',
        'Apps is where features are switched on and off, including Notes, Pomodoro, Standby, Eisenhower and the calendar integrations. Turning an app off erases that app\'s data, so it asks first.',
        'Encryption locks this device\'s data behind a passphrase of at least eight characters, with an optional hint and a twelve-word recovery code shown once. Save that code somewhere else, because it is the only way back in if the passphrase is forgotten. Later you can change the passphrase, issue a new recovery code, or rotate the key, which re-encrypts everything and makes other devices unlock again.',
        'The danger zone at the bottom deletes the semester and its tasks, grades and board, and clears pomodoro data. Each one confirms first.',
      ],
    },
  },
}
