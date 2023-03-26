import { ThemeProvider } from 'styled-components/native'

import RootNavigator from '@/navigation/RootNavigator'
import { theme } from '@/theme'

const App = () => (
  <ThemeProvider theme={theme}>
    <RootNavigator />
  </ThemeProvider>
)

export default App
