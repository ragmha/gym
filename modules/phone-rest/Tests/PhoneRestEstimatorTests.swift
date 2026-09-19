import Foundation
import XCTest
@testable import PhoneRestEstimatorCore
@testable import PhoneRestWindowCore

final class PhoneRestEstimatorTests: XCTestCase {
    private let hour: TimeInterval = 3600

    func testValidBoundedGapHasConservativeBounds() throws {
        let dataset = try fixture()
        let estimate = try value(evaluate(dataset))
        XCTAssertEqual(estimate.lowerBound, 6 * hour)
        XCTAssertEqual(estimate.upperBound, 8 * hour)
        XCTAssertEqual(estimate.coveredInactivity.start, dataset.window.start.addingTimeInterval(5 * hour))
        XCTAssertEqual(estimate.coveredInactivity.end, dataset.window.start.addingTimeInterval(11 * hour))
        XCTAssertEqual(estimate.hourRange, 6...8)
        XCTAssertEqual(estimate.durationDescription, "About 6–8 h")
    }

    func testOrderingDoesNotChangeTheResult() throws {
        let dataset = try fixture()
        XCTAssertEqual(evaluate(replacing(dataset, segments: Array(dataset.segments.reversed()))), evaluate(dataset))
    }

    func testEmptyDataAndEmptySegmentsAreUnavailable() throws {
        let dataset = try fixture()
        XCTAssertEqual(PhoneRestEstimator.estimate([], now: dataset.window.end), .unavailable(.noData))
        XCTAssertEqual(evaluate(replacing(dataset, segments: [])), .unavailable(.noData))
    }

    func testAllZeroIsNotInventedRest() throws {
        XCTAssertEqual(evaluate(try fixture(quiet: Set(0..<18))), .unavailable(.noBoundedRest))
    }

    func testAllActiveHasNoRestCandidate() throws {
        XCTAssertEqual(evaluate(try fixture(quiet: [])), .unavailable(.noBoundedRest))
    }

