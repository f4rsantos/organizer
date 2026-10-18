import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = OrganizerViewController()
        window?.makeKeyAndVisible()

        rememberWidgetTab(from: connectionOptions.urlContexts)
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        rememberWidgetTab(from: URLContexts)
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    private func rememberWidgetTab(from contexts: Set<UIOpenURLContext>) {
        guard let tab = contexts.lazy.compactMap({ WidgetShared.tab(from: $0.url) }).first else { return }
        WidgetShared.setLaunchTab(tab)
    }
}
