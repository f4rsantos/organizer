package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.graphics.Color;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

import io.github.f4rsantos.organizer.R;

public final class WidgetFormat {

    private WidgetFormat() {}

    public static int parseColor(String raw, int fallback) {
        if (raw == null || raw.isEmpty()) return fallback;
        try {
            return Color.parseColor(raw);
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    public static Date parseDayKey(String dayKey) {
        if (dayKey == null || dayKey.length() < 10) return null;
        try {
            return new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dayKey.substring(0, 10));
        } catch (java.text.ParseException e) {
            return null;
        }
    }

    public static String dayLabel(Context context, String dayKey, int offset) {
        if (offset == 0) return context.getString(R.string.widget_today_label);
        if (offset == 1) return context.getString(R.string.widget_tomorrow_label);
        Date date = parseDayKey(dayKey);
        if (date == null) return "";
        return new SimpleDateFormat(context.getString(R.string.widget_day_pattern), Locale.getDefault())
                .format(date);
    }

    public static String dueLabel(Context context, String dueDate, String todayKey) {
        if (dueDate == null || dueDate.isEmpty()) return "";
        Date due = parseDayKey(dueDate);
        Date today = parseDayKey(todayKey);
        if (due == null || today == null) return "";

        long diff = daysBetween(today, due);
        if (diff == 0) return context.getString(R.string.widget_today_label);
        if (diff == 1) return context.getString(R.string.widget_tomorrow_label);
        if (diff < 0 && diff >= -6) {
            return context.getString(R.string.widget_days_overdue, Math.abs(diff));
        }
        return new SimpleDateFormat(context.getString(R.string.widget_due_pattern), Locale.getDefault())
                .format(due);
    }

    private static long daysBetween(Date from, Date to) {
        Calendar a = midnight(from);
        Calendar b = midnight(to);
        long millis = b.getTimeInMillis() - a.getTimeInMillis();
        return Math.round(millis / 86400000d);
    }

    private static Calendar midnight(Date date) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal;
    }
}
