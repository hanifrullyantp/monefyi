import Foundation

struct CpuStats {
    let overallLoad: Double
    let userLoad: Double
    let systemLoad: Double
    let idleLoad: Double
    let thermalState: String
    let timestamp: Date

    static var empty: CpuStats {
        CpuStats(overallLoad: 0, userLoad: 0, systemLoad: 0, idleLoad: 0, thermalState: "nominal", timestamp: Date.distantPast)
    }
}
