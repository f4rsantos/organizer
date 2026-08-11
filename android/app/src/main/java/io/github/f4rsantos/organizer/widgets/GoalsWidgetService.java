package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import io.github.f4rsantos.organizer.R;

public class GoalsWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new GoalsFactory(getApplicationContext());
    }

    static class GoalsFactory implements RemoteViewsFactory {

        private final Context context;
        private JSONArray goals = new JSONArray();
        private JSONObject pending = new JSONObject();

        GoalsFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            JSONObject projection = WidgetStore.getProjection(context);
            goals = projection == null ? new JSONArray() : projection.optJSONArray("goals");
            if (goals == null) goals = new JSONArray();
            pending = WidgetStore.getPending(context);
        }

        @Override
        public void onDestroy() {
            goals = new JSONArray();
        }

        @Override
        public int getCount() {
            return goals.length();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            JSONObject goal = goals.optJSONObject(position);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_goal_row);
            if (goal == null) return row;

            String id = goal.optString("id");
            boolean done = pending.has(id) ? pending.optBoolean(id, false) : goal.optBoolean("done", false);
            int streak = goal.optInt("streak", 0);

            row.setTextViewText(R.id.goal_title, goal.optString("title"));
            row.setImageViewResource(R.id.goal_check,
                    done ? R.drawable.ic_widget_check_done : R.drawable.ic_widget_check);
            row.setInt(R.id.goal_title, "setPaintFlags", done
                    ? Paint.ANTI_ALIAS_FLAG | Paint.STRIKE_THRU_TEXT_FLAG
                    : Paint.ANTI_ALIAS_FLAG);
            row.setTextColor(R.id.goal_title,
                    context.getColor(done ? R.color.widget_done : R.color.widget_foreground));

            row.setTextViewText(R.id.goal_streak, String.valueOf(streak));
            row.setViewVisibility(R.id.goal_streak_wrap, streak > 0 ? View.VISIBLE : View.GONE);

            Intent fill = new Intent();
            fill.putExtra(GoalsWidgetProvider.EXTRA_GOAL_ID, id);
            fill.putExtra(GoalsWidgetProvider.EXTRA_DONE, !done);
            row.setOnClickFillInIntent(R.id.goal_row, fill);
            return row;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            JSONObject goal = goals.optJSONObject(position);
            return goal == null ? position : goal.optString("id", String.valueOf(position)).hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
