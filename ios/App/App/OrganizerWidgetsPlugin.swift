import Foundation
import WidgetKit
import Capacitor

@objc(OrganizerWidgetsPlugin)
public class OrganizerWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrganizerWidgetsPlugin"
    public let jsName = "OrganizerWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setProjection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "widgetCount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeLaunchTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncLiveActivities", returnType: CAPPluginReturnPromise)
    ]

    private var queueObserver: NSObjectProtocol?

    override public func load() {
        queueObserver = NotificationCenter.default.addObserver(
            forName: WidgetShared.queueChangedNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("queueChanged", data: [:])
        }
    }

    deinit {
        if let queueObserver {
            NotificationCenter.default.removeObserver(queueObserver)
        }
    }

    @objc func setProjection(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            call.reject("payload is required")
            return
        }
        WidgetShared.setProjection(payload)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func drainQueue(_ call: CAPPluginCall) {
        call.resolve(["ops": WidgetShared.drainQueue()])
    }

    @objc func clear(_ call: CAPPluginCall) {
        WidgetShared.clear()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func widgetCount(_ call: CAPPluginCall) {
        WidgetCenter.shared.getCurrentConfigurations { result in
            let count = (try? result.get())?.count ?? 0
            call.resolve(["count": count])
        }
    }

    @objc func syncLiveActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        guard
            let data = call.getString("payload")?.data(using: .utf8),
            let payload = try? JSONDecoder().decode(LiveActivitiesPayload.self, from: data)
        else {
            call.reject("invalid live activities payload")
            return
        }
        Task {
            await LiveActivityController.sync(payload)
            if #available(iOS 18.0, *) {
                ControlCenter.shared.reloadAllControls()
            }
            call.resolve()
        }
    }

    @objc func consumeLaunchTab(_ call: CAPPluginCall) {
        guard let tab = WidgetShared.takeLaunchTab() else {
            call.resolve([:])
            return
        }
        call.resolve(["tab": tab])
    }
}
