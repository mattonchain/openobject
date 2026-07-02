import SwiftUI
import AppKit

// The main window's content: reflects the bundled Host's status and, once it's running, offers a
// way into the control panel (MAC-APP-PLAN §B2). Onboarding (Host vs Display role) and driving the
// display in Chrome come in B3/B4.
struct ContentView: View {
    @EnvironmentObject private var engine: EngineHost
    @EnvironmentObject private var discovery: HostDiscovery

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

            Divider()
            hostsView
        }
        .padding(40)
        // Compact by default, but user-resizable so a long host name (middle-truncated below) can be
        // widened to read in full. Resizes are NOT persisted — WindowConfigurator disables frame
        // restoration, so the window reopens at its default size (Matt, 2026-07-02). Top-aligned so
        // extra height falls below the content instead of stretching it.
        .frame(minWidth: 380, maxWidth: .infinity, minHeight: 320, maxHeight: .infinity, alignment: .top)
        .background(WindowConfigurator())
    }

    // Hosts found on the network (B3). Proves discovery works; B3b turns this into the first-run
    // "view an existing Host vs run my own" choice.
    @ViewBuilder private var hostsView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("OpenObject hosts on your network")
                .font(.subheadline.weight(.semibold))
            if discovery.hosts.isEmpty {
                Text("Searching…")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(discovery.hosts) { host in
                    HStack(spacing: 6) {
                        Image(systemName: "dot.radiowaves.left.and.right")
                            .foregroundStyle(.secondary)
                        Text(host.name)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        if let version = host.version {
                            Text("v\(version)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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

// Applies one-time NSWindow tweaks SwiftUI doesn't expose declaratively. Here it turns OFF frame
// restoration so the window always opens at its default size — the user may resize it (e.g. to reveal
// a long host name) but the resize is not remembered across launches.
private struct WindowConfigurator: NSViewRepresentable {
    // The default size the window opens at every launch. Resizes during a session are allowed but
    // not remembered (Matt, 2026-07-02).
    static let defaultSize = NSSize(width: 420, height: 380)

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            guard let window = view.window else { return }
            // Stop the frame from being remembered across launches: SwiftUI autosaves the window
            // frame (and macOS restores it) independently, so isRestorable = false is not enough on
            // its own. Clear the autosave name AND force the default size, so a prior session's
            // resize never carries over.
            window.isRestorable = false
            window.setFrameAutosaveName("")
            window.setContentSize(Self.defaultSize)
        }
        return view
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
