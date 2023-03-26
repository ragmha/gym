module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@': './src',
        },
      },
    ],
    [
      'babel-plugin-styled-components',
      {
        ssr: false,
        displayName: false,
        preprocess: false,
      },
    ],
  ],
}
