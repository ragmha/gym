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
            phone.log(exercise, reps: reps, kilograms: kilograms == 0 ? nil : kilograms)
            WKInterfaceDevice.current().play(.click)
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
}
