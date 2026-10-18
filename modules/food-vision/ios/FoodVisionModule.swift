import ExpoModulesCore
import Vision

public class FoodVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FoodVision")

    // Labels only: the photo stays on device and its picker copy is deleted.
    AsyncFunction("classify") { (url: URL) async throws -> [[String: Any]] in
      defer { removeCachedPhoto(url) }
      guard #available(iOS 18.0, *) else {
        throw Exception(
          name: "FoodVisionUnavailable",
          description: "Meal photos need iOS 18 or later."
        )
      }
      let observations = try await ClassifyImageRequest().perform(on: url)
      return observations
        .filter { $0.confidence >= 0.1 }
        .sorted { $0.confidence > $1.confidence }
        .prefix(12)
        .map { ["label": $0.identifier, "confidence": Double($0.confidence)] }
    }
  }
}

private func removeCachedPhoto(_ url: URL) {
  guard url.isFileURL,
    let caches = FileManager.default.urls(
      for: .cachesDirectory, in: .userDomainMask
    ).first,
    url.resolvingSymlinksInPath().path.hasPrefix(
      caches.resolvingSymlinksInPath().path + "/"
    )
  else { return }
  try? FileManager.default.removeItem(at: url)
}
