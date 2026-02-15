const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ws: path.resolve(__dirname, 'src/shims/ws.js'),
}

module.exports = config
