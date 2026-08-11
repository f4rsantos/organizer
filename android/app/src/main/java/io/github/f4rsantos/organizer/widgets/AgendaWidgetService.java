package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import io.github.f4rsantos.organizer.R;

public class AgendaWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new AgendaFactory(getApplicationContext());
    }

    static class Row {
        final boolean header;
        final String label;
        final String time;
        final String title;

        Row(boolean header, String label, String time, String title) {
            this.header = header;
            this.label = label;
            this.time = time;
            this.title = title;
        }
    }

    static class AgendaFactory implements RemoteViewsFactory {

        private final Context context;
        private List<Row> rows = new ArrayList<>();

        AgendaFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            List<Row> next = new ArrayList<>();
            JSONObject projection = WidgetStore.getProjection(context);
            JSONArray agenda = projection == null ? null : projection.optJSONArray("agenda");
            if (agenda != null) {
                for (int i = 0; i < agenda.length(); i++) {
                    JSONObject day = agenda.optJSONObject(i);
                    if (day == null) continue;
                    String label = WidgetFormat.dayLabel(context, day.optString("dayKey"), day.optInt("offset", -1));
                    next.add(new Row(true, label, "", ""));

                    JSONArray entries = day.optJSONArray("entries");
                    if (entries == null) continue;
                    for (int j = 0; j < entries.length(); j++) {
                        JSONObject entry = entries.optJSONObject(j);
                        if (entry == null) continue;
                        String time = entry.optBoolean("allDay", false)
                                ? context.getString(R.string.widget_all_day)
                                : entry.optString("time", "");
                        next.add(new Row(false, "", time, entry.optString("title", "")));
                    }
                }
            }
            rows = next;
        }

        @Override
        public void onDestroy() {
            rows = new ArrayList<>();
        }

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            Row row = rows.get(position);
            if (row.header) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_agenda_header);
                views.setTextViewText(R.id.agenda_day_label, row.label);
                return views;
            }

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_agenda_row);
            views.setTextViewText(R.id.agenda_title, row.title);
            views.setTextViewText(R.id.agenda_time, row.time);
            views.setViewVisibility(R.id.agenda_time, row.time.isEmpty() ? View.GONE : View.VISIBLE);

            Intent fill = new Intent();
            views.setOnClickFillInIntent(R.id.agenda_title, fill);
            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 2;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }
    }
}
