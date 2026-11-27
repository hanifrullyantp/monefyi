// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "MacFyi",
    platforms: [.macOS(.v12)],
    products: [
        .executable(name: "MacFyi", targets: ["MacFyiApp"])
    ],
    targets: [
        .executableTarget(
            name: "MacFyiApp",
            path: "Sources/MacFyiApp"
        )
    ]
)
