import SwiftUI
import WidgetKit

struct AgendaWidget: Widget {
    let kind = "AgendaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            AgendaWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "calendar"))
        }
        .configurationDisplayName("widget.agenda.name")
        .description("widget.agenda.description")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct AgendaWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ProjectionEntry

    private var entryLimit: Int {
        family == .systemLarge ? 10 : 3
    }

    private var sections: [AgendaSection] {
        var remaining = entryLimit
        var out: [AgendaSection] = []
        let todayKey = WidgetDates.todayKey(now: entry.date)
        for day in entry.projection?.agenda ?? [] where remaining > 0 && day.dayKey >= todayKey {
            let entries = Array((day.entries ?? []).prefix(remaining))
            guard !entries.isEmpty else { continue }
            remaining -= entries.count
            out.append(AgendaSection(day: day, entries: entries))
        }
        return out
    }

    var body: some View {
        let sections = self.sections
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: entry.text.agenda, subtitle: nil, symbol: "list.bullet.rectangle")
            if sections.isEmpty {
                WidgetEmptyState(message: entry.projection == nil ? entry.text.noData : entry.text.agendaEmpty, symbol: "sun.max")
            } else {
                ForEach(sections) { section in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.text.dayTitle(dayKey: section.day.dayKey, now: entry.date))
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(section.day.dayKey == WidgetDates.todayKey(now: entry.date) ? WidgetPalette.accent : WidgetPalette.muted)
                            .textCase(.uppercase)
                            .widgetAccentable()
                        ForEach(section.entries) { item in
                            AgendaRow(item: item, allDayLabel: entry.text.allDay)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct AgendaSection: Identifiable {
    let day: WidgetAgendaDay
    let entries: [WidgetTodayEntry]

    var id: String { day.id }
}

struct AgendaRow: View {
    let item: WidgetTodayEntry
    let allDayLabel: String

    private var timeLabel: String {
        guard item.allDay != true, let time = item.time, !time.isEmpty else { return allDayLabel }
        return time
    }

    var body: some View {
        HStack(spacing: 8) {
            Capsule()
                .fill(WidgetPalette.accent)
                .frame(width: 3, height: 14)
                .widgetAccentable()
            Text(item.title)
                .font(.footnote)
                .foregroundStyle(WidgetPalette.foreground)
                .lineLimit(1)
            Spacer(minLength: 4)
            Text(timeLabel)
                .font(.caption2.weight(.medium).monospacedDigit())
                .foregroundStyle(WidgetPalette.muted)
                .lineLimit(1)
        }
    }
}
