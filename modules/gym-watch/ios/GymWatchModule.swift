import ExpoModulesCore
import WatchConnectivity

/// The iPhone's lifting log stays the source of truth: JS pushes today's
/// workout to the watch and drains the sets the watch sends back.
public class GymWatchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GymWatch")
    Events("onMessages")

    OnCreate {
      WatchLink.shared.start { [weak self] in self?.sendEvent("onMessages") }
    }

    Function("setState") { (json: String) in
      WatchLink.shared.push(json)
    }

    Function("takeMessages") { () -> [String] in
      WatchLink.shared.takeMessages()
    }
  }
}

/// Outlives JS reloads; queues watch messages until JS (and the saved log) is ready.
final class WatchLink: NSObject, WCSessionDelegate {
  static let shared = WatchLink()

  private let queue = DispatchQueue(label: "io.raghib.gym.watch-link")
  private var inbox: [String] = []
  private var latest: String?
  private var notify: (() -> Void)?

  func start(notify: @escaping () -> Void) {
    queue.sync { self.notify = notify }
    guard WCSession.isSupported(), WCSession.default.delegate == nil else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func push(_ json: String) {
    queue.async {
      self.latest = json
      self.flush()
    }
  }

  func takeMessages() -> [String] {
    queue.sync {
      defer { inbox.removeAll() }
      return inbox
    }
  }

  // Runs on `queue`. Fails quietly when no watch app is installed or paired.
  private func flush() {
    guard let latest, WCSession.isSupported(),
          WCSession.default.activationState == .activated else { return }
    try? WCSession.default.updateApplicationContext(["state": latest])
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    queue.async { self.flush() }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    guard let json = message["json"] as? String else { return }
    let notify = queue.sync { () -> (() -> Void)? in
      inbox.append(json)
      return self.notify
    }
    notify?()
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  // Called after switching to another paired watch.
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
}
