package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.TypedValue

import org.json.JSONArray

import java.util.Random

object TomatoPile {

    private const val BODY = 0xFFE23B3B.toInt()
    private const val BODY_FADED = 0x59A08A8A
    private const val LEAF = 0xFF3E9B4F.toInt()
    private const val LEAF_FADED = 0x598AA08E

    fun render(context: Context, tomatoes: JSONArray?, widthDp: Int, heightDp: Int): Bitmap {
        val width = dp(context, widthDp)
        val height = dp(context, heightDp)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        if (tomatoes == null || tomatoes.length() == 0) return bitmap

        val radius = dp(context, 11).toFloat()
        val floor = height - radius - dp(context, 1)
        val usable = Math.max(radius * 2, width - radius * 2)
        val perRow = Math.max(1, (usable / (radius * 1.75f)).toInt())

        val random = Random(tomatoes.length() * 31L)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        for (i in 0 until tomatoes.length()) {
            val tomato = tomatoes.optJSONObject(i)
            val faded = tomato != null && tomato.optBoolean("abandoned", false)

            val row = i / perRow
            val col = i % perRow
            val jitterX = (random.nextFloat() - 0.5f) * radius * 0.5f
            val jitterY = (random.nextFloat() - 0.5f) * radius * 0.3f

            var cx = radius + col * (radius * 1.75f) + jitterX +
                if (row % 2 == 1) radius * 0.5f else 0f
            val cy = floor - row * (radius * 1.55f) + jitterY
            if (cx > width - radius) cx = width - radius

            val tilt = (random.nextFloat() - 0.5f) * 22f
            canvas.save()
            canvas.rotate(tilt, cx, cy)
            drawTomato(canvas, paint, cx, cy, radius, faded)
            canvas.restore()
        }
        return bitmap
    }

    private fun drawTomato(canvas: Canvas, paint: Paint, cx: Float, cy: Float, r: Float, faded: Boolean) {
        paint.style = Paint.Style.FILL
        paint.color = if (faded) BODY_FADED else BODY
        canvas.drawOval(RectF(cx - r, cy - r * 0.88f, cx + r, cy + r * 0.92f), paint)

        paint.color = if (faded) LEAF_FADED else LEAF
        val leaf = Path()
        val ly = cy - r * 0.78f
        leaf.moveTo(cx, ly + r * 0.30f)
        leaf.lineTo(cx - r * 0.55f, ly - r * 0.16f)
        leaf.lineTo(cx - r * 0.16f, ly - r * 0.06f)
        leaf.lineTo(cx, ly - r * 0.46f)
        leaf.lineTo(cx + r * 0.16f, ly - r * 0.06f)
        leaf.lineTo(cx + r * 0.55f, ly - r * 0.16f)
        leaf.close()
        canvas.drawPath(leaf, paint)
    }

    private fun dp(context: Context, value: Int): Int =
        Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(),
            context.resources.displayMetrics))
}
