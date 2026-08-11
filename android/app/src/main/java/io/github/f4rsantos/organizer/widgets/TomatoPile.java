package io.github.f4rsantos.organizer.widgets;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.TypedValue;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Random;

public final class TomatoPile {

    private static final int BODY = 0xFFE23B3B;
    private static final int BODY_FADED = 0x59A08A8A;
    private static final int LEAF = 0xFF3E9B4F;
    private static final int LEAF_FADED = 0x598AA08E;

    private TomatoPile() {}

    public static Bitmap render(Context context, JSONArray tomatoes, int widthDp, int heightDp) {
        int width = dp(context, widthDp);
        int height = dp(context, heightDp);
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        if (tomatoes == null || tomatoes.length() == 0) return bitmap;

        float radius = dp(context, 11);
        float floor = height - radius - dp(context, 1);
        float usable = Math.max(radius * 2, width - radius * 2);
        int perRow = Math.max(1, (int) (usable / (radius * 1.75f)));

        Random random = new Random(tomatoes.length() * 31L);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        for (int i = 0; i < tomatoes.length(); i++) {
            JSONObject tomato = tomatoes.optJSONObject(i);
            boolean faded = tomato != null && tomato.optBoolean("abandoned", false);

            int row = i / perRow;
            int col = i % perRow;
            float jitterX = (random.nextFloat() - 0.5f) * radius * 0.5f;
            float jitterY = (random.nextFloat() - 0.5f) * radius * 0.3f;

            float cx = radius + col * (radius * 1.75f) + jitterX
                    + (row % 2 == 1 ? radius * 0.5f : 0f);
            float cy = floor - row * (radius * 1.55f) + jitterY;
            if (cx > width - radius) cx = width - radius;

            float tilt = (random.nextFloat() - 0.5f) * 22f;
            canvas.save();
            canvas.rotate(tilt, cx, cy);
            drawTomato(canvas, paint, cx, cy, radius, faded);
            canvas.restore();
        }
        return bitmap;
    }

    private static void drawTomato(Canvas canvas, Paint paint, float cx, float cy, float r, boolean faded) {
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(faded ? BODY_FADED : BODY);
        canvas.drawOval(new RectF(cx - r, cy - r * 0.88f, cx + r, cy + r * 0.92f), paint);

        paint.setColor(faded ? LEAF_FADED : LEAF);
        Path leaf = new Path();
        float ly = cy - r * 0.78f;
        leaf.moveTo(cx, ly + r * 0.30f);
        leaf.lineTo(cx - r * 0.55f, ly - r * 0.16f);
        leaf.lineTo(cx - r * 0.16f, ly - r * 0.06f);
        leaf.lineTo(cx, ly - r * 0.46f);
        leaf.lineTo(cx + r * 0.16f, ly - r * 0.06f);
        leaf.lineTo(cx + r * 0.55f, ly - r * 0.16f);
        leaf.close();
        canvas.drawPath(leaf, paint);
    }

    private static int dp(Context context, int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value,
                context.getResources().getDisplayMetrics()));
    }
}
