import SwiftUI
import Combine
import UserNotifications

final class MonitorManager: ObservableObject {
    static let shared = MonitorManager()
    private init() {}

    @Published var memoryStats: MemoryStats = .empty
    @Published var storageStats: StorageStats = .empty
    @Published var cpuStats: CpuStats = .empty
    @Published var networkStats: [NetworkStats] = []
    @Published var reclaimableStorage: UInt64 = 0

    private let maxHistory = 30
    @Published var ramHistory: [HistoryPoint] = []
    @Published var storageHistory: [HistoryPoint] = []
    @Published var cpuHistory: [HistoryPoint] = []

    private var timer: Timer?
    private let ramThreshold: Double = 85
    private let storageLowThreshold: Double = 10
    private var lastRamAlert: Date?
    private var lastStorageAlert: Date?
    let alertCooldown: TimeInterval = 300

    func startMonitoring() {
        stopMonitoring()
        timer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
        tick()
    }

    func stopMonitoring() {
        timer?.invalidate()
        timer = nil
    }

    func purgeMemory() async -> Bool {
        let result = await CleaningManager.shared.purgeMemory()
        memoryStats = MemoryMonitor.shared.fetch()
        return result
    }

    func cleanStorage() async -> (UInt64, [String]) {
        let (bytesFreed, details) = await CleaningManager.shared.cleanStorage()
        reclaimableStorage = CleaningManager.shared.estimateReclaimable()
        storageStats = StorageMonitor.shared.fetch()
        return (bytesFreed, details)
    }

    func toggleCaffeinate() {
        CaffeinateManager.shared.workModeEnabled.toggle()
    }

    func requestNotificationPermission() async -> Bool {
        return await NotificationManager.shared.requestAuthorization()
    }

    func checkThresholdsAndNotify() {
        let now = Date()

        if memoryStats.isCritical {
            if let last = lastRamAlert, now.timeIntervalSince(last) < alertCooldown {
                return
            }
            lastRamAlert = now
            NotificationManager.shared.sendCritical(
                title: "RAM Kritis",
                body: "Penggunaan RAM \(ByteFormatter.formatPercent(memoryStats.usagePercent))%",
                actionId: "CLEAN_ACTION",
                userInfo: ["type": "ram"]
            )
        }

        if (100 - storageStats.usagePercent) < storageLowThreshold {
            if let last = lastStorageAlert, now.timeIntervalSince(last) < alertCooldown {
                return
            }
            lastStorageAlert = now
            NotificationManager.shared.sendCritical(
                title: "Penyimpanan Menipis",
                body: "Ruang tersisa \(ByteFormatter.formatBytes(storageStats.available))",
                actionId: "CLEAN_ACTION",
                userInfo: ["type": "storage"]
            )
        }
    }

    private func tick() {
        memoryStats = MemoryMonitor.shared.fetch()
        storageStats = StorageMonitor.shared.fetch()
        cpuStats = CpuMonitor.shared.fetch()
        networkStats = NetworkMonitor.shared.fetch()
        reclaimableStorage = CleaningManager.shared.estimateReclaimable()

        appendHistory()
        checkThresholdsAndNotify()
    }

    private func appendHistory() {
        ramHistory.append(HistoryPoint(value: memoryStats.usagePercent, timestamp: Date()))
        storageHistory.append(HistoryPoint(value: storageStats.usagePercent, timestamp: Date()))
        cpuHistory.append(HistoryPoint(value: cpuStats.overallLoad, timestamp: Date()))

        if ramHistory.count > maxHistory { ramHistory.removeFirst() }
        if storageHistory.count > maxHistory { storageHistory.removeFirst() }
        if cpuHistory.count > maxHistory { cpuHistory.removeFirst() }
    }
}
