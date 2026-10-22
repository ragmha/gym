import Foundation

func expectFailure(_ operation: () throws -> Void) {
  do {
    try operation()
    fatalError("Expected a safe failure.")
  } catch is PlannerFailure {
    // Native errors must not escape the boundary.
  } catch {
    fatalError("Unexpected error type.")
  }
}

func localDate(_ date: Date, zone: TimeZone) -> DateComponents {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = zone
  return calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
}

let riyadh = TimeZone(identifier: "Asia/Riyadh")!
let losAngeles = TimeZone(identifier: "America/Los_Angeles")!
let utc = TimeZone(secondsFromGMT: 0)!

for completed in [true, false] {
  let value = try PlannerValues.reminderCompletion(id: "ABC-123:Reminder/1", completed: completed)
  assert(value.id == "ABC-123:Reminder/1" && value.completed == completed)
}
_ = try PlannerValues.reminderCompletion(id: String(repeating: "a", count: 1_024), completed: true)
for id in [" abc ", "a b", "🔑", String(repeating: "🔑", count: 512)] {
  let value = try PlannerValues.reminderCompletion(id: id, completed: false)
  assert(value.id == id && !value.completed)
}
for id in ["", " ", "\u{2003}", "\n", "abc\n", "abc\u{0}", "\u{7f}",
  String(repeating: "a", count: 1_025), String(repeating: "🔑", count: 513)] {
  expectFailure { _ = try PlannerValues.reminderCompletion(id: id, completed: true) }
}
for completed: Any in [0, 1, 2, 0.0, 1.0, "true", "false", NSNull()] {
  expectFailure { _ = try PlannerValues.reminderCompletion(id: "ABC", completed: completed) }
}
let boxedTrue = try PlannerValues.reminderCompletion(id: "ABC", completed: NSNumber(value: true))
let boxedFalse = try PlannerValues.reminderCompletion(id: "ABC", completed: NSNumber(value: false))
assert(boxedTrue.completed && !boxedFalse.completed)

assert(PlannerValues.cappedReminders(incomplete: [Int](), completed: []).isEmpty)
assert(PlannerValues.cappedReminders(incomplete: [1, 2], completed: [3, 4]) == [1, 2, 3, 4])
assert(PlannerValues.cappedReminders(incomplete: Array(0..<199), completed: [500, 501])
  == Array(0..<199) + [500])
assert(PlannerValues.cappedReminders(incomplete: Array(0..<200), completed: [500])
  == Array(0..<200))
assert(PlannerValues.cappedReminders(incomplete: Array(0..<201), completed: [500])
  == Array(0..<200))
assert(PlannerValues.cappedReminders(incomplete: [Int](), completed: Array(0..<201))
  == Array(0..<200))

try PlannerValues.validateKey("")
try PlannerValues.validateKey(String(repeating: "a", count: 256))
try PlannerValues.validateKey("abc-123_+/=")
for key in [" ", "a b", "\n", "\u{7f}", "🔑", String(repeating: "a", count: 257)] {
  expectFailure { try PlannerValues.validateKey(key) }
}

let undated = try PlannerValues.due(nil)
assert(undated.date == nil && !undated.hasTime)
let dateOnly = DateComponents(
  calendar: Calendar(identifier: .gregorian), timeZone: utc,
  year: 2026, month: 10, day: 21
)
for zone in [riyadh, losAngeles] {
  let due = try PlannerValues.due(dateOnly, localTimeZone: zone)
  assert(!due.hasTime)
  let parts = localDate(due.date!, zone: zone)
  assert(parts.year == 2026 && parts.month == 10 && parts.day == 21)
  assert(parts.hour == 0 && parts.minute == 0)
}

var timed = dateOnly
timed.hour = 12
timed.minute = 30
let timedDue = try PlannerValues.due(timed, localTimeZone: riyadh)
assert(timedDue.hasTime)
assert(localDate(timedDue.date!, zone: utc).hour == 12)
assert(localDate(timedDue.date!, zone: riyadh).hour == 15)
timed.timeZone = nil
let localTimedDue = try PlannerValues.due(timed, localTimeZone: riyadh)
assert(localDate(localTimedDue.date!, zone: riyadh).hour == 12)

for day in [8, 9] {
  let components = DateComponents(year: 2026, month: 3, day: day)
  let due = try PlannerValues.due(components, localTimeZone: losAngeles)
  assert(localDate(due.date!, zone: losAngeles).day == day)
  assert(localDate(due.date!, zone: losAngeles).hour == 0)
}
expectFailure { _ = try PlannerValues.due(DateComponents(year: 2026, month: 2, day: 30)) }
expectFailure { _ = try PlannerValues.due(DateComponents(hour: 12)) }

for zone in [riyadh, losAngeles] {
  for (month, day) in [(10, 21), (3, 8), (11, 1)] {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = zone
    let today = calendar.date(from: DateComponents(year: 2026, month: month, day: day))!
    let end = calendar.date(byAdding: .day, value: 1, to: today)!
    let tomorrowComponents = calendar.dateComponents([.year, .month, .day], from: end)
    let tomorrowDue = try PlannerValues.due(tomorrowComponents, localTimeZone: zone)
    assert(tomorrowDue.date == end && !tomorrowDue.hasTime)
    assert(!PlannerValues.includesReminder(due: tomorrowDue.date, end: end))
    assert(!PlannerValues.includesReminder(due: end.addingTimeInterval(1), end: end))
    assert(PlannerValues.includesReminder(due: today, end: end))
    assert(PlannerValues.includesReminder(due: today.addingTimeInterval(-1), end: end))
    assert(PlannerValues.includesReminder(due: end.addingTimeInterval(-0.001), end: end))
    assert(PlannerValues.includesReminder(due: nil, end: end))
    for completion in [today, today.addingTimeInterval(1), end.addingTimeInterval(-0.001)] {
      assert(PlannerValues.includesCompletedReminder(
        completed: true, completionDate: completion, start: today, end: end
      ))
      assert(!PlannerValues.includesCompletedReminder(
        completed: false, completionDate: completion, start: today, end: end
      ))
    }
    for completion in [today.addingTimeInterval(-0.001), end, end.addingTimeInterval(1),
      Date(timeIntervalSince1970: .nan), Date(timeIntervalSince1970: .infinity)] {
      assert(!PlannerValues.includesCompletedReminder(
        completed: true, completionDate: completion, start: today, end: end
      ))
    }
    assert(!PlannerValues.includesCompletedReminder(
      completed: true, completionDate: nil, start: today, end: end
    ))
  }
}

_ = try PlannerValues.day(startMs: 0, endMs: 25 * 60 * 60 * 1_000)
for (start, end) in [
  (Double.nan, 1.0), (0, Double.infinity), (1, 1), (2, 1),
  (0, 27 * 60 * 60 * 1_000), (-Double.greatestFiniteMagnitude, 0),
] {
  expectFailure { _ = try PlannerValues.day(startMs: start, endMs: end) }
}
try PlannerValues.checkCount(200, failure: .eventsOverflow)
try PlannerValues.checkCount(200, failure: .remindersOverflow)
expectFailure { try PlannerValues.checkCount(201, failure: .eventsOverflow) }
expectFailure { try PlannerValues.checkCount(201, failure: .remindersOverflow) }
print("Planner value checks passed.")
