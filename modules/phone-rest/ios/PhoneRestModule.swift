import ExpoModulesCore

public class PhoneRestModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhoneRest")

    // Input-only: neither usage records nor derived estimates cross the JS bridge.
    View(PhoneRestView.self) {
      Prop("dateKey") { (view: PhoneRestView, dateKey: String) in
        view.dateKey = dateKey
      }
      Prop("colorScheme") { (view: PhoneRestView, scheme: String) in
        view.colorScheme = scheme
      }
      OnViewDidUpdateProps { (view: PhoneRestView) in
        view.updateContent()
      }
    }
  }
}
