import Foundation

// Mirrors `WatchState` in src/lib/watch/index.ts.
struct LoggedSet: Codable, Hashable {
  let reps: Int
  let kilograms: Double?
}

struct Exercise: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  /// Nil for "To Failure" exercises.
  let sets: Int?
  let reps: Int
  /// Load to start from; nil is body weight.
  let kilograms: Double?
  var logged: [LoggedSet]

  var done: Bool { sets.map { logged.count >= $0 } ?? false }
  var ringSegments: Int { max(sets ?? 1, 1) }
  // An open-ended exercise has no completion fraction.
  var filledSegments: Int { sets.map { min(logged.count, max($0, 0)) } ?? 0 }

  private var loggedSets: String { "\(logged.count) \(logged.count == 1 ? "set" : "sets")" }

  var progress: String {
    sets.map { "\(logged.count)/\($0) sets" } ?? "\(loggedSets) · to failure"
  }

  func band(locked: Bool) -> String {
    if locked { return "\(loggedSets) logged" }
    if let sets, logged.count >= sets { return "All \(sets) sets done" }
    return "Set: \(logged.count + 1)" + (sets.map { " of \($0)" } ?? "")
  }
}

struct WorkoutState: Codable {
  let dateKey: String
  let day: String?
  let title: String
  let subtitle: String?
  let note: String?
  let locked: Bool
  var exercises: [Exercise]
}
