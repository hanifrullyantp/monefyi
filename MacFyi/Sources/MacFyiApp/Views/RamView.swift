import SwiftUI

struct RamView: View {
    @EnvironmentObject var monitor: MonitorManager
    @State private var isCleaning = false
    @State private var cleanResult: Bool?
    @State private var showResultAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Statistik kartu
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Total", value: ByteFormatter.formatBytes(monitor.memoryStats.total), icon: "memorychip", color: .blue)
                    StatCard(title: "Digunakan", value: ByteFormatter.formatBytes(monitor.memoryStats.used), icon: "drop.fill", color: .red)
                    StatCard(title: "Tersedia", value: ByteFormatter.formatBytes(monitor.memoryStats.available), icon: "arrow.down.circle", color: .green)
                    StatCard(title: "Wired", value: ByteFormatter.formatBytes(monitor.memoryStats.wired), icon: "lock.fill", color: .purple)
                }

                // Grafik penggunaan RAM
                let ramValues = monitor.ramHistory.map { $0.value }
                ChartView(
                    points: ramValues,
                    label: "Penggunaan RAM",
                    color: .blue,
                    minLabel: "0%",
                    maxLabel: "\(String(format: "%.0f", ramValues.max() ?? 100))%"
                )

                // Status progres
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Penggunaan \(ByteFormatter.formatPercent(monitor.memoryStats.usagePercent))")
                        Spacer()
                        Text(monitor.memoryStats.isCritical ? "KRITIS" : "Normal")
                            .font(.caption2)
                            .bold()
                            .foregroundColor(monitor.memoryStats.isCritical ? .red : .green)
                    }
                    ProgressView(value: monitor.memoryStats.usagePercent, total: 100)
                        .tint(monitor.memoryStats.isCritical ? .red : .blue)
                }
                .padding(14)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                // Detail komposisi
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Aktif", value: ByteFormatter.formatBytes(monitor.memoryStats.active), icon: "circle.fill", color: .orange)
                    StatCard(title: "Terkompresi", value: ByteFormatter.formatBytes(monitor.memoryStats.compressed), icon: "archivebox.fill", color: .teal)
                    StatCard(title: "Inaktif", value: ByteFormatter.formatBytes(monitor.memoryStats.inactive), icon: "pause.fill", color: .gray)
                }

                // Tombol bersihkan
                Button(action: cleanMemory) {
                    HStack {
                        if isCleaning {
                            ProgressView().controlSize(.small)
                        }
                        Image(systemName: "broom.fill")
                        Text(isCleaning ? "Membersihkan..." : "Bersihkan RAM")
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
        .alert("Bersihkan RAM", isPresented: $showResultAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(cleanResult == true ? "Cache memori berhasil dibersihkan." : "Gagal membersihkan RAM.")
        }
    }

    private func cleanMemory() {
        isCleaning = true
        Task {
            cleanResult = await monitor.purgeMemory()
            isCleaning = false
            showResultAlert = true
        }
    }
}