    func testAbsentQuietHourInvalidatesCoverageRatherThanBecomingZero() throws {
        let dataset = try fixture()
        var segments = dataset.segments
        segments.remove(at: 8)
        XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.incompleteCoverage))
    }

    func testMissingCoverageOutsideCandidateAlsoFailsClosed() throws {
        let dataset = try fixture()
        var segments = dataset.segments
        segments.remove(at: 2)
        XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.incompleteCoverage))
    }

    func testTruncatedLeadingAndTrailingDataAreUnavailable() throws {
        let dataset = try fixture()
        for segments in [Array(dataset.segments.dropFirst()), Array(dataset.segments.dropLast())] {
            XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.incompleteCoverage))
        }
    }

    func testUnboundedQuietLeadingAndTrailingRunsAreNotCandidates() throws {
        for quiet in [Set(0..<11), Set(5..<18)] {
            XCTAssertEqual(evaluate(try fixture(quiet: quiet)), .unavailable(.noBoundedRest))
        }
    }

    func testUnboundedTailIsNotAddedToABoundedCandidate() throws {
        let quiet = Set(5..<11).union(14..<18)
        let estimate = try value(evaluate(try fixture(quiet: quiet)))
        XCTAssertEqual(estimate.lowerBound, 6 * hour)
    }

    func testMidNightUseSplitsRatherThanSumsRest() throws {
        let quiet = Set(5..<9).union(10..<13)
        let estimate = try value(evaluate(try fixture(quiet: quiet)))
        XCTAssertEqual(estimate.lowerBound, 4 * hour)
        XCTAssertEqual(estimate.upperBound, 6 * hour)
    }

    func testSeveralShortFragmentsDoNotMeetMinimumBySumming() throws {
        let quiet = Set(5..<7).union(8..<10).union(11..<13)
        XCTAssertEqual(evaluate(try fixture(quiet: quiet)), .unavailable(.noBoundedRest))
    }

    func testFirstPickupAloneIsActivityAndNotAnExactWakeTime() throws {
        let dataset = try fixture(quiet: Set(5..<13))
        var segments = dataset.segments
        segments[9] = replacing(
            segments[9], duration: 0, firstPickup: segments[9].interval.start.addingTimeInterval(600)
        )
        let estimate = try value(evaluate(replacing(dataset, segments: segments)))
        XCTAssertEqual(estimate.lowerBound, 4 * hour)
        XCTAssertEqual(estimate.upperBound, 6 * hour)
    }

    func testPickupsWithoutAppActivityAlsoSplitTheRun() throws {
        let dataset = try fixture(quiet: Set(5..<13))
        var segments = dataset.segments
        segments[9] = replacing(segments[9], duration: 0, pickups: 1)
        XCTAssertEqual(try value(evaluate(replacing(dataset, segments: segments))).lowerBound, 4 * hour)
    }

    func testAnyPositiveActivityCountsButGenuineZeroRemainsZero() throws {
        let dataset = try fixture()
        XCTAssertEqual(try value(evaluate(dataset)).lowerBound, 6 * hour)
        var segments = dataset.segments
        segments[7] = replacing(segments[7], duration: .leastNonzeroMagnitude)
        XCTAssertEqual(try value(evaluate(replacing(dataset, segments: segments))).lowerBound, 3 * hour)
    }

    func testThreeHourMinimumIsInclusive() throws {
        XCTAssertEqual(try value(evaluate(try fixture(quiet: Set(5..<8)))).lowerBound, 3 * hour)
        XCTAssertEqual(evaluate(try fixture(quiet: Set(5..<7))), .unavailable(.noBoundedRest))
    }

    func testRoundingIsOutwardAndCannotCreateAMinimumLengthRun() throws {
        let start = try date("2026-09-11T18:00:00Z")
        let lengths: [TimeInterval] = [1800, 3600, 3600, 3600, 1800, 900]
        var cursor = start
        let segments = lengths.enumerated().map { index, length -> PhoneRestSegment in
            let interval = DateInterval(start: cursor, duration: length)
            cursor = interval.end
            return segment(interval, duration: index == 0 || index == 5 ? 60 : 0)
        }
        let dataset = PhoneRestDataset(
            window: DateInterval(start: start, end: cursor),
            lastUpdatedDate: cursor, isIPhone: true, segments: segments
        )
        let estimate = try value(evaluate(dataset))
        XCTAssertEqual(estimate.lowerBound, 3.5 * hour)
        XCTAssertEqual(estimate.upperBound, 4.25 * hour)
        XCTAssertEqual(estimate.hourRange, 3...5)

        let tooShortLengths: [TimeInterval] = [3600, 3600, 3600, 3599, 3600]
        cursor = start
        let tooShort = tooShortLengths.enumerated().map { index, length -> PhoneRestSegment in
            let interval = DateInterval(start: cursor, duration: length)
            cursor = interval.end
            return segment(interval, duration: index == 0 || index == 4 ? 60 : 0)
        }
        let shortDataset = PhoneRestDataset(
            window: DateInterval(start: start, end: cursor),
            lastUpdatedDate: cursor, isIPhone: true, segments: tooShort
        )
        XCTAssertEqual(evaluate(shortDataset), .unavailable(.noBoundedRest))
    }

    func testTieBreakIsDeterministicallyTheEarliestRun() throws {
        let dataset = try fixture(quiet: Set(3..<6).union(8..<11))
        let estimate = try value(evaluate(dataset))
        XCTAssertEqual(estimate.coveredInactivity.start, dataset.window.start.addingTimeInterval(3 * hour))
    }

    func testDuplicateAndOverlappingBucketsAreRejected() throws {
        let dataset = try fixture()
        XCTAssertEqual(
            evaluate(replacing(dataset, segments: dataset.segments + [dataset.segments[6]])),
            .unavailable(.invalidData)
        )
        var segments = dataset.segments
        segments[6] = segment(
            DateInterval(start: segments[6].interval.start.addingTimeInterval(-60), duration: hour),
            duration: 0
        )
        XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
    }

    func testNegativeNonFiniteAndImpossibleActivityDurationsAreRejected() throws {
        let dataset = try fixture()
        for duration in [-1, Double.nan, .infinity, -.infinity, hour + 1] {
            var segments = dataset.segments
            segments[7] = replacing(segments[7], duration: duration)
            XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
        }
    }

    func testExactlyFullBucketActivityIsValid() throws {
        let dataset = try fixture()
        var segments = dataset.segments
        segments[4] = replacing(segments[4], duration: hour)
        XCTAssertEqual(try value(evaluate(replacing(dataset, segments: segments))).lowerBound, 6 * hour)
    }

    func testNegativePickupsAndInvalidPickupDatesAreRejected() throws {
        let dataset = try fixture()
        var segments = dataset.segments
        segments[7] = replacing(segments[7], duration: 0, pickups: -1)
        XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
        for pickup in [
            dataset.segments[7].interval.start.addingTimeInterval(-1),
            dataset.segments[7].interval.end,
            Date(timeIntervalSinceReferenceDate: .nan),
            Date(timeIntervalSinceReferenceDate: .infinity),
        ] {
            segments = dataset.segments
            segments[7] = replacing(segments[7], duration: 0, firstPickup: pickup)
            XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
        }
    }

    func testZeroLengthOversizedAndNonFiniteBucketsAreRejected() throws {
        let dataset = try fixture()
        let invalidIntervals = [
            DateInterval(start: dataset.segments[7].interval.start, duration: 0),
            DateInterval(start: dataset.segments[7].interval.start, duration: hour + 1),
            DateInterval(start: Date(timeIntervalSinceReferenceDate: .nan), duration: hour),
        ]
        for interval in invalidIntervals {
            var segments = dataset.segments
            segments[7] = segment(interval, duration: 0)
            XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
        }
    }

    func testBucketsOutsideRequestedWindowAreRejectedNotClipped() throws {
        let dataset = try fixture()
        let leading = segment(DateInterval(start: dataset.window.start.addingTimeInterval(-hour), duration: hour), duration: 0)
        let trailing = segment(DateInterval(start: dataset.window.end, duration: hour), duration: 0)
        for extra in [leading, trailing] {
            XCTAssertEqual(
                evaluate(replacing(dataset, segments: dataset.segments + [extra])),
                .unavailable(.invalidData)
            )
        }
    }

    func testDataNotUpdatedThroughWindowIsNotReady() throws {
        let dataset = try fixture()
        let stale = PhoneRestDataset(
            window: dataset.window,
            lastUpdatedDate: dataset.window.end.addingTimeInterval(-1),
            isIPhone: true, segments: dataset.segments
        )
        XCTAssertEqual(evaluate(stale), .unavailable(.notReady))
    }

    func testFutureOrNonFiniteDataIsRejected() throws {
        let dataset = try fixture()
        let now = dataset.window.end
        XCTAssertEqual(
            PhoneRestEstimator.estimate([dataset], now: now.addingTimeInterval(-1)),
            .unavailable(.invalidData)
        )
        for updated in [
            now.addingTimeInterval(1),
            Date(timeIntervalSinceReferenceDate: .nan),
            Date(timeIntervalSinceReferenceDate: .infinity),
        ] {
            let invalid = PhoneRestDataset(
                window: dataset.window, lastUpdatedDate: updated,
                isIPhone: true, segments: dataset.segments
            )
            XCTAssertEqual(PhoneRestEstimator.estimate([invalid], now: now), .unavailable(.invalidData))
        }
        XCTAssertEqual(
            PhoneRestEstimator.estimate([dataset], now: Date(timeIntervalSinceReferenceDate: .nan)),
            .unavailable(.invalidData)
        )
    }

    func testMultipleEvenIdenticalDeviceDatasetsAreAmbiguous() throws {
        let dataset = try fixture()
        XCTAssertEqual(
            PhoneRestEstimator.estimate([dataset, dataset], now: dataset.window.end),
            .unavailable(.ambiguousDevices)
        )
    }

    func testNonIPhoneDataIsUnavailable() throws {
        let dataset = try fixture()
        let otherDevice = PhoneRestDataset(
            window: dataset.window, lastUpdatedDate: dataset.lastUpdatedDate,
            isIPhone: false, segments: dataset.segments
        )
        XCTAssertEqual(evaluate(otherDevice), .unavailable(.unsupportedSource))
    }

    func testOversizedInputFailsClosed() throws {
        let dataset = try fixture()
        let segments = Array(repeating: dataset.segments[0], count: PhoneRestEstimator.maximumSegmentCount + 1)
        XCTAssertEqual(evaluate(replacing(dataset, segments: segments)), .unavailable(.invalidData))
    }

    func testCurrentDayCompletedHoursStillRequireCoverageAndActivityBounds() throws {
        let now = try date("2026-09-12T09:30:00Z")
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        let dataset = fixture(window: window, quiet: Set(5..<11))
        XCTAssertEqual(window.end, try date("2026-09-12T09:00:00Z"))
        XCTAssertEqual(dataset.segments.last?.interval.duration, hour)
        XCTAssertEqual(try value(PhoneRestEstimator.estimate([dataset], now: now)).lowerBound, 6 * hour)
        let ongoing = fixture(window: window, quiet: Set(5..<16))
        XCTAssertEqual(PhoneRestEstimator.estimate([ongoing], now: now), .unavailable(.noBoundedRest))
    }

    func testCachedMorningDataRemainsUsableAcrossRefreshesWithinTheHour() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let updated = try date("2026-09-12T08:00:20Z")
        for timestamp in ["2026-09-12T08:12:00Z", "2026-09-12T08:47:19Z", "2026-09-12T08:59:59Z"] {
            let now = try date(timestamp)
            let window = try XCTUnwrap(PhoneRestWindow.interval(
                for: "2026-09-12", now: now, calendar: calendar
            ))
            let dataset = PhoneRestDataset(
                window: window, lastUpdatedDate: updated, isIPhone: true,
                segments: fixture(window: window, quiet: Set(5..<11)).segments
            )
            XCTAssertLessThan(updated, now)
            XCTAssertEqual(window.end, try date("2026-09-12T08:00:00Z"))
            XCTAssertEqual(try value(PhoneRestEstimator.estimate([dataset], now: now)).hourRange, 6...8)
        }
    }

    func testNextCompletedHourStillRequiresFreshData() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let now = try date("2026-09-12T09:01:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        let segments = fixture(window: window, quiet: Set(5..<11)).segments
        for timestamp in ["2026-09-12T08:00:20Z", "2026-09-12T08:59:59Z"] {
            let stale = PhoneRestDataset(
                window: window, lastUpdatedDate: try date(timestamp),
                isIPhone: true, segments: segments
            )
            XCTAssertEqual(PhoneRestEstimator.estimate([stale], now: now), .unavailable(.notReady))
        }
        let fresh = PhoneRestDataset(
            window: window, lastUpdatedDate: window.end, isIPhone: true, segments: segments
        )
        XCTAssertEqual(try value(PhoneRestEstimator.estimate([fresh], now: now)).hourRange, 6...8)
    }

    func testMissingCompletedMorningHourIsNotInferredFromFreshness() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let now = try date("2026-09-12T09:30:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        let dataset = fixture(window: window, quiet: Set(5..<11))
        let missingHour = PhoneRestDataset(
            window: window, lastUpdatedDate: now, isIPhone: true,
            segments: Array(dataset.segments.dropLast())
        )
        XCTAssertEqual(PhoneRestEstimator.estimate([missingHour], now: now), .unavailable(.incompleteCoverage))
    }

    func testDSTUsesElapsedCoverageIncludingRepeatedHour() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "America/New_York"))
        let now = try date("2026-11-02T18:00:00Z")
        let spring = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-03-08", now: now, calendar: calendar
        ))
        let fall = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-11-01", now: now, calendar: calendar
        ))
        let springData = fixture(window: spring, quiet: Set(5..<11))
        let fallData = fixture(window: fall, quiet: Set(5..<13))
        XCTAssertEqual(springData.segments.count, 17)
        XCTAssertEqual(fallData.segments.count, 19)
        XCTAssertEqual(try value(evaluate(springData)).hourRange, 6...8)
        XCTAssertEqual(try value(evaluate(fallData)).hourRange, 8...10)
        XCTAssertEqual(fallData.segments.filter { calendar.component(.hour, from: $0.interval.start) == 1 }.count, 2)
    }

    private func fixture(quiet: Set<Int> = Set(5..<11)) throws -> PhoneRestDataset {
        let start = try date("2026-09-11T18:00:00Z")
        return fixture(window: DateInterval(start: start, duration: 18 * hour), quiet: quiet)
    }

    private func fixture(window: DateInterval, quiet: Set<Int>) -> PhoneRestDataset {
        var cursor = window.start
        var segments: [PhoneRestSegment] = []
        while cursor < window.end {
            let end = min(cursor.addingTimeInterval(hour), window.end)
            let interval = DateInterval(start: cursor, end: end)
            segments.append(segment(interval, duration: quiet.contains(segments.count) ? 0 : min(60, interval.duration)))
            cursor = end
        }
        return PhoneRestDataset(
            window: window, lastUpdatedDate: window.end,
            isIPhone: true, segments: segments
        )
    }

    private func segment(_ interval: DateInterval, duration: TimeInterval) -> PhoneRestSegment {
        PhoneRestSegment(
            interval: interval, totalActivityDuration: duration,
            firstPickup: nil, pickupsWithoutApplicationActivity: 0
        )
    }

    private func replacing(
        _ segment: PhoneRestSegment,
        duration: TimeInterval,
        firstPickup: Date? = nil,
        pickups: Int = 0
    ) -> PhoneRestSegment {
        PhoneRestSegment(
            interval: segment.interval, totalActivityDuration: duration,
            firstPickup: firstPickup, pickupsWithoutApplicationActivity: pickups
        )
    }

    private func replacing(_ dataset: PhoneRestDataset, segments: [PhoneRestSegment]) -> PhoneRestDataset {
        PhoneRestDataset(
            window: dataset.window, lastUpdatedDate: dataset.lastUpdatedDate,
            isIPhone: dataset.isIPhone, segments: segments
        )
    }

    private func evaluate(_ dataset: PhoneRestDataset) -> PhoneRestOutcome {
        PhoneRestEstimator.estimate([dataset], now: dataset.window.end.addingTimeInterval(hour))
    }

    private func value(
        _ outcome: PhoneRestOutcome,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws -> PhoneRestEstimate {
        guard case .estimate(let estimate) = outcome else {
            XCTFail("Expected an estimate, got \(outcome)", file: file, line: line)
            throw ExpectedEstimate.missing
        }
        return estimate
    }

    private func date(_ value: String) throws -> Date {
        try XCTUnwrap(ISO8601DateFormatter().date(from: value))
    }

    private enum ExpectedEstimate: Error {
        case missing
    }
}
