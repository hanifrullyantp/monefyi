import SwiftUI

struct StorageView: View {
    @EnvironmentObject var monitor: MonitorManager
    @State private var isCleaning = false
    @State private var cleanResult: (UInt64, [String])?
    @State private var showResultAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Total", value: ByteFormatter.formatBytes(monitor.storageStats.total), icon: "internaldrive.fill", color: .blue)
                    StatCard(title: "Digunakan", value: ByteFormatter.formatBytes(monitor.storageStats.used), icon: "externaldrive.fill", color: .orange)
                    StatCard(title: "Tersedia", value: ByteFormatter.formatBytes(monitor.storageStats.available), icon: "arrow.down.circle", color: .green)
                    StatCard(title: "Dapat Dikosongkan", value: ByteFormatter.formatBytes(monitor.reclaimableStorage), icon: "trash.fill", color: .red)
                }

                let storageValues = monitor.storageHistory.map { $0.value }
                ChartView(
                    points: storageValues,
                    label: "Penggunaan Penyimpanan",
                    color: .orange,
                    minLabel: "0%",
                    maxLabel: "\(String(format: "%.0f", storageValues.max() ?? 100))%"
                )

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Penggunaan \(ByteFormatter.formatPercent(monitor.storageStats.usagePercent))")
                        Spacer()
                        Text(monitor.storageStats.isLow ? "MENIPIS" : "Aman")
                            .font(.caption2)
                            .bold()
                            .foregroundColor(monitor.storageStats.isLow ? .orange : .green)
                    }
                    ProgressView(value: monitor.storageStats.usagePercent, total: 100)
                        .tint(monitor.storageStats.isLow ? .orange : .green)
                }
                .padding(14)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                Button(action: cleanStorage) {
                    HStack {
                        if isCleaning {
                            ProgressView().controlSize(.small)
                        }
                        Image(systemName: "trash.fill")
                        Text(isCleaning ? "Membersihkan..." : "Bersihkan Penyimpanan")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(isCleaning)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Spacer(minLength: 20)
            }
            .padding()
        }
        .alert("Bersihkan Penyimpanan", isPresented: $showResultAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            if let result = cleanResult {
                Text("Bebaskan \(ByteFormatter.formatBytes(result.0)) (\(result.1.count) berkas).")
            } else {
                Text("Gagal membersihkan penyimpanan.")
            }
        }
    }

    private func cleanStorage() {
        isCleaning = true
        Task {
            cleanResult = await monitor.cleanStorage()
            isCleaning = false
            showResultAlert = true
        }
    }
}
