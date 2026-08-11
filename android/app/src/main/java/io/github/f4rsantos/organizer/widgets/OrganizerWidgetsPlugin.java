package io.github.f4rsantos.organizer.widgets;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OrganizerWidgets")
public class OrganizerWidgetsPlugin extends Plugin {

    @PluginMethod
    public void setProjection(PluginCall call) {
        String payload = call.getString("payload");
        if (payload == null) {
            call.reject("payload is required");
            return;
        }
        WidgetStore.setProjection(getContext(), payload);
        WidgetRefresh.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void drainQueue(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ops", WidgetStore.drainQueue(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        WidgetStore.clear(getContext());
        WidgetRefresh.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumeLaunchTab(PluginCall call) {
        JSObject result = new JSObject();
        result.put("tab", takeLaunchTab());
        call.resolve(result);
    }

    private String takeLaunchTab() {
        if (getActivity() == null || getActivity().getIntent() == null) return null;
        String tab = getActivity().getIntent().getStringExtra("tab");
        if (tab != null) getActivity().getIntent().removeExtra("tab");
        return tab;
    }
}
