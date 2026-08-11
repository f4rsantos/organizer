package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class WidgetStore {

    public static final String PREFS = "organizer_widget_projection";
    private static final String KEY_PROJECTION = "projection";
    private static final String KEY_QUEUE = "queue";
    private static final String KEY_PENDING = "pending";
    private static final String KEY_PENDING_MOVES = "pending-moves";
    private static final String KEY_CALENDAR_OFFSET = "calendar-offset-";
    private static final String KEY_SUMMARY_METRIC = "summary-metric-";
    private static final String KEY_CALENDAR_VIEW = "calendar-view-";

    public static final String VIEW_DAY = "day";
    public static final String VIEW_WEEK = "week";
    public static final String VIEW_MONTH = "month";
    public static final String VIEW_YEAR = "year";

    public static final String METRIC_TASKS = "tasks";
    public static final String METRIC_EVENTS = "events";
    public static final String METRIC_GOALS = "goals";

    private static final Object LOCK = new Object();

    private WidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void setProjection(Context context, String payload) {
        synchronized (LOCK) {
            prefs(context).edit().putString(KEY_PROJECTION, payload).apply();
        }
    }

    public static JSONObject getProjection(Context context) {
        synchronized (LOCK) {
            String raw = prefs(context).getString(KEY_PROJECTION, null);
            if (raw == null) return null;
            try {
                return new JSONObject(raw);
            } catch (JSONException e) {
                return null;
            }
        }
    }

    public static void clear(Context context) {
        synchronized (LOCK) {
            prefs(context).edit().remove(KEY_PROJECTION).remove(KEY_QUEUE)
                    .remove(KEY_PENDING).remove(KEY_PENDING_MOVES).apply();
        }
    }

    public static int getCalendarOffset(Context context, int widgetId) {
        synchronized (LOCK) {
            return prefs(context).getInt(KEY_CALENDAR_OFFSET + widgetId, 0);
        }
    }

    public static void setCalendarOffset(Context context, int widgetId, int offset) {
        synchronized (LOCK) {
            prefs(context).edit().putInt(KEY_CALENDAR_OFFSET + widgetId, offset).apply();
        }
    }

    public static void clearCalendarOffset(Context context, int widgetId) {
        synchronized (LOCK) {
            prefs(context).edit().remove(KEY_CALENDAR_OFFSET + widgetId)
                    .remove(KEY_CALENDAR_VIEW + widgetId).apply();
        }
    }

    public static String getCalendarView(Context context, int widgetId) {
        synchronized (LOCK) {
            return prefs(context).getString(KEY_CALENDAR_VIEW + widgetId, VIEW_MONTH);
        }
    }

    public static void setCalendarView(Context context, int widgetId, String view) {
        synchronized (LOCK) {
            prefs(context).edit().putString(KEY_CALENDAR_VIEW + widgetId, view).apply();
        }
    }

    public static String getSummaryMetric(Context context, int widgetId) {
        synchronized (LOCK) {
            return prefs(context).getString(KEY_SUMMARY_METRIC + widgetId, METRIC_TASKS);
        }
    }

    public static void setSummaryMetric(Context context, int widgetId, String metric) {
        synchronized (LOCK) {
            prefs(context).edit().putString(KEY_SUMMARY_METRIC + widgetId, metric).apply();
        }
    }

    public static void clearSummaryMetric(Context context, int widgetId) {
        synchronized (LOCK) {
            prefs(context).edit().remove(KEY_SUMMARY_METRIC + widgetId).apply();
        }
    }

    public static void enqueue(Context context, JSONObject op) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            JSONArray queue = readArray(p.getString(KEY_QUEUE, null));
            queue.put(op);
            p.edit().putString(KEY_QUEUE, queue.toString()).apply();
        }
    }

    public static String drainQueue(Context context) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            String raw = p.getString(KEY_QUEUE, null);
            p.edit().remove(KEY_QUEUE).remove(KEY_PENDING).remove(KEY_PENDING_MOVES).apply();
            return raw == null ? "[]" : raw;
        }
    }

    public static void markPending(Context context, String taskId, boolean done) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            JSONObject pending = readObject(p.getString(KEY_PENDING, null));
            try {
                pending.put(taskId, done);
            } catch (JSONException e) {
                return;
            }
            p.edit().putString(KEY_PENDING, pending.toString()).apply();
        }
    }

    public static void markPendingMove(Context context, String cardId, String columnId) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            JSONObject moves = readObject(p.getString(KEY_PENDING_MOVES, null));
            try {
                moves.put(cardId, columnId);
            } catch (JSONException e) {
                return;
            }
            p.edit().putString(KEY_PENDING_MOVES, moves.toString()).apply();
        }
    }

    public static JSONObject getPendingMoves(Context context) {
        synchronized (LOCK) {
            return readObject(prefs(context).getString(KEY_PENDING_MOVES, null));
        }
    }

    public static JSONObject getPending(Context context) {
        synchronized (LOCK) {
            return readObject(prefs(context).getString(KEY_PENDING, null));
        }
    }

    private static JSONArray readArray(String raw) {
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static JSONObject readObject(String raw) {
        if (raw == null) return new JSONObject();
        try {
            return new JSONObject(raw);
        } catch (JSONException e) {
            return new JSONObject();
        }
    }
}
