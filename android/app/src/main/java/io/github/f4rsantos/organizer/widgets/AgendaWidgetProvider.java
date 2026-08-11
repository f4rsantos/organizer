package io.github.f4rsantos.organizer.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class AgendaWidgetProvider extends AppWidgetProvider {

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

    private RemoteViews buildViews(Context context, int widgetId, boolean compact) {
        RemoteViews views = new RemoteViews(context.getPackageName(),
                compact ? R.layout.widget_agenda_compact : R.layout.widget_agenda);

        Intent serviceIntent = new Intent(context, AgendaWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_agenda_list, serviceIntent);
        views.setEmptyView(R.id.widget_agenda_list, R.id.widget_agenda_empty);
        views.setPendingIntentTemplate(R.id.widget_agenda_list,
                TasksWidgetProvider.openApp(context, "calendar"));

        if (!compact) {
            views.setTextViewText(R.id.widget_agenda_header, context.getString(R.string.widget_agenda_title));

            String count = upcomingLabel(context);
            views.setTextViewText(R.id.widget_agenda_count, count);
            views.setViewVisibility(R.id.widget_agenda_count, count.isEmpty() ? View.GONE : View.VISIBLE);

            views.setOnClickPendingIntent(R.id.widget_agenda_header,
                    TasksWidgetProvider.openApp(context, "calendar"));
            views.setOnClickPendingIntent(R.id.widget_agenda_add,
                    TasksWidgetProvider.openApp(context, "calendar"));
        }
        return views;
    }

    private String upcomingLabel(Context context) {
        JSONObject projection = WidgetStore.getProjection(context);
        JSONArray agenda = projection == null ? null : projection.optJSONArray("agenda");
        if (agenda == null || agenda.length() == 0) return "";

        int total = 0;
        for (int i = 0; i < agenda.length(); i++) {
            JSONObject day = agenda.optJSONObject(i);
            if (day == null) continue;
            JSONArray entries = day.optJSONArray("entries");
            if (entries != null) total += entries.length();
        }
        return total == 0 ? "" : String.valueOf(total);
    }
}
