package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService

import org.json.JSONArray
import org.json.JSONObject

import io.github.f4rsantos.organizer.R

class TasksWidgetService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        TasksFactory(applicationContext)

    class Row(
        val header: Boolean,
        val label: String,
        val groupName: String,
        val task: JSONObject?
    )

    class TasksFactory(private val context: Context) : RemoteViewsFactory {

        private var rows: List<Row> = ArrayList()
        private var pending = JSONObject()
        private var dayKey = ""
        private var classProgress = JSONArray()

        override fun onCreate() {}

        override fun onDataSetChanged() {
            val projection = WidgetStore.getProjection(context)
            val tasks = projection?.optJSONArray("tasks")
            dayKey = projection?.optString("dayKey", "") ?: ""
            pending = WidgetStore.getPending(context)

            val progress = projection?.optJSONObject("progress")
            classProgress = progress?.optJSONArray("classes") ?: JSONArray()

            val next = ArrayList<Row>()
            var currentGroup: String? = null
            for (i in 0 until (tasks?.length() ?: 0)) {
                val task = tasks?.optJSONObject(i) ?: continue

                val group = task.optString("className", "")
                if (currentGroup == null || currentGroup != group) {
                    currentGroup = group
                    next.add(Row(true,
                        if (group.isEmpty()) context.getString(R.string.widget_group_other) else group,
                        group, null))
                }
                next.add(Row(false, "", "", task))
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
                val header = RemoteViews(context.packageName, R.layout.widget_task_group)
                header.setTextViewText(R.id.task_group_label, row.label)
                renderGroupRing(header, row.groupName)
                return header
            }

            val task = row.task
            val view = RemoteViews(context.packageName, R.layout.widget_task_row)
            if (task == null) return view

            val id = task.optString("id")
            val overdue = task.optBoolean("overdue")
            val done = pending.optBoolean(id, false)
            val dueLabel = WidgetFormat.dueLabel(context, task.optString("dueDate", ""), dayKey)

            view.setTextViewText(R.id.task_title, task.optString("title"))
            view.setTextViewText(R.id.task_due, dueLabel)
            view.setViewVisibility(R.id.task_due, if (dueLabel.isEmpty()) View.GONE else View.VISIBLE)
            view.setTextColor(R.id.task_due, context.getColor(
                if (overdue && !done) R.color.widget_overdue else R.color.widget_muted))

            view.setImageViewResource(R.id.task_check,
                if (done) R.drawable.ic_widget_check_done else R.drawable.ic_widget_check)
            view.setInt(R.id.task_title, "setPaintFlags",
                if (done) Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG
                else Paint.ANTI_ALIAS_FLAG)
            view.setTextColor(R.id.task_title,
                context.getColor(if (done) R.color.widget_done else R.color.widget_foreground))

            val fill = Intent()
            fill.putExtra(TasksWidgetProvider.EXTRA_TASK_ID, id)
            fill.putExtra(TasksWidgetProvider.EXTRA_DONE, !done)
            view.setOnClickFillInIntent(R.id.task_row, fill)
            return view
        }

        private fun pendingDoneIn(groupName: String): Int {
            var delta = 0
            for (row in rows) {
                if (row.header || row.task == null) continue
                if (row.task.optString("className", "") != groupName) continue
                val id = row.task.optString("id")
                if (pending.has(id) && pending.optBoolean(id, false)) delta += 1
            }
            return delta
        }

        private fun renderGroupRing(header: RemoteViews, groupName: String) {
            for (i in 0 until classProgress.length()) {
                val cls = classProgress.optJSONObject(i) ?: continue
                if (cls.optString("name", "") != groupName) continue

                val total = cls.optInt("total", 0)
                if (total == 0) break

                val done = Math.min(total, cls.optInt("done", 0) + pendingDoneIn(groupName))
                val accent = context.getColor(R.color.widget_accent)
                header.setImageViewBitmap(R.id.task_group_ring, ProgressRing.render(context, 11,
                    done / total.toFloat(),
                    WidgetFormat.parseColor(cls.optString("color", ""), accent)))
                header.setViewVisibility(R.id.task_group_ring, View.VISIBLE)
                return
            }
            header.setViewVisibility(R.id.task_group_ring, View.GONE)
        }

        override fun getLoadingView(): RemoteViews? = null

        override fun getViewTypeCount(): Int = 2

        override fun getItemId(position: Int): Long = position.toLong()

        override fun hasStableIds(): Boolean = false
    }
}
