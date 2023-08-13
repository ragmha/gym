import type { Exercise } from '@/hooks/use-exercsie-tracker'

import { SafeAreaView, FlatList } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import styled from 'styled-components/native'

import { useCurrentTheme } from '@/hooks/use-current-theme'
import { useExerciseTracker } from '@/hooks/use-exercsie-tracker'

export const ExercisesScreen = () => {
  const { exercises, toggleExercise, setToggleExercise } = useExerciseTracker()
  const currentTheme = useCurrentTheme()

  const keyExtractor = (exercise: Exercise) => exercise.dayNumber.toString()

  const renderItem = ({ item }: { item: Exercise }) => (
    <StyledItem.Container>
      <BouncyCheckbox
        key={item.dayNumber}
        isChecked={toggleExercise?.[item.dayNumber] ?? false}
        fillColor={currentTheme.colors.secondaryVariant}
        iconStyle={{ borderColor: currentTheme.colors.secondaryVariant }}
        onPress={() => {
          setToggleExercise((prev) => ({
            ...prev,
            [item.dayNumber]: !prev?.[item.dayNumber],
          }))
        }}
        text={item.dayTitle}
        textStyle={{
          fontSize: currentTheme.typography.subtitle1.fontSize,
          color: currentTheme.colors.onSecondary,
        }}
      />
    </StyledItem.Container>
  )

  return (
    <SafeAreaView>
      <FlatList
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        data={exercises}
      />
    </SafeAreaView>
  )
}

const StyledItem = {
  Container: styled.View(
    {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 0.2,
    },
    ({ theme }) => ({
      borderColor: theme.colors.onSecondary,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    }),
  ),
}
