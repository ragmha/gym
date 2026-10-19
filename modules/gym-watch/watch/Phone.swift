import Foundation
import Observation
import WatchConnectivity

/// The iPhone owns the lifting log. The watch shows its latest copy and sends taps back.
@MainActor @Observable
final class Phone: NSObject, WCSessionDelegate {
  private(set) var state: WorkoutState?
  private(set) var error: String?
  /// The iPhone's last copy, restored when a tap cannot reach it.
  private var confirmed: WorkoutState?

  override init() {
    super.init()
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  /// Asks the iPhone for today's workout (wakes its app in the background).
  func sync() {
    guard WCSession.default.activationState == .activated else { return }
    send(["action": "sync"], failure: nil)
  }

  func log(_ exercise: Exercise, reps: Int, kilograms: Double?) {
    guard let state, let day = state.day else { return }
    change(exercise.id) { $0.logged.append(LoggedSet(reps: reps, kilograms: kilograms)) }
    send(
      [
        "action": "log", "dateKey": state.dateKey, "day": day, "exerciseId": exercise.id,
        "reps": reps, "kilograms": kilograms.map { $0 as Any } ?? NSNull(),
      ],
      failure: "iPhone not reachable. Set not saved."
    )
  }

  func undo(_ exercise: Exercise) {
    guard let state else { return }
    change(exercise.id) { _ = $0.logged.popLast() }
    send(
      ["action": "undo", "dateKey": state.dateKey, "exerciseId": exercise.id],
      failure: "iPhone not reachable. Undo not saved."
    )
  }

  /// Shows a tap straight away; the iPhone's next state confirms or replaces it.
  private func change(_ id: String, _ edit: (inout Exercise) -> Void) {
    guard var next = state, let index = next.exercises.firstIndex(where: { $0.id == id })
    else { return }
    edit(&next.exercises[index])
    state = next
  }

  private func send(_ message: [String: Any], failure: String?) {
    error = nil
    guard let data = try? JSONSerialization.data(withJSONObject: message),
          let json = String(data: data, encoding: .utf8) else { return }
    WCSession.default.sendMessage(["json": json], replyHandler: nil) { [weak self] _ in
      guard let failure else { return }
      Task { @MainActor in
        guard let self else { return }
        self.state = self.confirmed
        self.error = failure
      }
    }
  }

  private func apply(_ next: WorkoutState?) {
    guard let next else { return }
    confirmed = next
    state = next
  }

  nonisolated private static func decode(_ context: [String: Any]) -> WorkoutState? {
    guard let json = context["state"] as? String else { return nil }
    return try? JSONDecoder().decode(WorkoutState.self, from: Data(json.utf8))
  }

  nonisolated func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    let saved = Self.decode(session.receivedApplicationContext)
    Task { @MainActor in
      self.apply(saved)
      self.sync()
    }
  }

  nonisolated func session(
    _ session: WCSession,
    didReceiveApplicationContext applicationContext: [String: Any]
  ) {
    let next = Self.decode(applicationContext)
    Task { @MainActor in self.apply(next) }
  }

  // Reachability flickers at launch, so a sync sent then can fail; retry once the iPhone answers.
  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    guard session.isReachable else { return }
    Task { @MainActor in self.sync() }
  }
}
