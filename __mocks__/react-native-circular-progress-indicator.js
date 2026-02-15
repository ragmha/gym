import React from 'react'
import { View, Text } from 'react-native'

const CircularProgress = (props) => (
  <View testID="circular-progress">
    <Text>{props.value}%</Text>
  </View>
)

export default CircularProgress
