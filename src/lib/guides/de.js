export const de = {
  title: 'Anleitungen',
  subtitle: 'Wie jeder Teil des Organizers funktioniert und wann er hilft.',
  close: 'Anleitungen schließen',
  sections: {
    core: 'Grundlagen',
    productivity: 'Produktivität',
    sync: 'Kalendersynchronisation',
    ambient: 'Ambient',
    sharing: 'Sync und Teilen',
    setup: 'Einrichtung',
  },
  entries: {
    tasks: {
      title: 'Aufgaben',
      summary: 'Alles, was diese Woche fällig ist, gruppiert nach Fach.',
      body: [
        'Aufgaben zeigt jeweils eine Woche, gruppiert unter dem Fach, zu dem jede Aufgabe gehört. Jede Fachüberschrift trägt einen Ring, der zeigt, wie weit du bist, und das Leeren der ganzen Woche löst Konfetti aus. Die Pfeile oben wechseln zwischen Wochen, und die Überschrift nennt jeden Feiertag, der in die Woche fällt.',
        'Drücke den runden +-Button, um das Formular zu öffnen. Fülle oben Fach und Priorität aus, dann den Titel. Du kannst auch einfach natürlich schreiben: Tippe „Essay Analysis morgen“, und wenn du das Feld verlässt, werden Fach und Fälligkeitsdatum automatisch ausgefüllt. Es füllt nur Felder, die du nicht bereits selbst gesetzt hast.',
        'Zwei Datumsfelder erfüllen unterschiedliche Aufgaben. Das Fälligkeitsdatum platziert die Aufgabe im Kalender und löst den Heute-fällig-Alarm aus. Von Woche und Bis Woche entscheiden, in welchen Wochen der Aufgabenliste sie erscheint. Das Setzen eines Fälligkeitsdatums passt den Wochenbereich automatisch an, aber nur bis du selbst eine Woche wählst, danach bleibt deine Wahl bestehen.',
        'Schalte Wiederholen für etwas Wiederkehrendes ein. Wähle Täglich, Wöchentlich oder Monatlich, stelle Alle so ein, dass seltener wiederholt wird (zum Beispiel alle 2 Wochen), und stelle optional Bis ein, um es zu beenden. Jedes Vorkommen wird separat abgehakt, sodass das Erledigen dieser Woche die nächste unberührt lässt.',
        'Tippe in einer Aufgabenzeile auf den Kreis, um sie zu erledigen. Die Symbole daneben, auf dem Handy hinter einem Menü, fügen die Aufgabe zum Kanban-Board hinzu, bearbeiten sie, teilen sie mit einem Collab-Team, oder löschen sie. Das Teilen geht direkt an dein Team, wenn du nur eines hast, sonst wird gefragt, welches.',
        'Heute fällige Aufgaben sammeln sich in einem Banner über der Liste. Das Uhrsymbol legt eine bestimmte Erinnerungszeit fest, das X blendet diese Aufgabe nur für den Tag aus. Ob Alarme in der App, als Benachrichtigung oder beides erscheinen, wird unter Einstellungen, Allgemein, Fälligkeits-Alarme für Aufgaben festgelegt, was mit Keine beginnt. Stelle den Modus auf Benachrichtigung oder Beides und du erhältst zusätzlich Alarmzeit für den nächsten Tag, die standardmäßig 18:00 ist.',
        'Wenn eine Aufgabe sich über mehrere Wochen erstreckt, entscheidet Einstellungen, Allgemein, Verhalten mehrwöchiger Aufgaben, ob sie einmal insgesamt oder einmal pro Woche abgehakt werden muss.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Ziehe Arbeit über Spalten, bis sie erledigt ist.',
      body: [
        'Das Board organisiert Arbeit nach Phase statt nach Datum, was zu allem passt, das sich durch Schritte bewegt. Füge eine Karte mit Karte hinzufügen am unteren Rand einer Spalte hinzu, dann drücke Enter zum Speichern oder Escape zum Abbrechen.',
        'Ziehe Karten zwischen Spalten, oder verwende die Pfeile links und rechts im Kartenmenü. Auf einem Handy halte kurz gedrückt, bevor du ziehst. Das Erreichen der letzten Spalte zählt als erledigt und löst Konfetti aus. Spalten klappen auf mobilen Geräten mit dem Chevron in der Kopfzeile zusammen.',
        'Öffne eine Karte mit dem Pfeilsymbol, um eine Priorität, ein Fälligkeitsdatum, ein Fach und eine Checkliste festzulegen. Element hinzufügen baut die Checkliste auf. Der Dialog speichert, wenn du ihn schließt, auch durch Klicken außerhalb, es gibt also kein separates Abbrechen.',
        'Checklisten können auf der Vorderseite einer Karte angezeigt werden. Einstellungen, Kanban, Kanban-Checklisten-Vorschau bietet Auf Karten ausblenden, was der Standard ist, Auf allen Karten anzeigen, und Von Fall zu Fall. Mit Von Fall zu Fall schaltest du die Vorschau für einzelne Karten durch Doppelklick ein, was volle Karten lesbar hält, während detaillierte Karten ausgeklappt bleiben.',
        'Zu Aufgaben hinzufügen setzt eine Karte auch in deine wöchentliche Aufgabenliste, für Board-Arbeit, die auch eine Frist hat. Aufgaben automatisch zum Board hinzufügen, im selben Einstellungsbereich und standardmäßig aus, macht das Umgekehrte für die Aufgaben dieser Woche.',
        'Erledigte löschen entfernt alles in der letzten Spalte; Alles löschen leert das Board. Beide fragen zuerst nach Bestätigung. Spalten werden umbenannt, per Ziehen des Griffs neu geordnet, und unter Einstellungen, Kanban hinzugefügt, wobei die drei ursprünglichen Spalten nicht gelöscht werden können.',
      ],
    },
    grades: {
      title: 'Noten',
      summary: 'Verfolge gewichtete Bestandteile und was noch fehlt.',
      body: [
        'Lege zuerst fest, worauf jedes Fach benotet wird, unter Einstellungen, Notenbestandteile. Bestandteil hinzufügen erstellt standardmäßig eine Zeile mit 25%, also passe die Gewichte an, bis die laufende Summe 100% ergibt. Sie bleibt so lange rot.',
        'Trage im Tab Noten die Punkte von 20 ein, sobald du sie bekommst. Die große Zahl auf jeder Karte ist dein aufgelaufener Punktestand, der nur zählt, was bisher benotet wurde, und unter 9,5 rot wird.',
        'Wenn ein Bestandteil mehrere benotete Teile hat, drücke + auf seiner Zeile, um ihn in Teile aufzuteilen. Der erste Druck erstellt zwei Teile und löscht die Note des übergeordneten Bestandteils, und jeder weitere Druck fügt einen weiteren hinzu, wobei das Gewicht des übergeordneten Bestandteils gleichmäßig auf sie verteilt wird. Ein aufgeteilter Bestandteil wird nur über seine Teile benotet.',
        'Das Feld darunter beantwortet die Frage, die wirklich zählt: was du bei allem noch nicht Benoteten brauchst, um dort zu landen, wo du willst. Zielnote ist standardmäßig 9,5, ein Bestehen, und du kannst sie erhöhen. Würde das Erreichen deines Ziels mehr als 20 erfordern, zeigt es nicht erreichbar statt einer unmöglichen Zahl.',
        'Die Fußzeile summiert deinen kreditgewichteten Semesterdurchschnitt und die Kredite, auf deren Bestehen du auf Kurs bist, wobei ein Fach ab 9,5 zählt. Darunter erhalten frühere Semester jeweils eine Endnote, und das Feld Kursdurchschnitt nimmt deinen früheren Durchschnitt und die Anzahl der Semester, die er umfasst, und projiziert, wo der gesamte Kurs landet, sobald dieses Semester eingerechnet ist.',
      ],
    },
    calendar: {
      title: 'Kalender',
      summary: 'Tages-, Wochen-, Monats- und Jahresansichten von allem Datierten.',
      body: [
        'Vier Ansichten teilen sich einen Kalender. Tag und Woche zeichnen ein Stundenraster für Details zur Tageszeit; Monat und Jahr zeigen die Form des Semesters. Aufgaben, Termine und Ferien erscheinen alle zusammen, nach Fach eingefärbt.',
        'Ziehe in der Tages- oder Wochenansicht im Stundenraster nach unten, um Zeit zu blockieren. Zeiten rasten auf Viertelstunden ein, und alles Kürzere als 30 Minuten wird auf 30 aufgerundet. Das Terminformular öffnet sich mit diesen bereits eingetragenen Zeiten. Ziehe seitlich über Tagesspalten, um etwas zu erstellen, das sich über mehrere Tage erstreckt.',
        'In der Monats- oder Jahresansicht zeigt jeder Tag bis zu drei Chips und dann „+N weitere“. Klicke auf den Tag, um alles darin zu sehen und einen Termin für dieses Datum hinzuzufügen.',
        'Das Terminformular nimmt einen Titel, ein Datum, Start- und Endzeit, eine Farbe und eine optionale Notiz. Lasse die Startzeit leer für einen ganztägigen Termin. Schalte Mehrere Tage ein, um ein zweites Datumsfeld für das Ende zu erhalten. Wenn Google Calendar verbunden ist, erhältst du auch einen Schalter pro Termin, um ihn dorthin zu übertragen.',
        'Titel werden auch auf Daten und Zeiten gelesen, sodass „Meeting Freitag 15h-17h“ bereits ausgefüllt ankommt. Termine aus Google Calendar oder dem Studiengangkalender sind hier schreibgeschützt, da die Quelle sie besitzt.',
      ],
    },
    focus: {
      title: 'Fokus',
      summary: 'Ein Timer mit Pausen, die zu deiner Arbeitsweise passen.',
      body: [
        'Drücke Start und die Session-Uhr läuft. Pause und Zurücksetzen sind immer verfügbar, und während einer Pause kannst du sie vorzeitig überspringen.',
        'Das Zahnradsymbol öffnet die Pauseneinstellungen, und die beiden Arten funktionieren unabhängig, sodass du eine, die andere oder beide nutzen kannst. Intervall-Pausen sind standardmäßig bei 25 Minuten Arbeit und 5 Minuten Pause aktiv, die übliche Pomodoro-Form. Geplante Pausen lösen stattdessen zu festen Tageszeiten aus, was zu einem Stundenplan passt, der bereits Lücken hat: Stelle Stunde und Minute ein, wähle eine Dauer und drücke +, um sie zur Liste hinzuzufügen.',
        'Dasselbe Panel lässt dich die während Fokus und Pause angezeigten Wörter durch deine eigenen ersetzen.',
        'Unter Einstellungen, Fokus entscheidet Nach der Pause, was eine Pause mit deinem laufenden Zähler macht. Timer zurücksetzen startet die Zählung neu, was für das Zählen einzelner Sessions passt; weiterzählen trägt den Zähler weiter, was für die Messung eines ganzen Tages passt. Fokus-Alarmmodus fügt beim Phasenwechsel ein Signal hinzu: Keine, Vibration, Benachrichtigung oder Beides.',
        'Das Schließen des Tabs mitten in einer Session bläht deine Zahlen nicht auf. Wenn du viel später zurückkommst, erkennt der Timer, dass du weg warst, und pausiert, statt die gesamte Lücke als Fokus anzurechnen.',
      ],
    },
    notes: {
      title: 'Notizen',
      summary: 'Ein umfangreicher Editor mit Ordnern, Suche und Mathe.',
      body: [
        'Notizen leben in Ordnern, die du verschachteln kannst, indem du einen auf einen anderen ziehst. Der +-Button erstellt eine Notiz, der Ordner-Button erstellt einen Ordner, und ein Doppelklick auf einen Ordnernamen benennt ihn um. Die Suche filtert beim Tippen, das Rastersymbol wechselt zwischen Listen- und Kachelansicht, und favorisierte Notizen sortieren sich immer nach oben. Archivieren ist die sanftere Alternative zum Löschen: archivierte Notizen verlassen den Baum und sammeln sich hinter ihrem eigenen Filter.',
        'Die Werkzeugleiste umfasst Fett, Kursiv, Durchgestrichen, drei Überschriftenebenen, Aufzählungs-, nummerierte und Checklisten, Zitate, Tabellen, Codeblöcke, Trennlinien, Links, Textfarbe und Textgröße, sowie Rückgängig und Wiederholen. Es gibt einen Mikrofon-Button, wo Diktat unterstützt wird.',
        'Tippe @ gefolgt von ein paar Buchstaben, um eine Aufgabe nach Namen zu verknüpfen. Es schlägt passende offene Aufgaben vor, die Pfeiltasten bewegen sich durch sie, und Enter fügt den Link ein, was eine Notiz an die Arbeit bindet, zu der sie gehört.',
        'Mathe lösen, unter Einstellungen, Apps, Notizen, ist aus, bis du es einschaltest. Wenn aktiviert, beende eine Zeile mit = und drücke Enter, um sie zu lösen, einschließlich Ungleichungen und quadratischer Gleichungen. Drei Unteroptionen, alle aktiviert, sobald die Funktion eingeschaltet ist, steuern das Auflösen nach x, das Zeichnen einer ausgewählten Gleichung als Graph, und ob der Rechenweg schrittweise oder nur das Ergebnis angezeigt wird.',
        'Notizen importieren aus Markdown und Klartext, und exportieren als Markdown, Klartext, Webseite, Word, oder drucken als PDF. Notizen mit Handschrift auf dem Zeichenblock benötigen aktivierte Cloud-Sync, da Zeichnungen groß sind und remote gespeichert werden. Der Zeichenblock hat Stift und Radiergummi, fünf Breiten und fünf Farben, von denen eine deinem Design folgt. Der Radiergummi entfernt einen ganzen Strich statt eines Teils davon.',
      ],
    },
    habits: {
      title: 'Gewohnheiten',
      summary: 'Halte eine langfristige Gewohnheit am Laufen, Klick für Klick.',
      body: [
        'Eine Gewohnheit ist etwas, das du weiter tun willst, statt es einmal abzuschließen. Jede Gewohnheit zeigt einen einzelnen grauen Knopf, der darauf wartet, gedrückt zu werden. Ein Druck markiert den aktuellen Zeitraum als erledigt, löst eine kleine Feier aus und zeigt dir, wie lang deine Serie ist.',
        'Beim Anlegen einer Gewohnheit wählst du, wie oft geklickt werden soll, von täglich bis monatlich, und ob du jedes Mal eine kurze Notiz schreiben willst. Notizen lohnen sich, wenn dir wichtig ist, wie es lief, und nicht nur, dass es passiert ist.',
        'Dein Verlauf wächst darunter zu einem Kalender, sieben Tage pro Zeile, mit einem kleinen Punkt für jeden Tag außerhalb deiner Serie. Er beginnt als einzelne Zeile und wächst mit der Zeit in neue Zeilen und Monate, damit frühe Tage lesbar bleiben und lange Serien ausgerichtet bleiben. Die Knöpfe in der Kopfzeile zeigen den Fortschritt, machen den aktuellen Klick rückgängig oder löschen die Gewohnheit.',
      ],
    },
    eisenhower: {
      title: 'Eisenhower-Matrix',
      summary: 'Sortiere Aufgaben nach Dringlichkeit gegen Wichtigkeit.',
      body: [
        'Die Matrix teilt Arbeit entlang zweier Achsen auf, dringend und wichtig, was vier Felder ergibt: sofort erledigen, einplanen, delegieren, und verwerfen. Der Wert liegt darin, zu trennen, was nur laut ist, von dem, was wirklich zählt, was eine flache Liste verbirgt.',
        'Deine Aufgaben beginnen im unsortierten Ablagefach. Ziehe jede in das passende Feld, und ziehe sie woandershin, wenn sich das ändert. Alles, was mehr als eine Woche überfällig ist, bleibt außerhalb des Rasters, damit ein alter Rückstand nicht das aktuelle Bild verdeckt.',
        'Die Namen und Farben der Quadranten kannst du in den Einstellungen der App ändern, was sich lohnt, wenn die klassischen Bezeichnungen nicht dazu passen, wie du über deine eigene Arbeit denkst.',
      ],
    },
    quickAction: {
      title: 'Quick Action',
      summary: 'Tippe, was du willst, in normaler Sprache.',
      body: [
        'Drücke Ctrl+K überall, um es zu öffnen, oder schalte die Dreifach-Tipp-Geste für Handys ein. Tippe einen einfachen Satz, drücke Enter, und die App findet heraus, was du meintest. Der Shortcut kann in den Einstellungen der App neu belegt werden.',
        'Für ein einzelnes Element setzt „füge aufgabe essay für analysis morgen um 15 uhr hinzu“ Titel, Fach, Datum und Zeit auf einmal. Priorität und Wiederholung funktionieren auch: „füge aufgabe sport jeden montag hohe priorität hinzu“.',
        'Es erstellt mehr als nur Aufgaben. „füge kanban-karte überarbeitung hinzu“ macht eine Karte in der ersten Spalte, „füge karte überarbeitung an doing hinzu“ platziert sie in einer benannten Spalte, und „füge kalenderereignis vorlesung 15h-17h hinzu“ macht einen zeitgebundenen Termin.',
        'Mehrere Dinge auf einmal ist, wo es wirklich Zeit spart. „füge aufgaben alpha, beta, gamma hinzu“ macht drei. Es versteht auch geteilte Präfixe und Reihenfolgen für Zahlen und Daten, sodass eine Reihe verwandter Elemente in einem Satz entsteht, jedes mit seinen eigenen Angaben in der richtigen Reihenfolge.',
        'Es wirkt auch auf bereits Vorhandenes, indem es deine Worte locker mit deinen Aufgabentiteln abgleicht, statt eine exakte Übereinstimmung zu verlangen: „lösche einkäufe“, „teile notizen mit lerngruppe“, „öffne einstellungen“, „starten fokus“, „überspringen pause“. Noten funktionieren auch, wie in „note 15 in klausur für analysis“.',
        'All das folgt der Sprache deiner App, sodass die Befehle in der Sprache funktionieren, die du bereits verwendest.',
      ],
    },
    googleCalendar: {
      title: 'Google Calendar-Synchronisation',
      summary: 'Bidirektionale Synchronisation mit deinem Google-Kalender.',
      body: [
        'Verbinde dich einmalig, indem du eine Google-Client-ID einfügst und den nummerierten Schritten in der App folgst. Danach synchronisiert sie sich von selbst alle paar Minuten und immer, wenn du zum Fenster zurückkehrst.',
        'Die Synchronisation läuft in beide Richtungen. Termine aus Google erscheinen zusammen mit allem anderen, und Termine, die du hier erstellst, können mit dem Schalter im Terminformular hinübergeschoben werden. Wenn sich derselbe Termin an beiden Stellen geändert hat, gewinnt die neuere Bearbeitung. Das Löschen eines synchronisierten Termins hier entfernt ihn auch aus Google.',
      ],
    },
    eiCalendar: {
      title: 'Studiengangkalender',
      summary: 'Offizielle Studiengangtermine, automatisch übernommen.',
      body: [
        'Wenn dein Semester eine unterstützte Studiengangvorlage nutzt, übernimmt dies den öffentlichen Studiengangkalender und filtert ihn auf dein Jahr, sodass du nur die Fristen siehst, die wirklich für dich gelten, statt jedes Jahr auf einmal.',
        'Diese Einträge sind schreibgeschützt, weil der Studiengang sie besitzt. Sie aktualisieren sich, wenn der Studiengang sich aktualisiert, was bedeutet, dass offizielle Termine ankommen, ohne dass du etwas übertragen musst.',
        'Nur für den EI-Studiengang verfügbar.',
      ],
    },
    pomodoro: {
      title: 'Pomodoro-Tomaten',
      summary: 'Eine Tomate für jede abgeschlossene Fokus-Session.',
      body: [
        'Schalte dies im Apps-Raster ein, und jedes abgeschlossene Fokus-Intervall lässt eine Tomate in den Tab fallen. Längere Sessions lassen größere wachsen, und das Abbrechen einer Session auf halbem Weg hinterlässt eine kleinere, verblasste Tomate, sodass der Haufen ein ehrliches Protokoll bleibt statt eines Trophäenregals. Es gibt eine kurze Karenzzeit, um eine gerade beendete Session abzubrechen, ohne dass sie zählt.',
        'Die Tomaten sind physisch. Zieh und wirf sie, sie prallen ab und setzen sich, und auf einem Handy, das es unterstützt, ändert das Neigen des Geräts, in welche Richtung sie fallen. Globale Überlagerung über alle Tabs anzeigen lässt sie durch die ganze App treiben statt nur durch Fokus.',
        'Das Abzeichen über dem Rad öffnet die Statistiken. Dort erhältst du Summen für den Zeitraum und insgesamt, aufgegebene Zählungen, aktuelle und beste tägliche Serien, ein Balkendiagramm des Fokus pro Tag diese Woche, und einen Sechs-Monats-Trend. Zusammenfassung kopieren legt eine Klartext-Version in deiner Zwischenablage ab.',
        'Zurücksetzzeitraum legt fest, was „dieser Zeitraum“ bedeutet: täglich, wöchentlich, was der Standard ist, monatlich, oder pro Semester. Zeitraum-Pomodoros anzeigen und Zeitraum-Statistiken verfolgen sind separate Schalter, sodass du die Statistiken ohne das Abzeichen behalten kannst, obwohl das Ausschalten des Abzeichens auch die Aufzeichnung stoppt.',
      ],
    },
    standby: {
      title: 'Standby',
      summary: 'Verwandle ein angedocktes Handy in eine Schreibtischanzeige.',
      body: [
        'Standby erscheint von selbst, wenn ein Handy ins Querformat gedreht wird, sodass ein aufgestelltes Handy ohne dein Zutun zu einer Schreibtischanzeige wird. Der Bildschirm bleibt aktiv, solange es läuft.',
        'Wähle ein bis drei Felder und was jedes zeigt: ein Uhrrad, die Uhrzeit, deinen Kalender, den Fokus-Timer, das Kanban-Board, oder Aufgaben nach Kategorie. Jedes Feld kann darunter eine kleinere zweite Karte tragen, womit du einen Timer und deine Aufgabenliste nebeneinander bekommst, während du arbeitest.',
      ],
    },
    firebaseSync: {
      title: 'Cloud-Sync',
      summary: 'Halte mehrere Geräte im Gleichschritt.',
      body: [
        'Cloud-Sync verbindet die App mit einem Firebase-Projekt, das dir gehört, sodass deine Daten in deinem eigenen Konto liegen statt im Dienst von jemand anderem. Die App führt dich in vier Schritten durch: ein Projekt erstellen, Firestore aktivieren, die Konfiguration aus den Projekteinstellungen kopieren, und sie einfügen. Sie prüft die Verbindung vor dem Speichern.',
        'Einmal verbunden, erreicht eine Änderung auf einem Gerät die anderen innerhalb von Sekunden. Es hebt auch das lokale Speicherlimit auf, worum es bei der Speicherwarnung geht, wenn sie erscheint, und es ist das, was Notizen mit Handschrift zum Funktionieren brauchen.',
        'Die Synchronisierung kann Ende-zu-Ende verschlüsselt werden, sodass selbst jemand, der deine Datenbank lesen kann, deine Daten nicht lesen kann. Wenn du dich ohne das verbindest, wirst du gewarnt und dir wird Jetzt verschlüsseln angeboten. Diese Passphrase ist getrennt von der geräteseitigen Verschlüsselung: Eine zu setzen setzt nicht die andere, und ein Gerät, das eine entsperrt, braucht möglicherweise trotzdem die andere.',
      ],
    },
    collab: {
      title: 'Collab',
      summary: 'Teile Aufgaben und Karten mit anderen Personen.',
      body: [
        'Collab benötigt zuerst funktionierendes Cloud-Sync, dann eine einmalige Einrichtung in deiner Firebase-Konsole: die Sicherheitsregeln veröffentlichen, die dir die App zeigt, und die anonyme Anmeldung einschalten. Der Leitfaden führt durch alle vier Schritte, und danach aktivierst du Collab vom selben Panel aus.',
        'Erstelle ein Team, und lade dann Leute über einen Einladungslink ein. Einladungen haben ihre eigene Gültigkeitsdauer, standardmäßig einen Tag, getrennt davon, wie lange das Team selbst besteht. Der Link enthält den Schlüssel, der zum Lesen des Teams nötig ist, behandle ihn also wie ein Passwort und schicke einen neuen, wenn er abläuft.',
        'Zwei Einstellungen pro Team bestimmen sein Verhalten, und nur der Host kann sie ändern. Der Abschluss geteilter Aufgaben ist entweder für alle umschalten, der Standard, bei dem eine Person, die etwas abhakt, es für alle löscht, oder persönlicher Abschluss, bei dem jedes Mitglied seinen eigenen verfolgt. Die Bearbeitungsrechte für Aufgaben sind entweder für alle offen, der Standard, oder nur für den Host.',
        'Der Host kann das Team umbenennen, Einladungen erzeugen, und es löschen. Mitglieder können es verlassen. In beiden Fällen wird gefragt, falls du deine eigenen lokalen Aufgaben in das Team geteilt hattest, ob diese Kopien auf deinem Gerät behalten oder zusammen mit dem Team entfernt werden sollen.',
      ],
    },
    dataTransfer: {
      title: 'Export und Import',
      summary: 'Verschiebe deine Daten als Datei.',
      body: [
        'JSON exportieren schreibt alles in eine Datei, und JSON importieren liest eine wieder ein. Das ist eine Momentaufnahme statt einer Live-Verbindung, was es richtig für Backups und den Umzug auf ein neues Gerät macht, und falsch dafür, zwei Geräte synchron zu halten. Nutze dafür Cloud-Sync.',
        'Bei aktivierter Verschlüsselung bietet der Export eine Wahl: das verschlüsselte Organizer-Format, oder lesbares Klartext-JSON. Das lesbare ist leicht zu prüfen und völlig ungeschützt, behandle diese Datei also mit Vorsicht.',
        'Für kleinere Datenmengen gibt es außerdem Freigabelink kopieren und einen QR-Code, was der schnellste Weg ist, eine Einrichtung auf ein Gerät neben dir zu übertragen. Sehr große Datenstände passen nicht in einen Link, und die App wird dich darauf hinweisen.',
      ],
    },
    settings: {
      title: 'Einstellungen',
      summary: 'Semester, Fächer, Erscheinungsbild und Apps.',
      body: [
        'Arbeite beim ersten Mal von oben nach unten. Lege den Semesternamen sowie Start- und Enddatum fest, die Wochenzahl wird für dich berechnet. Füge dann Fächer hinzu, jeweils mit Credits und einer Farbe, und etwaige Ferien. Der größte Teil der App richtet sich danach, also kommen sie zuerst. Vorlage laden kann Daten und Fächer für einen bekannten Studiengang ausfüllen.',
        'Zwei Schalter ändern, wofür die App ist. Der Arbeitsmodus benennt Fächer in Gruppen um und blendet Noten und Credits aus, zur Nutzung außerhalb eines Studiengangs. Der Modus ohne Semester lässt das Semestersystem ganz weg und zählt stattdessen einfache Jahreswochen. Allgemein enthält außerdem drei Design-Farben, ob neue Aufgaben im Kalender erscheinen, wie mehrwöchige Aufgaben abgehakt werden, und die Fälligkeits-Alarmeinstellungen.',
        'Navigationsleiste ordnet Tabs per Ziehen neu, benennt sie um, blendet die aus, die du nicht nutzt, und gruppiert den Rest in Ordner. Anzeigen wählt Symbole, Namen, oder beides, und auf einem Handy kann die Leiste unten oder an der Seite sitzen.',
        'Apps ist der Ort, an dem Funktionen ein- und ausgeschaltet werden, einschließlich Notizen, Pomodoro, Standby, Eisenhower und den Kalenderintegrationen. Das Deaktivieren einer App löscht deren Daten, daher wird zuerst gefragt.',
        'Verschlüsselung sperrt die Daten dieses Geräts hinter einer Passphrase von mindestens acht Zeichen, mit optionalem Hinweis und einem einmalig angezeigten Wiederherstellungscode aus zwölf Wörtern. Speichere diesen Code anderswo, denn er ist der einzige Weg zurück, wenn die Passphrase vergessen wird. Später kannst du die Passphrase ändern, einen neuen Wiederherstellungscode ausstellen, oder den Schlüssel rotieren, was alles neu verschlüsselt und dazu führt, dass sich andere Geräte erneut entsperren müssen.',
        'Die Gefahrenzone unten löscht das Semester und seine Aufgaben, Noten und das Board, und löscht Pomodoro-Daten. Jede fragt zuerst nach Bestätigung.',
      ],
    },
  },
}
