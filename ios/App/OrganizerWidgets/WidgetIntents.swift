import AppIntents
import Foundation

struct ToggleTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "intent.toggleTask.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.toggleTask.task")
    var taskId: String

    @Parameter(title: "intent.toggleTask.done")
    var done: Bool

    init() {}

    init(taskId: String, done: Bool) {
        self.taskId = taskId
        self.done = done
    }

    func perform() async throws -> some IntentResult {
        WidgetShared.enqueueOp(type: "setTaskDone", id: taskId, fields: ["done": done])
        WidgetShared.markPending(taskId: taskId, done: done)
        return .result()
    }
}

struct ToggleHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "intent.toggleHabit.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.toggleHabit.habit")
    var habitId: String

    @Parameter(title: "intent.toggleTask.done")
    var done: Bool

    init() {}

    init(habitId: String, done: Bool) {
        self.habitId = habitId
        self.done = done
    }

    func perform() async throws -> some IntentResult {
        WidgetShared.enqueueOp(type: "setHabitCheckIn", id: habitId, fields: ["done": done])
        WidgetShared.markPendingHabit(id: habitId, done: done)
        return .result()
    }
}

struct MoveCardIntent: AppIntent {
    static var title: LocalizedStringResource = "intent.moveCard.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.moveCard.card")
    var cardId: String

    @Parameter(title: "intent.moveCard.column")
    var columnId: String

    init() {}

    init(cardId: String, columnId: String) {
        self.cardId = cardId
        self.columnId = columnId
    }

    func perform() async throws -> some IntentResult {
        WidgetShared.enqueueOp(type: "moveCard", id: cardId, fields: ["columnId": columnId])
        WidgetShared.markPendingMove(cardId: cardId, columnId: columnId)
        return .result()
    }
}

struct CalendarPageIntent: AppIntent {
    static var title: LocalizedStringResource = "intent.calendarPage.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.calendarPage.delta")
    var delta: Int

    init() {}

    init(delta: Int) {
        self.delta = delta
    }

    func perform() async throws -> some IntentResult {
        WidgetShared.shiftCalendarOffset(by: delta)
        return .result()
    }
}
