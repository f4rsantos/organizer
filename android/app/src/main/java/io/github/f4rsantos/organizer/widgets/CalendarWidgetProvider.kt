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

import org.json.JSONObject

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

import io.github.f4rsantos.organizer.R

class CalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            manager.updateAppWidget(id, buildViews(context, id, WidgetSize.isCompact(manager, id)))
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        newOptions: Bundle
    ) {
        manager.updateAppWidget(widgetId,
            buildViews(context, widgetId, WidgetSize.isCompact(manager, widgetId)))
    }

    override fun onDeleted(context: Context, ids: IntArray) {
        for (id in ids) WidgetStore.clearCalendarOffset(context, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID)

        if (ACTION_SHIFT == action && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            val next = clamp(WidgetStore.getCalendarOffset(context, widgetId)
                + intent.getIntExtra(EXTRA_DELTA, 0))
            WidgetStore.setCalendarOffset(context, widgetId, next)
            refresh(context, widgetId)
            return
        }

        if (ACTION_CYCLE_VIEW == action && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            WidgetStore.setCalendarView(context, widgetId,
                nextView(WidgetStore.getCalendarView(context, widgetId)))
            WidgetStore.setCalendarOffset(context, widgetId, 0)
            refresh(context, widgetId)
            return
        }
        super.onReceive(context, intent)
    }

    private fun refresh(context: Context, widgetId: Int) {
        val manager = AppWidgetManager.getInstance(context)
        manager.updateAppWidget(widgetId,
            buildViews(context, widgetId, WidgetSize.isCompact(manager, widgetId)))
    }

    private fun buildViews(context: Context, widgetId: Int, compact: Boolean): RemoteViews {
        val view = WidgetStore.getCalendarView(context, widgetId)
        val offset = clamp(WidgetStore.getCalendarOffset(context, widgetId))
        val projection = WidgetStore.getProjection(context)

        if (compact) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar_compact)
            val month = pick(projection, "calendar", "monthOffset", 0)
            views.removeAllViews(R.id.widget_calendar_grid)
            if (month != null) {
                views.setTextViewText(R.id.widget_calendar_month, monthLabel(month, true))
                fillMonthGrid(context, views, month, true)
            }
            return views
        }

        val views = RemoteViews(context.packageName, R.layout.widget_calendar)
        views.removeAllViews(R.id.widget_calendar_grid)
        views.removeAllViews(R.id.widget_calendar_weekdays)

        views.setOnClickPendingIntent(R.id.widget_calendar_prev, shiftIntent(context, widgetId, -1))
        views.setOnClickPendingIntent(R.id.widget_calendar_next, shiftIntent(context, widgetId, 1))
        views.setOnClickPendingIntent(R.id.widget_calendar_month, cycleIntent(context, widgetId))
        views.setOnClickPendingIntent(R.id.widget_calendar_add,
            TasksWidgetProvider.openApp(context, "calendar"))

        when (view) {
            WidgetStore.VIEW_DAY ->
                buildDay(context, views, pick(projection, "calendarDays", "dayOffset", offset))
            WidgetStore.VIEW_WEEK ->
                buildWeek(context, views, pick(projection, "calendarWeeks", "weekOffset", offset))
            WidgetStore.VIEW_YEAR ->
                buildYear(context, views, pick(projection, "calendarYears", "yearOffset", offset))
            else ->
                buildMonth(context, views, pick(projection, "calendar", "monthOffset", offset))
        }
        return views
    }

    private fun buildMonth(context: Context, views: RemoteViews, month: JSONObject?) {
        if (month == null) return
        views.setTextViewText(R.id.widget_calendar_month, monthLabel(month, false))
        for (label in weekdayLabels()) {
            val cell = RemoteViews(context.packageName, R.layout.widget_calendar_weekday)
            cell.setTextViewText(R.id.calendar_weekday_label, label)
            views.addView(R.id.widget_calendar_weekdays, cell)
        }
        fillMonthGrid(context, views, month, false)
    }

    private fun fillMonthGrid(context: Context, views: RemoteViews, month: JSONObject, compact: Boolean) {
        val days = month.optJSONArray("days")
        val total = days?.length() ?: 0
        var i = 0
        while (i < total) {
            val week = RemoteViews(context.packageName, R.layout.widget_calendar_week)
            var j = i
            while (j < i + 7 && j < total) {
                week.addView(R.id.calendar_week, dayCell(context, days?.optJSONObject(j), compact))
                j++
            }
            views.addView(R.id.widget_calendar_grid, week)
            i += 7
        }
    }

    private fun buildWeek(context: Context, views: RemoteViews, week: JSONObject?) {
        if (week == null) return
        views.setTextViewText(R.id.widget_calendar_month, weekLabel(week))

        val days = week.optJSONArray("days")
        for (i in 0 until (days?.length() ?: 0)) {
            val day = days?.optJSONObject(i) ?: continue

            val row = RemoteViews(context.packageName, R.layout.widget_calendar_daylist)
            row.setTextViewText(R.id.calendar_day_name, dayName(day.optString("dayKey")))
            row.setTextViewText(R.id.calendar_day_num, day.optInt("day").toString())
            row.setTextColor(R.id.calendar_day_num, context.getColor(
                if (day.optBoolean("today", false)) R.color.widget_accent
                else R.color.widget_foreground))

            row.removeAllViews(R.id.calendar_day_entries)
            val entries = day.optJSONArray("entries")
            for (j in 0 until (entries?.length() ?: 0)) {
                val entry = entries?.optJSONObject(j) ?: continue
                val chip = RemoteViews(context.packageName, R.layout.widget_calendar_entry)
                chip.setTextViewText(R.id.calendar_entry_title, entry.optString("title"))
                val time = if (entry.optBoolean("allDay", false)) "" else entry.optString("time", "")
                chip.setTextViewText(R.id.calendar_entry_time, time)
                chip.setViewVisibility(R.id.calendar_entry_time,
                    if (time.isEmpty()) View.GONE else View.VISIBLE)
                row.addView(R.id.calendar_day_entries, chip)
            }
            views.addView(R.id.widget_calendar_grid, row)
        }
    }

    private fun buildDay(context: Context, views: RemoteViews, day: JSONObject?) {
        if (day == null) return
        views.setTextViewText(R.id.widget_calendar_month, dayHeader(day.optString("dayKey")))

        val entries = day.optJSONArray("entries")
        if (entries == null || entries.length() == 0) {
            val empty = RemoteViews(context.packageName, R.layout.widget_calendar_entry)
            empty.setTextViewText(R.id.calendar_entry_title,
                context.getString(R.string.widget_calendar_empty))
            empty.setViewVisibility(R.id.calendar_entry_time, View.GONE)
            views.addView(R.id.widget_calendar_grid, empty)
            return
        }

        for (i in 0 until entries.length()) {
            val entry = entries.optJSONObject(i) ?: continue
            val chip = RemoteViews(context.packageName, R.layout.widget_calendar_entry)
            chip.setTextViewText(R.id.calendar_entry_title, entry.optString("title"))
            val time = if (entry.optBoolean("allDay", false))
                context.getString(R.string.widget_all_day)
            else entry.optString("time", "")
            chip.setTextViewText(R.id.calendar_entry_time, time)
            chip.setViewVisibility(R.id.calendar_entry_time,
                if (time.isEmpty()) View.GONE else View.VISIBLE)
            views.addView(R.id.widget_calendar_grid, chip)
        }
    }

    private fun buildYear(context: Context, views: RemoteViews, year: JSONObject?) {
        if (year == null) return
        views.setTextViewText(R.id.widget_calendar_month, year.optInt("year").toString())

        val months = year.optJSONArray("months")
        val current = year.optInt("currentMonth", 0)
        var i = 0
        while (i < (months?.length() ?: 0)) {
            val row = RemoteViews(context.packageName, R.layout.widget_calendar_week)
            var j = i
            while (j < i + 3 && j < (months?.length() ?: 0)) {
                val month = months?.optJSONObject(j)
                val cell = RemoteViews(context.packageName, R.layout.widget_calendar_month_cell)
                val monthNum = month?.optInt("month", j + 1) ?: (j + 1)
                cell.setTextViewText(R.id.calendar_month_name, shortMonth(monthNum))
                cell.setTextViewText(R.id.calendar_month_count,
                    (month?.optInt("count", 0) ?: 0).toString())
                cell.setTextColor(R.id.calendar_month_name, context.getColor(
                    if (monthNum == current) R.color.widget_accent else R.color.widget_foreground))
                row.addView(R.id.calendar_week, cell)
                j++
            }
            views.addView(R.id.widget_calendar_grid, row)
            i += 3
        }
    }

    private fun dayCell(context: Context, day: JSONObject?, compact: Boolean): RemoteViews {
        val cell = RemoteViews(context.packageName, R.layout.widget_calendar_day)
        if (day == null) {
            cell.setTextViewText(R.id.calendar_day_number, "")
            cell.setViewVisibility(R.id.calendar_day_dot, View.INVISIBLE)
            return cell
        }

        val today = day.optBoolean("today", false)
        val count = day.optInt("count", 0)

        cell.setTextViewText(R.id.calendar_day_number, day.optInt("day").toString())
        cell.setTextColor(R.id.calendar_day_number, context.getColor(
            if (today) R.color.widget_on_accent else R.color.widget_foreground))
        cell.setInt(R.id.calendar_day_number, "setBackgroundResource",
            if (today) R.drawable.widget_today_pill else 0)
        cell.setViewVisibility(R.id.calendar_day_dot,
            if (count > 0 && !compact) View.VISIBLE else View.INVISIBLE)
        return cell
    }

    private fun shiftIntent(context: Context, widgetId: Int, delta: Int): PendingIntent {
        val intent = Intent(context, CalendarWidgetProvider::class.java)
        intent.action = ACTION_SHIFT
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        intent.putExtra(EXTRA_DELTA, delta)
        intent.data = Uri.parse("organizer://calendar/$widgetId/$delta")
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun cycleIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, CalendarWidgetProvider::class.java)
        intent.action = ACTION_CYCLE_VIEW
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        intent.data = Uri.parse("organizer://calendar-view/$widgetId")
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun pick(projection: JSONObject?, key: String, offsetField: String, offset: Int): JSONObject? {
        val list = projection?.optJSONArray(key)
        for (i in 0 until (list?.length() ?: 0)) {
            val item = list?.optJSONObject(i)
            if (item != null && item.optInt(offsetField, 99) == offset) return item
        }
        return null
    }

    private fun monthLabel(month: JSONObject, compact: Boolean): String {
        val cal = Calendar.getInstance()
        cal.set(month.optInt("year"), month.optInt("month") - 1, 1)
        return SimpleDateFormat(if (compact) "MMM" else "MMMM yyyy", Locale.getDefault())
            .format(cal.time)
    }

    private fun weekLabel(week: JSONObject): String {
        val start = WidgetFormat.parseDayKey(week.optString("startKey")) ?: return ""
        val cal = Calendar.getInstance()
        cal.time = start
        cal.add(Calendar.DAY_OF_MONTH, 6)
        val fmt = SimpleDateFormat("d MMM", Locale.getDefault())
        return fmt.format(start) + " – " + fmt.format(cal.time)
    }

    private fun dayHeader(dayKey: String): String {
        val date = WidgetFormat.parseDayKey(dayKey) ?: return ""
        return SimpleDateFormat("EEEE, d MMM", Locale.getDefault()).format(date)
    }

    private fun dayName(dayKey: String): String {
        val date = WidgetFormat.parseDayKey(dayKey) ?: return ""
        return SimpleDateFormat("EEE", Locale.getDefault()).format(date)
    }

    private fun shortMonth(month: Int): String {
        val cal = Calendar.getInstance()
        cal.set(Calendar.MONTH, month - 1)
        cal.set(Calendar.DAY_OF_MONTH, 1)
        return SimpleDateFormat("MMM", Locale.getDefault()).format(cal.time)
    }

    private fun weekdayLabels(): Array<String> {
        val format = SimpleDateFormat("EEEEE", Locale.getDefault())
        val cal = Calendar.getInstance()
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        return Array(7) {
            val label = format.format(cal.time)
            cal.add(Calendar.DAY_OF_MONTH, 1)
            label
        }
    }

    companion object {
        const val ACTION_SHIFT = "io.github.f4rsantos.organizer.widgets.CALENDAR_SHIFT"
        const val ACTION_CYCLE_VIEW = "io.github.f4rsantos.organizer.widgets.CALENDAR_VIEW"
        const val EXTRA_DELTA = "delta"

        private const val MIN_OFFSET = -1
        private const val MAX_OFFSET = 1

        private fun nextView(view: String): String {
            if (WidgetStore.VIEW_DAY == view) return WidgetStore.VIEW_WEEK
            if (WidgetStore.VIEW_WEEK == view) return WidgetStore.VIEW_MONTH
            if (WidgetStore.VIEW_MONTH == view) return WidgetStore.VIEW_YEAR
            return WidgetStore.VIEW_DAY
        }

        private fun clamp(offset: Int): Int = offset.coerceIn(MIN_OFFSET, MAX_OFFSET)
    }
}
