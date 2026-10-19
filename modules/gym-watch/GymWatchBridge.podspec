Pod::Spec.new do |s|
  s.name = 'GymWatchBridge'
  s.version = '1.0.0'
  s.summary = 'Relays lifting sets between the Apple Watch app and the iPhone log.'
  s.description = s.summary
  s.author = 'gym contributors'
  s.homepage = 'https://github.com/ragmha/gym'
  s.license = { :type => 'MIT' }
  s.source = { :git => 'https://github.com/ragmha/gym.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity'
  # watch/ is the watchOS app target (via @bacons/apple-targets), not this pod.
  s.source_files = 'ios/**/*.swift'
end
