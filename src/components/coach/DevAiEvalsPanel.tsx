import { useTheme } from '@react-navigation/native'
import { useEffect, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Colors } from '@/constants/Colors'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import {
  AI_EVALUATION_FIXTURES,
  type EvaluationSplit,
} from '@/lib/coach/evaluationFixtures'
import {
  evaluationAvailabilityReason,
  inspectEvaluationEnvironment,
  SEMANTIC_REVIEW_RUBRIC,
  startSyntheticEvaluation,
  type EvaluationEnvironment,
  type EvaluationJob,
  type EvaluationReport,
} from '@/lib/coach/evaluations'

export default function DevAiEvalsPanel() {
  const theme = Colors[useTheme().dark ? 'dark' : 'light']
  const [split, setSplit] = useState<EvaluationSplit>('tuning')
  const [environment, setEnvironment] = useState<EvaluationEnvironment | null>(
    null,
  )
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const job = useRef<EvaluationJob | null>(null)
  const mounted = useRef(true)
  const generation = useRef(0)

  useEffect(() => {
    mounted.current = true
    let current = true
    void inspectEvaluationEnvironment().then((info) => {
      if (current) setEnvironment(info)
    })
    return () => {
      current = false
      mounted.current = false
      generation.current += 1
      job.current?.stop()
    }
  }, [])

  const start = () => {
    if (job.current) return
    const id = ++generation.current
    setBusy(true)
    setError(null)
    setShowJson(false)
    setReport(null)
    const current = () => mounted.current && id === generation.current
    const run = startSyntheticEvaluation(split, (next) => {
      if (current()) setReport(next)
    })
    job.current = run
    void run.done.then(
      (result) => {
        if (!current()) return
        setReport(result)
        if (result.environment.availability !== 'not-checked') {
          setEnvironment(result.environment)
        }
        setBusy(false)
        job.current = null
      },
      () => {
        if (!current()) return
        setError('Evaluation could not finish. No quality result is available.')
        setBusy(false)
        job.current = null
      },
    )
  }

  const share = async () => {
    if (!report || busy || Platform.OS !== 'ios') return
    try {
      await Share.share({
        title: 'Synthetic AI evaluation',
        message: JSON.stringify(report, null, 2),
      })
    } catch {
      if (mounted.current) {
        setError(
          'The share sheet could not open. Use Show JSON to inspect or copy.',
        )
      }
    }
  }

  const status =
    report?.status ??
    (busy || !environment
      ? 'checking'
      : environment.availability === 'available'
        ? 'ready'
        : 'blocked')
  const buttonStyle = [styles.button, { borderColor: theme.border }]
  const textStyle = [Typography.bodySm, { color: theme.text }]
  const mutedStyle = [Typography.bodySm, { color: theme.subtitleText }]
  const fixtures = AI_EVALUATION_FIXTURES.filter((item) => item.split === split)

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[Typography.headingLg, { color: theme.text }]}
        >
          Synthetic AI evaluations
        </Text>
        <Text style={textStyle}>
          Development only. Fixed synthetic inputs, no Health access, photos,
          personal logs, or cloud generation. Results stay in memory unless you
          explicitly share them.
        </Text>
        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={[Typography.headingSm, { color: theme.text }]}
          >
            {status.toUpperCase()}
          </Text>
          {environment ? (
            <>
              <Text style={textStyle}>
                Native app {environment.nativeAppVersion ?? 'unknown'} · build{' '}
                {environment.nativeBuildVersion ?? 'unknown'} ·{' '}
                {environment.platform} {environment.osVersion ?? 'unknown'}
              </Text>
              <Text style={textStyle}>
                {environment.engine}: {environment.availability}
              </Text>
              <Text style={mutedStyle}>
                {evaluationAvailabilityReason(environment.availability)}
              </Text>
            </>
          ) : null}
          <Text style={mutedStyle}>
            Apple’s model version is not exposed or pinned. Record the tested
            source commit beside any shared report.
          </Text>
          {report?.reason ? (
            <Text style={textStyle}>{report.reason}</Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={textStyle}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={styles.controls}>
          {(['tuning', 'held-out'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value} cases`}
              accessibilityState={{ checked: split === value, disabled: busy }}
              disabled={busy}
              onPress={() => {
                setSplit(value)
                setReport(null)
                setShowJson(false)
              }}
              style={[
                ...buttonStyle,
                {
                  backgroundColor:
                    split === value
                      ? theme.accentInactive
                      : theme.cardBackground,
                },
              ]}
            >
              <Text style={textStyle}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={mutedStyle}>
          {fixtures.length} cases: {fixtures.map((item) => item.id).join(', ')}.
          Tune on the tuning set; reserve held-out cases for final evaluation.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Run ${split} evaluations`}
          accessibilityState={{
            disabled: busy || environment?.availability !== 'available',
          }}
          disabled={busy || environment?.availability !== 'available'}
          onPress={start}
          style={[...buttonStyle, { backgroundColor: theme.accentInactive }]}
        >
          <Text style={[Typography.labelLg, { color: theme.accent }]}>
            Run {split} evaluations
          </Text>
        </Pressable>
        {busy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop after current request"
            onPress={() => job.current?.stop()}
            style={buttonStyle}
          >
            <Text style={textStyle}>Stop after current request</Text>
          </Pressable>
        ) : null}
        <Text style={mutedStyle}>
          Sequential requests use the production timeout and validation retry.
          Stop or leaving this screen skips later cases, not the native request
          already in flight.
        </Text>

        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          <Text style={[Typography.headingSm, { color: theme.warning }]}>
            Semantic review needed — always
          </Text>
          <Text style={textStyle}>
            Objective PASS means only the listed mechanical checks passed. It is
            never a full model-quality or health-safety pass. Outputs are the
            production-validated responses, not raw native generations.
          </Text>
          {SEMANTIC_REVIEW_RUBRIC.map((item) => (
            <Text key={item} style={mutedStyle}>
              • {item}
            </Text>
          ))}
        </View>

        {report?.cases.map((item) => (
          <View
            key={item.id}
            style={[styles.panel, { backgroundColor: theme.cardBackground }]}
          >
            <Text style={[Typography.headingSm, { color: theme.text }]}>
              {item.id}
            </Text>
            <Text style={mutedStyle}>
              {item.split} · {item.status} · {item.elapsedMs} ms
            </Text>
            <Text style={textStyle}>
              Objective checks: {item.objective.toUpperCase()} · Semantic
              review: REQUIRED
            </Text>
            {item.checks.map((check) => (
              <Text key={check.id} style={mutedStyle}>
                {check.passed ? 'PASS' : 'FAIL'} {check.id}: {check.detail}
              </Text>
            ))}
            <Text selectable style={textStyle}>
              {item.output ?? 'No output.'}
            </Text>
            {item.outputTruncated ? (
              <Text style={textStyle}>Output capture truncated.</Text>
            ) : null}
          </View>
        ))}
        {report && !busy ? (
          <>
            <Text style={mutedStyle}>Run elapsed: {report.elapsedMs} ms</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showJson ? 'Hide JSON' : 'Show JSON'}
              onPress={() => setShowJson(!showJson)}
              style={buttonStyle}
            >
              <Text style={textStyle}>
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </Text>
            </Pressable>
            {Platform.OS === 'ios' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share synthetic JSON"
                onPress={() => void share()}
                style={buttonStyle}
              >
                <Text style={textStyle}>Share synthetic JSON</Text>
              </Pressable>
            ) : null}
            {showJson ? (
              <Text selectable style={textStyle}>
                {JSON.stringify(report, null, 2)}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    padding: Layout.gutter,
    gap: Spacing.md,
  },
  panel: { padding: Spacing.lg, borderRadius: Radii.panel, gap: Spacing.sm },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  button: {
    minHeight: Layout.controlSize,
    minWidth: Layout.controlSize,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
