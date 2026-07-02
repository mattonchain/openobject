import SwiftUI
import AppKit

// The main window. It is role-aware (MAC-APP-PLAN §B3): the top reflects whether this Mac is running
// its own Host or viewing a chosen remote Host, and the discovered-Hosts list below is selectable to
// switch between them. First-run onboarding presentation + list-growth polish come in B3b-2.
struct ContentView: View {
    @EnvironmentObject private var engine: EngineHost
    @EnvironmentObject private var discovery: HostDiscovery
    @EnvironmentObject private var roleStore: RoleStore

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text("OpenObject")
                .font(.title.weight(.semibold))

            roleSection

            Divider()
            hostsView
        }
        .padding(40)
        // Compact by default, user-resizable (long host names widen to read in full), and the resize
        // is not persisted — see WindowConfigurator. Top-aligned so extra height falls below content.
        .frame(minWidth: 380, maxWidth: .infinity, minHeight: 320, maxHeight: .infinity, alignment: .top)
        .background(WindowConfigurator())
    }

    // MARK: - Top: the current role

    @ViewBuilder private var roleSection: some View {
        switch roleStore.mode {
        case .host:
            hostStatusView
        case .viewer(_, let name):
            viewerStatusView(name: name)
        }
    }

    @ViewBuilder private var hostStatusView: some View {
        switch engine.status {
        case .idle, .starting:
            Label("Starting the host…", systemImage: "hourglass")
                .foregroundStyle(.secondary)
        case .running(let name):
            VStack(spacing: 4) {
                Label("Host running", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text(name).font(.callout)
                Text(engine.baseURL.absoluteString)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Button("Open Control Panel") { openControlPanel() }
                .buttonStyle(.borderedProminent)
        case .failed(let message):
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder private func viewerStatusView(name: String) -> some View {
        VStack(spacing: 4) {
            Label("Viewing", systemImage: "display")
                .foregroundStyle(.secondary)
            Text(name).font(.callout)
        }
        Button("Open Control Panel") { openControlPanel() }
            .buttonStyle(.borderedProminent)
        Button("Run OpenObject on this Mac") { roleStore.runAsHost() }
    }

    // MARK: - Bottom: discovered Hosts (selectable to switch roles)

    @ViewBuilder private var hostsView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("OpenObject hosts on your network")
                .font(.subheadline.weight(.semibold))
            if discovery.hosts.isEmpty {
                Text("Searching…")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(orderedHosts) { host in
                    hostRow(host)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private func hostRow(_ host: HostDiscovery.Host) -> some View {
        let active = isActive(host)
        let local = (host.id == engine.hostId)
        if active {
            // The Host currently wired up: a prominent, checkmarked label — NOT a disabled button
            // (a disabled control renders grayed, which wrongly dimmed the active row).
            rowLabel(host, active: true, local: local)
        } else {
            // Another Host: a clickable button that switches to it.
            Button {
                if local { roleStore.runAsHost() } else { roleStore.view(hostId: host.id, name: host.name) }
            } label: {
                rowLabel(host, active: false, local: local)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder private func rowLabel(_ host: HostDiscovery.Host, active: Bool, local: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: active ? "checkmark.circle.fill" : "dot.radiowaves.left.and.right")
                .foregroundStyle(active ? Color.green : Color.secondary)
            Text(host.name)
                .fontWeight(active ? .semibold : .regular)
                .lineLimit(1)
                .truncationMode(.middle)
            if let version = host.version {
                Text("v\(version)").font(.footnote).foregroundStyle(.secondary)
            }
            if local {
                Text("· This Mac").font(.footnote).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
    }

    // MARK: - Actions

    // The connected/wired Host first, then the rest in discovery's alphabetical order (Matt,
    // 2026-07-02). discovery.hosts is already sorted by name.
    private var orderedHosts: [HostDiscovery.Host] {
        let hosts = discovery.hosts
        return hosts.filter { isActive($0) } + hosts.filter { !isActive($0) }
    }

    private func isActive(_ host: HostDiscovery.Host) -> Bool {
        switch roleStore.mode {
        case .host: return host.id == engine.hostId
        case .viewer(let id, _): return host.id == id
        }
    }

    private func openControlPanel() {
        switch roleStore.mode {
        case .host:
            NSWorkspace.shared.open(engine.controlURL)
        case .viewer(let id, _):
            guard let host = discovery.hosts.first(where: { $0.id == id }) else { return }
            Task {
                if let url = await discovery.resolveURL(for: host) {
                    NSWorkspace.shared.open(url)
                }
            }
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
