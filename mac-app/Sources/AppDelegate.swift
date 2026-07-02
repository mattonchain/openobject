import AppKit

// Owns the engine's process lifecycle across the app's launch and quit (MAC-APP-PLAN §B2).
// Using an NSApplicationDelegate (via the adaptor in OpenObjectApp) gives reliable
// launch/terminate hooks, which matters for a child process: the Host must start on launch and be
// stopped cleanly on quit so the bundled node never orphans.
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let engine = EngineHost()

    func applicationDidFinishLaunching(_ notification: Notification) {
        engine.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        engine.stop()
    }
}
