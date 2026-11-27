import SwiftUI

struct CpuView: View {
    @EnvironmentObject var monitor: MonitorManager

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Beban Keseluruhan", value: "\(String(format: "%.1f", monitor.cpuStats.overallLoad))%", icon: "cpu.fill", color: .red)
                    StatCard(title: "User", value: "\(String(format: "%.1f", monitor.cpuStats.userLoad))%", icon: "person.fill", color: .blue)
                    StatCard(title: "System", value: "\(String(format: "%.1f", monitor.cpuStats.systemLoad))%", icon: "desktopcomputer", color: .green)
                    StatCard(title: "Idle", value: "\(String(format: "%.1f", monitor.cpuStats.idleLoad))%", icon: "power", color: .gray)
                }

                let cpuValues = monitor.cpuHistory.map { $0.value }
                ChartView(
                    points: cpuValues,
                    label: "Beban CPU",
                    color: .red,
                    minLabel: "0%",
                    maxLabel: "\(String(format: "%.0f", cpuValues.max() ?? 100))%"
                )

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: thermalIcon)
                            .foregroundColor(thermalColor)
                        Text("Suhu / Termal: \(monitor.cpuStats.thermalState.capitalized)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Spacer()
                    }
                    ProgressView(value: thermalProgress, total: 100)
                        .tint(thermalColor)
                }
                .padding(14)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                Spacer(minLength: 20)
            }
            .padding()
        }
    }

    private var thermalIcon: String {
        switch monitor.cpuStats.thermalState.lowercased() {
        case "nominal": return "thermometer.sun"
        case "fair": return "thermometer.medium"
        case "serious": return "thermometer.high"
        case "critical": return "thermometer.exclamationmark"
        default: return "thermometer"
        }
    }

    private var thermalColor: Color {
        switch monitor.cpuStats.thermalState.lowercased() {
        case "nominal": return .green
        case "fair": return .blue
        case "serious": return .orange
        case "critical": return .red
        default: return .gray
        }
    }

    private var thermalProgress: Double {
        let map: [String: Double] = ["nominal": 25, "fair": 50, "serious": 75, "critical": 95]
        return map[monitor.cpuStats.thermalState.lowercased()] ?? 0
    }
}
