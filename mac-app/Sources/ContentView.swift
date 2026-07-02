import SwiftUI
import AppKit

// The main window's content: reflects the bundled Host's status and, once it's running, offers a
// way into the control panel (MAC-APP-PLAN §B2). Onboarding (Host vs Display role) and driving the
// display in Chrome come in B3/B4.
struct ContentView: View {
    @EnvironmentObject private var engine: EngineHost

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text("OpenObject")
                .font(.title.weight(.semibold))

            statusView

            if case .running = engine.status {
                Button("Open Control Panel") {
                    NSWorkspace.shared.open(engine.controlURL)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(40)
        .frame(minWidth: 400, minHeight: 300)
    }

    @ViewBuilder private var statusView: some View {
        switch engine.status {
        case .idle:
            Label("Idle", systemImage: "circle")
                .foregroundStyle(.secondary)
        case .starting:
            Label("Starting the host…", systemImage: "hourglass")
                .foregroundStyle(.secondary)
        case .running(let name):
            VStack(spacing: 4) {
                Label("Host running", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text(name)
                    .font(.callout)
                Text(engine.baseURL.absoluteString)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        case .failed(let message):
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
                .multilineTextAlignment(.center)
        }
    }
}
