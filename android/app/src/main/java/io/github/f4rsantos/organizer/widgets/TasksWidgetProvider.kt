package io.github.f4rsantos.organizer.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

import org.json.JSONException
import org.json.JSONObject

import io.github.f4rsantos.organizer.MainActivity
import io.github.f4rsantos.organizer.R

class TasksWidgetProvider : AppWidgetProvider() {

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

    override fun onReceive(context: Context, intent: Intent) {
        if (ACTION_TOGGLE == intent.action) {
            val taskId = intent.getStringExtra(EXTRA_TASK_ID)
            val done = intent.getBooleanExtra(EXTRA_DONE, true)
            if (taskId != null) {
                enqueueToggle(context, taskId, done)
                WidgetStore.markPending(context, taskId, done)
                WidgetRefresh.refreshAll(context)
            }
            return
        }
        super.onReceive(context, intent)
    }

    private fun enqueueToggle(context: Context, taskId: String, done: Boolean) {
        try {
            val op = JSONObject()
            op.put("id", taskId)
            op.put("type", "setTaskDone")
            op.put("done", done)
            op.put("ts", System.currentTimeMillis())
            WidgetStore.enqueue(context, op)
        } catch (e: JSONException) {
            return
        }
    }

    private fun buildViews(context: Context, widgetId: Int, compact: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_tasks_compact else R.layout.widget_tasks)

        val serviceIntent = Intent(context, TasksWidgetService::class.java)
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        serviceIntent.data = Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME))
        views.setRemoteAdapter(R.id.widget_tasks_list, serviceIntent)
        views.setEmptyView(R.id.widget_tasks_list, R.id.widget_tasks_empty)

        val toggleTemplate = Intent(context, TasksWidgetProvider::class.java)
        toggleTemplate.action = ACTION_TOGGLE
        views.setPendingIntentTemplate(R.id.widget_tasks_list, PendingIntent.getBroadcast(
            context, 0, toggleTemplate,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE))

        if (!compact) {
            renderRings(context, views)
            val subhead = subhead(context)
            views.setTextViewText(R.id.widget_tasks_subhead, subhead)
            views.setViewVisibility(R.id.widget_tasks_subhead,
                if (subhead.isEmpty()) View.GONE else View.VISIBLE)
            views.setOnClickPendingIntent(R.id.widget_tasks_header, openApp(context, "tasks"))
            views.setOnClickPendingIntent(R.id.widget_tasks_add, openApp(context, "tasks"))
        }
        return views
    }

    private fun renderRings(context: Context, views: RemoteViews) {
        val projection = WidgetStore.getProjection(context)
        val progress = projection?.optJSONObject("progress")
        if (progress == null) {
            views.setViewVisibility(R.id.widget_tasks_ring, View.GONE)
            return
        }

        val total = progress.optInt("total", 0)
        val done = progress.optInt("done", 0) + pendingDoneDelta(context, projection)

        views.setViewVisibility(R.id.widget_tasks_ring,
            if (total > 0) View.VISIBLE else View.GONE)
        if (total > 0) {
            views.setImageViewBitmap(R.id.widget_tasks_ring, ProgressRing.render(context, 22,
                Math.min(total, Math.max(0, done)) / total.toFloat(),
                context.getColor(R.color.widget_accent)))
        }
    }

    private fun pendingDoneDelta(context: Context, projection: JSONObject?): Int {
        val pending = WidgetStore.getPending(context)
        if (pending.length() == 0) return 0

        val tasks = projection?.optJSONArray("tasks")
        var delta = 0
        for (i in 0 until (tasks?.length() ?: 0)) {
            val task = tasks?.optJSONObject(i) ?: continue
            val id = task.optString("id")
            if (pending.has(id) && pending.optBoolean(id, false)) delta += 1
        }
        return delta
    }

    private fun subhead(context: Context): String {
        val projection = WidgetStore.getProjection(context)
        val summary = projection?.optJSONObject("summary") ?: return ""

        val overdue = summary.optInt("overdue", 0)
        if (overdue > 0) return context.getString(R.string.widget_overdue_count, overdue)

        val open = summary.optInt("tasksOpen", 0)
        return if (open > 0) context.getString(R.string.widget_open_tasks, open) else ""
    }

    companion object {
        const val ACTION_TOGGLE = "io.github.f4rsantos.organizer.widgets.TOGGLE_TASK"
        const val EXTRA_TASK_ID = "taskId"
        const val EXTRA_DONE = "done"

        @JvmStatic
        fun openApp(context: Context, tab: String): PendingIntent {
            val intent = Intent(context, MainActivity::class.java)
            intent.action = Intent.ACTION_MAIN
            intent.addCategory(Intent.CATEGORY_LAUNCHER)
            intent.putExtra("tab", tab)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            return PendingIntent.getActivity(context, tab.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }
}
