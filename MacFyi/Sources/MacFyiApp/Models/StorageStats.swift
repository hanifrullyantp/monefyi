import Foundation

struct StorageStats {
    let total: UInt64
    let used: UInt64
    let available: UInt64
    let timestamp: Date
    var reclaimable: UInt64 = 0

    var usagePercent: Double {
        guard total > 0 else { return 0 }
        return Double(used) / Double(total) * 100
    }
    var isLow: Bool { (100 - usagePercent) < 10 }

    static var empty: StorageStats {
        StorageStats(total: 0, used: 0, available: 0, timestamp: Date.distantPast)
    }
}
