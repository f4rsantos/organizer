package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService

import io.github.f4rsantos.organizer.R

class AgendaWidgetService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        AgendaFactory(applicationContext)

    class Row(
        val header: Boolean,
        val label: String,
        val time: String,
        val title: String
    )

    class AgendaFactory(private val context: Context) : RemoteViewsFactory {

        private var rows: List<Row> = ArrayList()

        override fun onCreate() {}

        override fun onDataSetChanged() {
            val next = ArrayList<Row>()
            val projection = WidgetStore.getProjection(context)
            val agenda = projection?.optJSONArray("agenda")
            for (i in 0 until (agenda?.length() ?: 0)) {
                val day = agenda?.optJSONObject(i) ?: continue
                val label = WidgetFormat.dayLabel(context, day.optString("dayKey"),
                    day.optInt("offset", -1))
                next.add(Row(true, label, "", ""))

                val entries = day.optJSONArray("entries") ?: continue
                for (j in 0 until entries.length()) {
                    val entry = entries.optJSONObject(j) ?: continue
                    val time = if (entry.optBoolean("allDay", false))
                        context.getString(R.string.widget_all_day)
                    else entry.optString("time", "")
                    next.add(Row(false, "", time, entry.optString("title", "")))
                }
            }
            rows = next
        }

        override fun onDestroy() {
            rows = ArrayList()
        }

        override fun getCount(): Int = rows.size

        override fun getViewAt(position: Int): RemoteViews {
            val row = rows[position]
            if (row.header) {
                val views = RemoteViews(context.packageName, R.layout.widget_agenda_header)
                views.setTextViewText(R.id.agenda_day_label, row.label)
                return views
            }

            val views = RemoteViews(context.packageName, R.layout.widget_agenda_row)
            views.setTextViewText(R.id.agenda_title, row.title)
            views.setTextViewText(R.id.agenda_time, row.time)
            views.setViewVisibility(R.id.agenda_time, if (row.time.isEmpty()) View.GONE else View.VISIBLE)

            views.setOnClickFillInIntent(R.id.agenda_title, Intent())
            return views
        }

        override fun getLoadingView(): RemoteViews? = null

        override fun getViewTypeCount(): Int = 2

        override fun getItemId(position: Int): Long = position.toLong()

        override fun hasStableIds(): Boolean = false
    }
}
