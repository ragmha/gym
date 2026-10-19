import Foundation

var exercise = Exercise(
  id: "squat", title: "Squat", sets: 5, reps: 5, kilograms: 100, logged: []
)
assert(exercise.ringSegments == 5 && exercise.filledSegments == 0 && !exercise.done)
exercise.logged.append(LoggedSet(reps: 5, kilograms: 100))
assert(exercise.filledSegments == 1 && exercise.progress == "1/5 sets")
exercise.logged = Array(repeating: LoggedSet(reps: 5, kilograms: 100), count: 6)
assert(exercise.filledSegments == 5 && exercise.done && exercise.progress == "6/5 sets")
exercise.logged.removeLast(2)
assert(exercise.filledSegments == 4 && !exercise.done && exercise.band(locked: false) == "Set: 5 of 5")
assert(exercise.band(locked: true) == "4 sets logged")

let openEnded = Exercise(
  id: "pushup", title: "Push-up", sets: nil, reps: 10, kilograms: nil,
  logged: [LoggedSet(reps: 10, kilograms: nil)]
)
assert(openEnded.ringSegments == 1 && openEnded.filledSegments == 0 && !openEnded.done)
assert(openEnded.progress == "1 set · to failure")
let decoded = try JSONDecoder().decode(Exercise.self, from: JSONEncoder().encode(openEnded))
assert(decoded == openEnded)
print("Watch set progress checks passed")
