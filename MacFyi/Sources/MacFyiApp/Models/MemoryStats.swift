import Foundation

struct MemoryStats {
    let total: UInt64
    let active: UInt64
    let wired: UInt64
    let compressed: UInt64
    let free: UInt64
    let inactive: UInt64
    let timestamp: Date

    var used: UInt64 { active + wired + compressed }
    var available: UInt64 { free + inactive }
    var usagePercent: Double {
        guard total > 0 else { return 0 }
        return Double(used) / Double(total) * 100
    }
    var isCritical: Bool { usagePercent > 85 }

    static var empty: MemoryStats {
        MemoryStats(total: 0, active: 0, wired: 0, compressed: 0, free: 0, inactive: 0, timestamp: Date.distantPast)
    }
}
