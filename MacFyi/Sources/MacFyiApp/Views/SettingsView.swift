import SwiftUI
import AppKit

struct SettingsView: View {
    @EnvironmentObject var monitor: MonitorManager
    @State private var notificationsEnabled = false
    @State private var notifChecking = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Pengaturan")
                    .font(.title2)
                    .bold()

                // Notifikasi
                toggleRow(
                    title: "Notifikasi",
                    isOn: $notificationsEnabled,
                    description: "Terima peringatan RAM kritis dan penyimpanan menipis."
                ) { newValue in
                    if newValue {
                        notifChecking = true
                        Task {
                            let granted = await monitor.requestNotificationPermission()
                            notificationsEnabled = granted
                            notifChecking = false
                        }
                    } else {
                        notificationsEnabled = false
                    }
                }

                // Anti-tidur / Work Mode
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Mode Kerja (Anti-Tidur)").bold()
                            Text("Mac dilarang tidur saat mode aktif.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Toggle("", isOn: Binding(
                            get: { CaffeinateManager.shared.workModeEnabled },
                            set: { monitor.toggleCaffeinate() }
                        ))
                    }
                    .padding()
                    .background(.regularMaterial)
                    .cornerRadius(12)
                }

                // Status anti-tidur sekarang
                HStack {
                    Image(systemName: CaffeinateManager.shared.isWorking ? "sun.max.fill" : "sun.max")
                        .foregroundColor(CaffeinateManager.shared.isWorking ? .orange : .gray)
                    Text(CaffeinateManager.shared.isWorking ? "Sedang mencegah tidur" : "Izinkan tidur")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Spacer()
                }
                .padding(.top, 4)

                // Ambang RAM
                infoRow(title: "Ambang RAM", value: "85%", description: "Peringatan dikirim saat penggunaan RAM melebihi ambang ini.")

                // Versi
                infoRow(title: "Versi", value: appVersion, description: "MacFyi untuk macOS.")

                // Keluar
                Button(action: { NSApp.terminate(nil) }) {
                    HStack {
                        Image(systemName: "power")
                        Text("Keluar")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Spacer(minLength: 20)
            }
            .padding()
        }
    }

    @ViewBuilder
    private func toggleRow(title: String, isOn: Binding<Bool>, description: String, action: @escaping (Bool) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).bold()
                    Text(description).font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                if notifChecking && title == "Notifikasi" {
                    ProgressView().controlSize(.small)
                } else {
                    Toggle("", isOn: isOn)
                        .onChange(of: isOn.wrappedValue) { action($0) }
                }
            }
            .padding()
            .background(.regularMaterial)
            .cornerRadius(12)
        }
    }

    @ViewBuilder
    private func infoRow(title: String, value: String, description: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).bold()
                Text(description).font(.caption2).foregroundStyle(.secondary)
            }
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(12)
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }
}
