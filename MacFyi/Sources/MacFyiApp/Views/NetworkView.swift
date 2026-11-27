import SwiftUI

struct NetworkView: View {
    @EnvironmentObject var monitor: MonitorManager

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if monitor.networkStats.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "wifi.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("Tidak ada antarmuka jaringan aktif")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    ForEach(monitor.networkStats, id: \.interface) { net in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "antenna.radiowaves.left.and.right")
                                    .foregroundColor(.blue)
                                Text(net.interface)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                Spacer()
                            }
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                StatCard(title: "Masuk", value: ByteFormatter.formatBytes(net.bytesIn), icon: "arrow.down", color: .green)
                                StatCard(title: "Keluar", value: ByteFormatter.formatBytes(net.bytesOut), icon: "arrow.up", color: .red)
                                StatCard(title: "Kecepatan Masuk", value: ByteFormatter.formatSpeed(net.speedIn), icon: "arrow.down.circle", color: .green)
                                StatCard(title: "Kecepatan Keluar", value: ByteFormatter.formatSpeed(net.speedOut), icon: "arrow.up.circle", color: .red)
                            }
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                StatCard(title: "Paket Masuk", value: "\(net.packetsIn)", icon: "arrow.down.circle", color: .teal)
                                StatCard(title: "Paket Keluar", value: "\(net.packetsOut)", icon: "arrow.up.circle", color: .teal)
                            }
                        }
                        .padding(12)
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                Spacer(minLength: 20)
            }
            .padding()
        }
    }
}
