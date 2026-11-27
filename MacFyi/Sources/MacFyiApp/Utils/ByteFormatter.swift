import Foundation

enum ByteFormatter {
    static func formatBytes(_ bytes: UInt64) -> String {
        let units = ["B", "KB", "MB", "GB", "TB"]
        var value = Double(bytes)
        var unitIndex = 0
        while value >= 1024 && unitIndex < units.count - 1 {
            value /= 1024
            unitIndex += 1
        }
        return String(format: "%.2f %@", value, units[unitIndex])
    }

    static func formatPercent(_ value: Double) -> String {
        return String(format: "%.1f%%", value)
    }

    static func formatSpeed(_ bytesPerSec: UInt64) -> String {
        return formatBytes(bytesPerSec) + "/s"
    }
}
