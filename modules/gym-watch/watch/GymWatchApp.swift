import SwiftUI
import WatchKit

@main
struct GymWatchApp: App {
  @State private var phone = Phone()
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      NavigationStack {
        WorkoutView()
      }
      .environment(phone)
    }
    // Refresh on every raise so a new day never logs into yesterday's workout.
    .onChange(of: scenePhase) { _, phase in
      if phase == .active { phone.sync() }
    }
  }
}

struct WorkoutView: View {
  @Environment(Phone.self) private var phone

  var body: some View {
    if let state = phone.state {
      List {
        // Plain text, not cells, so only exercises look tappable.
        if let subtitle = state.subtitle {
          Text(subtitle).font(.headline)
            .listRowBackground(Color.clear)
        }
        if let note = state.note {
          Text(note).foregroundStyle(.secondary)
            .listRowBackground(Color.clear)
        }
        ForEach(state.exercises) { exercise in
          NavigationLink {
            SetLogger(exercise)
          } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(exercise.title)
              Text(exercise.progress)
                .font(.footnote)
                .foregroundStyle(exercise.done ? .green : .secondary)
            }
          }
        }
      }
      .navigationTitle(state.title)
    } else {
      ContentUnavailableView("Open Gym on your iPhone", systemImage: "iphone")
    }
  }
}

struct SetLogger: View {
  @Environment(Phone.self) private var phone
  private let id: String
  @State private var reps: Int
  /// 0 means body weight.
  @State private var kilograms: Double

  // Target reps and the load the iPhone suggests.
  init(_ exercise: Exercise) {
    id = exercise.id
    _reps = State(initialValue: exercise.reps)
    _kilograms = State(initialValue: exercise.kilograms ?? 0)
  }

  var body: some View {
    if let state = phone.state, let exercise = state.exercises.first(where: { $0.id == id }) {
      ScrollView {
        VStack(spacing: 8) {
          Text(exercise.band(locked: state.locked))
            .font(.headline)
          // watchOS draws a plain stepper label huge; .body keeps Log set on the first screen.
          // Ranges match MAX_REPS and MAX_SET_KILOGRAMS in src/stores/GymLogStore.ts.
          Stepper(value: $reps, in: 1...500) { Text("\(reps) reps").font(.body) }
          Stepper(value: $kilograms, in: 0...1000, step: 2.5) {
            Text(kilograms == 0 ? "BW" : "\(kilograms.formatted()) kg").font(.body)
          }
          Button("Log set") {
            phone.log(exercise, reps: reps, kilograms: kilograms == 0 ? nil : kilograms)
            WKInterfaceDevice.current().play(.success)
          }
          .buttonStyle(.borderedProminent)
          .disabled(state.locked)
          if !exercise.logged.isEmpty && !state.locked {
            Button("Undo set \(exercise.logged.count)", role: .destructive) {
              phone.undo(exercise)
            }
          }
          if let error = phone.error {
            Text(error)
              .font(.footnote)
              .foregroundStyle(.red)
          }
        }
      }
      .navigationTitle(exercise.title)
    }
  }
}

extension Exercise {
  var done: Bool { sets.map { logged.count >= $0 } ?? false }

  private var loggedSets: String { "\(logged.count) \(logged.count == 1 ? "set" : "sets")" }

  var progress: String {
    sets.map { "\(logged.count)/\($0) sets" } ?? "\(loggedSets) · to failure"
  }

  // Same wording as the iPhone's set band.
  func band(locked: Bool) -> String {
    if locked { return "\(loggedSets) logged" }
    if let sets, logged.count >= sets { return "All \(sets) sets done" }
    return "Set: \(logged.count + 1)" + (sets.map { " of \($0)" } ?? "")
  }
}
