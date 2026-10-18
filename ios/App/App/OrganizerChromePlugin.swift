import UIKit
import SwiftUI
import Capacitor

@objc(OrganizerChromePlugin)
public class OrganizerChromePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrganizerChromePlugin"
    public let jsName = "OrganizerChrome"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTabBar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideTabBar", returnType: CAPPluginReturnPromise)
    ]

    private static let edgeInset: CGFloat = 8
    private static let sideInset: CGFloat = 12
    private static let topAccessoryClearance: CGFloat = 96
    private static let fadeDuration: TimeInterval = 0.2

    private let model = GlassTabBarModel()
    private var host: UIHostingController<GlassTabBar>?
    private var placementConstraints: [NSLayoutConstraint] = []
    private var legacySizeConstraints: [NSLayoutConstraint] = []

    @objc func setTabBar(_ call: CAPPluginCall) {
        guard
            let payload = call.getString("payload"),
            let data = payload.data(using: .utf8),
            let spec = try? JSONDecoder().decode(GlassTabBarSpec.self, from: data)
        else {
            call.reject("invalid tab bar payload")
            return
        }
        DispatchQueue.main.async {
            self.show(spec)
            call.resolve()
        }
    }

    @objc func hideTabBar(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.setVisible(false)
            call.resolve()
        }
    }

    private func show(_ spec: GlassTabBarSpec) {
        guard let container = bridge?.viewController?.view else { return }
        let host = self.host ?? makeHost(in: container)
        model.spec = spec
        host.overrideUserInterfaceStyle = interfaceStyle(for: spec.theme)
        place(host.view, in: container, placement: spec.placement)
        host.view.invalidateIntrinsicContentSize()
        if #unavailable(iOS 16.0) {
            DispatchQueue.main.async {
                self.applyLegacySize(host, in: container, placement: spec.placement)
            }
        }
        setVisible(spec.visible)
    }

    private func applyLegacySize(_ host: UIHostingController<GlassTabBar>, in container: UIView, placement: GlassTabBarPlacement) {
        let inset = placement == .top ? Self.topAccessoryClearance : Self.sideInset
        let available = container.safeAreaLayoutGuide.layoutFrame.width - 2 * inset
        let fitted = host.sizeThatFits(in: CGSize(width: available, height: .greatestFiniteMagnitude))
        NSLayoutConstraint.deactivate(legacySizeConstraints)
        legacySizeConstraints = [host.view.heightAnchor.constraint(equalToConstant: fitted.height)]
        if placement == .top {
            legacySizeConstraints.append(host.view.widthAnchor.constraint(equalToConstant: min(fitted.width, available)))
        }
        NSLayoutConstraint.activate(legacySizeConstraints)
    }

    private func makeHost(in container: UIView) -> UIHostingController<GlassTabBar> {
        let root = GlassTabBar(model: model) { [weak self] id, action in
            self?.emitSelection(id: id, action: action)
        }
        let host = UIHostingController(rootView: root)
        if #available(iOS 16.0, *) {
            host.sizingOptions = .intrinsicContentSize
        }
        host.view.backgroundColor = .clear
        host.view.translatesAutoresizingMaskIntoConstraints = false
        host.view.alpha = 0
        bridge?.viewController?.addChild(host)
        container.addSubview(host.view)
        host.didMove(toParent: bridge?.viewController)
        self.host = host
        return host
    }

    private func place(_ bar: UIView, in container: UIView, placement: GlassTabBarPlacement) {
        NSLayoutConstraint.deactivate(placementConstraints)
        let guide = container.safeAreaLayoutGuide
        switch placement {
        case .top:
            placementConstraints = [
                bar.topAnchor.constraint(equalTo: guide.topAnchor, constant: Self.edgeInset),
                bar.centerXAnchor.constraint(equalTo: guide.centerXAnchor),
                bar.widthAnchor.constraint(lessThanOrEqualTo: guide.widthAnchor, constant: -2 * Self.topAccessoryClearance)
            ]
        case .bottom:
            placementConstraints = [
                bar.bottomAnchor.constraint(equalTo: guide.bottomAnchor, constant: -Self.edgeInset),
                bar.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: Self.sideInset),
                bar.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -Self.sideInset)
            ]
        }
        NSLayoutConstraint.activate(placementConstraints)
    }

    private func setVisible(_ visible: Bool) {
        guard let bar = host?.view else { return }
        bar.isUserInteractionEnabled = visible
        UIView.animate(withDuration: Self.fadeDuration) {
            bar.alpha = visible ? 1 : 0
        }
    }

    private func interfaceStyle(for theme: String) -> UIUserInterfaceStyle {
        switch theme {
        case "dark": return .dark
        case "light": return .light
        default: return .unspecified
        }
    }

    private func emitSelection(id: String, action: String?) {
        var data: [String: Any] = ["id": id]
        if let action {
            data["action"] = action
        }
        notifyListeners("tabSelected", data: data)
    }
}
