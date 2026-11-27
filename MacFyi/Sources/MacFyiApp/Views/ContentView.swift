import SwiftUI

struct ContentView: View {
    @EnvironmentObject var monitor: MonitorManager
    @State private var selectedTab = 0

    private let tabs = ["Ringkasan", "RAM", "Penyimpanan", "Jaringan", "CPU", "Pengaturan"]

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $selectedTab) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                    Text(title).tag(index)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            Group {
                switch selectedTab {
                case 0: SummaryView()
                case 1: RamView()
                case 2: StorageView()
                case 3: NetworkView()
                case 4: CpuView()
                case 5: SettingsView()
                default: SummaryView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environmentObject(monitor)
        }
        .frame(width: 560, height: 700)
    }
}
