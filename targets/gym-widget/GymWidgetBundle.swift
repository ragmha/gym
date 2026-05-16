import WidgetKit
import SwiftUI

@main
struct GymWidgetBundle: WidgetBundle {
  var body: some Widget {
    GymTodayWidget()
    WorkoutLiveActivity()
  }
}
