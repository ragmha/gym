import AVFoundation
import ExpoModulesCore
import Vision

public class RepCameraModule: Module {
  public func definition() -> ModuleDefinition {
    if #available(iOS 17.0, *) {
      return ModuleDefinitionBuilder.buildBlock(
        Name("RepCamera"),
        View(RepCameraView.self) {
          Events("onAngle", "onError")
          Prop("joint") { (view: RepCameraView, joint: String) in
            view.camera.setJoint(joint)
          }
        }
      )
    }
    return ModuleDefinitionBuilder.buildBlock(Name("RepCamera"))
  }
}

@available(iOS 17.0, *)
final class RepCameraView: ExpoView {
  let onAngle = EventDispatcher()
  let onError = EventDispatcher()
  let camera = FrontCamera()
  private let preview: AVCaptureVideoPreviewLayer
  private var rotation: AVCaptureDevice.RotationCoordinator?
  private var observations: [NSKeyValueObservation] = []

  required init(appContext: AppContext? = nil) {
    preview = AVCaptureVideoPreviewLayer(session: camera.session)
    super.init(appContext: appContext)
    clipsToBounds = true
    preview.videoGravity = .resizeAspectFill
    layer.addSublayer(preview)
    camera.onAngle = { [weak self] joint, angle in
      var event: [String: Any] = ["joint": joint]
      if let angle { event["angle"] = angle }
      DispatchQueue.main.async { self?.onAngle(event) }
    }
    camera.onError = { [weak self] code in
      DispatchQueue.main.async { self?.onError(["code": code]) }
    }
    if let device = camera.device {
      let rotation = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: preview)
      self.rotation = rotation
      observations = [
        rotation.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]) {
          [weak self] rotation, _ in
          DispatchQueue.main.async {
            guard let connection = self?.preview.connection else { return }
            let angle = rotation.videoRotationAngleForHorizonLevelPreview
            if connection.isVideoRotationAngleSupported(angle) { connection.videoRotationAngle = angle }
          }
        },
        rotation.observe(\.videoRotationAngleForHorizonLevelCapture, options: [.initial, .new]) {
          [weak self] rotation, _ in
          self?.camera.setRotation(rotation.videoRotationAngleForHorizonLevelCapture)
        },
      ]
    }
    NotificationCenter.default.addObserver(
      self, selector: #selector(background), name: UIApplication.didEnterBackgroundNotification, object: nil
    )
  }

  deinit { NotificationCenter.default.removeObserver(self) }

  @objc private func background() { camera.run(false) }

  override func layoutSubviews() {
    super.layoutSubviews()
    preview.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    camera.run(window != nil)
  }
}

