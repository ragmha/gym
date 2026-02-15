const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

const wsShim = path.resolve(__dirname, 'src/shims/ws.js')

// Redirect all `ws` imports (including nested ones inside
// @supabase/realtime-js/node_modules/ws) to a thin shim that
// re-exports the built-in React Native WebSocket global.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws' || moduleName.startsWith('ws/')) {
    return { type: 'sourceFile', filePath: wsShim }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
