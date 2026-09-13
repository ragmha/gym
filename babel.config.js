module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          web: {
            // Metro wraps ESM dependencies such as Zustand in classic scripts.
            unstable_transformImportMeta: true,
          },
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}
