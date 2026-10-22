import ExpoModulesCore
import EventKit
import Security

public class DayPlannerModule: Module {
  private let queue = DispatchQueue(label: "io.raghib.gym.day-planner")
  private var observer: NSObjectProtocol?

  deinit {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  public func definition() -> ModuleDefinition {
    Name("DayPlanner")
    Events("onPlannerChange")

    OnStartObserving { [weak self] in
      guard let self else { return }
      self.queue.async {
        guard self.observer == nil else { return }
        self.observer = NotificationCenter.default.addObserver(
          forName: .EKEventStoreChanged, object: nil, queue: .main
        ) { [weak self] _ in
          self?.sendEvent("onPlannerChange", [:])
        }
      }
    }
    OnStopObserving { [weak self] in self?.stopObserving() }
    OnDestroy { [weak self] in self?.stopObserving() }

    AsyncFunction("readDay") { (startMs: Double, endMs: Double, promise: Promise) in
      self.queue.async {
        do {
          guard #available(iOS 17.0, *) else { throw PlannerFailure.unavailable }
          let (start, end) = try PlannerValues.day(startMs: startMs, endMs: endMs)
          try self.readDay(start: start, end: end, promise: promise)
        } catch {
          self.reject(promise, error)
        }
      }
    }
    AsyncFunction("requestCalendarAccess") { (promise: Promise) in
      self.queue.async { self.requestAccess(calendar: true, promise: promise) }
    }
    AsyncFunction("requestRemindersAccess") { (promise: Promise) in
      self.queue.async { self.requestAccess(calendar: false, promise: promise) }
    }
    AsyncFunction("setReminderCompleted") { (id: String, completed: Bool, promise: Promise) in
      self.queue.async {
        do {
          guard #available(iOS 17.0, *) else { throw PlannerFailure.unavailable }
          let value = try PlannerValues.reminderCompletion(id: id, completed: completed)
          try self.setReminderCompleted(id: value.id, completed: value.completed)
          promise.resolve(["id": value.id, "completed": value.completed])
        } catch {
          self.reject(promise, error)
        }
      }
    }
    AsyncFunction("getTransitKey") { (promise: Promise) in
      self.queue.async {
        do {
          promise.resolve(try self.getTransitKey())
        } catch {
          self.reject(promise, error)
        }
      }
    }
    AsyncFunction("setTransitKey") { (key: String, promise: Promise) in
      self.queue.async {
        do {
          try self.setTransitKey(key)
          promise.resolve(nil)
        } catch {
          self.reject(promise, error)
        }
      }
    }
  }

  private func stopObserving() {
    queue.async {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }

  private func reject(_ promise: Promise, _ error: Error) {
    let failure = (error as? PlannerFailure) ?? .remindersRead
    promise.reject("ERR_DAY_PLANNER", failure.message)
  }

  @available(iOS 17.0, *)
  private func access(_ type: EKEntityType) -> String {
    let status = EKEventStore.authorizationStatus(for: type)
    if status == .fullAccess { return "granted" }
    if status == .notDetermined { return "undetermined" }
    return "denied"
  }

  private func requestAccess(calendar: Bool, promise: Promise) {
    guard #available(iOS 17.0, *) else {
      reject(promise, PlannerFailure.unavailable)
      return
    }
    let type: EKEntityType = calendar ? .event : .reminder
    let status = EKEventStore.authorizationStatus(for: type)
    if status == .fullAccess {
      promise.resolve(true)
      return
    }
    if status == .denied || status == .restricted {
      promise.resolve(false)
      return
    }
    let usageKey = calendar
      ? "NSCalendarsFullAccessUsageDescription" : "NSRemindersFullAccessUsageDescription"
    guard let description = Bundle.main.object(forInfoDictionaryKey: usageKey) as? String,
      !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      reject(promise, PlannerFailure.permissionConfiguration)
      return
    }
    let store = EKEventStore()
    let completion: (Bool, Error?) -> Void = { [self, store] granted, error in
      queue.async {
        // Keep the requesting store alive until its completion has been handled.
        withExtendedLifetime(store) {
          if error != nil {
            self.reject(promise, PlannerFailure.permissionRequest)
          } else {
            promise.resolve(granted && self.access(type) == "granted")
          }
        }
      }
    }
    if calendar {
      store.requestFullAccessToEvents(completion: completion)
    } else {
      store.requestFullAccessToReminders(completion: completion)
    }
  }

