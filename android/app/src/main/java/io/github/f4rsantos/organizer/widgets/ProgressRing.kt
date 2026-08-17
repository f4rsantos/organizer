package io.github.f4rsantos.organizer.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.TypedValue

import io.github.f4rsantos.organizer.R

object ProgressRing {

    fun render(context: Context, sizeDp: Int, pct: Float, accent: Int): Bitmap {
        val size = dp(context, sizeDp)
        val stroke = size * 0.14f
        val inset = stroke / 2f

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = stroke
        paint.strokeCap = Paint.Cap.ROUND

        val bounds = RectF(inset, inset, size - inset, size - inset)

        paint.color = context.getColor(R.color.widget_ring_track)
        canvas.drawOval(bounds, paint)

        val clamped = pct.coerceIn(0f, 1f)
        if (clamped > 0f) {
            paint.color = if (clamped >= 1f) context.getColor(R.color.widget_ring_done) else accent
            canvas.drawArc(bounds, -90f, 360f * clamped, false, paint)
        }
        return bitmap
    }

    private fun dp(context: Context, value: Int): Int =
        Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(),
            context.resources.displayMetrics))
}
