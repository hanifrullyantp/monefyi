import Foundation
import UserNotifications

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    private let categoryIdentifier = "MEMFYI_CRITICAL"
    private let cleanActionIdentifier = "CLEAN_ACTION"

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = try? await center.requestAuthorization(options: [.alert, .sound])
        return granted == true
    }

    func sendCritical(title: String, body: String, actionId: String, userInfo: [AnyHashable: Any] = [:]) {
        let center = UNUserNotificationCenter.current()
        let action = UNNotificationAction(
            identifier: cleanActionIdentifier,
            title: "Bersihkan Sekarang",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: categoryIdentifier,
            actions: [action],
            intentIdentifiers: [],
            options: []
        )
        center.setNotificationCategories([category])

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.categoryIdentifier = categoryIdentifier
        content.sound = .default
        content.userInfo = userInfo

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        center.add(request)
    }
}