  @available(iOS 17.0, *)
  private func setReminderCompleted(id: String, completed: Bool) throws {
    guard access(.reminder) == "granted" else { throw PlannerFailure.remindersWrite }
    let store = EKEventStore()
    guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder,
      let calendar = reminder.calendar, calendar.allowsContentModifications
    else { throw PlannerFailure.remindersWrite }
    reminder.isCompleted = completed
    do {
      try store.save(reminder, commit: true)
    } catch {
      throw PlannerFailure.remindersWrite
    }
    // Read from a fresh store so an unsaved in-memory assignment cannot acknowledge a write.
    let savedStore = EKEventStore()
    guard access(.reminder) == "granted",
      let saved = savedStore.calendarItem(withIdentifier: id) as? EKReminder,
      saved.calendarItemIdentifier == id, saved.isCompleted == completed
    else { throw PlannerFailure.remindersWrite }
  }

  private func fetchReminders(
    store: EKEventStore, predicate: NSPredicate, completion: @escaping ([EKReminder]?) -> Void
  ) {
    var finished = false
    var fetchIdentifier: Any?
    let timeout = DispatchWorkItem {
      guard !finished else { return }
      finished = true
      if let fetchIdentifier { store.cancelFetchRequest(fetchIdentifier) }
      completion(nil)
    }
    fetchIdentifier = store.fetchReminders(matching: predicate) { matches in
      self.queue.async {
        guard !finished else { return }
        finished = true
        timeout.cancel()
        completion(matches)
      }
    }
    queue.asyncAfter(deadline: .now() + 30, execute: timeout)
  }

