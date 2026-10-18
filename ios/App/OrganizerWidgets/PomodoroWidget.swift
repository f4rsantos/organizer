import SwiftUI
import WidgetKit

struct PomodoroWidget: Widget {
    let kind = "PomodoroWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            PomodoroWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "focus"))
        }
        .configurationDisplayName("widget.pomodoro.name")
        .description("widget.pomodoro.description")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

struct FocusTimerWindow {
    let countFrom: Date
    let endsAt: Date?

    init?(_ timer: WidgetFocusTimer?) {
        guard let timer, timer.running == true, let countFrom = timer.countFrom else { return nil }
        self.countFrom = Date(timeIntervalSince1970: countFrom)
        endsAt = timer.endsAt.map { Date(timeIntervalSince1970: $0) }
    }

    var countdownRange: ClosedRange<Date>? {
        guard let endsAt, endsAt > countFrom else { return nil }
        return countFrom...endsAt
    }
}

struct FocusTimerText: View {
    let window: FocusTimerWindow

    var body: some View {
        if let range = window.countdownRange {
            Text(timerInterval: range, countsDown: true)
        } else {
            Text(window.countFrom, style: .timer)
        }
    }
}

struct PomodoroWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.showsWidgetContainerBackground) private var showsBackground
    let entry: ProjectionEntry

    private var pomodoro: WidgetPomodoro? {
        entry.projection?.pomodoro
    }

    var body: some View {
        if pomodoro?.enabled != true {
            VStack(alignment: .leading) {
                WidgetHeader(title: entry.text.pomodoro, subtitle: nil, symbol: "timer")
                WidgetEmptyState(message: entry.projection == nil ? entry.text.noData : entry.text.pomodoroOff, symbol: "timer")
            }
        } else if family == .systemSmall && !showsBackground {
            PomodoroStandBy(pomodoro: pomodoro, text: entry.text)
        } else if family == .accessoryRectangular {
            PomodoroAccessory(pomodoro: pomodoro, text: entry.text)
        } else {
            PomodoroCard(pomodoro: pomodoro, text: entry.text, wide: family == .systemMedium)
        }
    }
}

private struct PomodoroCard: View {
    let pomodoro: WidgetPomodoro?
    let text: WidgetText
    let wide: Bool

    private var completed: Int { pomodoro?.completed ?? 0 }
    private var timer: FocusTimerWindow? { FocusTimerWindow(pomodoro?.timer) }
    private var focusLabel: String {
        WidgetDurations.hoursMinutes(pomodoro?.focusSecs ?? 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: text.pomodoro, subtitle: wide ? focusLabel : nil, symbol: "timer")
            HStack(alignment: .bottom, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    if let timer {
                        FocusTimerText(window: timer)
                            .font(.system(size: 30, weight: .bold, design: .rounded).monospacedDigit())
                            .foregroundStyle(WidgetPalette.foreground)
                            .widgetAccentable()
                        Text(pomodoro?.timer?.phase == "break" ? text.breakPhase : text.focusPhase)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(WidgetPalette.accent)
                    } else {
                        Text(String(completed))
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(WidgetPalette.foreground)
                            .widgetAccentable()
                            .contentTransition(.numericText())
                        Text(text.completedCount(completed))
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(WidgetPalette.muted)
                            .lineLimit(1)
                    }
                }
                if wide {
                    Spacer(minLength: 4)
                    TomatoPile(tomatoes: pomodoro?.tomatoes ?? [], columns: 6)
                }
            }
            if !wide {
                Spacer(minLength: 0)
                TomatoPile(tomatoes: pomodoro?.tomatoes ?? [], columns: 6)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct PomodoroStandBy: View {
    let pomodoro: WidgetPomodoro?
    let text: WidgetText

    private var timer: FocusTimerWindow? { FocusTimerWindow(pomodoro?.timer) }
    private var isBreak: Bool { pomodoro?.timer?.phase == "break" }
    private var tone: Color {
        isBreak ? Color(light: 0x2F9E44, dark: 0x40C057) : Color(light: 0xE5484D, dark: 0xF2555A)
    }

    var body: some View {
        VStack(spacing: 4) {
            if let timer {
                FocusTimerText(window: timer)
                    .font(.system(size: 54, weight: .heavy, design: .rounded).monospacedDigit())
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .foregroundStyle(tone)
                    .widgetAccentable()
                Text(isBreak ? text.breakPhase : text.focusPhase)
                    .font(.headline)
                    .foregroundStyle(.secondary)
            } else {
                Text(String(pomodoro?.completed ?? 0))
                    .font(.system(size: 64, weight: .heavy, design: .rounded))
                    .foregroundStyle(tone)
                    .widgetAccentable()
                Text(text.completedCount(pomodoro?.completed ?? 0))
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct PomodoroAccessory: View {
    let pomodoro: WidgetPomodoro?
    let text: WidgetText

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Label(text.pomodoro, systemImage: "timer")
                .font(.headline)
                .widgetAccentable()
            if let timer = FocusTimerWindow(pomodoro?.timer) {
                FocusTimerText(window: timer)
                    .font(.body.monospacedDigit())
            } else {
                Text(text.completedCount(pomodoro?.completed ?? 0))
                    .font(.caption)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct TomatoPile: View {
    private static let maxTomatoes = 12

    let tomatoes: [WidgetTomato]
    let columns: Int

    var body: some View {
        let shown = Array(tomatoes.suffix(Self.maxTomatoes).enumerated())
        LazyVGrid(columns: Array(repeating: GridItem(.fixed(14), spacing: 3), count: columns), alignment: .leading, spacing: 3) {
            ForEach(shown, id: \.offset) { _, tomato in
                TomatoDot(tomato: tomato)
            }
        }
        .fixedSize()
    }
}

private struct TomatoDot: View {
    private static let tomatoRed = Color(light: 0xE5484D, dark: 0xF2555A)
    private static let leafGreen = Color(light: 0x2F9E44, dark: 0x40C057)

    let tomato: WidgetTomato

    var body: some View {
        ZStack(alignment: .top) {
            Circle()
                .fill(tomato.abandoned == true ? WidgetPalette.done : Self.tomatoRed)
                .opacity(0.35 + 0.65 * min(1, max(0, tomato.pct ?? 1)))
                .frame(width: 13, height: 13)
                .widgetAccentable()
            Image(systemName: "leaf.fill")
                .font(.system(size: 6))
                .foregroundStyle(Self.leafGreen)
                .offset(y: -3)
        }
        .frame(width: 14, height: 14)
    }
}

enum WidgetDurations {
    private static let formatter: DateComponentsFormatter = {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute]
        formatter.unitsStyle = .abbreviated
        formatter.zeroFormattingBehavior = .dropAll
        return formatter
    }()

    static func hoursMinutes(_ secs: Double) -> String {
        formatter.string(from: max(0, secs)) ?? ""
    }
}
