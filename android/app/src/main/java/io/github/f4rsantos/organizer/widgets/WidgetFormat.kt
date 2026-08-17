package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.graphics.Color

import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

import io.github.f4rsantos.organizer.R

object WidgetFormat {

    fun parseColor(raw: String?, fallback: Int): Int {
        if (raw.isNullOrEmpty()) return fallback
        return try {
            Color.parseColor(raw)
        } catch (e: IllegalArgumentException) {
            fallback
        }
    }

    fun parseDayKey(dayKey: String?): Date? {
        if (dayKey == null || dayKey.length < 10) return null
        return try {
            SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dayKey.substring(0, 10))
        } catch (e: ParseException) {
            null
        }
    }

    fun dayLabel(context: Context, dayKey: String?, offset: Int): String {
        if (offset == 0) return context.getString(R.string.widget_today_label)
        if (offset == 1) return context.getString(R.string.widget_tomorrow_label)
        val date = parseDayKey(dayKey) ?: return ""
        return SimpleDateFormat(context.getString(R.string.widget_day_pattern), Locale.getDefault())
            .format(date)
    }

    fun dueLabel(context: Context, dueDate: String?, todayKey: String?): String {
        if (dueDate.isNullOrEmpty()) return ""
        val due = parseDayKey(dueDate) ?: return ""
        val today = parseDayKey(todayKey) ?: return ""

        val diff = daysBetween(today, due)
        if (diff == 0L) return context.getString(R.string.widget_today_label)
        if (diff == 1L) return context.getString(R.string.widget_tomorrow_label)
        if (diff < 0 && diff >= -6) {
            return context.getString(R.string.widget_days_overdue, Math.abs(diff))
        }
        return SimpleDateFormat(context.getString(R.string.widget_due_pattern), Locale.getDefault())
            .format(due)
    }

    private fun daysBetween(from: Date, to: Date): Long {
        val a = midnight(from)
        val b = midnight(to)
        val millis = b.timeInMillis - a.timeInMillis
        return Math.round(millis / 86400000.0)
    }

    private fun midnight(date: Date): Calendar {
        val cal = Calendar.getInstance()
        cal.time = date
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal
    }
}
