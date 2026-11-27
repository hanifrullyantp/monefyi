import Foundation

/// Caffeinate berbasis aturan kerja (work mode).
/// Aturan: selama mode kerja aktif (isWorking == true), macOS dilarang tidur.
/// Jika mode kerja mati, caffeinate dihentikan dan macOS boleh tidur lagi.
final class CaffeinateManager {
    static let shared = CaffeinateManager()
    private init() {}

    /// Aktifkah mode kerja? Jika true, caffeinate akan berjalan terus-menerus.
    var workModeEnabled: Bool = false {
        didSet {
            if workModeEnabled {
                start()
            } else {
                stop()
            }
        }
    }

    private var caffeinateProcess: Process?

    /// true ketika mode kerja aktif DAN proses caffeinate sedang berjalan
    var isWorking: Bool {
        workModeEnabled && caffeinateProcess != nil && caffeinateProcess?.isRunning == true
    }

    /// true ketika caffeinate proses sedang mencegah tidur
    var isActive: Bool {
        caffeinateProcess != nil && caffeinateProcess?.isRunning == true
    }

    /// Mulai mencegah tidur (hanya jika workModeEnabled)
    func start() {
        guard workModeEnabled, !isActive else { return }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/caffeinate")
        process.arguments = ["-i"] // mencegah idle sleep
        do {
            try process.run()
            caffeinateProcess = process
        } catch {
            caffeinateProcess = nil
        }
    }

    /// Hentikan mencegah tidur (macOS boleh tidur lagi)
    func stop() {
        guard let process = caffeinateProcess, process.isRunning else {
            caffeinateProcess = nil
            return
        }
        process.terminate()
        caffeinateProcess = nil
    }

    /// Paksa hentikan (digunakan saat aplikasi akan ditutup)
    func forceStop() {
        stop()
    }
}
