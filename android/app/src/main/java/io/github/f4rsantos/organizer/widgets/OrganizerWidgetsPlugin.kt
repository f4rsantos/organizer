package io.github.f4rsantos.organizer.widgets

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "OrganizerWidgets")
class OrganizerWidgetsPlugin : Plugin() {

    @PluginMethod
    fun setProjection(call: PluginCall) {
        val payload = call.getString("payload")
        if (payload == null) {
            call.reject("payload is required")
            return
        }
        WidgetStore.setProjection(context, payload)
        WidgetRefresh.refreshAll(context)
        call.resolve()
    }

    @PluginMethod
    fun drainQueue(call: PluginCall) {
        val result = JSObject()
        result.put("ops", WidgetStore.drainQueue(context))
        call.resolve(result)
    }

    @PluginMethod
    fun clear(call: PluginCall) {
        WidgetStore.clear(context)
        WidgetRefresh.refreshAll(context)
        call.resolve()
    }

    @PluginMethod
    fun consumeLaunchTab(call: PluginCall) {
        val result = JSObject()
        result.put("tab", takeLaunchTab())
        call.resolve(result)
    }

    private fun takeLaunchTab(): String? {
        val intent = activity?.intent ?: return null
        val tab = intent.getStringExtra("tab")
        if (tab != null) intent.removeExtra("tab")
        return tab
    }
}
