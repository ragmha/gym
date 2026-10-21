import CoreMotion
import Foundation
import Observation
import WatchKit

/// Counts one set from wrist motion. A physical-therapy runtime session keeps
/// it counting with the wrist down; nothing is stored or sent until the user logs.
@MainActor @Observable
final class RepCounter: NSObject, WKExtendedRuntimeSessionDelegate {
  private(set) var reps = 0
  private(set) var counting = false
  private(set) var ready = false
  private(set) var error: String?
  private let motion = CMMotionManager()
  private var session: WKExtendedRuntimeSession?
  private var detector = RepDetector()
  private var lastRep = Date()
  private var stillSamples = 0
  private var prepareUntil = 0.0

  // ponytail: fixed idle cut-off; a long rest-pause between reps ends the set early.
  private static let idleSeconds = 8.0

  func start(threshold: Double) {
    guard !counting else { return }
    guard motion.isDeviceMotionAvailable else {
      error = "This watch can't count reps."
      return
    }
    reps = 0
    error = nil
    detector = RepDetector()
    detector.threshold = min(0.15, max(0.03, threshold))
    stillSamples = 0
    ready = false
    prepareUntil = ProcessInfo.processInfo.systemUptime + 3
    counting = true
    let session = WKExtendedRuntimeSession()
    session.delegate = self
    session.start()
    self.session = session
    motion.deviceMotionUpdateInterval = 1.0 / 50
    motion.startDeviceMotionUpdates(to: .main) { [weak self] data, error in
      MainActor.assumeIsolated {
        guard let self, self.counting else { return }
        if error != nil {
          self.error = "Motion tracking stopped. Review the count or try again."
          self.stop()
        } else if let data {
          self.handle(data)
        }
      }
    }
  }

  func stop() {
    guard counting else { return }
    counting = false
    motion.stopDeviceMotionUpdates()
    session?.invalidate()
    session = nil
  }

  private func handle(_ data: CMDeviceMotion) {
    // Gravity points down, so this is the upward share of the wrist's acceleration.
    let a = data.userAcceleration, g = data.gravity
    let vertical = -(a.x * g.x + a.y * g.y + a.z * g.z)
    if !ready {
      guard data.timestamp >= prepareUntil else { return }
      // Discard setup motion. Arm only after a full second at rest.
      stillSamples = sqrt(a.x * a.x + a.y * a.y + a.z * a.z) < 0.03 ? stillSamples + 1 : 0
      if stillSamples >= 50 {
        ready = true
        WKInterfaceDevice.current().play(.start)
      }
      return
    }
    if detector.add(vertical) {
      reps = detector.reps
      lastRep = Date()
      WKInterfaceDevice.current().play(.click)
      if reps == 500 { stop() }
    } else if reps > 0, Date().timeIntervalSince(lastRep) > Self.idleSeconds {
      stop()
      WKInterfaceDevice.current().play(.success)
    }
  }

  nonisolated func extendedRuntimeSessionDidStart(_ session: WKExtendedRuntimeSession) {}

  nonisolated func extendedRuntimeSessionWillExpire(_ session: WKExtendedRuntimeSession) {
    Task { @MainActor in
      guard self.session === session else { return }
      self.error = "Counting session expired. Review the count."
      self.stop()
    }
  }

  nonisolated func extendedRuntimeSession(
    _ session: WKExtendedRuntimeSession,
    didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
    error: Error?
  ) {
    guard reason != .none else { return }
    Task { @MainActor in
      guard self.session === session, self.counting else { return }
      self.error = "Wrist-down counting is unavailable. Review the count or log manually."
      self.stop()
    }
  }
}
