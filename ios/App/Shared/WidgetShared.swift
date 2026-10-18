import Foundation

enum WidgetShared {
    static let appGroup = "group.io.github.f4rsantos.organizer"
    static let urlScheme = "organizer"
    static let tabHost = "tab"
    static let queueChangedNotification = Notification.Name("OrganizerWidgetQueueChanged")
    static let calendarOffsetRange = -1...1

    private static let projectionKey = "projection"
    private static let queueKey = "queue"
    private static let pendingKey = "pending"
    private static let pendingHabitsKey = "pending-habits"
    private static let pendingMovesKey = "pending-moves"
    private static let launchTabKey = "launch-tab"
    private static let calendarOffsetKey = "calendar-offset"
    private static let focusRunningKey = "focus-running"
    private static let focusTemplateKey = "focus-template"
    private static let startedActivitiesKey = "started-activities"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    static func setProjection(_ payload: String) {
        defaults?.set(payload, forKey: projectionKey)
        defaults?.removeObject(forKey: calendarOffsetKey)
    }

    static func calendarOffset() -> Int {
        let stored = defaults?.integer(forKey: calendarOffsetKey) ?? 0
        return min(calendarOffsetRange.upperBound, max(calendarOffsetRange.lowerBound, stored))
    }

    static func shiftCalendarOffset(by delta: Int) {
        let next = min(calendarOffsetRange.upperBound, max(calendarOffsetRange.lowerBound, calendarOffset() + delta))
        defaults?.set(next, forKey: calendarOffsetKey)
    }

    static func setFocusRunning(_ running: Bool) {
        defaults?.set(running, forKey: focusRunningKey)
    }

    static func focusRunning() -> Bool {
        defaults?.bool(forKey: focusRunningKey) ?? false
    }

    static func setFocusTemplate(_ template: FocusTemplatePayload?) {
        guard let template, let data = try? JSONEncoder().encode(template) else {
            defaults?.removeObject(forKey: focusTemplateKey)
            return
        }
        defaults?.set(data, forKey: focusTemplateKey)
    }

    static func focusTemplate() -> FocusTemplatePayload? {
        guard let data = defaults?.data(forKey: focusTemplateKey) else { return nil }
        return try? JSONDecoder().decode(FocusTemplatePayload.self, from: data)
    }

    static func startedActivityKeys() -> Set<String> {
        Set(defaults?.stringArray(forKey: startedActivitiesKey) ?? [])
    }

    static func setStartedActivityKeys(_ keys: Set<String>) {
        defaults?.set(keys.sorted(), forKey: startedActivitiesKey)
    }

    static func notifyQueueChanged() {
        NotificationCenter.default.post(name: queueChangedNotification, object: nil)
    }

    static func projection() -> WidgetProjection? {
        guard
            let raw = defaults?.string(forKey: projectionKey),
            let data = raw.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetProjection.self, from: data)
    }

    static func clear() {
        defaults?.removeObject(forKey: projectionKey)
        defaults?.removeObject(forKey: queueKey)
        clearPending()
    }

    static func enqueue(_ op: [String: Any]) {
        guard let defaults else { return }
        var queue = readQueue(defaults)
        queue.append(op)
        guard
            let data = try? JSONSerialization.data(withJSONObject: queue),
            let raw = String(data: data, encoding: .utf8)
        else { return }
        defaults.set(raw, forKey: queueKey)
    }

    static func drainQueue() -> String {
        guard let defaults else { return "[]" }
        let raw = defaults.string(forKey: queueKey) ?? "[]"
        defaults.removeObject(forKey: queueKey)
        clearPending()
        return raw
    }

    static func markPending(taskId: String, done: Bool) {
        guard let defaults else { return }
        var pending = self.pending()
        pending[taskId] = done
        defaults.set(pending, forKey: pendingKey)
    }

    static func pending() -> [String: Bool] {
        defaults?.dictionary(forKey: pendingKey) as? [String: Bool] ?? [:]
    }

    static func markPendingHabit(id: String, done: Bool) {
        var pending = pendingHabits()
        pending[id] = done
        defaults?.set(pending, forKey: pendingHabitsKey)
    }

    static func pendingHabits() -> [String: Bool] {
        defaults?.dictionary(forKey: pendingHabitsKey) as? [String: Bool] ?? [:]
    }

    static func markPendingMove(cardId: String, columnId: String) {
        var moves = pendingMoves()
        moves[cardId] = columnId
        defaults?.set(moves, forKey: pendingMovesKey)
    }

    static func pendingMoves() -> [String: String] {
        defaults?.dictionary(forKey: pendingMovesKey) as? [String: String] ?? [:]
    }

    static func enqueueOp(type: String, id: String, fields: [String: Any]) {
        var op = fields
        op["type"] = type
        op["id"] = id
        op["ts"] = Int(Date().timeIntervalSince1970 * 1000)
        enqueue(op)
    }

    private static func clearPending() {
        defaults?.removeObject(forKey: pendingKey)
        defaults?.removeObject(forKey: pendingHabitsKey)
        defaults?.removeObject(forKey: pendingMovesKey)
    }

    static func setLaunchTab(_ tab: String) {
        defaults?.set(tab, forKey: launchTabKey)
    }

    static func takeLaunchTab() -> String? {
        guard let tab = defaults?.string(forKey: launchTabKey) else { return nil }
        defaults?.removeObject(forKey: launchTabKey)
        return tab
    }

    static func launchURL(tab: String) -> URL {
        var components = URLComponents()
        components.scheme = urlScheme
        components.host = tabHost
        components.path = "/" + tab
        return components.url ?? URL(fileURLWithPath: "/")
    }

    static func tab(from url: URL) -> String? {
        guard url.scheme == urlScheme, url.host == tabHost else { return nil }
        let tab = url.lastPathComponent
        return tab.isEmpty || tab == "/" ? nil : tab
    }

    private static func readQueue(_ defaults: UserDefaults) -> [Any] {
        guard
            let raw = defaults.string(forKey: queueKey),
            let data = raw.data(using: .utf8),
            let queue = try? JSONSerialization.jsonObject(with: data) as? [Any]
        else { return [] }
        return queue
    }
}

