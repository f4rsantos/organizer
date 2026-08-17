package io.github.f4rsantos.organizer.widgets

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RadioGroup

import io.github.f4rsantos.organizer.R

class SummaryConfigActivity : Activity() {

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.widget_summary_config)

        val extras = intent?.extras
        if (extras != null) {
            widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID)
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        if (!goalsEnabled()) {
            findViewById<View>(R.id.summary_config_goals).visibility = View.GONE
        }

        val group = findViewById<RadioGroup>(R.id.summary_config_group)
        group.check(radioIdFor(WidgetStore.getSummaryMetric(this, widgetId)))

        findViewById<View>(R.id.summary_config_save).setOnClickListener { save() }
    }

    private fun save() {
        val group = findViewById<RadioGroup>(R.id.summary_config_group)
        WidgetStore.setSummaryMetric(this, widgetId, metricFor(group.checkedRadioButtonId))

        val manager = AppWidgetManager.getInstance(this)
        SummaryWidgetProvider().onUpdate(this, manager, intArrayOf(widgetId))

        val result = Intent()
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        setResult(RESULT_OK, result)
        finish()
    }

    private fun goalsEnabled(): Boolean {
        val projection = WidgetStore.getProjection(this)
        val summary = projection?.optJSONObject("summary")
        return summary != null && summary.optBoolean("goalsEnabled", false)
    }

    private fun radioIdFor(metric: String): Int {
        if (WidgetStore.METRIC_EVENTS == metric) return R.id.summary_config_events
        if (WidgetStore.METRIC_GOALS == metric) return R.id.summary_config_goals
        return R.id.summary_config_tasks
    }

    private fun metricFor(radioId: Int): String {
        if (radioId == R.id.summary_config_events) return WidgetStore.METRIC_EVENTS
        if (radioId == R.id.summary_config_goals) return WidgetStore.METRIC_GOALS
        return WidgetStore.METRIC_TASKS
    }
}
