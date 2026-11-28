import SwiftUI
import AppKit
import UserNotifications

@main
struct MacFyiApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        // Kosong — tidak ada jendela utama, aplikasi hanya di menu bar
        EmptyScene()
    }
}

struct EmptyScene: Scene {
    var body: some Scene {
        #if os(macOS)
        Settings {
            EmptyView()
        }
        #endif
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    var statusItem: NSStatusItem?
    var popover: NSPopover?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Tutup semua jendela yang mungkin dibuat otomatis
        NSApp.windows.forEach { $0.close() }

        UNUserNotificationCenter.current().delegate = self
        MonitorManager.shared.startMonitoring()
        Task { await MonitorManager.shared.requestNotificationPermission() }

        setupStatusBar()
    }

    func applicationWillTerminate(_ notification: Notification) {
        MonitorManager.shared.stopMonitoring()
        CaffeinateManager.shared.forceStop()
    }

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "memorychip", accessibilityDescription: "MacFyi")
            button.target = self
            button.action = #selector(togglePopover)
        }

        let content = ContentView()
            .environmentObject(MonitorManager.shared)
            .frame(width: 560, height: 700)

        popover = NSPopover()
        popover?.contentViewController = NSHostingController(rootView: content)
        popover?.behavior = .transient
        popover?.contentSize = NSSize(width: 560, height: 700)
    }

    @objc private func togglePopover() {
        guard let button = statusItem?.button, let popover = popover else { return }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        guard response.actionIdentifier == "CLEAN_ACTION" else {
            completionHandler()
            return
        }
        let type = response.notification.request.content.userInfo["type"] as? String
        Task {
            if type == "ram" {
                _ = await MonitorManager.shared.purgeMemory()
            } else if type == "storage" {
                _ = await MonitorManager.shared.cleanStorage()
            }
        }
        completionHandler()
    }
}
