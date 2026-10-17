import SwiftUI
import WidgetKit
import UIKit

enum WidgetPalette {
    static let background = Color(light: 0xFBF8F6, dark: 0x0E1216)
    static let backgroundDeep = Color(light: 0xF1ECE8, dark: 0x080B0E)
    static let surface = Color(light: 0xEEEAE8, dark: 0x161B20)
    static let foreground = Color(light: 0x1E1A16, dark: 0xE7E4E1)
    static let muted = Color(light: 0x76706C, dark: 0x857F7A)
    static let overdue = Color(light: 0xB4451F, dark: 0xE08A5A)
    static let accent = Color(light: 0x305880, dark: 0x5E93CA)
    static let done = Color(light: 0xA39D98, dark: 0x5C5854)
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    init?(widgetHex hex: String?) {
        guard let hex else { return nil }
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
        self.init(UIColor(rgb: value))
    }
}

extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

struct WidgetGlassBackground: ViewModifier {
    func body(content: Content) -> some View {
        content.containerBackground(for: .widget) {
            LinearGradient(
                colors: [WidgetPalette.background, WidgetPalette.backgroundDeep],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

struct GlassTile: ViewModifier {
    @Environment(\.widgetRenderingMode) private var renderingMode

    private static let cornerRadius: CGFloat = 14

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Self.cornerRadius, style: .continuous)
        return content
            .background(shape.fill(fill))
            .overlay(
                shape.strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(0.55), Color.white.opacity(0.05)],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 0.75
                )
            )
    }

    private var fill: AnyShapeStyle {
        if renderingMode == .fullColor {
            return AnyShapeStyle(WidgetPalette.surface.opacity(0.85))
        }
        return AnyShapeStyle(Color.white.opacity(0.12))
    }
}

extension View {
    func widgetGlassBackground() -> some View {
        modifier(WidgetGlassBackground())
    }

    func glassTile() -> some View {
        modifier(GlassTile())
    }
}

struct WidgetText {
    let labels: WidgetLabels?

    var overview: String { labels?.overview ?? "Overview" }
    var tasks: String { labels?.tasks ?? "Tasks" }
    var events: String { labels?.events ?? "Events" }
    var habits: String { labels?.habits ?? "Habits" }
    var tasksEmpty: String { labels?.tasksEmpty ?? "All done. Enjoy the day." }
    var today: String { labels?.today ?? "Today" }
    var noData: String { labels?.noData ?? "Open Organizer to sync" }
    var calendar: String { labels?.calendar ?? "Calendar" }
    var kanban: String { labels?.kanban ?? "Kanban" }
    var agenda: String { labels?.agenda ?? "Agenda" }
    var pomodoro: String { labels?.pomodoro ?? "Pomodoro" }
    var kanbanEmpty: String { labels?.kanbanEmpty ?? "No board yet." }
    var agendaEmpty: String { labels?.agendaEmpty ?? "Clear ahead. Time to rest." }
    var habitsEmpty: String { labels?.habitsEmpty ?? "All habits done today." }
    var tomorrow: String { labels?.tomorrow ?? "Tomorrow" }
    var allDay: String { labels?.allDay ?? "All day" }
    var focusPhase: String { labels?.focusPhase ?? "Focus" }
    var breakPhase: String { labels?.breakPhase ?? "Break" }
    var pomodoroOff: String { labels?.pomodoroOff ?? "Turn on Pomodoro in Organizer" }

    var weekdaysShort: [String] {
        let names = labels?.weekdaysShort ?? []
        return names.count == 7 ? names : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    }

    func monthName(_ month: Int) -> String {
        let names = labels?.months ?? []
        guard month >= 1, month <= names.count else { return String(month) }
        return names[month - 1]
    }

    func completedCount(_ count: Int) -> String {
        fill(labels?.completedCount ?? "{count} done", count)
    }

    func streakCount(_ count: Int) -> String {
        fill(labels?.streakCount ?? "{count} day streak", count)
    }

    func dayTitle(dayKey: String, now: Date) -> String {
        if dayKey == WidgetDates.todayKey(now: now) { return today }
        if dayKey == WidgetDates.tomorrowKey(now: now) { return tomorrow }
        return WidgetDates.long(dayKey: dayKey) ?? dayKey
    }

    func openCount(_ count: Int) -> String {
        fill(labels?.openCount ?? "{count} open", count)
    }

    func overdueCount(_ count: Int) -> String {
        fill(labels?.overdueCount ?? "{count} overdue", count)
    }

    private func fill(_ template: String, _ count: Int) -> String {
        template.replacingOccurrences(of: "{count}", with: String(count))
    }
}

enum WidgetDates {
    private static let parser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let display: DateFormatter = {
        let formatter = DateFormatter()
        formatter.setLocalizedDateFormatFromTemplate("dMMM")
        return formatter
    }()

    private static let longDisplay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.setLocalizedDateFormatFromTemplate("EEEdMMM")
        return formatter
    }()

    static func key(for date: Date) -> String {
        parser.string(from: date)
    }

    static func todayKey(now: Date = Date()) -> String {
        key(for: now)
    }

    static func tomorrowKey(now: Date = Date()) -> String {
        key(for: Calendar.current.date(byAdding: .day, value: 1, to: now) ?? now)
    }

    static func long(dayKey: String) -> String? {
        guard let date = parser.date(from: dayKey) else { return nil }
        return longDisplay.string(from: date)
    }

    static func short(dayKey: String) -> String? {
        guard let date = parser.date(from: dayKey) else { return nil }
        return display.string(from: date)
    }
}

struct WidgetHeader: View {
    let title: String
    let subtitle: String?
    let symbol: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: symbol)
                .font(.caption.weight(.semibold))
                .foregroundStyle(WidgetPalette.accent)
                .widgetAccentable()
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(WidgetPalette.foreground)
                .lineLimit(1)
            Spacer(minLength: 4)
            if let subtitle {
                Text(subtitle)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(WidgetPalette.muted)
                    .lineLimit(1)
            }
        }
    }
}

struct WidgetEmptyState: View {
    let message: String
    let symbol: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(WidgetPalette.accent)
                .widgetAccentable()
            Text(message)
                .font(.caption)
                .foregroundStyle(WidgetPalette.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
