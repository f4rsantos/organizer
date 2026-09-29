package io.github.f4rsantos.organizer.focus

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.view.View
import androidx.core.content.ContextCompat
import io.github.f4rsantos.organizer.R

class FocusRingView(context: Context) : View(context) {

    private val strokeWidthPx = resources.displayMetrics.density * STROKE_DP
    private val bounds = RectF()

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthPx
        color = ContextCompat.getColor(context, R.color.widget_ring_track)
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthPx
        strokeCap = Paint.Cap.ROUND
    }

    private var progress = 0f
    private var isBreak = false

    fun setState(progress: Float, isBreak: Boolean) {
        val clamped = progress.coerceIn(0f, 1f)
        if (clamped == this.progress && isBreak == this.isBreak) return
        val phaseChanged = isBreak != this.isBreak
        this.progress = clamped
        this.isBreak = isBreak
        if (phaseChanged) applyProgressColor()
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val inset = strokeWidthPx / 2
        bounds.set(inset, inset, w - inset, h - inset)
        applyProgressColor()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawOval(bounds, trackPaint)
        if (progress <= 0f) return
        canvas.drawArc(bounds, START_ANGLE, FULL_SWEEP * progress, false, progressPaint)
    }

    private fun applyProgressColor() {
        if (isBreak) {
            progressPaint.shader = null
            progressPaint.color = ContextCompat.getColor(context, R.color.overlay_break)
            return
        }
        progressPaint.shader = LinearGradient(
            0f, 0f, width.toFloat(), height.toFloat(),
            ContextCompat.getColor(context, R.color.overlay_focus_start),
            ContextCompat.getColor(context, R.color.overlay_focus_end),
            Shader.TileMode.CLAMP
        )
    }

    companion object {
        private const val STROKE_DP = 4f
        private const val START_ANGLE = -90f
        private const val FULL_SWEEP = 360f
    }
}
