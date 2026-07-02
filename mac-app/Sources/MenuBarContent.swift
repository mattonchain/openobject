import SwiftUI
import AppKit

// The menu-bar item's menu — the display's remote (MAC-APP-PLAN §B5). This is the ONE surface
// reachable from inside the full-screen Chrome kiosk: move the mouse to the top of the screen and the
// macOS menu bar (with the OpenObject icon on the right) slides down over the kiosk. So the escape
// hatch — Return to Display, Show OpenObject (bring the window up), Stop Display — lives here, not in
// the window (which is hidden while the kiosk is full-screen).
struct MenuBarContent: View {
    @EnvironmentObject private var engine: EngineHost
    @EnvironmentObject private var roleStore: RoleStore
    @EnvironmentObject private var display: DisplayController
    @EnvironmentObject private var actions: DisplayActions

    var body: some View {
        Text(statusText)
        Divider()

        // Stable menu: items always present, grayed when they don't apply (macOS convention).
        Button("Open Display") { actions.openDisplay() }
            .disabled(!display.isChromeInstalled || display.state == .running)
        Button("Return to Display") { actions.returnToDisplay() }
            .disabled(display.state != .running)
        Button("Stop Display") { actions.stopDisplay() }
            .disabled(display.state != .running)

        Button("Show OpenObject") { actions.showControls() }
        Button("Open Control Panel") { actions.openControlPanel() }

        Divider()
        Button("Quit OpenObject") { NSApplication.shared.terminate(nil) }
            .keyboardShortcut("q")
    }

    // A status line at the top of the menu: which Host this is or is viewing.
    private var statusText: String {
        switch roleStore.mode {
        case .viewer(_, let name):
            return "Viewing \(name)"
        case .host:
            if case .running(let name) = engine.status { return name }
            return "OpenObject"
        }
    }
}
