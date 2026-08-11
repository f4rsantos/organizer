package io.github.f4rsantos.organizer.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class PomodoroWidgetProvider extends AppWidgetProvider {

    private static final int MAX_VISIBLE = 8;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, WidgetSize.isCompact(manager, id)));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        manager.updateAppWidget(widgetId, buildViews(context, WidgetSize.isCompact(manager, widgetId)));
    }

    private RemoteViews buildViews(Context context, boolean compact) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONObject pomodoro = projection == null ? null : projection.optJSONObject("pomodoro");

        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_pomodoro_compact : R.layout.widget_pomodoro);

        boolean enabled = pomodoro != null && pomodoro.optBoolean("enabled", false);
        int completed = pomodoro == null ? 0 : pomodoro.optInt("completed", 0);
        int abandoned = pomodoro == null ? 0 : pomodoro.optInt("abandoned", 0);
        int focusSecs = pomodoro == null ? 0 : pomodoro.optInt("focusSecs", 0);

        views.setTextViewText(R.id.widget_pomodoro_count,
                context.getResources().getQuantityString(R.plurals.widget_pomodoro_count, completed, completed));
        views.setOnClickPendingIntent(R.id.widget_pomodoro_root,
                TasksWidgetProvider.openApp(context, "focus"));

        if (compact) return views;

        views.setTextViewText(R.id.widget_pomodoro_focus, focusLabel(context, focusSecs));
        views.setTextViewText(R.id.widget_pomodoro_abandoned,
                context.getString(R.string.widget_pomodoro_abandoned, abandoned));
        views.setViewVisibility(R.id.widget_pomodoro_abandoned,
                abandoned > 0 ? View.VISIBLE : View.GONE);

        JSONArray tomatoes = pomodoro == null ? null : pomodoro.optJSONArray("tomatoes");
        int shown = tomatoes == null ? 0 : tomatoes.length();
        views.setImageViewBitmap(R.id.widget_pomodoro_pile,
                TomatoPile.render(context, tomatoes, 150, 60));

        views.setViewVisibility(R.id.widget_pomodoro_empty,
                enabled && shown == 0 ? View.VISIBLE : View.GONE);
        return views;
    }

    private String focusLabel(Context context, int secs) {
        int minutes = Math.max(0, secs) / 60;
        if (minutes < 60) return context.getString(R.string.widget_pomodoro_minutes, minutes);
        return context.getString(R.string.widget_pomodoro_hours, minutes / 60, minutes % 60);
    }
}
