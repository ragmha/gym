Pod::Spec.new do |s|
  s.name = 'FoodVision'
  s.version = '1.0.0'
  s.summary = 'On-device meal photo labels from Apple Vision.'
  s.description = s.summary
  s.author = 'gym contributors'
  s.homepage = 'https://github.com/ragmha/gym'
  s.license = { :type => 'MIT' }
  s.source = { :git => 'https://github.com/ragmha/gym.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision'
  s.source_files = '*.swift'
end
