import ActivityKit
import WidgetKit
import SwiftUI

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 8) {
        Text(context.attributes.workoutName)
          .font(.headline)

        Text(context.state.exerciseName)
          .font(.subheadline)

        HStack {
          Text("Set \(max(context.state.currentSet, 1)) of \(max(context.state.totalSets, 1))")
            .font(.subheadline)
          Spacer()
          RestCountdownView(restEndsAt: context.state.restEndsAt)
        }
      }
      .padding(.vertical, 4)
      .activityBackgroundTint(.black.opacity(0.08))
      .activitySystemActionForegroundColor(.accentColor)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label(context.attributes.workoutName, systemImage: "dumbbell.fill")
            .font(.subheadline)
        }

        DynamicIslandExpandedRegion(.trailing) {
          Text("\(max(context.state.currentSet, 1))/\(max(context.state.totalSets, 1))")
            .font(.headline)
        }

        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            VStack(alignment: .leading, spacing: 4) {
              Text(context.state.exerciseName)
                .font(.headline)
              Text("Set \(max(context.state.currentSet, 1)) of \(max(context.state.totalSets, 1))")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            Spacer()
            RestCountdownView(restEndsAt: context.state.restEndsAt)
          }
        }
      } compactLeading: {
        Image(systemName: "dumbbell.fill")
      } compactTrailing: {
        if let restEndsAt = context.state.restEndsAt, restEndsAt > Date() {
          Text(timerInterval: Date()...restEndsAt, countsDown: true)
            .font(.caption2)
            .monospacedDigit()
        } else {
          Text("\(max(context.state.currentSet, 1))/\(max(context.state.totalSets, 1))")
            .font(.caption2)
            .monospacedDigit()
        }
      } minimal: {
        if let restEndsAt = context.state.restEndsAt, restEndsAt > Date() {
          Text(timerInterval: Date()...restEndsAt, countsDown: true)
            .font(.caption2)
            .monospacedDigit()
        } else {
          Text("—")
            .font(.caption2)
        }
      }
      .widgetURL(URL(string: "io.raghib.gym://"))
      .keylineTint(.accentColor)
    }
  }
}

private struct RestCountdownView: View {
  let restEndsAt: Date?

  var body: some View {
    if let restEndsAt {
      if restEndsAt > Date() {
        Text(timerInterval: Date()...restEndsAt, countsDown: true)
          .font(.headline)
          .monospacedDigit()
      } else {
        Text("Rest done")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    } else {
      Text("Lift")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
  }
}
