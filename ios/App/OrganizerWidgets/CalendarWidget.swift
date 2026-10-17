import SwiftUI
import WidgetKit

struct CalendarWidget: Widget {
    let kind = "CalendarWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            CalendarWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "calendar"))
        }
        .configurationDisplayName("widget.calendar.name")
        .description("widget.calendar.description")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct CalendarWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ProjectionEntry

    private var offset: Int {
        entry.calendarOffset
    }

    private func page<T>(_ list: [T]?) -> T? {
        let index = offset - WidgetShared.calendarOffsetRange.lowerBound
        guard let list, list.indices.contains(index) else { return nil }
        return list[index]
    }

    var body: some View {
        if family == .systemLarge, let month = page(entry.projection?.calendar) {
            CalendarMonthView(month: month, text: entry.text, todayKey: WidgetDates.todayKey(now: entry.date), offset: offset)
        } else if let week = page(entry.projection?.calendarWeeks) {
            CalendarWeekView(week: week, text: entry.text, today: offset == 0 ? entry.projection?.today ?? [] : [], todayKey: WidgetDates.todayKey(now: entry.date), offset: offset)
        } else {
            VStack(alignment: .leading) {
                WidgetHeader(title: entry.text.calendar, subtitle: nil, symbol: "calendar")
                WidgetEmptyState(message: entry.text.noData, symbol: "calendar")
            }
        }
    }
}

private struct CalendarDayCell: View {
    let day: WidgetCalendarDay
    let large: Bool
    let todayKey: String

    private var isToday: Bool { day.dayKey == todayKey }
    private var count: Int { day.count ?? day.entries?.count ?? 0 }

    var body: some View {
        VStack(spacing: 2) {
            Text(String(day.day))
                .font(.system(size: large ? 13 : 15, weight: isToday ? .bold : .medium, design: .rounded))
                .foregroundStyle(isToday ? Color.white : WidgetPalette.foreground)
                .frame(width: large ? 24 : 28, height: large ? 24 : 28)
                .background(Circle().fill(isToday ? WidgetPalette.accent : Color.clear))
                .widgetAccentable(isToday)
            HStack(spacing: 2) {
                ForEach(0..<min(count, 3), id: \.self) { _ in
                    Circle()
                        .fill(WidgetPalette.accent)
                        .frame(width: 4, height: 4)
                }
            }
            .frame(height: 4)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct CalendarPagerHeader: View {
    let title: String
    let offset: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "calendar")
                .font(.caption.weight(.semibold))
                .foregroundStyle(WidgetPalette.accent)
                .widgetAccentable()
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(WidgetPalette.foreground)
                .lineLimit(1)
            Spacer(minLength: 4)
            CalendarPageButton(symbol: "chevron.left", delta: -1, enabled: offset > WidgetShared.calendarOffsetRange.lowerBound)
            CalendarPageButton(symbol: "chevron.right", delta: 1, enabled: offset < WidgetShared.calendarOffsetRange.upperBound)
        }
    }
}

private struct CalendarPageButton: View {
    let symbol: String
    let delta: Int
    let enabled: Bool

    var body: some View {
        Button(intent: CalendarPageIntent(delta: delta)) {
            Image(systemName: symbol)
                .font(.caption.weight(.bold))
                .foregroundStyle(enabled ? WidgetPalette.accent : WidgetPalette.done)
                .frame(width: 26, height: 22)
                .glassTile()
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

private struct WeekdayHeader: View {
    let names: [String]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(names.enumerated()), id: \.offset) { _, name in
                Text(name)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(WidgetPalette.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity)
            }
        }
    }
}

private struct CalendarMonthView: View {
    let month: WidgetCalendarMonth
    let text: WidgetText
    let todayKey: String
    let offset: Int

    private var weeks: [[WidgetCalendarDay?]] {
        let days = month.days ?? []
        return stride(from: 0, to: days.count, by: 7).map { start in
            Array(days[start..<min(start + 7, days.count)])
        }
    }

    var body: some View {
        VStack(spacing: 4) {
            CalendarPagerHeader(title: "\(text.monthName(month.month)) \(month.year)", offset: offset)
            WeekdayHeader(names: text.weekdaysShort)
            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                HStack(spacing: 0) {
                    ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                        if let day {
                            CalendarDayCell(day: day, large: true, todayKey: todayKey)
                        } else {
                            Color.clear.frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

private struct CalendarWeekView: View {
    private static let todayEntries = 2

    let week: WidgetCalendarWeek
    let text: WidgetText
    let today: [WidgetTodayEntry]
    let todayKey: String
    let offset: Int

    private var weekTitle: String {
        guard let first = week.days?.first, let last = week.days?.last else { return text.calendar }
        let start = WidgetDates.short(dayKey: first.dayKey) ?? first.dayKey
        let end = WidgetDates.short(dayKey: last.dayKey) ?? last.dayKey
        return "\(start) – \(end)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            CalendarPagerHeader(title: weekTitle, offset: offset)
            WeekdayHeader(names: text.weekdaysShort)
            HStack(spacing: 0) {
                ForEach(week.days ?? [], id: \.dayKey) { day in
                    CalendarDayCell(day: day, large: false, todayKey: todayKey)
                }
            }
            ForEach(today.prefix(Self.todayEntries)) { item in
                AgendaRow(item: item, allDayLabel: text.allDay)
            }
            Spacer(minLength: 0)
        }
    }
}
