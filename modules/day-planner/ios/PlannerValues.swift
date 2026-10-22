import Foundation
import CoreFoundation

enum PlannerFailure: Error {
  case unavailable, invalidDay, calendarRead, remindersRead, invalidReminderDate
  case eventsOverflow, remindersOverflow, permissionConfiguration, permissionRequest
  case invalidKey, keychain, invalidReminderCompletion, remindersWrite

  var message: String {
    switch self {
    case .unavailable: return "The Today planner requires iOS 17 or later."
    case .invalidDay: return "A valid day interval is required."
    case .calendarRead: return "Calendar events could not be read."
    case .remindersRead: return "Reminders could not be read."
    case .invalidReminderDate: return "A reminder due date could not be read."
    case .eventsOverflow: return "The day contains more than 200 calendar events."
    case .remindersOverflow: return "The day contains more than 200 due or undated reminders."
    case .permissionConfiguration: return "Planner access is not configured in this application."
    case .permissionRequest: return "Planner access could not be requested."
    case .invalidKey: return "The transit key must contain at most 256 printable ASCII characters."
    case .keychain: return "The transit key could not be accessed securely."
    case .invalidReminderCompletion: return "A valid reminder identifier and completion state are required."
    case .remindersWrite: return "The reminder completion could not be saved."
    }
  }
}

enum PlannerValues {
  static let limit = 200

  static func reminderCompletion(
    id: String, completed: Any
  ) throws -> (id: String, completed: Bool) {
    guard !id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, id.utf16.count <= 1_024,
      id.unicodeScalars.allSatisfy({ !CharacterSet.controlCharacters.contains($0) }),
      let value = completed as? NSNumber,
      CFGetTypeID(value) == CFBooleanGetTypeID()
    else { throw PlannerFailure.invalidReminderCompletion }
    return (id, value.boolValue)
  }

  static func includesCompletedReminder(
    completed: Bool, completionDate: Date?, start: Date, end: Date
  ) -> Bool {
    guard completed, let completionDate, completionDate.timeIntervalSince1970.isFinite else {
      return false
    }
    return completionDate >= start && completionDate < end
  }

  static func cappedReminders<T>(incomplete: [T], completed: [T]) -> [T] {
    let pending = Array(incomplete.prefix(limit))
    return pending + completed.prefix(limit - pending.count)
  }

  static func day(startMs: Double, endMs: Double) throws -> (Date, Date) {
    guard startMs.isFinite, endMs.isFinite,
      startMs >= -62_135_596_800_000, endMs <= 253_402_300_799_999,
      startMs < endMs, endMs - startMs <= 26 * 60 * 60 * 1_000
    else { throw PlannerFailure.invalidDay }
    return (
      Date(timeIntervalSince1970: startMs / 1_000),
      Date(timeIntervalSince1970: endMs / 1_000)
    )
  }

  static func validateKey(_ key: String) throws {
    guard key.utf8.count <= 256,
      key.utf8.allSatisfy({ $0 >= 0x21 && $0 <= 0x7e })
    else { throw PlannerFailure.invalidKey }
  }

  static func due(
    _ components: DateComponents?, localTimeZone: TimeZone = .current
  ) throws -> (date: Date?, hasTime: Bool) {
    guard let components else { return (nil, false) }
    guard components.year != nil, components.month != nil, components.day != nil else {
      throw PlannerFailure.invalidReminderDate
    }
    let hasTime = components.hour != nil || components.minute != nil || components.second != nil
    var calendar = components.calendar ?? Calendar(identifier: .gregorian)
    calendar.timeZone = hasTime ? (components.timeZone ?? localTimeZone) : localTimeZone
    var localComponents = components
    // Date-only due dates are local civil days, not midnight UTC.
    localComponents.calendar = calendar
    localComponents.timeZone = calendar.timeZone
    guard localComponents.isValidDate(in: calendar),
      let date = calendar.date(from: localComponents),
      date.timeIntervalSince1970.isFinite
    else { throw PlannerFailure.invalidReminderDate }
    return (date, hasTime)
  }

  static func checkCount(_ count: Int, failure: PlannerFailure) throws {
    guard count <= limit else { throw failure }
  }

  static func includesReminder(due: Date?, end: Date) -> Bool {
    if let due, due >= end { return false }
    return true
  }
}
