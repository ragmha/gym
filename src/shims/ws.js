// Shim for the `ws` package in React Native.
// React Native provides a global WebSocket, so the Node.js `ws` library
// is unnecessary and its Node-specific deps (stream, etc.) break bundling.
module.exports = globalThis.WebSocket
