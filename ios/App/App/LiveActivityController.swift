import Foundation
import ActivityKit

@available(iOS 16.2, *)
enum LiveActivityController {
    private static let msPerSecond = 1000.0

    static func sync(_ payload: LiveActivitiesPayload) async {
        WidgetShared.setFocusTemplate(payload.focusTemplate)
        let focusItem = payload.activities.first { $0.kind == "focus" }
        WidgetShared.setFocusRunning(focusItem != nil && focusItem?.pausedAtMs == nil)

        let wanted = Dictionary(payload.activities.map { (OrganizerActivityAttributes.key(kind: $0.kind, itemId: $0.id), $0) }, uniquingKeysWith: { first, _ in first })
        var live = Set<String>()
        for activity in Activity<OrganizerActivityAttributes>.activities where isOnScreen(activity) {
            let key = activity.attributes.key
            guard let item = wanted[key], !live.contains(key) else {
                await activity.end(nil, dismissalPolicy: .immediate)
                continue
            }
            live.insert(key)
            let state = contentState(item)
            await activity.update(ActivityContent(state: state, staleDate: state.staleDate))
        }

        var started = WidgetShared.startedActivityKeys().intersection(wanted.keys).union(live)
        let dismissed = started.subtracting(live)
        if ActivityAuthorizationInfo().areActivitiesEnabled {
            for (key, item) in wanted where !live.contains(key) && !dismissed.contains(key) {
                let state = contentState(item)
                let request = try? Activity.request(
                    attributes: OrganizerActivityAttributes(kind: item.kind, itemId: item.id),
                    content: ActivityContent(state: state, staleDate: state.staleDate),
                    pushType: nil
                )
                if request != nil {
                    started.insert(key)
                }
            }
        }
        WidgetShared.setStartedActivityKeys(started)
    }

    private static func isOnScreen(_ activity: Activity<OrganizerActivityAttributes>) -> Bool {
        activity.activityState == .active || activity.activityState == .stale
    }

    private static func date(_ ms: Double?) -> Date? {
        ms.map { Date(timeIntervalSince1970: $0 / msPerSecond) }
    }

    private static func contentState(_ item: LiveActivityItemPayload) -> OrganizerActivityAttributes.ContentState {
        OrganizerActivityAttributes.ContentState(
            title: item.title,
            subtitle: item.subtitle,
            tone: item.tone,
            timer: item.timer,
            countFrom: date(item.countFromMs),
            endsAt: date(item.endsAtMs),
            pausedAt: date(item.pausedAtMs),
            taskId: item.taskId
        )
    }
}
