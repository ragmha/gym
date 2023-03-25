import { FC } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import RootNavigator from './navigation/RootNavigator';

´

const App: FC = () => {
  return <RootNavigator />;
};
export default App;
