import Foundation

final class CleaningManager {
    static let shared = CleaningManager()
    private init() {}

    func purgeMemory() async -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/purge")
        do {
            try process.run()
            process.waitUntilExit()
            return process.terminationStatus == 0
        } catch {
            return false
        }
    }

    func estimateReclaimable() -> UInt64 {
        let paths: [URL] = [
            FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Caches"),
            URL(fileURLWithPath: "/tmp"),
            FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs")
        ]
        return paths.reduce(0) { $0 + sizeOfDirectory(at: $1) }
    }

    private func sizeOfDirectory(at url: URL) -> UInt64 {
        var total: UInt64 = 0
        guard let enumerator = FileManager.default.enumerator(
            at: url,
            includingPropertiesForKeys: [.fileSizeKey, .isReadableKey],
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else { return 0 }
        for case let fileURL as URL in enumerator {
            do {
                let values = try fileURL.resourceValues(forKeys: [.fileSizeKey, .isReadableKey])
                if values.isReadable ?? false {
                    total += UInt64(values.fileSize ?? 0)
                }
            } catch {
                continue
            }
        }
        return total
    }

    func cleanStorage() async -> (bytesFreed: UInt64, details: [String]) {
        var bytesFreed: UInt64 = 0
        var details: [String] = []

        let cachesDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Caches")
        let tmpDir = URL(fileURLWithPath: "/tmp")
        let logsDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs")

        let sevenDaysAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()

        func removeItem(at url: URL) {
            do {
                let values = try url.resourceValues(forKeys: [.fileSizeKey])
                let size = UInt64(values.fileSize ?? 0)
                try FileManager.default.removeItem(at: url)
                bytesFreed += size
                details.append(url.path)
            } catch {
                return
            }
        }

        func processDirectory(_ dir: URL, olderThan: Date? = nil) {
            guard let contents = try? FileManager.default.contentsOfDirectory(
                at: dir,
                includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { return }
            for item in contents {
                if let olderThan = olderThan {
                    do {
                        let values = try item.resourceValues(forKeys: [.contentModificationDateKey])
                        guard let modDate = values.contentModificationDate,
                              modDate < olderThan else { continue }
                    } catch {
                        continue
                    }
                }
                removeItem(at: item)
            }
        }

        processDirectory(cachesDir)
        processDirectory(tmpDir)
        processDirectory(logsDir, olderThan: sevenDaysAgo)

        return (bytesFreed, details)
    }
}
