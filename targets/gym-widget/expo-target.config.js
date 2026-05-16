/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'GymWidget',
  deploymentTarget: '16.2',
  colors: {
    $accent: { light: '#007AFF', dark: '#FF6B35' },
    $widgetBackground: { light: '#F1F5F9', dark: '#111C2D' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
})
