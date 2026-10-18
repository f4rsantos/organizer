import WidgetKit
import Foundation

struct PendingWidgetState {
    let tasks: [String: Bool]
    let habits: [String: Bool]
    let moves: [String: String]

    static let none = PendingWidgetState(tasks: [:], habits: [:], moves: [:])

    static func current() -> PendingWidgetState {
        PendingWidgetState(tasks: WidgetShared.pending(), habits: WidgetShared.pendingHabits(), moves: WidgetShared.pendingMoves())
    }
}

struct ProjectionEntry: TimelineEntry {
    let date: Date
    let projection: WidgetProjection?
    let pending: PendingWidgetState
    var calendarOffset: Int = 0

    var text: WidgetText {
        WidgetText(labels: projection?.labels)
    }

    static func current() -> ProjectionEntry {
        ProjectionEntry(date: Date(), projection: WidgetShared.projection(), pending: .current(), calendarOffset: WidgetShared.calendarOffset())
    }

    static let preview = ProjectionEntry(
        date: Date(),
        projection: WidgetProjection(
            dayKey: nil,
            tasks: [
                WidgetTask(id: "p1", title: "Lab report", dueDate: nil, className: "Maths", classColor: "#6366F1", overdue: false),
                WidgetTask(id: "p2", title: "Reading", dueDate: nil, className: "History", classColor: "#F59E0B", overdue: true),
                WidgetTask(id: "p3", title: "Essay outline", dueDate: nil, className: nil, classColor: nil, overdue: false)
            ],
            today: [],
            kanban: [
                WidgetKanbanColumn(id: "k1", title: "To do", count: 2, cards: [
                    WidgetKanbanCard(id: "c1", title: "Draft slides", shared: false),
                    WidgetKanbanCard(id: "c2", title: "Book room", shared: false)
                ]),
                WidgetKanbanColumn(id: "k2", title: "Doing", count: 1, cards: [
                    WidgetKanbanCard(id: "c3", title: "Lab report", shared: false)
                ]),
                WidgetKanbanColumn(id: "k3", title: "Done", count: 4, cards: [])
            ],
            agenda: [
                WidgetAgendaDay(dayKey: WidgetDates.todayKey(), offset: 0, entries: [
                    WidgetTodayEntry(id: "a1", title: "Lecture", time: "09:00", allDay: false),
                    WidgetTodayEntry(id: "a2", title: "Essay due", time: "", allDay: true)
                ]),
                WidgetAgendaDay(dayKey: WidgetDates.tomorrowKey(), offset: 1, entries: [
                    WidgetTodayEntry(id: "a3", title: "Study group", time: "16:30", allDay: false)
                ])
            ],
            calendar: nil,
            calendarWeeks: nil,
            habits: [
                WidgetHabit(id: "h1", title: "Exercise", done: true, streak: 6, color: "#16A34A"),
                WidgetHabit(id: "h2", title: "Read", done: false, streak: 2, color: "#6366F1")
            ],
            pomodoro: WidgetPomodoro(enabled: true, completed: 5, abandoned: 1, focusSecs: 7200, tomatoes: [
                WidgetTomato(pct: 1, abandoned: false),
                WidgetTomato(pct: 1, abandoned: false),
                WidgetTomato(pct: 0.6, abandoned: true),
                WidgetTomato(pct: 1, abandoned: false)
            ], timer: nil),
            summary: WidgetSummary(habitsEnabled: true, overdue: 1, dueToday: 2, tasksOpen: 3, eventsToday: 2, habitsPending: 1),
            labels: nil
        ),
        pending: .none
    )
}

struct ProjectionProvider: TimelineProvider {
    private static let refreshMinutes = 30

    func placeholder(in context: Context) -> ProjectionEntry {
        .preview
    }

    func getSnapshot(in context: Context, completion: @escaping (ProjectionEntry) -> Void) {
        completion(context.isPreview ? .preview : .current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProjectionEntry>) -> Void) {
        let entry = ProjectionEntry.current()
        completion(Timeline(entries: [entry], policy: .after(Self.nextRefresh(after: entry.date))))
    }

    static func nextRefresh(after date: Date) -> Date {
        let calendar = Calendar.current
        let soon = calendar.date(byAdding: .minute, value: refreshMinutes, to: date) ?? date
        let midnight = calendar.nextDate(after: date, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? soon
        return min(soon, midnight)
    }
}
