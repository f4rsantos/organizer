package io.github.f4rsantos.organizer.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class SummaryWidgetProvider extends AppWidgetProvider {

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
        for (int id : ids) WidgetStore.clearSummaryMetric(context, id);
    }

    private RemoteViews buildViews(Context context, int widgetId, boolean compact) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONObject summary = projection == null ? null : projection.optJSONObject("summary");

        int tasksOpen = summary == null ? 0 : summary.optInt("tasksOpen", 0);
        int eventsToday = summary == null ? 0 : summary.optInt("eventsToday", 0);
        int goalsPending = summary == null ? 0 : summary.optInt("goalsPending", 0);
        int overdue = summary == null ? 0 : summary.optInt("overdue", 0);
        boolean goalsEnabled = summary != null && summary.optBoolean("goalsEnabled", false);

        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_summary_compact : R.layout.widget_summary);

        if (compact) {
            String metric = WidgetStore.getSummaryMetric(context, widgetId);
            int value = tasksOpen;
            int labelRes = R.string.widget_label_tasks;
            String tab = "tasks";

            if (WidgetStore.METRIC_EVENTS.equals(metric)) {
                value = eventsToday;
                labelRes = R.string.widget_label_events;
                tab = "calendar";
            } else if (WidgetStore.METRIC_GOALS.equals(metric)) {
                value = goalsPending;
                labelRes = R.string.widget_label_goals;
                tab = "goals";
            }

            views.setTextViewText(R.id.widget_summary_tasks_value, String.valueOf(value));
            views.setTextViewText(R.id.widget_summary_compact_label, context.getString(labelRes));
            views.setTextColor(R.id.widget_summary_tasks_value, context.getColor(
                    overdue > 0 && WidgetStore.METRIC_TASKS.equals(metric)
                            ? R.color.widget_overdue : R.color.widget_foreground));
            views.setOnClickPendingIntent(R.id.widget_summary_root,
                    TasksWidgetProvider.openApp(context, tab));
            return views;
        }

        views.setTextViewText(R.id.widget_summary_tasks_value, String.valueOf(tasksOpen));
        views.setTextColor(R.id.widget_summary_tasks_value, context.getColor(
                overdue > 0 ? R.color.widget_overdue : R.color.widget_foreground));
        views.setOnClickPendingIntent(R.id.widget_summary_root,
                TasksWidgetProvider.openApp(context, "tasks"));

        {
            views.setTextViewText(R.id.widget_summary_date, context.getString(R.string.widget_summary_title));
            views.setTextViewText(R.id.widget_summary_headline, overdue > 0
                    ? context.getString(R.string.widget_overdue_count, overdue)
                    : context.getString(R.string.widget_open_tasks, tasksOpen));

            views.setTextViewText(R.id.widget_summary_events_value, String.valueOf(eventsToday));
            views.setTextViewText(R.id.widget_summary_goals_value, String.valueOf(goalsPending));
            views.setViewVisibility(R.id.widget_summary_goals,
                    goalsEnabled ? View.VISIBLE : View.GONE);

            views.setOnClickPendingIntent(R.id.widget_summary_tasks,
                    TasksWidgetProvider.openApp(context, "tasks"));
            views.setOnClickPendingIntent(R.id.widget_summary_events,
                    TasksWidgetProvider.openApp(context, "calendar"));
            views.setOnClickPendingIntent(R.id.widget_summary_goals,
                    TasksWidgetProvider.openApp(context, "goals"));
        }
        return views;
    }
}
