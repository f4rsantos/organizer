package io.github.f4rsantos.organizer.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

import io.github.f4rsantos.organizer.R

class SummaryWidgetProvider : AppWidgetProvider() {

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
        for (id in ids) WidgetStore.clearSummaryMetric(context, id)
    }

    private fun buildViews(context: Context, widgetId: Int, compact: Boolean): RemoteViews {
        val projection = WidgetStore.getProjection(context)
        val summary = projection?.optJSONObject("summary")

        val tasksOpen = summary?.optInt("tasksOpen", 0) ?: 0
        val eventsToday = summary?.optInt("eventsToday", 0) ?: 0
        val goalsPending = summary?.optInt("goalsPending", 0) ?: 0
        val overdue = summary?.optInt("overdue", 0) ?: 0
        val goalsEnabled = summary != null && summary.optBoolean("goalsEnabled", false)

        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_summary_compact else R.layout.widget_summary)

        if (compact) {
            val metric = WidgetStore.getSummaryMetric(context, widgetId)
            var value = tasksOpen
            var labelRes = R.string.widget_label_tasks
            var tab = "tasks"

            if (WidgetStore.METRIC_EVENTS == metric) {
                value = eventsToday
                labelRes = R.string.widget_label_events
                tab = "calendar"
            } else if (WidgetStore.METRIC_GOALS == metric) {
                value = goalsPending
                labelRes = R.string.widget_label_goals
                tab = "goals"
            }

            views.setTextViewText(R.id.widget_summary_tasks_value, value.toString())
            views.setTextViewText(R.id.widget_summary_compact_label, context.getString(labelRes))
            views.setTextColor(R.id.widget_summary_tasks_value, context.getColor(
                if (overdue > 0 && WidgetStore.METRIC_TASKS == metric)
                    R.color.widget_overdue else R.color.widget_foreground))
            views.setOnClickPendingIntent(R.id.widget_summary_root,
                TasksWidgetProvider.openApp(context, tab))
            return views
        }

        views.setTextViewText(R.id.widget_summary_tasks_value, tasksOpen.toString())
        views.setTextColor(R.id.widget_summary_tasks_value, context.getColor(
            if (overdue > 0) R.color.widget_overdue else R.color.widget_foreground))
        views.setOnClickPendingIntent(R.id.widget_summary_root,
            TasksWidgetProvider.openApp(context, "tasks"))

        views.setTextViewText(R.id.widget_summary_date, context.getString(R.string.widget_summary_title))
        views.setTextViewText(R.id.widget_summary_headline,
            if (overdue > 0) context.getString(R.string.widget_overdue_count, overdue)
            else context.getString(R.string.widget_open_tasks, tasksOpen))

        views.setTextViewText(R.id.widget_summary_events_value, eventsToday.toString())
        views.setTextViewText(R.id.widget_summary_goals_value, goalsPending.toString())
        views.setViewVisibility(R.id.widget_summary_goals,
            if (goalsEnabled) View.VISIBLE else View.GONE)

        views.setOnClickPendingIntent(R.id.widget_summary_tasks,
            TasksWidgetProvider.openApp(context, "tasks"))
        views.setOnClickPendingIntent(R.id.widget_summary_events,
            TasksWidgetProvider.openApp(context, "calendar"))
        views.setOnClickPendingIntent(R.id.widget_summary_goals,
            TasksWidgetProvider.openApp(context, "goals"))

        return views
    }
}
