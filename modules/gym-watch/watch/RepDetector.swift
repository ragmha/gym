import Foundation

/// Counts reps from the wrist's vertical acceleration (in g, gravity removed).
///
/// A complete cycle needs an initial push, the opposite push, then a return
/// to the first direction. Two lobes alone can just be lowering the wrist.
struct RepDetector {
  // ponytail: vertical motion only; stationary-wrist exercises need the camera.
  var threshold = 0.07
  private(set) var reps = 0
  private var smoothed = 0.0
  private var direction = 0
  private var pushes = 0

  /// Feeds one 50 Hz sample; returns true when it completes a rep.
  mutating func add(_ verticalG: Double) -> Bool {
    guard verticalG.isFinite else {
      smoothed = 0
      direction = 0
      pushes = 0
      return false
    }
    // About a 3 Hz low-pass: drops tremor and foot strikes, keeps the lift.
    smoothed += 0.27 * (verticalG - smoothed)
    let next = smoothed > threshold ? 1 : smoothed < -threshold ? -1 : 0
    guard next != 0, next != direction else { return false }
    direction = next
    pushes += 1
    guard pushes >= 3, !pushes.isMultiple(of: 2), reps < 500 else { return false }
    reps += 1
    return true
  }
}
