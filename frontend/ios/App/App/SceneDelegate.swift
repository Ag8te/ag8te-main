import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard scene is UIWindowScene else {
            return
        }

        connectionOptions.urlContexts.forEach { forward($0) }
        connectionOptions.userActivities.forEach { forward($0) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach { forward($0) }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        forward(userActivity)
    }

    private func forward(_ context: UIOpenURLContext) {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [
            .openInPlace: context.options.openInPlace
        ]

        if let sourceApplication = context.options.sourceApplication {
            options[.sourceApplication] = sourceApplication
        }
        if let annotation = context.options.annotation {
            options[.annotation] = annotation
        }

        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: context.url,
            options: options
        )
    }

    private func forward(_ userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
