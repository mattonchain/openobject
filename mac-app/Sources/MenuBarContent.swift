import SwiftUI
import AppKit

// The menu-bar item's menu. It mirrors the Host status and offers Open Control Panel + Quit
// (MAC-APP-PLAN §B2). The fuller UX — start/stop the Host, open the display, show Host vs Display
// role and which server — arrives in B5.
struct MenuBarContent: View {
    @EnvironmentObject private var engine: EngineHost

    var body: some View {
        statusLine
        Divider()
        if case .running = engine.status {
            Button("Open Control Panel") {
                NSWorkspace.shared.open(engine.controlURL)
            }
        }
        Button("Quit OpenObject") {
            NSApplication.shared.terminate(nil)
        }
        .keyboardShortcut("q")
    }

    private var statusLine: Text {
        switch engine.status {
        case .idle:            return Text("OpenObject — idle")
        case .starting:        return Text("OpenObject — starting…")
        case .running(let n):  return Text(n)
        case .failed:          return Text("OpenObject — engine error")
        }
    }
}
