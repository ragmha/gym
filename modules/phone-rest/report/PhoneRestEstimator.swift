import Foundation

// Internal to the report extension (and the pure test target), never the app module.
struct PhoneRestSegment: Equatable {
    let interval: DateInterval
    let totalActivityDuration: TimeInterval
    let firstPickup: Date?
    let pickupsWithoutApplicationActivity: Int

    var isActive: Bool {
        totalActivityDuration > 0 || firstPickup != nil || pickupsWithoutApplicationActivity > 0
    }
}

struct PhoneRestDataset {
    let window: DateInterval
    let lastUpdatedDate: Date
    let isIPhone: Bool
    let segments: [PhoneRestSegment]
}

struct PhoneRestEstimate: Equatable {
    let coveredInactivity: DateInterval
    let lowerBound: TimeInterval
    let upperBound: TimeInterval

    // Round outwards: a whole-hour label must not tighten the evidence bounds.
    var hourRange: ClosedRange<Int> {
        Int(floor(lowerBound / 3600))...Int(ceil(upperBound / 3600))
    }

    var durationDescription: String {
        "About \(hourRange.lowerBound)–\(hourRange.upperBound) h"
    }
}

enum PhoneRestUnavailableReason: Equatable {
    case noData
    case ambiguousDevices
    case unsupportedSource
    case unexpectedWindow
    case invalidData
    case incompleteCoverage
    case notReady
    case noBoundedRest

    var explanation: String {
        switch self {
        case .noData:
            return "Screen Time has not provided usable hourly data. It may be unavailable, not ready, or not permitted."
        case .ambiguousDevices:
            return "More than one device dataset was returned. Phones are not combined or chosen."
        case .unsupportedSource:
            return "This prototype needs data from exactly one iPhone."
        case .unexpectedWindow:
            return "Screen Time did not return the requested hourly evening-to-noon window."
        case .invalidData:
            return "Some hourly data is invalid or inconsistent. No estimate is shown."
        case .incompleteCoverage:
            return "Hourly coverage is missing or truncated. Unreported time is not inactivity."
        case .notReady:
            return "Screen Time has not yet updated through the end of this window."
        case .noBoundedRest:
            return "No fully covered inactive stretch of at least 3 hours has phone activity on both sides."
        }
    }
}

enum PhoneRestOutcome: Equatable {
    case estimate(PhoneRestEstimate)
    case unavailable(PhoneRestUnavailableReason)
}

enum PhoneRestEstimator {
    static let minimumCoveredInactivity: TimeInterval = 3 * 3600
    static let maximumHourlyBucketDuration: TimeInterval = 3600
    // A generous work limit for an evening-to-noon hourly report, including DST.
    static let maximumSegmentCount = 48

    static func estimate(_ datasets: [PhoneRestDataset], now: Date) -> PhoneRestOutcome {
        guard !datasets.isEmpty else { return .unavailable(.noData) }
        // Device names/models do not identify a physical phone. Even equal-looking
        // datasets are not merged; duplicate or multi-user/device reports fail closed.
        guard datasets.count == 1, let dataset = datasets.first else {
            return .unavailable(.ambiguousDevices)
        }
        guard dataset.isIPhone else { return .unavailable(.unsupportedSource) }
        guard isValid(dataset.window),
              now.timeIntervalSinceReferenceDate.isFinite,
              dataset.lastUpdatedDate.timeIntervalSinceReferenceDate.isFinite,
              dataset.window.end <= now,
              dataset.lastUpdatedDate <= now
        else {
            return .unavailable(.invalidData)
        }
        guard !dataset.segments.isEmpty else { return .unavailable(.noData) }
        guard dataset.segments.count <= maximumSegmentCount,
              dataset.segments.allSatisfy({ isValid($0, during: dataset.window) })
        else {
            return .unavailable(.invalidData)
        }
        guard dataset.lastUpdatedDate >= dataset.window.end else {
            return .unavailable(.notReady)
        }

        let segments = dataset.segments.sorted { $0.interval.start < $1.interval.start }
        var cursor = dataset.window.start
        for segment in segments {
            guard segment.interval.start >= cursor else { return .unavailable(.invalidData) }
            guard segment.interval.start == cursor else {
                return .unavailable(.incompleteCoverage)
            }
            cursor = segment.interval.end
        }
        guard cursor == dataset.window.end else { return .unavailable(.incompleteCoverage) }

        var previousActive: PhoneRestSegment?
        var quietStart: Date?
        var best: PhoneRestEstimate?

        for segment in segments {
            if !segment.isActive {
                if quietStart == nil { quietStart = segment.interval.start }
                continue
            }

            if let start = quietStart, let left = previousActive {
                let lower = segment.interval.start.timeIntervalSince(start)
                if lower >= minimumCoveredInactivity {
                    // Last use lies somewhere in the left active bucket; next use
                    // lies somewhere in the right one. Pickups mark activity but
                    // are not treated as exact bed/wake times or final phone use.
                    let candidate = PhoneRestEstimate(
                        coveredInactivity: DateInterval(start: start, end: segment.interval.start),
                        lowerBound: lower,
                        upperBound: segment.interval.end.timeIntervalSince(left.interval.start)
                    )
                    if best == nil || lower > (best?.lowerBound ?? 0) {
                        best = candidate
                    }
                }
            }
            previousActive = segment
            quietStart = nil
        }

        // Leading/trailing quiet runs have no two-sided activity bounds. They are
        // never candidates, and separate overnight fragments are never summed.
        guard let best else { return .unavailable(.noBoundedRest) }
        return .estimate(best)
    }

    private static func isValid(_ interval: DateInterval) -> Bool {
        interval.start.timeIntervalSinceReferenceDate.isFinite
            && interval.end.timeIntervalSinceReferenceDate.isFinite
            && interval.duration.isFinite
            && interval.duration > 0
    }

    private static func isValid(_ segment: PhoneRestSegment, during window: DateInterval) -> Bool {
        guard isValid(segment.interval),
              segment.interval.duration <= maximumHourlyBucketDuration,
              segment.interval.start >= window.start,
              segment.interval.end <= window.end,
              segment.totalActivityDuration.isFinite,
              segment.totalActivityDuration >= 0,
              segment.totalActivityDuration <= segment.interval.duration,
              segment.pickupsWithoutApplicationActivity >= 0
        else {
            return false
        }
        if let pickup = segment.firstPickup {
            return pickup.timeIntervalSinceReferenceDate.isFinite
                && pickup >= segment.interval.start
                && pickup < segment.interval.end
        }
        return true
    }
}
