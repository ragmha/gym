import DeviceActivity
import ExpoModulesCore
import FamilyControls
import SwiftUI

final class PhoneRestView: ExpoView {
  var dateKey = ""
  var colorScheme = "light"
  private let host = UIHostingController(rootView: AnyView(EmptyView()))

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    host.view.backgroundColor = .clear
    addSubview(host.view)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      host.willMove(toParent: nil)
      host.removeFromParent()
    } else if host.parent == nil {
      var ancestor: UIResponder? = next
      while let responder = ancestor {
        if let controller = responder as? UIViewController {
          controller.addChild(host)
          host.didMove(toParent: controller)
          break
        }
        ancestor = responder.next
      }
    }
  }

  func updateContent() {
    let scheme: ColorScheme = colorScheme == "dark" ? .dark : .light
    if #available(iOS 16.0, *) {
      host.rootView = AnyView(
        PhoneRestContent(dateKey: dateKey)
          .environment(\.colorScheme, scheme)
      )
    } else {
      host.rootView = AnyView(
        Text("Phone rest requires iOS 16 or later.")
          .padding()
          .environment(\.colorScheme, scheme)
      )
    }
  }
}

@available(iOS 16.0, *)
private struct PhoneRestContent: View {
  let dateKey: String
  @ObservedObject private var authorization = AuthorizationCenter.shared
  @State private var busy = false
  @State private var errorMessage: String?
  @State private var reportID = UUID()
  @State private var confirmDisconnect = false

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text("Phone rest · Experimental").font(.headline)
        Text("An overnight phone-inactivity estimate, not measured sleep.")
          .foregroundStyle(.secondary)
        Text(dateKey).font(.subheadline).monospacedDigit()

        #if targetEnvironment(simulator)
        Label("A physical iPhone is required", systemImage: "iphone")
          .font(.headline)
        Text("Screen Time usage cannot be validated in the simulator. No sample estimate is substituted.")
        #else
        if let interval = PhoneRestWindow.interval(for: dateKey) {
          if authorization.authorizationStatus == .approved {
            DeviceActivityReport(
              DeviceActivityReport.Context("phone-rest"),
              filter: DeviceActivityFilter(
                segment: .hourly(during: interval),
                users: .all,
                devices: .init([.iPhone])
              )
            )
            .id(reportID)
            .frame(minHeight: 360)

            Button("Refresh report") { reportID = UUID() }
              .buttonStyle(.bordered)
            Text("If the report stays blank, check Screen Time access in Settings, then refresh. Missing activity is never assumed to be sleep.")
              .font(.footnote)
              .foregroundStyle(.secondary)
            Button("Disconnect Screen Time", role: .destructive) {
              confirmDisconnect = true
            }
            .disabled(busy)
          } else {
            Text("Enable Screen Time access once. iOS supplies hourly activity when you open this report; no Shortcuts or daily logging.")
            Button(busy ? "Requesting access…" : "Enable Phone rest") {
              Task { await requestAccess() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(busy)
            if authorization.authorizationStatus == .denied {
              Text("Access is off. You can review it in iPhone Settings.")
                .foregroundStyle(.secondary)
            }
          }
        } else {
          Text("No valid overnight window for this date. Choose today or a past day.")
            .accessibilityIdentifier("phone-rest-invalid-date")
        }
        #endif

        if let errorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .accessibilityIdentifier("phone-rest-error")
        }
        Text("Activity and estimates remain inside Apple's native report extension. Nothing is saved to Health, sent to the coach, or uploaded.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(20)
    }
    .background(Color(uiColor: .systemBackground))
    .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
      reportID = UUID()
    }
    .confirmationDialog("Disconnect Phone rest?", isPresented: $confirmDisconnect) {
      Button("Disconnect", role: .destructive) {
        Task { await revokeAccess() }
      }
    }
  }

  @MainActor
  private func requestAccess() async {
    busy = true
    errorMessage = nil
    defer { busy = false }
    do {
      try await authorization.requestAuthorization(for: .individual)
      if authorization.authorizationStatus != .approved {
        errorMessage = "Screen Time access was not granted. Phone rest remains unavailable."
      }
    } catch {
      errorMessage = "Unable to enable Screen Time. Review access in Settings. This build also needs the Family Controls capability."
    }
  }

  @MainActor
  private func revokeAccess() async {
    busy = true
    errorMessage = nil
    defer { busy = false }
    do {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        authorization.revokeAuthorization { result in
          continuation.resume(with: result)
        }
      }
      reportID = UUID()
    } catch {
      errorMessage = "Unable to disconnect Screen Time. Review access in iPhone Settings."
    }
  }
}
