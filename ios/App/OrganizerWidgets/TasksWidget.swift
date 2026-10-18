import SwiftUI
import WidgetKit
import AppIntents

struct TasksWidget: Widget {
    let kind = "TasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            TasksWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "tasks"))
        }
        .configurationDisplayName("widget.tasks.name")
        .description("widget.tasks.description")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TasksWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ProjectionEntry

    private var rowLimit: Int {
        switch family {
        case .systemLarge: return 9
        case .systemMedium: return 4
        default: return 3
        }
    }

    private var tasks: [WidgetTask] {
        Array((entry.projection?.tasks ?? []).prefix(rowLimit))
    }

    private var openCount: Int {
        entry.projection?.summary?.tasksOpen ?? entry.projection?.tasks?.count ?? 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            TasksHeader(title: entry.text.tasks, subtitle: entry.text.openCount(openCount), compact: family == .systemSmall)
            if entry.projection == nil {
                WidgetEmptyState(message: entry.text.noData, symbol: "checkmark.seal")
            } else if tasks.isEmpty {
                WidgetEmptyState(message: entry.text.tasksEmpty, symbol: "checkmark.seal")
            } else {
                VStack(spacing: family == .systemSmall ? 4 : 2) {
                    ForEach(tasks) { task in
                        TaskRow(
                            task: task,
                            done: entry.pending.tasks[task.id] ?? false,
                            dueLabel: dueLabel(for: task),
                            compact: family == .systemSmall
                        )
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func dueLabel(for task: WidgetTask) -> String? {
        guard let due = task.dueDate, !due.isEmpty else { return nil }
        if due == entry.projection?.dayKey { return entry.text.today }
        return WidgetDates.short(dayKey: due)
    }
}

private struct TasksHeader: View {
    let title: String
    let subtitle: String
    let compact: Bool

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(WidgetPalette.foreground)
            Spacer(minLength: 4)
            if !compact {
                Text(subtitle)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(WidgetPalette.muted)
            }
        }
    }
}

private struct TaskRow: View {
    let task: WidgetTask
    let done: Bool
    let dueLabel: String?
    let compact: Bool

    private var classColor: Color {
        Color(widgetHex: task.classColor) ?? WidgetPalette.accent
    }

    var body: some View {
        HStack(spacing: 8) {
            Button(intent: ToggleTaskIntent(taskId: task.id, done: !done)) {
                Image(systemName: done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: compact ? 16 : 18, weight: .medium))
                    .foregroundStyle(done ? WidgetPalette.done : classColor)
                    .widgetAccentable()
            }
            .buttonStyle(.plain)
            Text(task.title)
                .font(compact ? .caption : .footnote)
                .foregroundStyle(done ? WidgetPalette.done : WidgetPalette.foreground)
                .strikethrough(done)
                .lineLimit(1)
            Spacer(minLength: 4)
            if let dueLabel, !compact {
                Text(dueLabel)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(task.overdue == true ? WidgetPalette.overdue : WidgetPalette.muted)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, compact ? 0 : 8)
        .padding(.vertical, compact ? 0 : 5)
        .modifier(OptionalGlassTile(enabled: !compact))
    }
}

