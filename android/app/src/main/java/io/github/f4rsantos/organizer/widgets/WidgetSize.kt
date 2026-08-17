package io.github.f4rsantos.organizer.widgets

import android.appwidget.AppWidgetManager

object WidgetSize {

    private const val COMPACT_HEIGHT_DP = 110
    private const val COMPACT_WIDTH_DP = 140

    fun isWide(manager: AppWidgetManager, widgetId: Int): Boolean {
        val options = manager.getAppWidgetOptions(widgetId) ?: return true

        val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        if (height <= 0 || width <= 0) return true

        return width >= height
    }

    fun isCompact(manager: AppWidgetManager, widgetId: Int): Boolean {
        val options = manager.getAppWidgetOptions(widgetId) ?: return false

        val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        if (height == 0 && width == 0) return false

        return (height > 0 && height < COMPACT_HEIGHT_DP) || (width > 0 && width < COMPACT_WIDTH_DP)
    }
}
