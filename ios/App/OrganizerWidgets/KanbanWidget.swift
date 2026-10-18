import SwiftUI
import WidgetKit
import AppIntents

struct KanbanWidget: Widget {
    let kind = "KanbanWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProjectionProvider()) { entry in
            KanbanWidgetView(entry: entry)
                .widgetGlassBackground()
                .widgetURL(WidgetShared.launchURL(tab: "kanban"))
        }
        .configurationDisplayName("widget.kanban.name")
        .description("widget.kanban.description")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct KanbanBoard {
    struct Column: Identifiable {
        let id: String
        let title: String
        let count: Int
        let cards: [WidgetKanbanCard]
        let nextColumnId: String?
    }

    let columns: [Column]

    init(columns source: [WidgetKanbanColumn], moves: [String: String]) {
        var cardsByColumn: [String: [WidgetKanbanCard]] = [:]
        var countByColumn: [String: Int] = [:]
        for column in source {
            countByColumn[column.id] = column.count ?? column.cards?.count ?? 0
        }
        for column in source {
            for card in column.cards ?? [] {
                let target = moves[card.id].flatMap { id in source.contains { $0.id == id } ? id : nil } ?? column.id
                cardsByColumn[target, default: []].append(card)
                if target != column.id {
                    countByColumn[column.id, default: 0] -= 1
                    countByColumn[target, default: 0] += 1
                }
            }
        }
        columns = source.enumerated().map { index, column in
            let next = source.count > 1 ? source[(index + 1) % source.count].id : nil
            return Column(
                id: column.id,
                title: column.title,
                count: max(0, countByColumn[column.id] ?? 0),
                cards: cardsByColumn[column.id] ?? [],
                nextColumnId: next
            )
        }
    }
}

struct KanbanWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ProjectionEntry

    private var board: KanbanBoard {
        KanbanBoard(columns: entry.projection?.kanban ?? [], moves: entry.pending.moves)
    }

    var body: some View {
        let columns = board.columns
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(title: entry.text.kanban, subtitle: nil, symbol: "rectangle.split.3x1")
            if columns.isEmpty {
                WidgetEmptyState(message: entry.projection == nil ? entry.text.noData : entry.text.kanbanEmpty, symbol: "rectangle.split.3x1")
            } else if family == .systemLarge {
                KanbanLarge(columns: Array(columns.prefix(4)))
            } else {
                KanbanCounts(columns: Array(columns.prefix(4)))
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct KanbanCounts: View {
    let columns: [KanbanBoard.Column]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(columns) { column in
                VStack(spacing: 2) {
                    Text(String(column.count))
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(WidgetPalette.foreground)
                        .widgetAccentable()
                        .contentTransition(.numericText())
                    Text(column.title)
                        .font(.caption2)
                        .foregroundStyle(WidgetPalette.muted)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.vertical, 6)
                .glassTile()
            }
        }
    }
}

private struct KanbanLarge: View {
    private static let cardsPerColumn = 3

    let columns: [KanbanBoard.Column]

    var body: some View {
        VStack(spacing: 6) {
            ForEach(columns) { column in
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(column.title)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(WidgetPalette.foreground)
                            .lineLimit(1)
                        Spacer()
                        Text(String(column.count))
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(WidgetPalette.accent)
                            .widgetAccentable()
                    }
                    ForEach(column.cards.prefix(Self.cardsPerColumn)) { card in
                        KanbanCardRow(card: card, nextColumnId: column.nextColumnId)
                    }
                }
                .padding(8)
                .glassTile()
            }
        }
    }
}

private struct KanbanCardRow: View {
    let card: WidgetKanbanCard
    let nextColumnId: String?

    private var movable: Bool {
        nextColumnId != nil && card.shared != true
    }

    var body: some View {
        HStack(spacing: 6) {
            Text(card.title)
                .font(.caption)
                .foregroundStyle(WidgetPalette.foreground)
                .lineLimit(1)
            Spacer(minLength: 4)
            if movable, let nextColumnId {
                Button(intent: MoveCardIntent(cardId: card.id, columnId: nextColumnId)) {
                    Image(systemName: "arrow.right.circle")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(WidgetPalette.accent)
                        .widgetAccentable()
                }
                .buttonStyle(.plain)
            }
        }
    }
}
