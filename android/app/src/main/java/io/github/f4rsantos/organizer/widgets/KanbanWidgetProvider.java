package io.github.f4rsantos.organizer.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class KanbanWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_MOVE = "io.github.f4rsantos.organizer.widgets.MOVE_CARD";
    public static final String EXTRA_CARD_ID = "cardId";
    public static final String EXTRA_COLUMN_ID = "columnId";

    private static final int COMPACT_MAX_ROWS = 3;
    private static final int MAX_CARDS_HORIZONTAL = 4;
    private static final int MAX_CARDS_VERTICAL = 3;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context,
                    WidgetSize.isCompact(manager, id), WidgetSize.isWide(manager, id)));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        manager.updateAppWidget(widgetId, buildViews(context,
                WidgetSize.isCompact(manager, widgetId), WidgetSize.isWide(manager, widgetId)));
    }

    private RemoteViews buildViews(Context context, boolean compact, boolean wide) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONArray columns = projection == null ? null : projection.optJSONArray("kanban");
        JSONObject pendingMoves = WidgetStore.getPendingMoves(context);
        columns = applyPendingMoves(columns, pendingMoves);

        boolean horizontal = wide && !compact;
        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_kanban_compact
                        : (horizontal ? R.layout.widget_kanban_h : R.layout.widget_kanban));
        views.removeAllViews(R.id.widget_kanban_columns);

        int count = columns == null ? 0 : columns.length();
        views.setViewVisibility(R.id.widget_kanban_empty, count == 0 ? View.VISIBLE : View.GONE);

        int limit = compact ? Math.min(count, COMPACT_MAX_ROWS) : count;
        for (int i = 0; i < limit; i++) {
            JSONObject column = columns.optJSONObject(i);
            if (column == null) continue;
            RemoteViews row = new RemoteViews(context.getPackageName(), horizontal
                    ? R.layout.widget_kanban_column
                    : R.layout.widget_kanban_column_row);
            row.setTextViewText(R.id.kanban_col_title, column.optString("title"));
            row.setTextViewText(R.id.kanban_col_count, String.valueOf(column.optInt("count")));
            row.removeAllViews(R.id.kanban_col_cards);

            JSONArray cards = column.optJSONArray("cards");
            int cardLimit = horizontal ? MAX_CARDS_HORIZONTAL : MAX_CARDS_VERTICAL;
            for (int c = 0; cards != null && c < cards.length() && c < cardLimit; c++) {
                JSONObject card = cards.optJSONObject(c);
                if (card == null) continue;
                RemoteViews cardView = new RemoteViews(context.getPackageName(), R.layout.widget_kanban_card);
                cardView.setTextViewText(R.id.kanban_card_title, card.optString("title"));
                cardView.setOnClickPendingIntent(R.id.kanban_card_title,
                        moveIntent(context, card.optString("id"), nextColumnId(columns, i)));
                row.addView(R.id.kanban_col_cards, cardView);
            }
            views.addView(R.id.widget_kanban_columns, row);
        }

        return views;
    }

    private JSONArray applyPendingMoves(JSONArray columns, JSONObject moves) {
        if (columns == null || moves == null || moves.length() == 0) return columns;

        try {
            JSONArray out = new JSONArray();
            JSONArray moved = new JSONArray();

            for (int i = 0; i < columns.length(); i++) {
                JSONObject column = columns.optJSONObject(i);
                if (column == null) continue;
                JSONObject copy = new JSONObject(column.toString());
                JSONArray kept = new JSONArray();
                JSONArray cards = copy.optJSONArray("cards");

                for (int c = 0; cards != null && c < cards.length(); c++) {
                    JSONObject card = cards.optJSONObject(c);
                    if (card == null) continue;
                    String target = moves.optString(card.optString("id"), null);
                    if (target != null && !target.equals(copy.optString("id"))) {
                        card.put("targetColumn", target);
                        moved.put(card);
                    } else {
                        kept.put(card);
                    }
                }
                copy.put("cards", kept);
                out.put(copy);
            }

            for (int m = 0; m < moved.length(); m++) {
                JSONObject card = moved.optJSONObject(m);
                if (card == null) continue;
                String target = card.optString("targetColumn");
                for (int i = 0; i < out.length(); i++) {
                    JSONObject column = out.optJSONObject(i);
                    if (column == null || !target.equals(column.optString("id"))) continue;
                    column.optJSONArray("cards").put(card);
                    break;
                }
            }

            for (int i = 0; i < out.length(); i++) {
                JSONObject column = out.optJSONObject(i);
                if (column == null) continue;
                JSONArray cards = column.optJSONArray("cards");
                column.put("count", cards == null ? 0 : cards.length());
            }
            return out;
        } catch (JSONException e) {
            return columns;
        }
    }

    private String nextColumnId(JSONArray columns, int currentIndex) {
        if (columns == null || columns.length() == 0) return null;
        JSONObject next = columns.optJSONObject((currentIndex + 1) % columns.length());
        return next == null ? null : next.optString("id", null);
    }

    private PendingIntent moveIntent(Context context, String cardId, String columnId) {
        Intent intent = new Intent(context, KanbanWidgetProvider.class);
        intent.setAction(ACTION_MOVE);
        intent.putExtra(EXTRA_CARD_ID, cardId);
        intent.putExtra(EXTRA_COLUMN_ID, columnId);
        intent.setData(android.net.Uri.parse("organizer://kanban/" + cardId + "/" + columnId));
        return PendingIntent.getBroadcast(context, (cardId + columnId).hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_MOVE.equals(intent.getAction())) {
            String cardId = intent.getStringExtra(EXTRA_CARD_ID);
            String columnId = intent.getStringExtra(EXTRA_COLUMN_ID);
            if (cardId != null && columnId != null) {
                enqueueMove(context, cardId, columnId);
                WidgetStore.markPendingMove(context, cardId, columnId);
                WidgetRefresh.refreshAll(context);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    private void enqueueMove(Context context, String cardId, String columnId) {
        try {
            JSONObject op = new JSONObject();
            op.put("id", cardId);
            op.put("type", "moveCard");
            op.put("columnId", columnId);
            op.put("ts", System.currentTimeMillis());
            WidgetStore.enqueue(context, op);
        } catch (JSONException e) {
            return;
        }
    }
}
