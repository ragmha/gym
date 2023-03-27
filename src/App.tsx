import 'react-native-gesture-handler'

import { ThemeProvider } from 'styled-components/native'

import { useCurrentTheme } from './hooks/use-current-theme'

import RootNavigator from '@/navigation/RootNavigator'

const App = () => (
  <ThemeProvider theme={useCurrentTheme()}>
    <RootNavigator />
  </ThemeProvider>
)

export default App
