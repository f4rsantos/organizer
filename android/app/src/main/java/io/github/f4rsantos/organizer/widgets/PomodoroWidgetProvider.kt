package io.github.f4rsantos.organizer.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

import io.github.f4rsantos.organizer.R

class PomodoroWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            manager.updateAppWidget(id, buildViews(context, WidgetSize.isCompact(manager, id)))
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        newOptions: Bundle
    ) {
        manager.updateAppWidget(widgetId,
            buildViews(context, WidgetSize.isCompact(manager, widgetId)))
    }

    private fun buildViews(context: Context, compact: Boolean): RemoteViews {
        val projection = WidgetStore.getProjection(context)
        val pomodoro = projection?.optJSONObject("pomodoro")

        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_pomodoro_compact else R.layout.widget_pomodoro)

        val enabled = pomodoro != null && pomodoro.optBoolean("enabled", false)
        val completed = pomodoro?.optInt("completed", 0) ?: 0
        val abandoned = pomodoro?.optInt("abandoned", 0) ?: 0
        val focusSecs = pomodoro?.optInt("focusSecs", 0) ?: 0

        views.setTextViewText(R.id.widget_pomodoro_count,
            context.resources.getQuantityString(R.plurals.widget_pomodoro_count, completed, completed))
        views.setOnClickPendingIntent(R.id.widget_pomodoro_root,
            TasksWidgetProvider.openApp(context, "focus"))

        if (compact) return views

        views.setTextViewText(R.id.widget_pomodoro_focus, focusLabel(context, focusSecs))
        views.setTextViewText(R.id.widget_pomodoro_abandoned,
            context.getString(R.string.widget_pomodoro_abandoned, abandoned))
        views.setViewVisibility(R.id.widget_pomodoro_abandoned,
            if (abandoned > 0) View.VISIBLE else View.GONE)

        val tomatoes = pomodoro?.optJSONArray("tomatoes")
        val shown = tomatoes?.length() ?: 0
        views.setImageViewBitmap(R.id.widget_pomodoro_pile,
            TomatoPile.render(context, tomatoes, 150, 60))

        views.setViewVisibility(R.id.widget_pomodoro_empty,
            if (enabled && shown == 0) View.VISIBLE else View.GONE)
        return views
    }

    private fun focusLabel(context: Context, secs: Int): String {
        val minutes = Math.max(0, secs) / 60
        if (minutes < 60) return context.getString(R.string.widget_pomodoro_minutes, minutes)
        return context.getString(R.string.widget_pomodoro_hours, minutes / 60, minutes % 60)
    }
}
