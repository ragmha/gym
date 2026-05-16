import WidgetKit
import SwiftUI

private struct TodaySnapshot: Codable {
  var date: String
  var steps: Int
  var stepsGoal: Int
  var workoutXp: Int
  var lastWorkoutAt: Date?
}

private struct GymTodayEntry: TimelineEntry {
  let date: Date
  let snapshot: TodaySnapshot?
}

private struct GymTodayProvider: TimelineProvider {
  private let appGroup = "group.io.raghib.gym"
  private let snapshotKey = "todaySnapshot"

  func placeholder(in context: Context) -> GymTodayEntry {
    GymTodayEntry(
      date: Date(),
      snapshot: TodaySnapshot(
        date: "",
        steps: 7420,
        stepsGoal: 10000,
        workoutXp: 120,
        lastWorkoutAt: Date().addingTimeInterval(-3600)
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (GymTodayEntry) -> Void) {
    completion(GymTodayEntry(date: Date(), snapshot: readSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<GymTodayEntry>) -> Void) {
    let entry = GymTodayEntry(date: Date(), snapshot: readSnapshot())
    let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }

  private func readSnapshot() -> TodaySnapshot? {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let json = defaults.string(forKey: snapshotKey),
      let data = json.data(using: .utf8)
    else {
      return nil
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let value = try container.decode(String.self)
      if let date = fractionalISO8601Formatter.date(from: value) {
        return date
      }
      if let date = ISO8601DateFormatter().date(from: value) {
        return date
      }
      throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "Invalid ISO8601 date string"
      )
    }
    return try? decoder.decode(TodaySnapshot.self, from: data)
  }
}

private let fractionalISO8601Formatter: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

private struct GymTodayWidgetView: View {
  let entry: GymTodayProvider.Entry

  @Environment(\.widgetFamily) private var family

  var body: some View {
    if let snapshot = entry.snapshot {
      content(snapshot)
    } else {
      emptyState
    }
  }

  @ViewBuilder
  private func content(_ snapshot: TodaySnapshot) -> some View {
    let goal = max(snapshot.stepsGoal, 1)
    let progress = min(Double(snapshot.steps) / Double(goal), 1)

    VStack(alignment: .leading, spacing: 10) {
      Text("Today")
        .font(.caption)
        .foregroundStyle(.secondary)

      Text("\(snapshot.steps.formatted()) / \(goal.formatted()) steps")
        .font(.headline)

      ProgressView(value: progress)
        .tint(.accentColor)

      if family == .systemMedium {
        HStack {
          Label("XP \(snapshot.workoutXp)", systemImage: "figure.strengthtraining.traditional")
            .font(.subheadline)
          Spacer(minLength: 8)
          Text(lastWorkoutLabel(snapshot.lastWorkoutAt))
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.trailing)
        }
      } else {
        Text("XP \(snapshot.workoutXp)")
          .font(.subheadline)
      }
    }
    .containerBackground(.fill.tertiary, for: .widget)
    .widgetURL(URL(string: "io.raghib.gym://"))
  }

  private var emptyState: some View {
    VStack(spacing: 8) {
      Image(systemName: "figure.strengthtraining.traditional")
        .font(.title2)
      Text("Open Gym")
        .font(.headline)
      Text("Add this widget to track daily progress")
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .containerBackground(.fill.tertiary, for: .widget)
    .widgetURL(URL(string: "io.raghib.gym://"))
  }

  private func lastWorkoutLabel(_ date: Date?) -> String {
    guard let date else {
      return "No workout yet"
    }
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return "Last \(formatter.localizedString(for: date, relativeTo: Date()))"
  }
}

struct GymTodayWidget: Widget {
  private let kind = "GymTodayWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: GymTodayProvider()) { entry in
      GymTodayWidgetView(entry: entry)
    }
    .supportedFamilies([.systemSmall, .systemMedium])
    .configurationDisplayName("Gym Today")
    .description("Steps, workout XP, and last workout at a glance.")
  }
}

#Preview(as: .systemSmall) {
  GymTodayWidget()
} timeline: {
  GymTodayEntry(
    date: Date(),
    snapshot: TodaySnapshot(
      date: "",
      steps: 7420,
      stepsGoal: 10000,
      workoutXp: 120,
      lastWorkoutAt: Date().addingTimeInterval(-3600)
    )
  )
}