  @available(iOS 17.0, *)
  private func readDay(start: Date, end: Date, promise: Promise) throws {
    let calendarAccess = access(.event)
    let remindersAccess = access(.reminder)
    let store = EKEventStore()
    var events: [[String: Any]] = []
    if calendarAccess == "granted" {
      let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
      let matches = store.events(matching: predicate).filter {
        $0.startDate < end && (
          $0.endDate > start || ($0.startDate == $0.endDate && $0.startDate >= start)
        )
      }.sorted {
        if $0.startDate != $1.startDate { return $0.startDate < $1.startDate }
        if $0.endDate != $1.endDate { return $0.endDate < $1.endDate }
        return ($0.eventIdentifier ?? "") < ($1.eventIdentifier ?? "")
      }
      try PlannerValues.checkCount(matches.count, failure: .eventsOverflow)
      events = try matches.map { event in
        guard let id = event.eventIdentifier else { throw PlannerFailure.calendarRead }
        return [
          "id": id, "title": event.title ?? "",
          "startMs": event.startDate.timeIntervalSince1970 * 1_000,
          "endMs": event.endDate.timeIntervalSince1970 * 1_000,
          "allDay": event.isAllDay,
        ]
      }
      guard access(.event) == "granted" else { throw PlannerFailure.calendarRead }
    }

    let eventValues = events
    let resolve: ([[String: Any]]) -> Void = { reminders in
      promise.resolve([
        "calendarAccess": calendarAccess, "remindersAccess": remindersAccess,
        "events": eventValues, "reminders": reminders,
      ])
    }
    guard remindersAccess == "granted" else {
      resolve([])
      return
    }
    // A nil end also includes undated reminders. Filter locally after resolving
    // civil due dates, rather than letting EventKit impose a timezone boundary.
    let predicate = store.predicateForIncompleteReminders(
      withDueDateStarting: nil, ending: nil, calendars: nil
    )
    fetchReminders(store: store, predicate: predicate) { [self, store] incomplete in
      guard let incomplete, self.access(.reminder) == "granted",
        calendarAccess != "granted" || self.access(.event) == "granted"
      else {
        self.reject(promise, PlannerFailure.remindersRead)
        return
      }
      let completedPredicate = store.predicateForCompletedReminders(
        withCompletionDateStarting: start, ending: end, calendars: nil
      )
      self.fetchReminders(store: store, predicate: completedPredicate) { [self, store] completed in
        do {
          guard let completed, self.access(.reminder) == "granted",
            calendarAccess != "granted" || self.access(.event) == "granted"
          else { throw PlannerFailure.remindersRead }
          var dueReminders: [(reminder: EKReminder, date: Date?, hasTime: Bool)] = []
          for reminder in incomplete where !reminder.isCompleted {
            let due = try PlannerValues.due(reminder.dueDateComponents)
            guard PlannerValues.includesReminder(due: due.date, end: end) else { continue }
            dueReminders.append((reminder, due.date, due.hasTime))
          }
          dueReminders.sort {
            let lhs = $0.date ?? .distantFuture
            let rhs = $1.date ?? .distantFuture
            if lhs != rhs { return lhs < rhs }
            return $0.reminder.calendarItemIdentifier < $1.reminder.calendarItemIdentifier
          }
          let completedToday = try completed.filter {
            PlannerValues.includesCompletedReminder(
              completed: $0.isCompleted, completionDate: $0.completionDate, start: start, end: end
            )
          }.sorted {
            if $0.completionDate != $1.completionDate {
              return $0.completionDate! < $1.completionDate!
            }
            return $0.calendarItemIdentifier < $1.calendarItemIdentifier
          }.map { reminder in
            let due = try PlannerValues.due(reminder.dueDateComponents)
            return (reminder: reminder, date: due.date, hasTime: due.hasTime)
          }
          var seen = Set<String>()
          let uniqueIncomplete = dueReminders.filter {
            seen.insert($0.reminder.calendarItemIdentifier).inserted
          }
          let uniqueCompleted = completedToday.filter {
            seen.insert($0.reminder.calendarItemIdentifier).inserted
          }
          let values: [[String: Any]] = PlannerValues.cappedReminders(
            incomplete: uniqueIncomplete, completed: uniqueCompleted
          ).map { item in
            [
              "id": item.reminder.calendarItemIdentifier,
              "title": item.reminder.title ?? "",
              "dueMs": item.date.map { $0.timeIntervalSince1970 * 1_000 } as Any? ?? NSNull(),
              "priority": item.reminder.priority,
              "hasDueTime": item.hasTime,
              "completed": item.reminder.isCompleted,
            ]
          }
          withExtendedLifetime(store) { resolve(values) }
        } catch {
          self.reject(promise, error)
        }
      }
    }
  }

  private var keyQuery: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "io.raghib.gym.transit",
      kSecAttrAccount as String: "digitransit",
      kSecAttrSynchronizable as String: false,
    ]
  }

  private func getTransitKey() throws -> String? {
    var query = keyQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data,
      let key = String(data: data, encoding: .utf8), !key.isEmpty
    else { throw PlannerFailure.keychain }
    try PlannerValues.validateKey(key)
    return key
  }

  private func setTransitKey(_ key: String) throws {
    try PlannerValues.validateKey(key)
    if key.isEmpty {
      let status = SecItemDelete(keyQuery as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        throw PlannerFailure.keychain
      }
      return
    }
    let attributes: [String: Any] = [
      kSecValueData as String: Data(key.utf8),
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    let status = SecItemUpdate(keyQuery as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      let addStatus = SecItemAdd(keyQuery.merging(attributes) { _, new in new } as CFDictionary, nil)
      guard addStatus == errSecSuccess else { throw PlannerFailure.keychain }
    } else if status != errSecSuccess {
      throw PlannerFailure.keychain
    }
  }
}