/// Frames and all capture state stay on this serial queue, never in files or JS.
@available(iOS 17.0, *)
final class FrontCamera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  let session = AVCaptureSession()
  let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
  var onAngle: (String, Double?) -> Void = { _, _ in }
  var onError: (String) -> Void = { _ in }
  private let queue = DispatchQueue(label: "io.raghib.gym.rep-camera")
  private let request = VNDetectHumanBodyPoseRequest()
  private let output = AVCaptureVideoDataOutput()
  private var configured = false
  private var active = false
  private var joint = "elbow"
  private var side: Int?
  private var rotationAngle = 90.0
  private var lastFrame = -Double.infinity

  private static let sides: [String: [[VNHumanBodyPoseObservation.JointName]]] = [
    "knee": [[.leftHip, .leftKnee, .leftAnkle], [.rightHip, .rightKnee, .rightAnkle]],
    "hip": [[.leftShoulder, .leftHip, .leftKnee], [.rightShoulder, .rightHip, .rightKnee]],
    "elbow": [[.leftShoulder, .leftElbow, .leftWrist], [.rightShoulder, .rightElbow, .rightWrist]],
  ]

  override init() {
    super.init()
    for name in [AVCaptureSession.runtimeErrorNotification, AVCaptureSession.wasInterruptedNotification] {
      NotificationCenter.default.addObserver(self, selector: #selector(interrupted), name: name, object: session)
    }
  }

  deinit { NotificationCenter.default.removeObserver(self) }

  @objc private func interrupted() {
    queue.async { [self] in
      if active { fail("interrupted") }
    }
  }

  private func loseTracking() {
    side = nil
    onAngle(joint, nil)
  }

  private func fail(_ code: String) {
    active = false
    session.stopRunning()
    loseTracking()
    onError(code)
  }

  func setJoint(_ name: String) {
    queue.async { [self] in
      guard Self.sides[name] != nil else { return fail("configuration") }
      joint = name
      loseTracking()
    }
  }

  func setRotation(_ angle: Double) {
    queue.async { [self] in
      guard angle != rotationAngle else { return }
      rotationAngle = angle
      if let connection = output.connection(with: .video),
        connection.isVideoRotationAngleSupported(angle) {
        connection.videoRotationAngle = angle
      }
      loseTracking()
    }
  }

  func run(_ on: Bool) {
    queue.async { [self] in
      active = on
      guard on else {
        session.stopRunning()
        loseTracking()
        return
      }
      guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else {
        return fail("permission")
      }
      if !configured, !configure() { return }
      session.startRunning()
    }
  }

  private func configure() -> Bool {
    guard let device else { fail("unavailable"); return false }
    do {
      let input = try AVCaptureDeviceInput(device: device)
      output.alwaysDiscardsLateVideoFrames = true
      output.setSampleBufferDelegate(self, queue: queue)
      session.beginConfiguration()
      defer { session.commitConfiguration() }
      if session.canSetSessionPreset(.hd1280x720) { session.sessionPreset = .hd1280x720 }
      guard session.canAddInput(input) else { onError("configuration"); return false }
      session.addInput(input)
      guard session.canAddOutput(output) else { onError("configuration"); return false }
      session.addOutput(output)
      if let connection = output.connection(with: .video) {
        connection.automaticallyAdjustsVideoMirroring = false
        if connection.isVideoMirroringSupported { connection.isVideoMirrored = false }
        guard connection.isVideoRotationAngleSupported(rotationAngle) else {
          onError("configuration")
          return false
        }
        connection.videoRotationAngle = rotationAngle
      }
      configured = true
      return true
    } catch {
      fail("configuration")
      return false
    }
  }

  func captureOutput(
    _ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection
  ) {
    guard active else { return }
    let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds
    // ponytail: 10 fps bounds Vision work and bridge traffic; tune only after device profiling.
    guard time - lastFrame >= 0.1 else { return }
    lastFrame = time
    guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return loseTracking() }
    do {
      try VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up).perform([request])
      guard let poses = request.results, poses.count == 1, let pose = poses.first,
        let sides = Self.sides[joint] else { return loseTracking() }
      let width = Double(CVPixelBufferGetWidth(buffer))
      let height = Double(CVPixelBufferGetHeight(buffer))
      var best: (side: Int, confidence: Float, angle: Double)?
      for (index, names) in sides.enumerated() where side == nil || side == index {
        let points = try names.map { try pose.recognizedPoint($0) }
        guard let confidence = points.map(\.confidence).min(),
          confidence >= 0.5, confidence > (best?.confidence ?? 0) else { continue }
        let p = points.map { (x: $0.location.x * width, y: $0.location.y * height) }
        let u = (x: p[0].x - p[1].x, y: p[0].y - p[1].y)
        let v = (x: p[2].x - p[1].x, y: p[2].y - p[1].y)
        guard hypot(u.x, u.y) > 1, hypot(v.x, v.y) > 1 else { continue }
        best = (index, confidence, atan2(abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y) * 180 / .pi)
      }
      guard let best else { return loseTracking() }
      side = best.side
      onAngle(joint, best.angle)
    } catch {
      fail("analysis")
    }
  }
}
