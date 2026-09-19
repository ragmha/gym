// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PhoneRestPure",
    platforms: [.iOS(.v16), .macOS(.v13)],
    targets: [
        .target(
            name: "PhoneRestWindowCore",
            path: "shared",
            sources: ["PhoneRestWindow.swift"]
        ),
        .target(
            name: "PhoneRestEstimatorCore",
            path: "report",
            exclude: ["PhoneRestReport.swift"],
            sources: ["PhoneRestEstimator.swift"]
        ),
        .testTarget(
            name: "PhoneRestTests",
            dependencies: ["PhoneRestWindowCore", "PhoneRestEstimatorCore"],
            path: "Tests"
        ),
    ]
)
