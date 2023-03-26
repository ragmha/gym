import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native'

export const HomeScreen = () => {
  const isDarkMode = useColorScheme() === 'dark'
  const backgroundStyle = 'bg-neutral-300 dark:bg-slate-900'

  return (
    <View className="content-center">
      <SafeAreaView className={backgroundStyle}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View className="bg-white dark:bg-black">
          <Text>Hello world</Text>
        </View>
      </SafeAreaView>
    </View>
  )
}
