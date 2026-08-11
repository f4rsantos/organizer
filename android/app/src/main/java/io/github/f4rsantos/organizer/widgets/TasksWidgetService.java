package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import io.github.f4rsantos.organizer.R;

public class TasksWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TasksFactory(getApplicationContext());
    }

    static class Row {
        final boolean header;
        final String label;
        final String groupName;
        final JSONObject task;

        Row(boolean header, String label, String groupName, JSONObject task) {
            this.header = header;
            this.label = label;
            this.groupName = groupName;
            this.task = task;
        }
    }

    static class TasksFactory implements RemoteViewsFactory {

        private final Context context;
        private List<Row> rows = new ArrayList<>();
        private JSONObject pending = new JSONObject();
        private String dayKey = "";
        private JSONArray classProgress = new JSONArray();

        TasksFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            JSONObject projection = WidgetStore.getProjection(context);
            JSONArray tasks = projection == null ? null : projection.optJSONArray("tasks");
            dayKey = projection == null ? "" : projection.optString("dayKey", "");
            pending = WidgetStore.getPending(context);

            JSONObject progress = projection == null ? null : projection.optJSONObject("progress");
            JSONArray classes = progress == null ? null : progress.optJSONArray("classes");
            classProgress = classes == null ? new JSONArray() : classes;

            List<Row> next = new ArrayList<>();
            String currentGroup = null;
            for (int i = 0; tasks != null && i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task == null) continue;

                String group = task.optString("className", "");
                if (currentGroup == null || !currentGroup.equals(group)) {
                    currentGroup = group;
                    next.add(new Row(true, group.isEmpty()
                            ? context.getString(R.string.widget_group_other)
                            : group, group, null));
                }
                next.add(new Row(false, "", "", task));
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
                RemoteViews header = new RemoteViews(context.getPackageName(), R.layout.widget_task_group);
                header.setTextViewText(R.id.task_group_label, row.label);
                renderGroupRing(header, row.groupName);
                return header;
            }

            JSONObject task = row.task;
            RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.widget_task_row);

            String id = task.optString("id");
            boolean overdue = task.optBoolean("overdue");
            boolean done = pending.optBoolean(id, false);
            String dueLabel = WidgetFormat.dueLabel(context, task.optString("dueDate", ""), dayKey);

            view.setTextViewText(R.id.task_title, task.optString("title"));
            view.setTextViewText(R.id.task_due, dueLabel);
            view.setViewVisibility(R.id.task_due, dueLabel.isEmpty() ? View.GONE : View.VISIBLE);
            view.setTextColor(R.id.task_due, context.getColor(
                    overdue && !done ? R.color.widget_overdue : R.color.widget_muted));

            view.setImageViewResource(R.id.task_check,
                    done ? R.drawable.ic_widget_check_done : R.drawable.ic_widget_check);
            view.setInt(R.id.task_title, "setPaintFlags", done
                    ? Paint.ANTI_ALIAS_FLAG | Paint.STRIKE_THRU_TEXT_FLAG
                    : Paint.ANTI_ALIAS_FLAG);
            view.setTextColor(R.id.task_title,
                    context.getColor(done ? R.color.widget_done : R.color.widget_foreground));

            Intent fill = new Intent();
            fill.putExtra(TasksWidgetProvider.EXTRA_TASK_ID, id);
            fill.putExtra(TasksWidgetProvider.EXTRA_DONE, !done);
            view.setOnClickFillInIntent(R.id.task_row, fill);
            return view;
        }

        private int pendingDoneIn(String groupName) {
            int delta = 0;
            for (Row row : rows) {
                if (row.header || row.task == null) continue;
                if (!row.task.optString("className", "").equals(groupName)) continue;
                String id = row.task.optString("id");
                if (pending.has(id) && pending.optBoolean(id, false)) delta += 1;
            }
            return delta;
        }

        private void renderGroupRing(RemoteViews header, String groupName) {
            for (int i = 0; i < classProgress.length(); i++) {
                JSONObject cls = classProgress.optJSONObject(i);
                if (cls == null) continue;
                if (!cls.optString("name", "").equals(groupName)) continue;

                int total = cls.optInt("total", 0);
                if (total == 0) break;

                int done = Math.min(total, cls.optInt("done", 0) + pendingDoneIn(groupName));
                int accent = context.getColor(R.color.widget_accent);
                header.setImageViewBitmap(R.id.task_group_ring, ProgressRing.render(context, 11,
                        done / (float) total,
                        WidgetFormat.parseColor(cls.optString("color", ""), accent)));
                header.setViewVisibility(R.id.task_group_ring, View.VISIBLE);
                return;
            }
            header.setViewVisibility(R.id.task_group_ring, View.GONE);
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
