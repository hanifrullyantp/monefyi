import SwiftUI

/// Kartu statistik dengan gradasi ringan dan ikon SF Symbol.
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(color)
                Spacer()
            }
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [color.opacity(0.12), color.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(color.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

/// Grafik garis ringan (sparkline) tanpa dependensi eksternal.
struct ChartView: View {
    let points: [Double]
    let label: String
    let color: Color
    let minLabel: String
    let maxLabel: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Text(maxLabel)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            GeometryReader { geo in
                path(in: geo.size)
                    .stroke(color, lineWidth: 2)
                    .background(
                        path(in: geo.size)
                            .stroke(color.opacity(0.15), lineWidth: 2)
                            .blur(radius: 2)
                    )
            }
            .frame(height: 70)
            HStack {
                Text(minLabel)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Spacer()
                Text("sekarang")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [Color.gray.opacity(0.10), Color.gray.opacity(0.04)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.gray.opacity(0.30), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func path(in size: CGSize) -> Path {
        guard points.count > 1 else { return Path() }
        var p = Path()
        let step = size.width / CGFloat(points.count - 1)
        let minVal = points.min() ?? 0
        let maxVal = points.max() ?? 1
        let range = maxVal - minVal
        let h = size.height

        for (i, val) in points.enumerated() {
            let x = CGFloat(i) * step
            let y = h - (CGFloat((val - minVal) / max(range, 0.001)) * h)
            if i == 0 {
                p.move(to: CGPoint(x: x, y: y))
            } else {
                p.addLine(to: CGPoint(x: x, y: y))
            }
        }
        return p
    }
}
