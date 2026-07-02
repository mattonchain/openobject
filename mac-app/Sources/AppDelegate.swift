import AppKit
import Combine

// Owns the app's long-lived objects and coordinates the engine's process lifecycle with the chosen
// role (MAC-APP-PLAN §B2/§B3). The local Host runs only in `.host` mode; in `.viewer` mode the app
// drives no server and instead points at a chosen remote Host. Using an NSApplicationDelegate gives
// reliable launch/terminate hooks, which matters for a child process.
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let engine = EngineHost()
    let discovery = HostDiscovery()
    let roleStore = RoleStore()
    let display = DisplayController()
    lazy var actions = DisplayActions(engine: engine, discovery: discovery, roleStore: roleStore, display: display)
    private var cancellables = Set<AnyCancellable>()

    func applicationDidFinishLaunching(_ notification: Notification) {
        discovery.start() // always browse, so the Hosts list stays live in either role

        // Start/stop the local Host to match the chosen role. @Published replays the current value to
        // a new subscriber, so this also performs the initial start (host) or no-op (viewer) on launch.
        roleStore.$mode
            .sink { [weak self] mode in
                guard let self else { return }
                switch mode {
                case .host:   self.engine.start()
                case .viewer: self.engine.stop()
                }
            }
            .store(in: &cancellables)
    }

    func applicationWillTerminate(_ notification: Notification) {
        display.stop()
        discovery.stop()
        engine.stop()
    }
}
