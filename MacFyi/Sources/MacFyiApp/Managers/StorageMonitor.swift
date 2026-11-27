import Foundation

final class StorageMonitor {
    static let shared = StorageMonitor()
    private init() {}

    func fetch() -> StorageStats {
        let path = NSHomeDirectory()
        do {
            let attrs = try FileManager.default.attributesOfFileSystem(forPath: path)
            let total = (attrs[FileAttributeKey.systemSize] as? NSNumber)?.uint64Value ?? 0
            let free = (attrs[FileAttributeKey.systemFreeSize] as? NSNumber)?.uint64Value ?? 0
            return StorageStats(total: total, used: total - free, available: free, timestamp: Date())
        } catch {
            return StorageStats(total: 0, used: 0, available: 0, timestamp: Date())
        }
    }
}
