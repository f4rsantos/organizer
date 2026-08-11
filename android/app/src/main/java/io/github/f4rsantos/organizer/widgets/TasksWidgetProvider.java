package io.github.f4rsantos.organizer.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.MainActivity;
import io.github.f4rsantos.organizer.R;

public class TasksWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_TOGGLE = "io.github.f4rsantos.organizer.widgets.TOGGLE_TASK";
    public static final String EXTRA_TASK_ID = "taskId";
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
        if (ACTION_TOGGLE.equals(intent.getAction())) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            boolean done = intent.getBooleanExtra(EXTRA_DONE, true);
            if (taskId != null) {
                enqueueToggle(context, taskId, done);
                WidgetStore.markPending(context, taskId, done);
                WidgetRefresh.refreshAll(context);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    private void enqueueToggle(Context context, String taskId, boolean done) {
        try {
            JSONObject op = new JSONObject();
            op.put("id", taskId);
            op.put("type", "setTaskDone");
            op.put("done", done);
            op.put("ts", System.currentTimeMillis());
            WidgetStore.enqueue(context, op);
        } catch (JSONException e) {
            return;
        }
    }

    private RemoteViews buildViews(Context context, int widgetId, boolean compact) {
        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_tasks_compact : R.layout.widget_tasks);

        Intent serviceIntent = new Intent(context, TasksWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_tasks_list, serviceIntent);
        views.setEmptyView(R.id.widget_tasks_list, R.id.widget_tasks_empty);

        Intent toggleTemplate = new Intent(context, TasksWidgetProvider.class);
        toggleTemplate.setAction(ACTION_TOGGLE);
        views.setPendingIntentTemplate(R.id.widget_tasks_list, PendingIntent.getBroadcast(
                context, 0, toggleTemplate,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        if (!compact) {
            renderRings(context, views);
            String subhead = subhead(context);
            views.setTextViewText(R.id.widget_tasks_subhead, subhead);
            views.setViewVisibility(R.id.widget_tasks_subhead,
                    subhead.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            views.setOnClickPendingIntent(R.id.widget_tasks_header, openApp(context, "tasks"));
            views.setOnClickPendingIntent(R.id.widget_tasks_add, openApp(context, "tasks"));
        }
        return views;
    }

    private void renderRings(Context context, RemoteViews views) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONObject progress = projection == null ? null : projection.optJSONObject("progress");
        if (progress == null) {
            views.setViewVisibility(R.id.widget_tasks_ring, android.view.View.GONE);
            return;
        }

        int total = progress.optInt("total", 0);
        int done = progress.optInt("done", 0) + pendingDoneDelta(context, projection);

        views.setViewVisibility(R.id.widget_tasks_ring,
                total > 0 ? android.view.View.VISIBLE : android.view.View.GONE);
        if (total > 0) {
            views.setImageViewBitmap(R.id.widget_tasks_ring, ProgressRing.render(context, 22,
                    Math.min(total, Math.max(0, done)) / (float) total,
                    context.getColor(R.color.widget_accent)));
        }
    }

    private int pendingDoneDelta(Context context, JSONObject projection) {
        JSONObject pending = WidgetStore.getPending(context);
        if (pending == null || pending.length() == 0) return 0;

        JSONArray tasks = projection == null ? null : projection.optJSONArray("tasks");
        int delta = 0;
        for (int i = 0; tasks != null && i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null) continue;
            String id = task.optString("id");
            if (pending.has(id) && pending.optBoolean(id, false)) delta += 1;
        }
        return delta;
    }

    private String subhead(Context context) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONObject summary = projection == null ? null : projection.optJSONObject("summary");
        if (summary == null) return "";

        int overdue = summary.optInt("overdue", 0);
        if (overdue > 0) return context.getString(R.string.widget_overdue_count, overdue);

        int open = summary.optInt("tasksOpen", 0);
        return open > 0 ? context.getString(R.string.widget_open_tasks, open) : "";
    }

    static PendingIntent openApp(Context context, String tab) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.putExtra("tab", tab);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, tab.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
