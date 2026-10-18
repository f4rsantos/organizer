import SwiftUI
import WidgetKit
import AppIntents

struct HabitsWidget: Widget {
    let kind = "HabitsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            HabitsWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "habits"))
        }
        .configurationDisplayName("widget.habits.name")
        .description("widget.habits.description")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct HabitsWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ProjectionEntry

    private var rowLimit: Int {
        switch family {
        case .systemLarge: return 8
        case .systemMedium: return 3
        default: return 3
        }
    }

    private var habits: [WidgetHabit] {
        entry.projection?.habits ?? []
    }

    private func isDone(_ habit: WidgetHabit) -> Bool {
        entry.pending.habits[habit.id] ?? habit.done ?? false
    }

    var body: some View {
        let doneCount = habits.filter(isDone).count
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: entry.text.habits, subtitle: habits.isEmpty ? nil : "\(doneCount)/\(habits.count)", symbol: "target")
            if habits.isEmpty || doneCount == habits.count && family == .systemSmall {
                WidgetEmptyState(message: entry.projection == nil ? entry.text.noData : entry.text.habitsEmpty, symbol: "sparkles")
            } else {
                VStack(spacing: 4) {
                    ForEach(Array(habits.prefix(rowLimit))) { habit in
                        HabitRow(
                            habit: habit,
                            done: isDone(habit),
                            streakLabel: entry.text.streakCount(habit.streak ?? 0),
                            compact: family == .systemSmall
                        )
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct HabitRow: View {
    let habit: WidgetHabit
    let done: Bool
    let streakLabel: String
    let compact: Bool

    private var color: Color {
        Color(widgetHex: habit.color) ?? WidgetPalette.accent
    }

    var body: some View {
        HStack(spacing: 8) {
            Button(intent: ToggleHabitIntent(habitId: habit.id, done: !done)) {
                Image(systemName: done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: compact ? 16 : 18, weight: .medium))
                    .foregroundStyle(done ? color : WidgetPalette.muted)
                    .widgetAccentable()
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 0) {
                Text(habit.title)
                    .font(compact ? .caption : .footnote)
                    .foregroundStyle(done ? WidgetPalette.done : WidgetPalette.foreground)
                    .lineLimit(1)
                if !compact, (habit.streak ?? 0) > 0 {
                    Text(streakLabel)
                        .font(.caption2)
                        .foregroundStyle(WidgetPalette.muted)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            if (habit.streak ?? 0) > 0 {
                Label(String(habit.streak ?? 0), systemImage: "flame.fill")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(WidgetPalette.overdue)
                    .labelStyle(.titleAndIcon)
            }
        }
        .padding(.horizontal, compact ? 0 : 8)
        .padding(.vertical, compact ? 0 : 5)
        .modifier(OptionalGlassTile(enabled: !compact))
    }
}

struct OptionalGlassTile: ViewModifier {
    let enabled: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if enabled {
            content.glassTile()
        } else {
            content
        }
    }
}
