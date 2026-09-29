package io.github.f4rsantos.organizer.focus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import io.github.f4rsantos.organizer.MainActivity
import io.github.f4rsantos.organizer.R
import kotlin.math.abs
import kotlin.math.roundToInt

class FocusOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var labelView: TextView? = null
    private var ringView: FocusRingView? = null
    private var toggleButton: ImageButton? = null
    private var skipButton: ImageButton? = null
    private var running = false
    private var isBreak = false
    private var progress = 0f

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification())
        addOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let { applyState(it) }
        return START_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        super.onDestroy()
    }

    private fun applyState(intent: Intent) {
        val label = intent.getStringExtra(EXTRA_LABEL)
        running = intent.getBooleanExtra(EXTRA_RUNNING, running)
        isBreak = intent.getBooleanExtra(EXTRA_BREAK, isBreak)
        progress = intent.getFloatExtra(EXTRA_PROGRESS, progress)
        if (label != null) labelView?.text = label
        labelView?.setTextColor(color(if (isBreak) R.color.overlay_break else R.color.widget_foreground))
        ringView?.setState(progress, isBreak)
        toggleButton?.setImageResource(if (running) R.drawable.ic_overlay_pause else R.drawable.ic_overlay_play)
        toggleButton?.visibility = if (isBreak) View.GONE else View.VISIBLE
        skipButton?.visibility = if (isBreak) View.VISIBLE else View.GONE
    }

    private fun addOverlay() {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val ring = FocusRingView(this)
        ringView = ring

        val label = TextView(this).apply {
            text = PLACEHOLDER_LABEL
            setTextColor(color(R.color.widget_foreground))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, LABEL_SP)
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            fontFeatureSettings = "tnum"
        }
        labelView = label

        val toggle = controlButton(R.drawable.ic_overlay_pause, ACTION_TOGGLE)
        toggleButton = toggle
        val skip = controlButton(R.drawable.ic_overlay_skip, ACTION_SKIP).apply { visibility = View.GONE }
        skipButton = skip
        val reset = controlButton(R.drawable.ic_overlay_reset, ACTION_RESET)

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = ContextCompat.getDrawable(this@FocusOverlayService, R.drawable.overlay_card)
            elevation = dp(CARD_ELEVATION_DP).toFloat()
            setPadding(dp(CARD_PADDING_START_DP), dp(CARD_PADDING_VERTICAL_DP), dp(CARD_PADDING_END_DP), dp(CARD_PADDING_VERTICAL_DP))
        }
        card.addView(ring, LinearLayout.LayoutParams(dp(RING_DP), dp(RING_DP)))
        card.addView(label, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            marginStart = dp(LABEL_MARGIN_START_DP)
            marginEnd = dp(LABEL_MARGIN_END_DP)
        })
        listOf(toggle, skip, reset).forEachIndexed { index, button ->
            card.addView(button, LinearLayout.LayoutParams(dp(BUTTON_DP), dp(BUTTON_DP)).apply {
                if (index > 0) marginStart = dp(BUTTON_GAP_DP)
            })
        }

        val root = FrameLayout(this).apply {
            clipToPadding = false
            clipChildren = false
            setPadding(dp(SHADOW_ROOM_DP), dp(SHADOW_ROOM_DP), dp(SHADOW_ROOM_DP), dp(SHADOW_ROOM_DP))
            addView(card)
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = dp(INITIAL_X_DP)
        params.y = dp(INITIAL_Y_DP)

        attachDrag(card, root, params, wm)

        overlayView = root
        wm.addView(root, params)
    }

    private fun controlButton(iconRes: Int, action: String): ImageButton {
        return ImageButton(this).apply {
            setImageResource(iconRes)
            background = ContextCompat.getDrawable(this@FocusOverlayService, R.drawable.overlay_button)
            scaleType = ImageView.ScaleType.CENTER
            contentDescription = action
            setOnClickListener { sendAction(action) }
        }
    }

    private fun color(res: Int): Int = ContextCompat.getColor(this, res)

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

    private fun attachDrag(handle: View, window: View, params: WindowManager.LayoutParams, wm: WindowManager) {
        var startX = 0
        var startY = 0
        var touchX = 0f
        var touchY = 0f
        var moved = false

        handle.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = params.x
                    startY = params.y
                    touchX = event.rawX
                    touchY = event.rawY
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchX).toInt()
                    val dy = (event.rawY - touchY).toInt()
                    if (abs(dx) > dp(DRAG_SLOP_DP) || abs(dy) > dp(DRAG_SLOP_DP)) moved = true
                    params.x = startX + dx
                    params.y = startY + dy
                    wm.updateViewLayout(window, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) openApp()
                    true
                }
                else -> false
            }
        }
    }

    private fun openApp() {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            putExtra("tab", "focus")
        }
        startActivity(intent)
    }

    private fun sendAction(action: String) {
        val intent = Intent(ACTION_OVERLAY_CONTROL).apply {
            setPackage(packageName)
            putExtra(EXTRA_CONTROL_ACTION, action)
        }
        sendBroadcast(intent)
    }

    private fun removeOverlay() {
        overlayView?.let { view ->
            runCatching { windowManager?.removeView(view) }
        }
        overlayView = null
    }

    private fun buildNotification(): Notification {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Focus overlay", NotificationManager.IMPORTANCE_MIN
            )
            manager.createNotificationChannel(channel)
        }
        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Focus timer running")
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    companion object {
        const val ACTION_OVERLAY_CONTROL = "io.github.f4rsantos.organizer.focus.OVERLAY_CONTROL"
        const val ACTION_TOGGLE = "toggle"
        const val ACTION_RESET = "reset"
        const val ACTION_SKIP = "skip"
        const val EXTRA_CONTROL_ACTION = "controlAction"
        const val EXTRA_LABEL = "label"
        const val EXTRA_RUNNING = "running"
        const val EXTRA_BREAK = "isBreak"
        const val EXTRA_PROGRESS = "progress"
        private const val CHANNEL_ID = "focus_overlay"
        private const val NOTIFICATION_ID = 4821
        private const val PLACEHOLDER_LABEL = "--:--"
        private const val LABEL_SP = 20f
        private const val RING_DP = 36
        private const val BUTTON_DP = 36
        private const val BUTTON_GAP_DP = 4
        private const val LABEL_MARGIN_START_DP = 12
        private const val LABEL_MARGIN_END_DP = 10
        private const val CARD_PADDING_START_DP = 10
        private const val CARD_PADDING_END_DP = 8
        private const val CARD_PADDING_VERTICAL_DP = 8
        private const val CARD_ELEVATION_DP = 6
        private const val SHADOW_ROOM_DP = 12
        private const val INITIAL_X_DP = 12
        private const val INITIAL_Y_DP = 64
        private const val DRAG_SLOP_DP = 4
    }
}
