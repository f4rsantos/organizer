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
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

import io.github.f4rsantos.organizer.R;

public class CalendarWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_SHIFT = "io.github.f4rsantos.organizer.widgets.CALENDAR_SHIFT";
    public static final String ACTION_CYCLE_VIEW = "io.github.f4rsantos.organizer.widgets.CALENDAR_VIEW";
    public static final String EXTRA_DELTA = "delta";

    private static final int MIN_OFFSET = -1;
    private static final int MAX_OFFSET = 1;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, id, WidgetSize.isCompact(manager, id)));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        manager.updateAppWidget(widgetId, buildViews(context, widgetId, WidgetSize.isCompact(manager, widgetId)));
    }

    @Override
    public void onDeleted(Context context, int[] ids) {
        for (int id : ids) WidgetStore.clearCalendarOffset(context, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);

        if (ACTION_SHIFT.equals(action) && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            int next = clamp(WidgetStore.getCalendarOffset(context, widgetId)
                    + intent.getIntExtra(EXTRA_DELTA, 0));
            WidgetStore.setCalendarOffset(context, widgetId, next);
            refresh(context, widgetId);
            return;
        }

        if (ACTION_CYCLE_VIEW.equals(action) && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            WidgetStore.setCalendarView(context, widgetId,
                    nextView(WidgetStore.getCalendarView(context, widgetId)));
            WidgetStore.setCalendarOffset(context, widgetId, 0);
            refresh(context, widgetId);
            return;
        }
        super.onReceive(context, intent);
    }

    private void refresh(Context context, int widgetId) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        manager.updateAppWidget(widgetId,
                buildViews(context, widgetId, WidgetSize.isCompact(manager, widgetId)));
    }

    private static String nextView(String view) {
        if (WidgetStore.VIEW_DAY.equals(view)) return WidgetStore.VIEW_WEEK;
        if (WidgetStore.VIEW_WEEK.equals(view)) return WidgetStore.VIEW_MONTH;
        if (WidgetStore.VIEW_MONTH.equals(view)) return WidgetStore.VIEW_YEAR;
        return WidgetStore.VIEW_DAY;
    }

    private static int clamp(int offset) {
        return Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, offset));
    }

    private RemoteViews buildViews(Context context, int widgetId, boolean compact) {
        String view = WidgetStore.getCalendarView(context, widgetId);
        int offset = clamp(WidgetStore.getCalendarOffset(context, widgetId));
        JSONObject projection = WidgetStore.getProjection(context);

        if (compact) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_compact);
            JSONObject month = pick(projection, "calendar", "monthOffset", 0);
            views.removeAllViews(R.id.widget_calendar_grid);
            if (month != null) {
                views.setTextViewText(R.id.widget_calendar_month, monthLabel(month, true));
                fillMonthGrid(context, views, month, true);
            }
            return views;
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        views.removeAllViews(R.id.widget_calendar_grid);
        views.removeAllViews(R.id.widget_calendar_weekdays);

        views.setOnClickPendingIntent(R.id.widget_calendar_prev, shiftIntent(context, widgetId, -1));
        views.setOnClickPendingIntent(R.id.widget_calendar_next, shiftIntent(context, widgetId, 1));
        views.setOnClickPendingIntent(R.id.widget_calendar_month, cycleIntent(context, widgetId));
        views.setOnClickPendingIntent(R.id.widget_calendar_add,
                TasksWidgetProvider.openApp(context, "calendar"));

        if (WidgetStore.VIEW_DAY.equals(view)) {
            buildDay(context, views, pick(projection, "calendarDays", "dayOffset", offset));
        } else if (WidgetStore.VIEW_WEEK.equals(view)) {
            buildWeek(context, views, pick(projection, "calendarWeeks", "weekOffset", offset));
        } else if (WidgetStore.VIEW_YEAR.equals(view)) {
            buildYear(context, views, pick(projection, "calendarYears", "yearOffset", offset));
        } else {
            buildMonth(context, views, pick(projection, "calendar", "monthOffset", offset));
        }
        return views;
    }

    private void buildMonth(Context context, RemoteViews views, JSONObject month) {
        if (month == null) return;
        views.setTextViewText(R.id.widget_calendar_month, monthLabel(month, false));
        for (String label : weekdayLabels()) {
            RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_weekday);
            cell.setTextViewText(R.id.calendar_weekday_label, label);
            views.addView(R.id.widget_calendar_weekdays, cell);
        }
        fillMonthGrid(context, views, month, false);
    }

    private void fillMonthGrid(Context context, RemoteViews views, JSONObject month, boolean compact) {
        JSONArray days = month.optJSONArray("days");
        int total = days == null ? 0 : days.length();
        for (int i = 0; i < total; i += 7) {
            RemoteViews week = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_week);
            for (int j = i; j < i + 7 && j < total; j++) {
                week.addView(R.id.calendar_week, dayCell(context, days.optJSONObject(j), compact));
            }
            views.addView(R.id.widget_calendar_grid, week);
        }
    }

    private void buildWeek(Context context, RemoteViews views, JSONObject week) {
        if (week == null) return;
        views.setTextViewText(R.id.widget_calendar_month, weekLabel(week));

        JSONArray days = week.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day == null) continue;

            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_daylist);
            row.setTextViewText(R.id.calendar_day_name, dayName(day.optString("dayKey")));
            row.setTextViewText(R.id.calendar_day_num, String.valueOf(day.optInt("day")));
            row.setTextColor(R.id.calendar_day_num, context.getColor(
                    day.optBoolean("today", false) ? R.color.widget_accent : R.color.widget_foreground));

            row.removeAllViews(R.id.calendar_day_entries);
            JSONArray entries = day.optJSONArray("entries");
            for (int j = 0; entries != null && j < entries.length(); j++) {
                JSONObject entry = entries.optJSONObject(j);
                if (entry == null) continue;
                RemoteViews chip = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_entry);
                chip.setTextViewText(R.id.calendar_entry_title, entry.optString("title"));
                String time = entry.optBoolean("allDay", false) ? "" : entry.optString("time", "");
                chip.setTextViewText(R.id.calendar_entry_time, time);
                chip.setViewVisibility(R.id.calendar_entry_time, time.isEmpty() ? View.GONE : View.VISIBLE);
                row.addView(R.id.calendar_day_entries, chip);
            }
            views.addView(R.id.widget_calendar_grid, row);
        }
    }

    private void buildDay(Context context, RemoteViews views, JSONObject day) {
        if (day == null) return;
        views.setTextViewText(R.id.widget_calendar_month, dayHeader(day.optString("dayKey")));

        JSONArray entries = day.optJSONArray("entries");
        if (entries == null || entries.length() == 0) {
            RemoteViews empty = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_entry);
            empty.setTextViewText(R.id.calendar_entry_title, context.getString(R.string.widget_calendar_empty));
            empty.setViewVisibility(R.id.calendar_entry_time, View.GONE);
            views.addView(R.id.widget_calendar_grid, empty);
            return;
        }

        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.optJSONObject(i);
            if (entry == null) continue;
            RemoteViews chip = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_entry);
            chip.setTextViewText(R.id.calendar_entry_title, entry.optString("title"));
            String time = entry.optBoolean("allDay", false)
                    ? context.getString(R.string.widget_all_day)
                    : entry.optString("time", "");
            chip.setTextViewText(R.id.calendar_entry_time, time);
            chip.setViewVisibility(R.id.calendar_entry_time, time.isEmpty() ? View.GONE : View.VISIBLE);
            views.addView(R.id.widget_calendar_grid, chip);
        }
    }

    private void buildYear(Context context, RemoteViews views, JSONObject year) {
        if (year == null) return;
        views.setTextViewText(R.id.widget_calendar_month, String.valueOf(year.optInt("year")));

        JSONArray months = year.optJSONArray("months");
        int current = year.optInt("currentMonth", 0);
        for (int i = 0; months != null && i < months.length(); i += 3) {
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_week);
            for (int j = i; j < i + 3 && j < months.length(); j++) {
                JSONObject month = months.optJSONObject(j);
                RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_month_cell);
                int monthNum = month == null ? j + 1 : month.optInt("month", j + 1);
                cell.setTextViewText(R.id.calendar_month_name, shortMonth(monthNum));
                cell.setTextViewText(R.id.calendar_month_count,
                        String.valueOf(month == null ? 0 : month.optInt("count", 0)));
                cell.setTextColor(R.id.calendar_month_name, context.getColor(
                        monthNum == current ? R.color.widget_accent : R.color.widget_foreground));
                row.addView(R.id.calendar_week, cell);
            }
            views.addView(R.id.widget_calendar_grid, row);
        }
    }

    private RemoteViews dayCell(Context context, JSONObject day, boolean compact) {
        RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_day);
        if (day == null) {
            cell.setTextViewText(R.id.calendar_day_number, "");
            cell.setViewVisibility(R.id.calendar_day_dot, View.INVISIBLE);
            return cell;
        }

        boolean today = day.optBoolean("today", false);
        int count = day.optInt("count", 0);

        cell.setTextViewText(R.id.calendar_day_number, String.valueOf(day.optInt("day")));
        cell.setTextColor(R.id.calendar_day_number, context.getColor(
                today ? R.color.widget_on_accent : R.color.widget_foreground));
        cell.setInt(R.id.calendar_day_number, "setBackgroundResource",
                today ? R.drawable.widget_today_pill : 0);
        cell.setViewVisibility(R.id.calendar_day_dot,
                count > 0 && !compact ? View.VISIBLE : View.INVISIBLE);
        return cell;
    }

    private PendingIntent shiftIntent(Context context, int widgetId, int delta) {
        Intent intent = new Intent(context, CalendarWidgetProvider.class);
        intent.setAction(ACTION_SHIFT);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        intent.putExtra(EXTRA_DELTA, delta);
        intent.setData(android.net.Uri.parse("organizer://calendar/" + widgetId + "/" + delta));
        return PendingIntent.getBroadcast(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent cycleIntent(Context context, int widgetId) {
        Intent intent = new Intent(context, CalendarWidgetProvider.class);
        intent.setAction(ACTION_CYCLE_VIEW);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        intent.setData(android.net.Uri.parse("organizer://calendar-view/" + widgetId));
        return PendingIntent.getBroadcast(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private JSONObject pick(JSONObject projection, String key, String offsetField, int offset) {
        JSONArray list = projection == null ? null : projection.optJSONArray(key);
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject item = list.optJSONObject(i);
            if (item != null && item.optInt(offsetField, 99) == offset) return item;
        }
        return null;
    }

    private String monthLabel(JSONObject month, boolean compact) {
        Calendar cal = Calendar.getInstance();
        cal.set(month.optInt("year"), month.optInt("month") - 1, 1);
        return new SimpleDateFormat(compact ? "MMM" : "MMMM yyyy", Locale.getDefault())
                .format(cal.getTime());
    }

    private String weekLabel(JSONObject week) {
        java.util.Date start = WidgetFormat.parseDayKey(week.optString("startKey"));
        if (start == null) return "";
        Calendar cal = Calendar.getInstance();
        cal.setTime(start);
        cal.add(Calendar.DAY_OF_MONTH, 6);
        SimpleDateFormat fmt = new SimpleDateFormat("d MMM", Locale.getDefault());
        return fmt.format(start) + " – " + fmt.format(cal.getTime());
    }

    private String dayHeader(String dayKey) {
        java.util.Date date = WidgetFormat.parseDayKey(dayKey);
        if (date == null) return "";
        return new SimpleDateFormat("EEEE, d MMM", Locale.getDefault()).format(date);
    }

    private String dayName(String dayKey) {
        java.util.Date date = WidgetFormat.parseDayKey(dayKey);
        if (date == null) return "";
        return new SimpleDateFormat("EEE", Locale.getDefault()).format(date);
    }

    private String shortMonth(int month) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.MONTH, month - 1);
        cal.set(Calendar.DAY_OF_MONTH, 1);
        return new SimpleDateFormat("MMM", Locale.getDefault()).format(cal.getTime());
    }

    private String[] weekdayLabels() {
        String[] labels = new String[7];
        SimpleDateFormat format = new SimpleDateFormat("EEEEE", Locale.getDefault());
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        for (int i = 0; i < 7; i++) {
            labels[i] = format.format(cal.getTime());
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }
        return labels;
    }
}
