import Foundation
#if canImport(ActivityKit)
import ActivityKit
import AppIntents
import WidgetKit

@available(iOS 16.1, *)
struct OrganizerActivityAttributes: ActivityAttributes {
    let kind: String
    let itemId: String

    var key: String {
        Self.key(kind: kind, itemId: itemId)
    }

    static func key(kind: String, itemId: String) -> String {
        "\(kind)|\(itemId)"
    }

    struct ContentState: Codable, Hashable {
        let title: String
        let subtitle: String?
        let tone: String
        let timer: String
        let countFrom: Date?
        let endsAt: Date?
        let pausedAt: Date?
        let taskId: String?

        var isPaused: Bool { pausedAt != nil }

        var countdownRange: ClosedRange<Date>? {
            guard timer == "countdown", pausedAt == nil, let countFrom, let endsAt, endsAt > countFrom else { return nil }
            return countFrom...endsAt
        }

        var countUpStart: Date? {
            guard timer == "countup", pausedAt == nil else { return nil }
            return countFrom
        }

        var frozenSeconds: TimeInterval? {
            guard let pausedAt else { return nil }
            if let endsAt { return max(0, endsAt.timeIntervalSince(pausedAt)) }
            guard let countFrom else { return nil }
            return max(0, pausedAt.timeIntervalSince(countFrom))
        }

        var frozenProgress: Double? {
            guard let pausedAt, let countFrom, let endsAt, endsAt > countFrom else { return nil }
            let total = endsAt.timeIntervalSince(countFrom)
            return min(1, max(0, pausedAt.timeIntervalSince(countFrom) / total))
        }

        var staleDate: Date? {
            isPaused ? nil : endsAt
        }

        func paused(at now: Date) -> ContentState {
            guard pausedAt == nil else { return self }
            return with(countFrom: countFrom, endsAt: endsAt, pausedAt: now)
        }

        func resumed(at now: Date) -> ContentState {
            guard let pausedAt else { return self }
            let shift = now.timeIntervalSince(pausedAt)
            return with(countFrom: countFrom?.addingTimeInterval(shift), endsAt: endsAt?.addingTimeInterval(shift), pausedAt: nil)
        }

        private func with(countFrom: Date?, endsAt: Date?, pausedAt: Date?) -> ContentState {
            ContentState(title: title, subtitle: subtitle, tone: tone, timer: timer, countFrom: countFrom, endsAt: endsAt, pausedAt: pausedAt, taskId: taskId)
        }
    }
}

@available(iOS 17.0, *)
enum FocusActivityActions {
    static let kind = "focus"

    static func setRunning(_ running: Bool) async {
        WidgetShared.enqueueOp(type: "setFocusRunning", id: kind, fields: ["running": running])
        WidgetShared.setFocusRunning(running)
        let now = Date()
        let existing = Activity<OrganizerActivityAttributes>.activities.filter { $0.attributes.kind == kind }
        for activity in existing {
            let current = activity.content.state
            let next = running ? current.resumed(at: now) : current.paused(at: now)
            await activity.update(ActivityContent(state: next, staleDate: next.staleDate))
        }
        if running, existing.isEmpty, let template = WidgetShared.focusTemplate() {
            let endsAt = template.targetSecs.map { now.addingTimeInterval($0) }
            let state = OrganizerActivityAttributes.ContentState(
                title: template.title,
                subtitle: nil,
                tone: "focus",
                timer: endsAt == nil ? "countup" : "countdown",
                countFrom: now,
                endsAt: endsAt,
                pausedAt: nil,
                taskId: nil
            )
            let attributes = OrganizerActivityAttributes(kind: kind, itemId: kind)
            if (try? Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: state.staleDate), pushType: nil)) != nil {
                WidgetShared.setStartedActivityKeys(WidgetShared.startedActivityKeys().union([attributes.key]))
            }
        }
        if #available(iOS 18.0, *) {
            ControlCenter.shared.reloadAllControls()
        }
        WidgetShared.notifyQueueChanged()
    }
}

@available(iOS 18.0, *)
struct FocusControlIntent: SetValueIntent, LiveActivityIntent {
    static var title: LocalizedStringResource = "intent.focusRunning.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.focusRunning.running")
    var value: Bool

    init() {}

    func perform() async throws -> some IntentResult {
        await FocusActivityActions.setRunning(value)
        return .result()
    }
}

@available(iOS 17.0, *)
struct SetFocusRunningIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "intent.focusRunning.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.focusRunning.running")
    var running: Bool

    init() {}

    init(running: Bool) {
        self.running = running
    }

    func perform() async throws -> some IntentResult {
        await FocusActivityActions.setRunning(running)
        return .result()
    }
}

@available(iOS 17.0, *)
struct DismissActivityIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "intent.dismissActivity.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.dismissActivity.kind")
    var kind: String

    @Parameter(title: "intent.dismissActivity.item")
    var itemId: String

    init() {}

    init(kind: String, itemId: String) {
        self.kind = kind
        self.itemId = itemId
    }

    func perform() async throws -> some IntentResult {
        let key = OrganizerActivityAttributes.key(kind: kind, itemId: itemId)
        for activity in Activity<OrganizerActivityAttributes>.activities where activity.attributes.key == key {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct CompleteTaskActivityIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "intent.completeTask.title"
    static var isDiscoverable = false

    @Parameter(title: "intent.toggleTask.task")
    var taskId: String

    init() {}

    init(taskId: String) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        WidgetShared.enqueueOp(type: "setTaskDone", id: taskId, fields: ["done": true])
        WidgetShared.markPending(taskId: taskId, done: true)
        for activity in Activity<OrganizerActivityAttributes>.activities where activity.content.state.taskId == taskId {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        WidgetShared.notifyQueueChanged()
        return .result()
    }
}
#endif

struct LiveActivityItemPayload: Decodable {
    let kind: String
    let id: String
    let title: String
    let subtitle: String?
    let tone: String
    let timer: String
    let countFromMs: Double?
    let endsAtMs: Double?
    let pausedAtMs: Double?
    let taskId: String?
}

struct FocusTemplatePayload: Codable {
    let title: String
    let targetSecs: Double?
}

struct LiveActivitiesPayload: Decodable {
    let activities: [LiveActivityItemPayload]
    let focusTemplate: FocusTemplatePayload?
}
