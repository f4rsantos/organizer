package io.github.f4rsantos.organizer.focus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import io.github.f4rsantos.organizer.MainActivity
import kotlin.math.abs

class FocusOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var labelView: TextView? = null
    private var toggleButton: ImageButton? = null
    private var running = false
    private var isBreak = false

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
        if (label != null) labelView?.text = label
        toggleButton?.setImageResource(
            if (isBreak) android.R.drawable.ic_lock_idle_alarm
            else if (running) android.R.drawable.ic_media_pause
            else android.R.drawable.ic_media_play
        )
        toggleButton?.visibility = if (isBreak) View.GONE else View.VISIBLE
    }

    private fun addOverlay() {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#F0202020"))
            setPadding(28, 20, 20, 20)
            gravity = Gravity.CENTER_VERTICAL
        }

        val label = TextView(this).apply {
            text = "--:--"
            setTextColor(Color.WHITE)
            textSize = 14f
        }
        labelView = label

        val toggle = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_media_pause)
            setBackgroundColor(Color.TRANSPARENT)
            setColorFilter(Color.WHITE)
            setOnClickListener { sendAction(ACTION_TOGGLE) }
        }
        toggleButton = toggle

        val reset = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_menu_revert)
            setBackgroundColor(Color.TRANSPARENT)
            setColorFilter(Color.WHITE)
            setOnClickListener { sendAction(ACTION_RESET) }
        }

        container.addView(label)
        container.addView(toggle)
        container.addView(reset)

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
        params.x = 24
        params.y = 120

        attachDrag(container, params, wm)

        overlayView = container
        wm.addView(container, params)
    }

    private fun attachDrag(view: View, params: WindowManager.LayoutParams, wm: WindowManager) {
        var startX = 0
        var startY = 0
        var touchX = 0f
        var touchY = 0f
        var moved = false

        view.setOnTouchListener { v, event ->
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
                    if (abs(dx) > 8 || abs(dy) > 8) moved = true
                    params.x = startX + dx
                    params.y = startY + dy
                    wm.updateViewLayout(view, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved && v === view) openApp()
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
        const val EXTRA_CONTROL_ACTION = "controlAction"
        const val EXTRA_LABEL = "label"
        const val EXTRA_RUNNING = "running"
        const val EXTRA_BREAK = "isBreak"
        private const val CHANNEL_ID = "focus_overlay"
        private const val NOTIFICATION_ID = 4821
    }
}
