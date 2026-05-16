import ActivityKit
import ExpoModulesCore

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    AsyncFunction("areActivitiesEnabled") { () -> Bool in
      guard #available(iOS 16.2, *) else {
        return false
      }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("startActivity") { (attrs: [String: Any], state: [String: Any]) async throws -> String? in
      guard #available(iOS 16.2, *) else {
        return nil
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        return nil
      }

      let attributes = try makeAttributes(from: attrs)
      let contentState = try makeState(from: state)
      let content = ActivityContent(state: contentState, staleDate: nil)
      let activity = try Activity<WorkoutActivityAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
      return activity.id
    }

    AsyncFunction("updateActivity") { (id: String, state: [String: Any]) async throws in
      guard #available(iOS 16.2, *) else {
        return
      }
      guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.id == id }) else {
        return
      }

      let content = ActivityContent(state: try makeState(from: state), staleDate: nil)
      await activity.update(content)
    }

    AsyncFunction("endActivity") { (id: String) async in
      guard #available(iOS 16.2, *) else {
        return
      }
      guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.id == id }) else {
        return
      }

      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}

private enum LiveActivityModuleError: LocalizedError {
  case invalidAttributes
  case invalidState

  var errorDescription: String? {
    switch self {
    case .invalidAttributes:
      return "Invalid activity attributes"
    case .invalidState:
      return "Invalid activity state"
    }
  }
}

private let iso8601Formatter = ISO8601DateFormatter()

@available(iOS 16.2, *)
private func makeAttributes(from attrs: [String: Any]) throws -> WorkoutActivityAttributes {
  guard
    let workoutName = attrs["workoutName"] as? String,
    let startedAtRaw = attrs["startedAt"] as? String,
    let startedAt = iso8601Formatter.date(from: startedAtRaw)
  else {
    throw LiveActivityModuleError.invalidAttributes
  }

  return WorkoutActivityAttributes(workoutName: workoutName, startedAt: startedAt)
}

@available(iOS 16.2, *)
private func makeState(from state: [String: Any]) throws -> WorkoutActivityAttributes.ContentState {
  guard
    let exerciseName = state["exerciseName"] as? String,
    let currentSet = state["currentSet"] as? Int,
    let totalSets = state["totalSets"] as? Int
  else {
    throw LiveActivityModuleError.invalidState
  }

  let restEndsAt: Date?
  if let raw = state["restEndsAt"] as? String {
    restEndsAt = iso8601Formatter.date(from: raw)
  } else {
    restEndsAt = nil
  }

  return WorkoutActivityAttributes.ContentState(
    exerciseName: exerciseName,
    currentSet: max(1, currentSet),
    totalSets: max(1, totalSets),
    restEndsAt: restEndsAt
  )
}
