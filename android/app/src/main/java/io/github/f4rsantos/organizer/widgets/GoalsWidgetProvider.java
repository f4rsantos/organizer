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
import org.json.JSONException;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class GoalsWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_CHECK_IN = "io.github.f4rsantos.organizer.widgets.CHECK_IN_GOAL";
    public static final String EXTRA_GOAL_ID = "goalId";
    public static final String EXTRA_DONE = "done";

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
    public void onReceive(Context context, Intent intent) {
        if (ACTION_CHECK_IN.equals(intent.getAction())) {
            String goalId = intent.getStringExtra(EXTRA_GOAL_ID);
            boolean done = intent.getBooleanExtra(EXTRA_DONE, true);
            if (goalId != null) {
                enqueueCheckIn(context, goalId, done);
                WidgetStore.markPending(context, goalId, done);
                WidgetRefresh.refreshAll(context);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    private void enqueueCheckIn(Context context, String goalId, boolean done) {
        try {
            JSONObject op = new JSONObject();
            op.put("id", goalId);
            op.put("type", "setGoalCheckIn");
            op.put("done", done);
            op.put("ts", System.currentTimeMillis());
            WidgetStore.enqueue(context, op);
        } catch (JSONException e) {
            return;
        }
    }

    private RemoteViews buildViews(Context context, int widgetId, boolean compact) {
        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_goals_compact : R.layout.widget_goals);

        Intent serviceIntent = new Intent(context, GoalsWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_goals_list, serviceIntent);
        views.setEmptyView(R.id.widget_goals_list, R.id.widget_goals_empty);

        Intent template = new Intent(context, GoalsWidgetProvider.class);
        template.setAction(ACTION_CHECK_IN);
        views.setPendingIntentTemplate(R.id.widget_goals_list, PendingIntent.getBroadcast(
                context, 0, template,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        if (!compact) {
            String progress = progressLabel(context);
            views.setTextViewText(R.id.widget_goals_progress, progress);
            views.setViewVisibility(R.id.widget_goals_progress, progress.isEmpty() ? View.GONE : View.VISIBLE);
            views.setOnClickPendingIntent(R.id.widget_goals_header,
                    TasksWidgetProvider.openApp(context, "goals"));
        }
        return views;
    }

    private String progressLabel(Context context) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONArray goals = projection == null ? null : projection.optJSONArray("goals");
        if (goals == null || goals.length() == 0) return "";

        int done = 0;
        for (int i = 0; i < goals.length(); i++) {
            JSONObject goal = goals.optJSONObject(i);
            if (goal != null && goal.optBoolean("done", false)) done++;
        }
        return done + "/" + goals.length();
    }
}
