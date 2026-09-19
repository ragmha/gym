import DeviceActivity
import Foundation
import SwiftUI

@main
struct PhoneRestReport: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        PhoneRestReportScene()
    }
}

private struct PhoneRestReportConfiguration {
    let outcome: PhoneRestOutcome
    let dateKey: String?
    let window: DateInterval?

    static func unavailable(_ reason: PhoneRestUnavailableReason) -> Self {
        Self(outcome: .unavailable(reason), dateKey: nil, window: nil)
    }
}

private struct PhoneRestReportScene: DeviceActivityReportScene {
    let context = DeviceActivityReport.Context("phone-rest")
    let content: (PhoneRestReportConfiguration) -> PhoneRestReportView = {
        PhoneRestReportView(configuration: $0)
    }

    func makeConfiguration(
        representing data: DeviceActivityResults<DeviceActivityData>
    ) async -> PhoneRestReportConfiguration {
        var datasets: [PhoneRestDataset] = []

        for await deviceData in data {
            guard !Task.isCancelled else { return .unavailable(.notReady) }
            guard datasets.isEmpty else { return .unavailable(.ambiguousDevices) }
            guard deviceData.device.model == .iPhone else { return .unavailable(.unsupportedSource) }
            guard case .hourly(let window) = deviceData.segmentInterval else {
                return .unavailable(.unexpectedWindow)
            }

            var segments: [PhoneRestSegment] = []
            for await segment in deviceData.activitySegments {
                guard !Task.isCancelled else { return .unavailable(.notReady) }
                guard segments.count < PhoneRestEstimator.maximumSegmentCount else {
                    return .unavailable(.invalidData)
                }
                segments.append(PhoneRestSegment(
                    interval: segment.dateInterval,
                    totalActivityDuration: segment.totalActivityDuration,
                    firstPickup: segment.firstPickup,
                    pickupsWithoutApplicationActivity: segment.totalPickupsWithoutApplicationActivity
                ))
            }
            datasets.append(PhoneRestDataset(
                window: window,
                lastUpdatedDate: deviceData.lastUpdatedDate,
                isIPhone: true,
                segments: segments
            ))
        }

        // Capture the validation clock after collection: Screen Time may update
        // while its asynchronous sequences are being read.
        let now = Date()
        guard !Task.isCancelled else { return .unavailable(.notReady) }
        guard let dataset = datasets.first else { return .unavailable(.noData) }
        // The filter interval, unlike the first/last observed bucket, can reveal
        // missing leading/trailing coverage without guessing the requested day.
        guard let dateKey = PhoneRestWindow.dateKey(forWindow: dataset.window, now: now) else {
            return .unavailable(.unexpectedWindow)
        }

        return PhoneRestReportConfiguration(
            outcome: PhoneRestEstimator.estimate(datasets, now: now),
            dateKey: dateKey,
            window: dataset.window
        )
    }
}

private struct PhoneRestReportView: View {
    let configuration: PhoneRestReportConfiguration

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Phone rest")
                .font(.headline)

            switch configuration.outcome {
            case .estimate(let estimate):
                Text(estimate.durationDescription)
                    .font(.title2.weight(.semibold))
                Text("Longest covered, bounded inactive stretch.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            case .unavailable(let reason):
                Text("Unavailable")
                    .font(.title3.weight(.semibold))
                Text(reason.explanation)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("Phone inactivity, not measured sleep")
                .font(.subheadline)

            if let dateKey = configuration.dateKey, let window = configuration.window {
                Text("For \(dateKey) · iPhone Screen Time")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Window: \(window.start.formatted(date: .abbreviated, time: .shortened)) – \(window.end.formatted(date: .abbreviated, time: .shortened)) (local)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("Completed hours only (current hour excluded).")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .accessibilityElement(children: .combine)
    }
}
