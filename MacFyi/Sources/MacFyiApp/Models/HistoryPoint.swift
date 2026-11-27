import Foundation

struct HistoryPoint: Identifiable {
    let id = UUID()
    let value: Double
    let timestamp: Date
}
