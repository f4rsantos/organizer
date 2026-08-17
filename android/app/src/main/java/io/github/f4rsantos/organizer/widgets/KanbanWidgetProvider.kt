package io.github.f4rsantos.organizer.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

import io.github.f4rsantos.organizer.R

class KanbanWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            manager.updateAppWidget(id, buildViews(context,
                WidgetSize.isCompact(manager, id), WidgetSize.isWide(manager, id)))
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        newOptions: Bundle
    ) {
        manager.updateAppWidget(widgetId, buildViews(context,
            WidgetSize.isCompact(manager, widgetId), WidgetSize.isWide(manager, widgetId)))
    }

    private fun buildViews(context: Context, compact: Boolean, wide: Boolean): RemoteViews {
        val projection = WidgetStore.getProjection(context)
        val pendingMoves = WidgetStore.getPendingMoves(context)
        val columns = applyPendingMoves(projection?.optJSONArray("kanban"), pendingMoves)

        val horizontal = wide && !compact
        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_kanban_compact
            else if (horizontal) R.layout.widget_kanban_h else R.layout.widget_kanban)
        views.removeAllViews(R.id.widget_kanban_columns)

        val count = columns?.length() ?: 0
        views.setViewVisibility(R.id.widget_kanban_empty, if (count == 0) View.VISIBLE else View.GONE)

        val limit = if (compact) Math.min(count, COMPACT_MAX_ROWS) else count
        for (i in 0 until limit) {
            val column = columns?.optJSONObject(i) ?: continue
            val row = RemoteViews(context.packageName,
                if (horizontal) R.layout.widget_kanban_column else R.layout.widget_kanban_column_row)
            row.setTextViewText(R.id.kanban_col_title, column.optString("title"))
            row.setTextViewText(R.id.kanban_col_count, column.optInt("count").toString())
            row.removeAllViews(R.id.kanban_col_cards)

            val cards = column.optJSONArray("cards")
            val cardLimit = if (horizontal) MAX_CARDS_HORIZONTAL else MAX_CARDS_VERTICAL
            var c = 0
            while (c < (cards?.length() ?: 0) && c < cardLimit) {
                val card = cards?.optJSONObject(c)
                if (card != null) {
                    val cardView = RemoteViews(context.packageName, R.layout.widget_kanban_card)
                    cardView.setTextViewText(R.id.kanban_card_title, card.optString("title"))
                    cardView.setOnClickPendingIntent(R.id.kanban_card_title,
                        moveIntent(context, card.optString("id"), nextColumnId(columns, i)))
                    row.addView(R.id.kanban_col_cards, cardView)
                }
                c++
            }
            views.addView(R.id.widget_kanban_columns, row)
        }

        return views
    }

    private fun applyPendingMoves(columns: JSONArray?, moves: JSONObject?): JSONArray? {
        if (columns == null || moves == null || moves.length() == 0) return columns

        return try {
            val out = JSONArray()
            val moved = JSONArray()

            for (i in 0 until columns.length()) {
                val column = columns.optJSONObject(i) ?: continue
                val copy = JSONObject(column.toString())
                val kept = JSONArray()
                val cards = copy.optJSONArray("cards")

                for (c in 0 until (cards?.length() ?: 0)) {
                    val card = cards?.optJSONObject(c) ?: continue
                    val target = moves.optString(card.optString("id"), null)
                    if (target != null && target != copy.optString("id")) {
                        card.put("targetColumn", target)
                        moved.put(card)
                    } else {
                        kept.put(card)
                    }
                }
                copy.put("cards", kept)
                out.put(copy)
            }

            for (m in 0 until moved.length()) {
                val card = moved.optJSONObject(m) ?: continue
                val target = card.optString("targetColumn")
                for (i in 0 until out.length()) {
                    val column = out.optJSONObject(i)
                    if (column == null || target != column.optString("id")) continue
                    column.optJSONArray("cards")?.put(card)
                    break
                }
            }

            for (i in 0 until out.length()) {
                val column = out.optJSONObject(i) ?: continue
                val cards = column.optJSONArray("cards")
                column.put("count", cards?.length() ?: 0)
            }
            out
        } catch (e: JSONException) {
            columns
        }
    }

    private fun nextColumnId(columns: JSONArray?, currentIndex: Int): String? {
        if (columns == null || columns.length() == 0) return null
        val next = columns.optJSONObject((currentIndex + 1) % columns.length())
        return next?.optString("id", null)
    }

    private fun moveIntent(context: Context, cardId: String, columnId: String?): PendingIntent {
        val intent = Intent(context, KanbanWidgetProvider::class.java)
        intent.action = ACTION_MOVE
        intent.putExtra(EXTRA_CARD_ID, cardId)
        intent.putExtra(EXTRA_COLUMN_ID, columnId)
        intent.data = Uri.parse("organizer://kanban/$cardId/$columnId")
        return PendingIntent.getBroadcast(context, (cardId + columnId).hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (ACTION_MOVE == intent.action) {
            val cardId = intent.getStringExtra(EXTRA_CARD_ID)
            val columnId = intent.getStringExtra(EXTRA_COLUMN_ID)
            if (cardId != null && columnId != null) {
                enqueueMove(context, cardId, columnId)
                WidgetStore.markPendingMove(context, cardId, columnId)
                WidgetRefresh.refreshAll(context)
            }
            return
        }
        super.onReceive(context, intent)
    }

    private fun enqueueMove(context: Context, cardId: String, columnId: String) {
        try {
            val op = JSONObject()
            op.put("id", cardId)
            op.put("type", "moveCard")
            op.put("columnId", columnId)
            op.put("ts", System.currentTimeMillis())
            WidgetStore.enqueue(context, op)
        } catch (e: JSONException) {
            return
        }
    }

    companion object {
        const val ACTION_MOVE = "io.github.f4rsantos.organizer.widgets.MOVE_CARD"
        const val EXTRA_CARD_ID = "cardId"
        const val EXTRA_COLUMN_ID = "columnId"

        private const val COMPACT_MAX_ROWS = 3
        private const val MAX_CARDS_HORIZONTAL = 4
        private const val MAX_CARDS_VERTICAL = 3
    }
}
