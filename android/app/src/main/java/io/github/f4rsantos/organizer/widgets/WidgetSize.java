package io.github.f4rsantos.organizer.widgets;

import android.appwidget.AppWidgetManager;
import android.os.Bundle;

public final class WidgetSize {

    private static final int COMPACT_HEIGHT_DP = 110;
    private static final int COMPACT_WIDTH_DP = 140;

    private WidgetSize() {}

    public static boolean isWide(AppWidgetManager manager, int widgetId) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        if (options == null) return true;

        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        if (height <= 0 || width <= 0) return true;

        return width >= height;
    }

    public static boolean isCompact(AppWidgetManager manager, int widgetId) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        if (options == null) return false;

        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        if (height == 0 && width == 0) return false;

        return (height > 0 && height < COMPACT_HEIGHT_DP) || (width > 0 && width < COMPACT_WIDTH_DP);
    }
}
