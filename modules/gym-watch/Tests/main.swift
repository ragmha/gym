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

func countReps(_ samples: [Double]) -> Int {
  var detector = RepDetector()
  for sample in samples { _ = detector.add(sample) }
  return detector.reps
}

/// 50 Hz vertical acceleration for reps that start at rest, pausing mid-rep and between reps.
func lift(reps: Int, seconds: Double, peak: Double, pause: Double = 0) -> [Double] {
  let length = Int(seconds * 50)
  let wave = (0..<length).map { peak * cos(2 * .pi * Double($0) / Double(length)) }
  let still = [Double](repeating: 0, count: Int(pause * 50))
  let rep = Array(wave[..<(length / 2)]) + still + Array(wave[(length / 2)...]) + still
  return Array([[Double]](repeating: rep, count: reps).joined()) + [Double](repeating: 0, count: 100)
}

assert(countReps(lift(reps: 5, seconds: 2, peak: 0.25)) == 5)  // curl: up first
assert(countReps(lift(reps: 5, seconds: 2, peak: -0.25)) == 5)  // squat: down first
assert(countReps(lift(reps: 5, seconds: 3, peak: 0.09, pause: 1.5)) == 5)  // slow, paused
assert(countReps((0..<500).map { 0.15 * sin(0.4 * .pi * Double($0)) }) == 0)  // 10 Hz tremor
assert(countReps([Double](repeating: 0.01, count: 500)) == 0)  // sensor bias
// A one-way movement accelerates then brakes, but is not a complete rep.
let loweredWrist = (0..<50).map { -0.18 * cos(.pi * Double($0) / 50) }
assert(countReps(loweredWrist + [Double](repeating: 0, count: 100)) == 0)
var interrupted = RepDetector()
for sample in loweredWrist { _ = interrupted.add(sample) }
_ = interrupted.add(.nan)
for sample in lift(reps: 2, seconds: 2, peak: 0.25) { _ = interrupted.add(sample) }
assert(interrupted.reps == 2)
print("Watch rep detector checks passed")
