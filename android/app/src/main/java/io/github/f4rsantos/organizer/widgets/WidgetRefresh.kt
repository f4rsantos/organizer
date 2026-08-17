package io.github.f4rsantos.organizer.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

import io.github.f4rsantos.organizer.R

object WidgetRefresh {

    fun refreshAll(context: Context) {
        refresh(context, TasksWidgetProvider::class.java, R.id.widget_tasks_list)
        refresh(context, CalendarWidgetProvider::class.java, 0)
        refresh(context, KanbanWidgetProvider::class.java, 0)
        refresh(context, AgendaWidgetProvider::class.java, R.id.widget_agenda_list)
        refresh(context, GoalsWidgetProvider::class.java, R.id.widget_goals_list)
        refresh(context, SummaryWidgetProvider::class.java, 0)
        refresh(context, PomodoroWidgetProvider::class.java, 0)
    }

    private fun refresh(context: Context, provider: Class<*>, collectionViewId: Int) {
        val app = context.applicationContext
        val manager = AppWidgetManager.getInstance(app)
        val component = ComponentName(app, provider)
        val ids = manager.getAppWidgetIds(component)
        if (ids.isEmpty()) return

        if (collectionViewId != 0) {
            manager.notifyAppWidgetViewDataChanged(ids, collectionViewId)
        }

        val intent = Intent(app, provider)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        app.sendBroadcast(intent)
    }
}
