package io.github.f4rsantos.organizer.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

import io.github.f4rsantos.organizer.R

class AgendaWidgetProvider : AppWidgetProvider() {

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

    private fun buildViews(context: Context, widgetId: Int, compact: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName,
            if (compact) R.layout.widget_agenda_compact else R.layout.widget_agenda)

        val serviceIntent = Intent(context, AgendaWidgetService::class.java)
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        serviceIntent.data = Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME))
        views.setRemoteAdapter(R.id.widget_agenda_list, serviceIntent)
        views.setEmptyView(R.id.widget_agenda_list, R.id.widget_agenda_empty)
        views.setPendingIntentTemplate(R.id.widget_agenda_list,
            TasksWidgetProvider.openApp(context, "calendar"))

        if (!compact) {
            views.setTextViewText(R.id.widget_agenda_header,
                context.getString(R.string.widget_agenda_title))

            val count = upcomingLabel(context)
            views.setTextViewText(R.id.widget_agenda_count, count)
            views.setViewVisibility(R.id.widget_agenda_count,
                if (count.isEmpty()) View.GONE else View.VISIBLE)

            views.setOnClickPendingIntent(R.id.widget_agenda_header,
                TasksWidgetProvider.openApp(context, "calendar"))
            views.setOnClickPendingIntent(R.id.widget_agenda_add,
                TasksWidgetProvider.openApp(context, "calendar"))
        }
        return views
    }

    private fun upcomingLabel(context: Context): String {
        val projection = WidgetStore.getProjection(context)
        val agenda = projection?.optJSONArray("agenda")
        if (agenda == null || agenda.length() == 0) return ""

        var total = 0
        for (i in 0 until agenda.length()) {
            val day = agenda.optJSONObject(i) ?: continue
            val entries = day.optJSONArray("entries")
            if (entries != null) total += entries.length()
        }
        return if (total == 0) "" else total.toString()
    }
}
