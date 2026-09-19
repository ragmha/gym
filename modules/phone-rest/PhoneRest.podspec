Pod::Spec.new do |s|
  s.name = 'PhoneRest'
  s.version = '1.0.0'
  s.summary = 'Privacy-isolated Screen Time report host for Phone rest.'
  s.description = s.summary
  s.author = 'gym contributors'
  s.homepage = 'https://github.com/ragmha/gym'
  s.license = { :type => 'MIT' }
  s.source = { :git => 'https://github.com/ragmha/gym.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'SwiftUI', 'DeviceActivity', 'FamilyControls'
  s.source_files = 'ios/**/*.swift', 'shared/PhoneRestWindow.swift'
end
