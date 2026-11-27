import Foundation
import Darwin

final class NetworkMonitor {
    static let shared = NetworkMonitor()
    private init() {}

    private var previous: [String: (bytesIn: UInt64, bytesOut: UInt64, packetsIn: UInt64, packetsOut: UInt64, timestamp: Date)] = [:]

    func fetch() -> [NetworkStats] {
        let now = Date()
        var stats: [NetworkStats] = []

        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0 else { return [] }
        defer { freeifaddrs(ifaddr) }

        var pointer = ifaddr
        while let node = pointer {
            let interface = node.pointee
            let name = String(cString: interface.ifa_name)

            if name == "lo0" {
                pointer = interface.ifa_next
                continue
            }

            guard let addr = interface.ifa_addr,
                  Int32(addr.pointee.sa_family) == AF_LINK,
                  let data = interface.ifa_data?.assumingMemoryBound(to: if_data.self) else {
                pointer = interface.ifa_next
                continue
            }

            let ifData = data.pointee
            let bytesIn = UInt64(ifData.ifi_ibytes)
            let bytesOut = UInt64(ifData.ifi_obytes)
            let packetsIn = UInt64(ifData.ifi_ipackets)
            let packetsOut = UInt64(ifData.ifi_opackets)

            var speedIn: UInt64 = 0
            var speedOut: UInt64 = 0
            if let prev = previous[name] {
                let elapsed = now.timeIntervalSince(prev.timestamp)
                if elapsed > 0, bytesIn >= prev.bytesIn, bytesOut >= prev.bytesOut {
                    speedIn = UInt64(Double(bytesIn - prev.bytesIn) / elapsed)
                    speedOut = UInt64(Double(bytesOut - prev.bytesOut) / elapsed)
                }
            }

            previous[name] = (bytesIn, bytesOut, packetsIn, packetsOut, now)

            stats.append(NetworkStats(interface: name, bytesIn: bytesIn, bytesOut: bytesOut, packetsIn: packetsIn, packetsOut: packetsOut, speedIn: speedIn, speedOut: speedOut, timestamp: now))
            pointer = interface.ifa_next
        }

        return stats
    }
}
