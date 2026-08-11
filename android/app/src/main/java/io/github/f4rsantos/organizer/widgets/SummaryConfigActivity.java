package io.github.f4rsantos.organizer.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RadioGroup;

import io.github.f4rsantos.organizer.R;

public class SummaryConfigActivity extends Activity {

    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);
        setContentView(R.layout.widget_summary_config);

        Intent intent = getIntent();
        Bundle extras = intent == null ? null : intent.getExtras();
        if (extras != null) {
            widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        if (!goalsEnabled()) {
            findViewById(R.id.summary_config_goals).setVisibility(View.GONE);
        }

        RadioGroup group = findViewById(R.id.summary_config_group);
        group.check(radioIdFor(WidgetStore.getSummaryMetric(this, widgetId)));

        findViewById(R.id.summary_config_save).setOnClickListener(this::save);
    }

    private void save(View unused) {
        RadioGroup group = findViewById(R.id.summary_config_group);
        WidgetStore.setSummaryMetric(this, widgetId, metricFor(group.getCheckedRadioButtonId()));

        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        new SummaryWidgetProvider().onUpdate(this, manager, new int[] { widgetId });

        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        setResult(RESULT_OK, result);
        finish();
    }

    private boolean goalsEnabled() {
        org.json.JSONObject projection = WidgetStore.getProjection(this);
        org.json.JSONObject summary = projection == null ? null : projection.optJSONObject("summary");
        return summary != null && summary.optBoolean("goalsEnabled", false);
    }

    private int radioIdFor(String metric) {
        if (WidgetStore.METRIC_EVENTS.equals(metric)) return R.id.summary_config_events;
        if (WidgetStore.METRIC_GOALS.equals(metric)) return R.id.summary_config_goals;
        return R.id.summary_config_tasks;
    }

    private String metricFor(int radioId) {
        if (radioId == R.id.summary_config_events) return WidgetStore.METRIC_EVENTS;
        if (radioId == R.id.summary_config_goals) return WidgetStore.METRIC_GOALS;
        return WidgetStore.METRIC_TASKS;
    }
}
