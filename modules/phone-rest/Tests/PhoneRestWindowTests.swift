import Foundation
import XCTest
@testable import PhoneRestWindowCore

final class PhoneRestWindowTests: XCTestCase {
    func testEveningToNoonUsesLocalTime() throws {
        let calendar = try calendar("Asia/Riyadh")
        let now = try date("2026-09-13T12:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))

        XCTAssertEqual(window.start, try date("2026-09-11T15:00:00Z"))
        XCTAssertEqual(window.end, try date("2026-09-12T09:00:00Z"))
        XCTAssertEqual(window.duration, 18 * 3600)
        XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), "2026-09-12")
    }

    func testRejectsMalformedAndNormalizedDates() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-13T12:00:00Z")
        let invalid = [
            "", "2026-9-12", "26-09-12", "02026-09-12", "2026/09/12",
            "2026-09-12 ", " 2026-09-12", "2026-09-12T00:00:00Z",
            "２０２６-０９-１２", "2026-00-12", "2026-13-12", "2026-09-00",
            "2026-09-31", "2026-04-31", "2026-02-29", "2024-02-30",
            "1900-02-29", "0000-01-01", "-001-01-01", "2026-+9-12",
        ]
        for key in invalid {
            XCTAssertNil(PhoneRestWindow.interval(for: key, now: now, calendar: calendar), key)
        }
    }

    func testAcceptsActualLeapDays() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-13T12:00:00Z")
        for key in ["2000-02-29", "2024-02-29"] {
            let window = try XCTUnwrap(PhoneRestWindow.interval(for: key, now: now, calendar: calendar))
            XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), key)
        }
    }

    func testFutureDateIsRejectedEvenAfterTodaysWindow() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T23:30:00Z")
        XCTAssertNil(PhoneRestWindow.interval(for: "2026-09-13", now: now, calendar: calendar))
    }

    func testFutureCheckUsesLocalDayRatherThanUTCDay() throws {
        let calendar = try calendar("Asia/Riyadh")
        let now = try date("2026-09-11T21:30:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.end, try date("2026-09-11T21:00:00Z"))
        XCTAssertNil(PhoneRestWindow.interval(for: "2026-09-13", now: now, calendar: calendar))
    }

    func testCurrentDayExcludesIncompleteHourAndAcceptsDeliveryAcrossHourBoundary() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T08:47:19Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.end, try date("2026-09-12T08:00:00Z"))
        XCTAssertEqual(window.start, try date("2026-09-11T18:00:00Z"))
        XCTAssertEqual(
            PhoneRestWindow.dateKey(
                forWindow: window, now: try date("2026-09-12T09:02:00Z"), calendar: calendar
            ),
            "2026-09-12"
        )
    }

    func testMorningRefreshesShareAnEndpointUntilTheNextHour() throws {
        let calendar = try calendar("UTC")
        let endpoint = try date("2026-09-12T08:00:00Z")
        let offsets: [TimeInterval] = [0, 1, 28 * 60, 3599]
        for offset in offsets {
            let window = try XCTUnwrap(PhoneRestWindow.interval(
                for: "2026-09-12", now: endpoint.addingTimeInterval(offset), calendar: calendar
            ))
            XCTAssertEqual(window.end, endpoint)
        }
        let nextHour = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: endpoint.addingTimeInterval(3600), calendar: calendar
        ))
        XCTAssertEqual(nextHour.end, endpoint.addingTimeInterval(3600))
    }

    func testHourBoundaryUsesLocalTimeInAFractionalOffsetZone() throws {
        let calendar = try calendar("Asia/Kathmandu")
        let now = try date("2026-09-12T03:02:19Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.end, try date("2026-09-12T02:15:00Z"))
        XCTAssertEqual(calendar.component(.hour, from: window.end), 8)
        XCTAssertEqual(calendar.component(.minute, from: window.end), 0)
    }

    func testLastMorningHourIsIncludedOnlyOnceNoonArrives() throws {
        let calendar = try calendar("UTC")
        let noon = try date("2026-09-12T12:00:00Z")
        let beforeNoon = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: noon.addingTimeInterval(-1), calendar: calendar
        ))
        let atNoon = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: noon, calendar: calendar
        ))
        XCTAssertEqual(beforeNoon.end, noon.addingTimeInterval(-3600))
        XCTAssertEqual(atNoon.end, noon)
    }

    func testCurrentDayAtMidnightIsStillAValidPartialWindow() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T00:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.duration, 6 * 3600)
        XCTAssertEqual(window.end, now)
        XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), "2026-09-12")
    }

    func testCurrentDayAfterNoonEndsAtNoon() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T20:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.end, try date("2026-09-12T12:00:00Z"))
    }

    func testDSTSpringForwardIsSeventeenElapsedHours() throws {
        let calendar = try calendar("America/New_York")
        let now = try date("2026-03-09T18:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-03-08", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.start, try date("2026-03-07T23:00:00Z"))
        XCTAssertEqual(window.end, try date("2026-03-08T16:00:00Z"))
        XCTAssertEqual(window.duration, 17 * 3600)
        XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), "2026-03-08")
    }

    func testDSTFallBackIsNineteenElapsedHours() throws {
        let calendar = try calendar("America/New_York")
        let now = try date("2026-11-02T18:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-11-01", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.start, try date("2026-10-31T22:00:00Z"))
        XCTAssertEqual(window.end, try date("2026-11-01T17:00:00Z"))
        XCTAssertEqual(window.duration, 19 * 3600)
        XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), "2026-11-01")
    }

    func testCurrentHourBoundaryHandlesSkippedAndRepeatedDSTHours() throws {
        let calendar = try calendar("America/New_York")
        let cases = [
            ("2026-03-08", "2026-03-08T07:30:00Z", "2026-03-08T07:00:00Z"),
            ("2026-11-01", "2026-11-01T05:30:00Z", "2026-11-01T05:00:00Z"),
            ("2026-11-01", "2026-11-01T06:30:00Z", "2026-11-01T06:00:00Z"),
        ]
        for (key, timestamp, expected) in cases {
            let now = try date(timestamp)
            let window = try XCTUnwrap(PhoneRestWindow.interval(for: key, now: now, calendar: calendar))
            XCTAssertEqual(window.end, try date(expected))
            XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), key)
        }
    }

    func testGregorianKeysDoNotFollowCalendarPreference() throws {
        var calendar = Calendar(identifier: .buddhist)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Asia/Riyadh"))
        let now = try date("2026-09-13T12:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(window.end, try date("2026-09-12T09:00:00Z"))
        XCTAssertEqual(PhoneRestWindow.dateKey(for: window.end, calendar: calendar), "2026-09-12")
    }

    func testRejectsSkippedCivilDateRatherThanNormalizingIt() throws {
        let calendar = try calendar("Pacific/Apia")
        let now = try date("2012-01-02T12:00:00Z")
        XCTAssertNil(PhoneRestWindow.interval(for: "2011-12-30", now: now, calendar: calendar))
    }

    func testRejectsNonFiniteDates() throws {
        let calendar = try calendar("UTC")
        for value in [Double.nan, .infinity, -.infinity] {
            let invalidDate = Date(timeIntervalSinceReferenceDate: value)
            XCTAssertNil(PhoneRestWindow.interval(for: "2026-09-12", now: invalidDate, calendar: calendar))
            XCTAssertNil(PhoneRestWindow.dateKey(for: invalidDate, calendar: calendar))
        }
    }

    func testMetadataRecoversHistoricalRequestedDayNotToday() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-14T19:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        XCTAssertEqual(PhoneRestWindow.dateKey(forWindow: window, now: now, calendar: calendar), "2026-09-12")
    }

    func testRejectsWrongStartAndTruncatedHistoricalMetadata() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-14T19:00:00Z")
        let window = try XCTUnwrap(PhoneRestWindow.interval(
            for: "2026-09-12", now: now, calendar: calendar
        ))
        let shifted = DateInterval(start: window.start.addingTimeInterval(3600), end: window.end)
        let shortened = DateInterval(start: window.start, end: window.end.addingTimeInterval(-3600))
        let tooLate = DateInterval(start: window.start, end: window.end.addingTimeInterval(3600))
        for invalid in [shifted, shortened, tooLate] {
            XCTAssertNil(PhoneRestWindow.dateKey(forWindow: invalid, now: now, calendar: calendar))
        }
    }

    func testRejectsFutureAndPreviousEveningOnlyMetadata() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T09:00:00Z")
        let start = try date("2026-09-11T18:00:00Z")
        let future = DateInterval(start: start, end: now.addingTimeInterval(1))
        let previousEvening = DateInterval(start: start, end: start.addingTimeInterval(3600))
        XCTAssertNil(PhoneRestWindow.dateKey(forWindow: future, now: now, calendar: calendar))
        XCTAssertNil(PhoneRestWindow.dateKey(forWindow: previousEvening, now: now, calendar: calendar))
    }

    func testMetadataRejectsPartialHoursEvenWhenDeliveryIsDelayed() throws {
        let calendar = try calendar("UTC")
        let now = try date("2026-09-12T09:45:00Z")
        let start = try date("2026-09-11T18:00:00Z")
        for endpoint in ["2026-09-12T08:47:19Z", "2026-09-12T09:30:00Z"] {
            let partialHour = DateInterval(start: start, end: try date(endpoint))
            XCTAssertNil(PhoneRestWindow.dateKey(forWindow: partialHour, now: now, calendar: calendar))
        }
        XCTAssertNil(PhoneRestWindow.dateKey(
            forWindow: DateInterval(start: start, duration: 0), now: now, calendar: calendar
        ))
    }

    private func calendar(_ zone: String) throws -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: zone))
        return calendar
    }

    private func date(_ value: String) throws -> Date {
        try XCTUnwrap(ISO8601DateFormatter().date(from: value))
    }
}
