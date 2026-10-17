import SwiftUI
import WidgetKit
import AppIntents

enum SummaryMetric: String, AppEnum {
    case tasks
    case events
    case habits

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "widget.summary.metric"
    static var caseDisplayRepresentations: [SummaryMetric: DisplayRepresentation] = [
        .tasks: "widget.summary.metric.tasks",
        .events: "widget.summary.metric.events",
        .habits: "widget.summary.metric.habits"
    ]

    var symbol: String {
        switch self {
        case .tasks: return "checkmark.circle"
        case .events: return "calendar"
        case .habits: return "target"
        }
    }

    var tab: String {
        switch self {
        case .tasks: return "tasks"
        case .events: return "calendar"
        case .habits: return "habits"
        }
    }
}

struct SummaryConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "widget.summary.configure"

    @Parameter(title: "widget.summary.metric", default: .tasks)
    var metric: SummaryMetric
}

struct SummaryEntry: TimelineEntry {
    let base: ProjectionEntry
    let metric: SummaryMetric

    var date: Date { base.date }
}

struct SummaryProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(base: .preview, metric: .tasks)
    }

    func snapshot(for configuration: SummaryConfigurationIntent, in context: Context) async -> SummaryEntry {
        SummaryEntry(base: context.isPreview ? .preview : .current(), metric: configuration.metric)
    }

    func timeline(for configuration: SummaryConfigurationIntent, in context: Context) async -> Timeline<SummaryEntry> {
        let base = ProjectionEntry.current()
        let entry = SummaryEntry(base: base, metric: configuration.metric)
        return Timeline(entries: [entry], policy: .after(ProjectionProvider.nextRefresh(after: base.date)))
    }
}

struct SummaryWidget: Widget {
    let kind = "SummaryWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SummaryConfigurationIntent.self, provider: SummaryProvider()) { entry in
            SummaryWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: entry.metric.tab))
        }
        .configurationDisplayName("widget.summary.name")
        .description("widget.summary.description")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

private struct SummaryCounts {
    let tasksOpen: Int
    let overdue: Int
    let eventsToday: Int
    let habitsPending: Int
    let habitsEnabled: Bool

    init(_ summary: WidgetSummary?) {
        tasksOpen = summary?.tasksOpen ?? 0
        overdue = summary?.overdue ?? 0
        eventsToday = summary?.eventsToday ?? 0
        habitsPending = summary?.habitsPending ?? 0
        habitsEnabled = summary?.habitsEnabled ?? false
    }

    func shown(_ metric: SummaryMetric) -> SummaryMetric {
        metric == .habits && !habitsEnabled ? .tasks : metric
    }

    func value(_ metric: SummaryMetric) -> Int {
        switch metric {
        case .tasks: return tasksOpen
        case .events: return eventsToday
        case .habits: return habitsPending
        }
    }

    func others(than metric: SummaryMetric) -> [SummaryMetric] {
        [SummaryMetric.tasks, .events, .habits].filter { $0 != metric && ($0 != .habits || habitsEnabled) }
    }
}

private extension WidgetText {
    func label(_ metric: SummaryMetric) -> String {
        switch metric {
        case .tasks: return tasks
        case .events: return events
        case .habits: return habits
        }
    }
}

struct SummaryWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry

    private var counts: SummaryCounts {
        SummaryCounts(entry.base.projection?.summary)
    }

    var body: some View {
        let metric = counts.shown(entry.metric)
        switch family {
        case .accessoryCircular:
            SummaryCircular(value: counts.value(metric), symbol: metric.symbol)
        case .accessoryRectangular:
            SummaryRectangular(counts: counts, text: entry.base.text)
        case .systemMedium:
            SummaryMedium(counts: counts, text: entry.base.text)
        default:
            SummarySmall(counts: counts, metric: metric, text: entry.base.text)
        }
    }
}

private struct SummaryHeadline: View {
    let counts: SummaryCounts
    let text: WidgetText

    var body: some View {
        Text(counts.overdue > 0 ? text.overdueCount(counts.overdue) : text.openCount(counts.tasksOpen))
            .font(.caption2.weight(.medium))
            .foregroundStyle(counts.overdue > 0 ? WidgetPalette.overdue : WidgetPalette.muted)
            .lineLimit(1)
    }
}

private struct SummarySmall: View {
    let counts: SummaryCounts
    let metric: SummaryMetric
    let text: WidgetText

    private var alert: Bool {
        metric == .tasks && counts.overdue > 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(text.overview)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(WidgetPalette.foreground)
            if metric == .tasks {
                SummaryHeadline(counts: counts, text: text)
            } else {
                Text(text.label(metric))
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(WidgetPalette.muted)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Text(String(counts.value(metric)))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(alert ? WidgetPalette.overdue : WidgetPalette.foreground)
                .widgetAccentable()
                .contentTransition(.numericText())
            HStack(spacing: 10) {
                ForEach(counts.others(than: metric), id: \.self) { other in
                    SummaryMiniStat(symbol: other.symbol, value: counts.value(other))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct SummaryMiniStat: View {
    let symbol: String
    let value: Int

    var body: some View {
        Label(String(value), systemImage: symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(WidgetPalette.muted)
            .labelStyle(.titleAndIcon)
    }
}

private struct SummaryMedium: View {
    let counts: SummaryCounts
    let text: WidgetText

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(text.overview)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(WidgetPalette.foreground)
                SummaryHeadline(counts: counts, text: text)
            }
            HStack(spacing: 8) {
                ForEach([SummaryMetric.tasks, .events, .habits].filter { $0 != .habits || counts.habitsEnabled }, id: \.self) { metric in
                    Link(destination: WidgetShared.launchURL(tab: metric.tab)) {
                        SummaryTile(
                            value: counts.value(metric),
                            label: text.label(metric),
                            symbol: metric.symbol,
                            alert: metric == .tasks && counts.overdue > 0
                        )
                    }
                }
            }
        }
    }
}

private struct SummaryTile: View {
    let value: Int
    let label: String
    let symbol: String
    let alert: Bool

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: symbol)
                .font(.caption.weight(.semibold))
                .foregroundStyle(WidgetPalette.accent)
                .widgetAccentable()
            Text(String(value))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(alert ? WidgetPalette.overdue : WidgetPalette.foreground)
                .contentTransition(.numericText())
            Text(label)
                .font(.caption2)
                .foregroundStyle(WidgetPalette.muted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 6)
        .glassTile()
    }
}

private struct SummaryCircular: View {
    let value: Int
    let symbol: String

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: symbol)
                    .font(.caption2)
                Text(String(value))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .widgetAccentable()
            }
        }
    }
}

private struct SummaryRectangular: View {
    let counts: SummaryCounts
    let text: WidgetText

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(text.overview)
                .font(.headline)
                .widgetAccentable()
            Text(counts.overdue > 0 ? text.overdueCount(counts.overdue) : text.openCount(counts.tasksOpen))
                .font(.caption)
            HStack(spacing: 8) {
                Label(String(counts.eventsToday), systemImage: "calendar")
                if counts.habitsEnabled {
                    Label(String(counts.habitsPending), systemImage: "target")
                }
            }
            .font(.caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
