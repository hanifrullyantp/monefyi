import Foundation

final class CpuMonitor {
    static let shared = CpuMonitor()
    private init() {}

    func fetch() -> CpuStats {
        var count = mach_msg_type_number_t(CPU_STATE_MAX)
        var ticks = [integer_t](repeating: 0, count: Int(CPU_STATE_MAX))
        let result = ticks.withUnsafeMutableBufferPointer {
            host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0.baseAddress!, &count)
        }

        var overallLoad = 0.0
        var userLoad = 0.0
        var systemLoad = 0.0
        var idleLoad = 0.0

        if result == KERN_SUCCESS {
            let userTicks = Double(ticks[Int(CPU_STATE_USER)])
            let systemTicks = Double(ticks[Int(CPU_STATE_SYSTEM)])
            let idleTicks = Double(ticks[Int(CPU_STATE_IDLE)])
            let niceTicks = Double(ticks[Int(CPU_STATE_NICE)])
            let total = userTicks + systemTicks + idleTicks + niceTicks
            if total > 0 {
                userLoad = userTicks / total * 100
                systemLoad = systemTicks / total * 100
                idleLoad = idleTicks / total * 100
                overallLoad = (userTicks + systemTicks + niceTicks) / total * 100
            }
        }

        let thermalState: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermalState = "nominal"
        case .fair: thermalState = "fair"
        case .serious: thermalState = "serious"
        case .critical: thermalState = "critical"
        @unknown default: thermalState = "nominal"
        }

        return CpuStats(overallLoad: overallLoad, userLoad: userLoad, systemLoad: systemLoad, idleLoad: idleLoad, thermalState: thermalState, timestamp: Date())
    }
}
