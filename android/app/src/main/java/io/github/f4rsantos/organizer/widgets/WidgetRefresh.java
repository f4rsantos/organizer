package io.github.f4rsantos.organizer.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import io.github.f4rsantos.organizer.R;

public final class WidgetRefresh {

    private WidgetRefresh() {}

    public static void refreshAll(Context context) {
        refresh(context, TasksWidgetProvider.class, R.id.widget_tasks_list);
        refresh(context, CalendarWidgetProvider.class, 0);
        refresh(context, KanbanWidgetProvider.class, 0);
        refresh(context, AgendaWidgetProvider.class, R.id.widget_agenda_list);
        refresh(context, GoalsWidgetProvider.class, R.id.widget_goals_list);
        refresh(context, SummaryWidgetProvider.class, 0);
        refresh(context, PomodoroWidgetProvider.class, 0);
    }

    private static void refresh(Context context, Class<?> provider, int collectionViewId) {
        Context app = context.getApplicationContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(app);
        ComponentName component = new ComponentName(app, provider);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length == 0) return;

        if (collectionViewId != 0) {
            manager.notifyAppWidgetViewDataChanged(ids, collectionViewId);
        }

        Intent intent = new Intent(app, provider);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        app.sendBroadcast(intent);
    }
}