struct WidgetProjection: Decodable {
    let dayKey: String?
    let tasks: [WidgetTask]?
    let today: [WidgetTodayEntry]?
    let kanban: [WidgetKanbanColumn]?
    let agenda: [WidgetAgendaDay]?
    let calendar: [WidgetCalendarMonth]?
    let calendarWeeks: [WidgetCalendarWeek]?
    let habits: [WidgetHabit]?
    let pomodoro: WidgetPomodoro?
    let summary: WidgetSummary?
    let labels: WidgetLabels?
}

struct WidgetTask: Decodable, Identifiable {
    let id: String
    let title: String
    let dueDate: String?
    let className: String?
    let classColor: String?
    let overdue: Bool?
}

struct WidgetTodayEntry: Decodable, Identifiable {
    let id: String
    let title: String
    let time: String?
    let allDay: Bool?
}

struct WidgetKanbanColumn: Decodable, Identifiable {
    let id: String
    let title: String
    let count: Int?
    let cards: [WidgetKanbanCard]?
}

struct WidgetKanbanCard: Decodable, Identifiable {
    let id: String
    let title: String
    let shared: Bool?
}

struct WidgetAgendaDay: Decodable, Identifiable {
    let dayKey: String
    let offset: Int?
    let entries: [WidgetTodayEntry]?

    var id: String { dayKey }
}

struct WidgetCalendarDay: Decodable {
    let day: Int
    let dayKey: String
    let count: Int?
    let today: Bool?
    let entries: [WidgetTodayEntry]?
}

struct WidgetCalendarMonth: Decodable {
    let year: Int
    let month: Int
    let monthOffset: Int?
    let days: [WidgetCalendarDay?]?
}

struct WidgetCalendarWeek: Decodable {
    let weekOffset: Int?
    let startKey: String?
    let days: [WidgetCalendarDay]?
}

struct WidgetHabit: Decodable, Identifiable {
    let id: String
    let title: String
    let done: Bool?
    let streak: Int?
    let color: String?
}

struct WidgetTomato: Decodable {
    let pct: Double?
    let abandoned: Bool?
}

struct WidgetFocusTimer: Decodable {
    let running: Bool?
    let phase: String?
    let startedAt: Double?
    let countFrom: Double?
    let endsAt: Double?
}

struct WidgetPomodoro: Decodable {
    let enabled: Bool?
    let completed: Int?
    let abandoned: Int?
    let focusSecs: Double?
    let tomatoes: [WidgetTomato]?
    let timer: WidgetFocusTimer?
}

struct WidgetSummary: Decodable {
    let habitsEnabled: Bool?
    let overdue: Int?
    let dueToday: Int?
    let tasksOpen: Int?
    let eventsToday: Int?
    let habitsPending: Int?
}

struct WidgetLabels: Decodable {
    let overview: String?
    let tasks: String?
    let events: String?
    let habits: String?
    let openCount: String?
    let overdueCount: String?
    let tasksEmpty: String?
    let today: String?
    let noData: String?
    let calendar: String?
    let kanban: String?
    let agenda: String?
    let pomodoro: String?
    let kanbanEmpty: String?
    let agendaEmpty: String?
    let habitsEmpty: String?
    let tomorrow: String?
    let allDay: String?
    let focusPhase: String?
    let breakPhase: String?
    let completedCount: String?
    let streakCount: String?
    let pomodoroOff: String?
    let weekdaysShort: [String]?
    let months: [String]?
}
