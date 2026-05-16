import ActivityKit
import Foundation

struct WorkoutActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var exerciseName: String
    var currentSet: Int
    var totalSets: Int
    var restEndsAt: Date?
  }

  var workoutName: String
  var startedAt: Date
}
