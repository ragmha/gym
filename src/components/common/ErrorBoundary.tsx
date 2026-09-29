import { Ionicons } from '@expo/vector-icons'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.error?.message ?? 'An unexpected error occurred.'}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

function ErrorFallback({
  message,
  onReset,
}: {
  message: string
  onReset: () => void
}) {
  const theme = useTheme()
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.icon, { backgroundColor: theme.cardSurface }]}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.icon} />
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          Something went wrong
        </Text>
        <Text
          selectable
          accessibilityRole="alert"
          style={[styles.message, { color: theme.subtitleText }]}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onReset}
        >
          <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
            Try Again
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.gutter,
    gap: Spacing.lg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headingLg,
    textAlign: 'center',
  },
  message: {
    ...Typography.bodyMd,
    textAlign: 'center',
  },
  button: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
})
