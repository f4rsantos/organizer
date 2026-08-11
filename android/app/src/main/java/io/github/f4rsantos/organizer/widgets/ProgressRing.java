package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.TypedValue;

import io.github.f4rsantos.organizer.R;

public final class ProgressRing {

    private ProgressRing() {}

    public static Bitmap render(Context context, int sizeDp, float pct, int accent) {
        int size = dp(context, sizeDp);
        float stroke = size * 0.14f;
        float inset = stroke / 2f;

        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(stroke);
        paint.setStrokeCap(Paint.Cap.ROUND);

        RectF bounds = new RectF(inset, inset, size - inset, size - inset);

        paint.setColor(context.getColor(R.color.widget_ring_track));
        canvas.drawOval(bounds, paint);

        float clamped = Math.max(0f, Math.min(1f, pct));
        if (clamped > 0f) {
            paint.setColor(clamped >= 1f ? context.getColor(R.color.widget_ring_done) : accent);
            canvas.drawArc(bounds, -90f, 360f * clamped, false, paint);
        }
        return bitmap;
    }

    private static int dp(Context context, int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value,
                context.getResources().getDisplayMetrics()));
    }
}
