package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.content.SharedPreferences

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

object WidgetStore {

    const val PREFS = "organizer_widget_projection"
    private const val KEY_PROJECTION = "projection"
    private const val KEY_QUEUE = "queue"
    private const val KEY_PENDING = "pending"
    private const val KEY_PENDING_MOVES = "pending-moves"
    private const val KEY_CALENDAR_OFFSET = "calendar-offset-"
    private const val KEY_SUMMARY_METRIC = "summary-metric-"
    private const val KEY_CALENDAR_VIEW = "calendar-view-"

    const val VIEW_DAY = "day"
    const val VIEW_WEEK = "week"
    const val VIEW_MONTH = "month"
    const val VIEW_YEAR = "year"

    const val METRIC_TASKS = "tasks"
    const val METRIC_EVENTS = "events"
    const val METRIC_GOALS = "goals"

    private val LOCK = Any()

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun setProjection(context: Context, payload: String) {
        synchronized(LOCK) {
            prefs(context).edit().putString(KEY_PROJECTION, payload).apply()
        }
    }

    fun getProjection(context: Context): JSONObject? {
        synchronized(LOCK) {
            val raw = prefs(context).getString(KEY_PROJECTION, null) ?: return null
            return try {
                JSONObject(raw)
            } catch (e: JSONException) {
                null
            }
        }
    }

    fun clear(context: Context) {
        synchronized(LOCK) {
            prefs(context).edit().remove(KEY_PROJECTION).remove(KEY_QUEUE)
                .remove(KEY_PENDING).remove(KEY_PENDING_MOVES).apply()
        }
    }

    fun getCalendarOffset(context: Context, widgetId: Int): Int {
        synchronized(LOCK) {
            return prefs(context).getInt(KEY_CALENDAR_OFFSET + widgetId, 0)
        }
    }

    fun setCalendarOffset(context: Context, widgetId: Int, offset: Int) {
        synchronized(LOCK) {
            prefs(context).edit().putInt(KEY_CALENDAR_OFFSET + widgetId, offset).apply()
        }
    }

    fun clearCalendarOffset(context: Context, widgetId: Int) {
        synchronized(LOCK) {
            prefs(context).edit().remove(KEY_CALENDAR_OFFSET + widgetId)
                .remove(KEY_CALENDAR_VIEW + widgetId).apply()
        }
    }

    fun getCalendarView(context: Context, widgetId: Int): String {
        synchronized(LOCK) {
            return prefs(context).getString(KEY_CALENDAR_VIEW + widgetId, VIEW_MONTH) ?: VIEW_MONTH
        }
    }

    fun setCalendarView(context: Context, widgetId: Int, view: String) {
        synchronized(LOCK) {
            prefs(context).edit().putString(KEY_CALENDAR_VIEW + widgetId, view).apply()
        }
    }

    fun getSummaryMetric(context: Context, widgetId: Int): String {
        synchronized(LOCK) {
            return prefs(context).getString(KEY_SUMMARY_METRIC + widgetId, METRIC_TASKS) ?: METRIC_TASKS
        }
    }

    fun setSummaryMetric(context: Context, widgetId: Int, metric: String) {
        synchronized(LOCK) {
            prefs(context).edit().putString(KEY_SUMMARY_METRIC + widgetId, metric).apply()
        }
    }

    fun clearSummaryMetric(context: Context, widgetId: Int) {
        synchronized(LOCK) {
            prefs(context).edit().remove(KEY_SUMMARY_METRIC + widgetId).apply()
        }
    }

    fun enqueue(context: Context, op: JSONObject) {
        synchronized(LOCK) {
            val p = prefs(context)
            val queue = readArray(p.getString(KEY_QUEUE, null))
            queue.put(op)
            p.edit().putString(KEY_QUEUE, queue.toString()).apply()
        }
    }

    fun drainQueue(context: Context): String {
        synchronized(LOCK) {
            val p = prefs(context)
            val raw = p.getString(KEY_QUEUE, null)
            p.edit().remove(KEY_QUEUE).remove(KEY_PENDING).remove(KEY_PENDING_MOVES).apply()
            return raw ?: "[]"
        }
    }

    fun markPending(context: Context, taskId: String, done: Boolean) {
        synchronized(LOCK) {
            val p = prefs(context)
            val pending = readObject(p.getString(KEY_PENDING, null))
            try {
                pending.put(taskId, done)
            } catch (e: JSONException) {
                return
            }
            p.edit().putString(KEY_PENDING, pending.toString()).apply()
        }
    }

    fun markPendingMove(context: Context, cardId: String, columnId: String) {
        synchronized(LOCK) {
            val p = prefs(context)
            val moves = readObject(p.getString(KEY_PENDING_MOVES, null))
            try {
                moves.put(cardId, columnId)
            } catch (e: JSONException) {
                return
            }
            p.edit().putString(KEY_PENDING_MOVES, moves.toString()).apply()
        }
    }

    fun getPendingMoves(context: Context): JSONObject {
        synchronized(LOCK) {
            return readObject(prefs(context).getString(KEY_PENDING_MOVES, null))
        }
    }

    fun getPending(context: Context): JSONObject {
        synchronized(LOCK) {
            return readObject(prefs(context).getString(KEY_PENDING, null))
        }
    }

    private fun readArray(raw: String?): JSONArray {
        if (raw == null) return JSONArray()
        return try {
            JSONArray(raw)
        } catch (e: JSONException) {
            JSONArray()
        }
    }

    private fun readObject(raw: String?): JSONObject {
        if (raw == null) return JSONObject()
        return try {
            JSONObject(raw)
        } catch (e: JSONException) {
            JSONObject()
        }
    }
}
