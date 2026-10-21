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
      .tint(.red)
      .preferredColorScheme(.dark)
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
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  private let id: String
  @State private var reps: Int
  /// 0 means body weight.
  @State private var kilograms: Double
  @State private var page = 0
  @State private var showError = false
  @State private var showCounter = false

  // Target reps and the load the iPhone suggests.
  init(_ exercise: Exercise) {
    id = exercise.id
    _reps = State(initialValue: exercise.reps)
    _kilograms = State(initialValue: exercise.kilograms ?? 0)
  }

  var body: some View {
    if let state = phone.state, let exercise = state.exercises.first(where: { $0.id == id }) {
      TabView(selection: $page) {
        GeometryReader { geometry in
          let size = min(geometry.size.width, geometry.size.height)
          let button = Button {
            log(exercise)
          } label: {
            ZStack {
              if !dynamicTypeSize.isAccessibilitySize {
                ForEach(0..<exercise.ringSegments, id: \.self) { index in
                  let count = Double(exercise.ringSegments)
                  let gap = exercise.sets == nil ? 0 : min(0.025, 0.25 / count)
                  Circle()
                    .trim(from: Double(index) / count + gap, to: Double(index + 1) / count - gap)
                    .stroke(
                      Color.red.opacity(index < exercise.filledSegments ? 1 : 0.28),
                      style: StrokeStyle(lineWidth: 12, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                }
              }
              VStack(spacing: 4) {
                if dynamicTypeSize.isAccessibilitySize {
                  Text(exercise.title).font(.headline)
                }
                Text(exercise.sets.map { "\($0) × \(reps)" } ?? "\(reps) reps")
                  .font(.title2.weight(.semibold))
                  .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                  .minimumScaleFactor(0.4)
                Text(load)
                  .font(.title.weight(.semibold))
                  .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                  .minimumScaleFactor(0.4)
              }
              .monospacedDigit()
              .multilineTextAlignment(.center)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .padding(20)
            }
            .padding(8)
            .frame(
              width: dynamicTypeSize.isAccessibilitySize ? geometry.size.width : size,
              height: dynamicTypeSize.isAccessibilitySize ? nil : size
            )
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .disabled(state.locked)
          .accessibilityLabel(state.locked ? "Workout finished" : "Log set for \(exercise.title)")
          .accessibilityValue("\(reps) reps, \(kilograms == 0 ? "body weight" : load), \(exercise.progress)")
          .accessibilityHint(state.locked ? "" : "Sends this set to your iPhone. Swipe left to edit reps or weight.")
          .accessibilityIdentifier("log-set")

          if dynamicTypeSize.isAccessibilitySize {
            ScrollView { button }
          } else {
            button.position(x: geometry.size.width / 2, y: geometry.size.height / 2)
          }
        }
        .padding(.bottom, 8)
        .tag(0)

        ScrollView {
          VStack(spacing: 8) {
            if let error = phone.error {
              Text(error)
                .font(.footnote)
                .foregroundStyle(.red)
            }
            Text(exercise.band(locked: state.locked))
              .font(.headline)
            if state.locked { Text("Workout finished").font(.footnote) }
            // Ranges match MAX_REPS and MAX_SET_KILOGRAMS in src/stores/GymLogStore.ts.
            Stepper(value: $reps, in: 1...500) { Text("\(reps) reps").font(.body) }
              .frame(minHeight: 48)
              .disabled(state.locked)
            Stepper(value: $kilograms, in: 0...1000, step: 2.5) {
              Text(load).font(.body)
            }
            .frame(minHeight: 48)
            .disabled(state.locked)
            Button("Back to sets") { page = 0 }
              .frame(minHeight: 48)
            if !exercise.logged.isEmpty && !state.locked {
              Button("Undo set \(exercise.logged.count)", role: .destructive) {
                phone.undo(exercise)
              }
              .frame(minHeight: 48)
              .accessibilityIdentifier("undo-set")
            }
          }
          .padding(.horizontal, 8)
          .padding(.bottom, 28)
        }
        .tag(1)
      }
      .tabViewStyle(.page(indexDisplayMode: .always))
      .ignoresSafeArea(edges: .bottom)
      .background(.black)
      .foregroundStyle(.white)
      .navigationBarBackButtonHidden()
      .toolbarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button { dismiss() } label: {
            HStack(spacing: 4) {
              Image(systemName: "chevron.left.circle.fill")
              if !dynamicTypeSize.isAccessibilitySize {
                Text(exercise.title).lineLimit(1)
              }
            }
            .font(.headline)
            .foregroundStyle(.red)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Back to exercises")
        }
        if !state.locked {
          ToolbarItem(placement: .topBarTrailing) {
            Button { showCounter = true } label: {
              Image(systemName: "figure.strengthtraining.traditional")
            }
            .accessibilityLabel("Count reps")
            .accessibilityIdentifier("count-reps")
          }
        }
      }
      .fullScreenCover(isPresented: $showCounter) {
        RepCountView { counted in
          reps = counted
          log(exercise, reps: counted)
          page = 0
        }
      }
      .onChange(of: phone.error) { _, error in
        if error != nil { showError = true }
      }
      .alert("Workout not updated", isPresented: $showError) {
        Button("OK", role: .cancel) {}
      } message: {
        if let error = phone.error { Text(error) }
      }
    }
  }

  private var load: String { kilograms == 0 ? "BW" : "\(kilograms.formatted()) kg" }

  private func log(_ exercise: Exercise, reps: Int? = nil) {
    phone.log(exercise, reps: reps ?? self.reps, kilograms: kilograms == 0 ? nil : kilograms)
    WKInterfaceDevice.current().play(.click)
  }
}

/// Counts a set from wrist motion, then lets the crown correct it before logging.
struct RepCountView: View {
  let onLog: (Int) -> Void
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.isLuminanceReduced) private var isLuminanceReduced
  @State private var counter = RepCounter()
  @State private var crown = 0.0
  @State private var started = false
  @State private var logged = false
  @State private var threshold = 0.07

  private var counted: Int { Int(crown.rounded()) }

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        if !started {
          Text("Count wrist motion").font(.headline)
          Text("Only for lifts where this wrist moves with each rep. Get into position, hold still for the start tap, then lift.")
            .font(.footnote)
          Stepper(value: $threshold, in: 0.03...0.15, step: 0.02) {
            Text("Motion threshold \(threshold.formatted(.number.precision(.fractionLength(2)))) g")
          }
          .accessibilityHint("Lower the threshold if slow reps are missed. Raise it if extra reps are counted.")
          Button("Start") {
            started = true
            counter.start(threshold: threshold)
          }
          .frame(minHeight: 48)
          .accessibilityIdentifier("start-rep-count")
          Button("Cancel", role: .cancel) { dismiss() }
            .frame(minHeight: 48)
        } else if counter.counting {
          Text("\(counter.reps)")
            .font(.system(size: 64, weight: .semibold))
            .accessibilityLabel("\(counter.reps) reps counted")
          Text(counter.ready ? "Counting wrist motion." : "Get into position. Hold still until the start tap.")
            .font(.footnote)
            .foregroundStyle(.secondary)
          Button("Done") { counter.stop() }
            .frame(minHeight: 48)
          Text("Stay still for 8 seconds to finish. Waking the screen also stops counting.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else {
          Text("\(counted)")
            .font(.system(size: 64, weight: .semibold))
            .focusable()
            .digitalCrownRotation(
              $crown, from: 0, through: 500, by: 1, sensitivity: .low,
              isContinuous: false, isHapticFeedbackEnabled: true
            )
            .accessibilityLabel("\(counted) reps")
            .accessibilityHint("Turn the Digital Crown to correct the count.")
            .accessibilityAdjustableAction { direction in
              crown = min(500, max(0, crown + (direction == .increment ? 1 : -1)))
            }
          Text("Turn the crown to correct.")
            .font(.footnote)
            .foregroundStyle(.secondary)
          Button("Log \(counted) reps") {
            guard !logged else { return }
            logged = true
            onLog(counted)
            dismiss()
          }
          .frame(minHeight: 48)
          .disabled(counted < 1 || logged)
          .accessibilityIdentifier("log-counted-reps")
          Button("Cancel", role: .cancel) { dismiss() }
            .frame(minHeight: 48)
        }
        if let error = counter.error {
          Text(error).font(.footnote).foregroundStyle(.red)
        }
      }
      .monospacedDigit()
      .frame(maxWidth: .infinity)
    }
    .onDisappear { counter.stop() }
    .onChange(of: scenePhase) { previous, next in
      if previous != .active && next == .active { stopOnWake() }
    }
    .onChange(of: isLuminanceReduced) { previous, next in
      if previous && !next { stopOnWake() }
    }
    .onChange(of: counter.counting) { _, counting in
      if !counting { crown = Double(counter.reps) }
    }
  }

  private func stopOnWake() {
    // Stop on a wrist raise before the motion used to check the watch becomes another rep.
    if counter.ready && counter.reps > 0 { counter.stop() }
  }
}
