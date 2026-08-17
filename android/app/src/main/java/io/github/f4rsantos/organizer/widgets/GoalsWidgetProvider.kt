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

import io.github.f4rsantos.organizer.R

class GoalsWidgetProvider : AppWidgetProvider() {

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
        if (ACTION_CHECK_IN == intent.action) {
            val goalId = intent.getStringExtra(EXTRA_GOAL_ID)
            val done = intent.getBooleanExtra(EXTRA_DONE, true)
            if (goalId != null) {
                enqueueCheckIn(context, goalId, done)
                WidgetStore.markPending(context, goalId, done)
                WidgetRefresh.refreshAll(context)
            }
            return
        }
        super.onReceive(context, intent)
    }

    private fun enqueueCheckIn(context: Context, goalId: String, done: Boolean) {
        try {
            val op = JSONObject()
            op.put("id", goalId)
            op.put("type", "setGoalCheckIn")
            op.put("done", done)
            op.put("ts", System.currentTimeMillis())
            WidgetStore.enqueue(context, op)
        } catch (e: JSONException) {
            return
        }
    }

    private fun buildViews(context: Context, widgetId: Int, compact: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_goals_compact else R.layout.widget_goals)

        val serviceIntent = Intent(context, GoalsWidgetService::class.java)
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        serviceIntent.data = Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME))
        views.setRemoteAdapter(R.id.widget_goals_list, serviceIntent)
        views.setEmptyView(R.id.widget_goals_list, R.id.widget_goals_empty)

        val template = Intent(context, GoalsWidgetProvider::class.java)
        template.action = ACTION_CHECK_IN
        views.setPendingIntentTemplate(R.id.widget_goals_list, PendingIntent.getBroadcast(
            context, 0, template,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE))

        if (!compact) {
            val progress = progressLabel(context)
            views.setTextViewText(R.id.widget_goals_progress, progress)
            views.setViewVisibility(R.id.widget_goals_progress,
                if (progress.isEmpty()) View.GONE else View.VISIBLE)
            views.setOnClickPendingIntent(R.id.widget_goals_header,
                TasksWidgetProvider.openApp(context, "goals"))
        }
        return views
    }

    private fun progressLabel(context: Context): String {
        val projection = WidgetStore.getProjection(context)
        val goals = projection?.optJSONArray("goals")
        if (goals == null || goals.length() == 0) return ""

        var done = 0
        for (i in 0 until goals.length()) {
            val goal = goals.optJSONObject(i)
            if (goal != null && goal.optBoolean("done", false)) done++
        }
        return "$done/${goals.length()}"
    }

    companion object {
        const val ACTION_CHECK_IN = "io.github.f4rsantos.organizer.widgets.CHECK_IN_GOAL"
        const val EXTRA_GOAL_ID = "goalId"
        const val EXTRA_DONE = "done"
    }
}
