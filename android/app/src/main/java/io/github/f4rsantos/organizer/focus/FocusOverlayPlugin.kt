package io.github.f4rsantos.organizer.focus

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "FocusOverlay")
class FocusOverlayPlugin : Plugin() {

    private var controlReceiver: BroadcastReceiver? = null

    override fun load() {
        super.load()
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                val action = intent?.getStringExtra(FocusOverlayService.EXTRA_CONTROL_ACTION) ?: return
                val result = JSObject()
                result.put("action", action)
                notifyListeners("overlayControl", result)
            }
        }
        controlReceiver = receiver
        val filter = IntentFilter(FocusOverlayService.ACTION_OVERLAY_CONTROL)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
    }

    override fun handleOnDestroy() {
        controlReceiver?.let { runCatching { context.unregisterReceiver(it) } }
        super.handleOnDestroy()
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val result = JSObject()
        result.put("granted", canDrawOverlays())
        call.resolve(result)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (canDrawOverlays()) {
            val result = JSObject()
            result.put("granted", true)
            call.resolve(result)
            return
        }
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName)
        )
        saveCall(call)
        startActivityForResult(call, intent, "overlayPermissionResult")
    }

    @com.getcapacitor.annotation.ActivityCallback
    private fun overlayPermissionResult(call: PluginCall?, result: androidx.activity.result.ActivityResult?) {
        val savedCall = call ?: return
        val response = JSObject()
        response.put("granted", canDrawOverlays())
        savedCall.resolve(response)
    }

    @PluginMethod
    fun show(call: PluginCall) {
        if (!canDrawOverlays()) {
            call.reject("overlay permission not granted")
            return
        }
        val intent = Intent(context, FocusOverlayService::class.java).apply {
            putExtra(FocusOverlayService.EXTRA_LABEL, call.getString("label", "--:--"))
            putExtra(FocusOverlayService.EXTRA_RUNNING, call.getBoolean("running", false))
            putExtra(FocusOverlayService.EXTRA_BREAK, call.getBoolean("isBreak", false))
        }
        context.startForegroundService(intent)
        call.resolve()
    }

    @PluginMethod
    fun update(call: PluginCall) {
        val intent = Intent(context, FocusOverlayService::class.java).apply {
            putExtra(FocusOverlayService.EXTRA_LABEL, call.getString("label", "--:--"))
            putExtra(FocusOverlayService.EXTRA_RUNNING, call.getBoolean("running", false))
            putExtra(FocusOverlayService.EXTRA_BREAK, call.getBoolean("isBreak", false))
        }
        runCatching { context.startForegroundService(intent) }
        call.resolve()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        context.stopService(Intent(context, FocusOverlayService::class.java))
        call.resolve()
    }

    private fun canDrawOverlays(): Boolean {
        return Settings.canDrawOverlays(context)
    }
}
