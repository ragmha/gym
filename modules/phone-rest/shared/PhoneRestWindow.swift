import Foundation

public enum PhoneRestWindow {
    /// Local Gregorian dates, independent of the user's preferred calendar.
    /// The prototype window is the previous evening at 18:00 through noon.
    /// Today's incomplete local hour is excluded so refreshes within that hour
    /// do not continually advance the freshness/coverage requirement.
    public static func interval(
        for dateKey: String,
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> DateInterval? {
        let calendar = localGregorianCalendar(calendar)
        guard now.timeIntervalSinceReferenceDate.isFinite,
              let selectedNoon = noon(for: dateKey, calendar: calendar),
              calendar.startOfDay(for: selectedNoon) <= calendar.startOfDay(for: now),
              let previousDay = calendar.date(byAdding: .day, value: -1, to: selectedNoon),
              let start = localDate(on: previousDay, hour: 18, calendar: calendar),
              let currentHourStart = calendar.dateInterval(of: .hour, for: now)?.start
        else {
            return nil
        }

        let end = min(selectedNoon, currentHourStart)
        guard start < end else { return nil }
        return DateInterval(start: start, end: end)
    }

    /// Recovers the requested date from `.hourly(during:)` metadata, never from
    /// observed activity edges. Accepts an earlier completed-hour boundary on
    /// the same day because delivery can cross an hour after filter creation.
    public static func dateKey(
        forWindow window: DateInterval,
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> String? {
        let calendar = localGregorianCalendar(calendar)
        guard window.start.timeIntervalSinceReferenceDate.isFinite,
              window.end.timeIntervalSinceReferenceDate.isFinite,
              window.duration.isFinite,
              window.duration > 0,
              now.timeIntervalSinceReferenceDate.isFinite,
              window.end <= now,
              let selectedDay = calendar.date(byAdding: .day, value: 1, to: window.start),
              let key = dateKey(for: selectedDay, calendar: calendar),
              let expected = interval(for: key, now: now, calendar: calendar),
              window.start == expected.start,
              window.end <= expected.end
        else {
            return nil
        }

        if window.end == expected.end {
            return key
        }

        guard calendar.isDate(selectedDay, inSameDayAs: now),
              window.end >= calendar.startOfDay(for: selectedDay),
              calendar.dateInterval(of: .hour, for: window.end)?.start == window.end
        else {
            return nil
        }
        return key
    }

    public static func dateKey(for date: Date, calendar: Calendar = .current) -> String? {
        guard date.timeIntervalSinceReferenceDate.isFinite else { return nil }
        let components = localGregorianCalendar(calendar).dateComponents(
            [.era, .year, .month, .day], from: date
        )
        guard components.era == 1,
              let year = components.year, (1...9999).contains(year),
              let month = components.month,
              let day = components.day
        else {
            return nil
        }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    private static func localGregorianCalendar(_ calendar: Calendar) -> Calendar {
        var result = Calendar(identifier: .gregorian)
        result.timeZone = calendar.timeZone
        return result
    }

    private static func noon(for key: String, calendar: Calendar) -> Date? {
        let bytes = Array(key.utf8)
        guard bytes.count == 10, bytes[4] == 45, bytes[7] == 45,
              bytes.enumerated().allSatisfy({ index, byte in
                  index == 4 || index == 7 || (48...57).contains(byte)
              }),
              let year = Int(key.prefix(4)), (1...9999).contains(year),
              let month = Int(key.dropFirst(5).prefix(2)), (1...12).contains(month),
              let day = Int(key.suffix(2)), (1...31).contains(day)
        else {
            return nil
        }

        let components = DateComponents(
            era: 1, year: year, month: month, day: day, hour: 12, minute: 0, second: 0
        )
        guard let date = calendar.date(from: components),
              calendar.dateComponents(
                  [.era, .year, .month, .day, .hour, .minute, .second], from: date
              ) == components
        else {
            return nil
        }
        return date
    }

    private static func localDate(on day: Date, hour: Int, calendar: Calendar) -> Date? {
        var components = calendar.dateComponents([.era, .year, .month, .day], from: day)
        components.hour = hour
        components.minute = 0
        components.second = 0
        guard let date = calendar.date(from: components),
              calendar.dateComponents(
                  [.era, .year, .month, .day, .hour, .minute, .second], from: date
              ) == components
        else {
            return nil
        }
        return date
    }
}
