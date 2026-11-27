import Foundation

final class MemoryMonitor {
    static let shared = MemoryMonitor()
    private init() {}

    func fetch() -> MemoryStats {
        var pageSize: vm_size_t = 0
        guard host_page_size(mach_host_self(), &pageSize) == KERN_SUCCESS else {
            return Self.zeroedStats
        }

        var info = vm_statistics64()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64>.stride / MemoryLayout<natural_t>.stride)
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: natural_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }
        guard result == KERN_SUCCESS else {
            return Self.zeroedStats
        }

        let page = UInt64(pageSize)
        let active = UInt64(info.active_count) * page
        let wired = UInt64(info.wire_count) * page
        let compressed = UInt64(info.compressor_page_count) * page
        let free = UInt64(info.free_count) * page
        let inactive = UInt64(info.inactive_count) * page
        let total = active + wired + compressed + free + inactive

        return MemoryStats(total: total, active: active, wired: wired, compressed: compressed, free: free, inactive: inactive, timestamp: Date())
    }

    private static var zeroedStats: MemoryStats {
        MemoryStats(total: 0, active: 0, wired: 0, compressed: 0, free: 0, inactive: 0, timestamp: Date())
    }
}
