import SwiftUI

struct SummaryView: View {
    @EnvironmentObject var monitor: MonitorManager

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Kunci metrik
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(
                        title: "RAM",
                        value: ByteFormatter.formatPercent(monitor.memoryStats.usagePercent),
                        icon: monitor.memoryStats.isCritical ? "exclamationmark.circle.fill" : "memorychip",
                        color: monitor.memoryStats.isCritical ? .red : .blue
                    )
                    StatCard(
                        title: "Penyimpanan",
                        value: ByteFormatter.formatPercent(monitor.storageStats.usagePercent),
                        icon: monitor.storageStats.isLow ? "exclamationmark.circle.fill" : "internaldrive.fill",
                        color: monitor.storageStats.isLow ? .orange : .green
                    )
                    StatCard(
                        title: "CPU",
                        value: "\(String(format: "%.0f", monitor.cpuStats.overallLoad))%",
                        icon: "cpu.fill",
                        color: .red
                    )
                    StatCard(
                        title: "Dapat Dikosongkan",
                        value: ByteFormatter.formatBytes(monitor.reclaimableStorage),
                        icon: "trash.fill",
                        color: .red
                    )
                }

                // Grafik gabung ringan
                VStack(alignment: .leading, spacing: 10) {
                    if !monitor.ramHistory.isEmpty {
                        ChartView(
                            points: monitor.ramHistory.map { $0.value },
                            label: "RAM",
                            color: .blue,
                            minLabel: "0%",
                            maxLabel: "100%"
                        )
                    }
                    if !monitor.storageHistory.isEmpty {
                        ChartView(
                            points: monitor.storageHistory.map { $0.value },
                            label: "Penyimpanan",
                            color: .orange,
                            minLabel: "0%",
                            maxLabel: "100%"
                        )
                    }
                }

                // Status anti-tidur
                HStack {
                    Image(systemName: CaffeinateManager.shared.isWorking ? "sun.max.fill" : "sun.max")
                        .foregroundColor(CaffeinateManager.shared.isWorking ? .orange : .gray)
                    Text(CaffeinateManager.shared.isWorking ? "Anti-Tidur Aktif" : "Anti-Tidur Mati")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Spacer()
                }
                .padding(12)
                .background(CaffeinateManager.shared.isWorking ? Color.orange.opacity(0.15) : Color(NSColor.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                Spacer(minLength: 20)
            }
            .padding()
        }
    }
}
