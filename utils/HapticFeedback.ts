import HapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback'

export function hapticFeedback(
  type: HapticFeedbackTypes = HapticFeedbackTypes.impactLight,
  force = false
) {
  HapticFeedback.trigger(type, {
    enableVibrateFallback: force,
    ignoreAndroidSystemSettings: force,
  })
}
