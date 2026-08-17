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

class GoalsWidgetService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        GoalsFactory(applicationContext)

    class GoalsFactory(private val context: Context) : RemoteViewsFactory {

        private var goals = JSONArray()
        private var pending = JSONObject()

        override fun onCreate() {}

        override fun onDataSetChanged() {
            val projection = WidgetStore.getProjection(context)
            goals = projection?.optJSONArray("goals") ?: JSONArray()
            pending = WidgetStore.getPending(context)
        }

        override fun onDestroy() {
            goals = JSONArray()
        }

        override fun getCount(): Int = goals.length()

        override fun getViewAt(position: Int): RemoteViews {
            val row = RemoteViews(context.packageName, R.layout.widget_goal_row)
            val goal = goals.optJSONObject(position) ?: return row

            val id = goal.optString("id")
            val done = if (pending.has(id)) pending.optBoolean(id, false)
                else goal.optBoolean("done", false)
            val streak = goal.optInt("streak", 0)

            row.setTextViewText(R.id.goal_title, goal.optString("title"))
            row.setImageViewResource(R.id.goal_check,
                if (done) R.drawable.ic_widget_check_done else R.drawable.ic_widget_check)
            row.setInt(R.id.goal_title, "setPaintFlags",
                if (done) Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG
                else Paint.ANTI_ALIAS_FLAG)
            row.setTextColor(R.id.goal_title,
                context.getColor(if (done) R.color.widget_done else R.color.widget_foreground))

            row.setTextViewText(R.id.goal_streak, streak.toString())
            row.setViewVisibility(R.id.goal_streak_wrap, if (streak > 0) View.VISIBLE else View.GONE)

            val fill = Intent()
            fill.putExtra(GoalsWidgetProvider.EXTRA_GOAL_ID, id)
            fill.putExtra(GoalsWidgetProvider.EXTRA_DONE, !done)
            row.setOnClickFillInIntent(R.id.goal_row, fill)
            return row
        }

        override fun getLoadingView(): RemoteViews? = null

        override fun getViewTypeCount(): Int = 1

        override fun getItemId(position: Int): Long {
            val goal = goals.optJSONObject(position) ?: return position.toLong()
            return goal.optString("id", position.toString()).hashCode().toLong()
        }

        override fun hasStableIds(): Boolean = true
    }
}
