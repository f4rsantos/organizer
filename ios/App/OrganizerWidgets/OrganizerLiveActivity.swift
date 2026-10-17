import ActivityKit
import SwiftUI
import WidgetKit

struct OrganizerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrganizerActivityAttributes.self) { context in
            ActivityLockScreenView(kind: context.attributes.kind, itemId: context.attributes.itemId, state: context.state, isStale: context.isStale)
                .padding(16)
                .activityBackgroundTint(WidgetPalette.background.opacity(0.35))
                .activitySystemActionForegroundColor(ActivityTone.color(context.state.tone))
                .widgetURL(WidgetShared.launchURL(tab: ActivityTone.tab(for: context.attributes.kind)))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ActivityBadge(state: context.state)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ActivityClock(state: context.state, isStale: context.isStale)
                        .font(.title2.weight(.bold).monospacedDigit())
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 110, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            if let subtitle = context.state.subtitle {
                                Text(subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            ActivityProgress(state: context.state)
                        }
                        ActivityAction(kind: context.attributes.kind, itemId: context.attributes.itemId, state: context.state)
                    }
                }
            } compactLeading: {
                ActivityIcon(state: context.state)
            } compactTrailing: {
                ActivityClock(state: context.state, isStale: context.isStale)
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .frame(maxWidth: 52)
            } minimal: {
                ActivityIcon(state: context.state)
            }
            .widgetURL(WidgetShared.launchURL(tab: ActivityTone.tab(for: context.attributes.kind)))
            .keylineTint(ActivityTone.color(context.state.tone))
        }
    }
}

enum ActivityTone {
    static func color(_ tone: String) -> Color {
        switch tone {
        case "break": return Color(light: 0x2F9E44, dark: 0x40C057)
        case "event": return WidgetPalette.accent
        case "deadline": return Color(light: 0xE8590C, dark: 0xFF922B)
        case "agent": return Color(light: 0x7048E8, dark: 0x9775FA)
        case "failed": return WidgetPalette.overdue
        default: return Color(light: 0xE5484D, dark: 0xF2555A)
        }
    }

    static func symbol(_ tone: String) -> String {
        switch tone {
        case "break": return "cup.and.saucer.fill"
        case "event": return "calendar"
        case "deadline": return "flag.fill"
        case "agent": return "sparkles"
        case "failed": return "exclamationmark.triangle.fill"
        default: return "timer"
        }
    }

    static func tab(for kind: String) -> String {
        switch kind {
        case "upNext": return "calendar"
        case "deadline": return "tasks"
        case "agent": return "aiAssistant"
        default: return "focus"
        }
    }
}

private struct ActivityIcon: View {
    let state: OrganizerActivityAttributes.ContentState

    var body: some View {
        Image(systemName: state.isPaused ? "pause.fill" : ActivityTone.symbol(state.tone))
            .foregroundStyle(ActivityTone.color(state.tone))
    }
}

private struct ActivityBadge: View {
    let state: OrganizerActivityAttributes.ContentState

    var body: some View {
        Label(state.title, systemImage: ActivityTone.symbol(state.tone))
            .font(.headline)
            .foregroundStyle(ActivityTone.color(state.tone))
            .lineLimit(1)
    }
}

private struct ActivityClock: View {
    let state: OrganizerActivityAttributes.ContentState
    let isStale: Bool

    var body: some View {
        if let frozen = state.frozenSeconds {
            Text(Duration.seconds(frozen).formatted(.time(pattern: frozen >= 3600 ? .hourMinuteSecond : .minuteSecond)))
                .opacity(0.7)
        } else if let range = state.countdownRange, !isStale {
            Text(timerInterval: range, countsDown: true)
        } else if let start = state.countUpStart {
            Text(start, style: .timer)
        } else {
            Image(systemName: ActivityTone.symbol(state.tone))
                .foregroundStyle(ActivityTone.color(state.tone))
        }
    }
}

private struct ActivityProgress: View {
    let state: OrganizerActivityAttributes.ContentState

    var body: some View {
        if let progress = state.frozenProgress {
            ProgressView(value: progress)
                .tint(ActivityTone.color(state.tone).opacity(0.6))
        } else if let range = state.countdownRange {
            ProgressView(timerInterval: range, countsDown: state.tone == "focus" || state.tone == "break") {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .tint(ActivityTone.color(state.tone))
        }
    }
}

private struct ActivityAction: View {
    let kind: String
    let itemId: String
    let state: OrganizerActivityAttributes.ContentState

    var body: some View {
        if kind == FocusActivityActions.kind {
            Button(intent: SetFocusRunningIntent(running: state.isPaused)) {
                ActivityActionLabel(symbol: state.isPaused ? "play.fill" : "pause.fill", tone: state.tone, filled: true)
            }
            .buttonStyle(.plain)
        } else {
            HStack(spacing: 8) {
                if let taskId = state.taskId {
                    Button(intent: CompleteTaskActivityIntent(taskId: taskId)) {
                        ActivityActionLabel(symbol: "checkmark", tone: state.tone, filled: true)
                    }
                    .buttonStyle(.plain)
                }
                Button(intent: DismissActivityIntent(kind: kind, itemId: itemId)) {
                    ActivityActionLabel(symbol: "xmark", tone: state.tone, filled: false)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct ActivityActionLabel: View {
    let symbol: String
    let tone: String
    let filled: Bool

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(filled ? Color.white : ActivityTone.color(tone))
            .frame(width: 36, height: 36)
            .background(Circle().fill(ActivityTone.color(tone).opacity(filled ? 1 : 0.18)))
    }
}

private struct ActivityLockScreenView: View {
    let kind: String
    let itemId: String
    let state: OrganizerActivityAttributes.ContentState
    let isStale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    ActivityBadge(state: state)
                    if let subtitle = state.subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(WidgetPalette.muted)
                    }
                }
                Spacer()
                ActivityClock(state: state, isStale: isStale)
                    .font(.system(size: 34, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(WidgetPalette.foreground)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 150, alignment: .trailing)
            }
            HStack(spacing: 12) {
                ActivityProgress(state: state)
                ActivityAction(kind: kind, itemId: itemId, state: state)
            }
        }
    }
}
