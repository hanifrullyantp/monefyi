import Foundation

struct NetworkStats {
    let interface: String
    let bytesIn: UInt64
    let bytesOut: UInt64
    let packetsIn: UInt64
    let packetsOut: UInt64
    var speedIn: UInt64
    var speedOut: UInt64
    let timestamp: Date
}
