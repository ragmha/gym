import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import {
  HYROX_STATIONS,
  formatStationTime,
  getStation,
  parseStationTime,
  type HyroxStation,
} from '@/lib/training/hyrox'
import {
  useHyroxBenchmarkStoreBase,
  useHyroxStationSummary,
} from '@/stores/HyroxBenchmarkStore'

export default function HyroxLogScreen() {
  const router = useRouter()
  const theme = useTheme()
  const params = useLocalSearchParams<{ stationId?: string }>()
  const addBenchmark = useHyroxBenchmarkStoreBase((s) => s.addBenchmark)

  const initialStation = useMemo<HyroxStation>(() => {
    const requested = params.stationId
    if (typeof requested === 'string') {
      const match = HYROX_STATIONS.find((s) => s.id === requested)
      if (match) return match.id
    }
    return HYROX_STATIONS[0]?.id ?? 'run_1km'
  }, [params.stationId])

  const [stationId, setStationId] = useState<HyroxStation>(initialStation)
  const [timeText, setTimeText] = useState('')
  const [weightText, setWeightText] = useState('')

  const station = getStation(stationId)
  const summary = useHyroxStationSummary(stationId)
  const recentAttempts = useHyroxBenchmarkStoreBase((s) =>
    s.benchmarks.filter((b) => b.station === stationId).slice(0, 8),
  )

  const handleSave = () => {
    const seconds = parseStationTime(timeText)
    if (seconds == null || seconds <= 0) {
      Alert.alert('Invalid time', 'Use mm:ss or h:mm:ss format (e.g. 4:23).')
      return
    }
    let weightKg: number | null = null
    if (station.supportsWeight && weightText.trim().length > 0) {
      const parsed = Number(weightText.replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed < 0) {
        Alert.alert('Invalid weight', 'Enter a number in kg, or leave blank.')
        return
      }
      weightKg = parsed
    }
    addBenchmark({ station: stationId, timeSeconds: seconds, weightKg })
    router.back()
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: 'Log Hyrox attempt' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.subtitleText }]}>
          Station
        </Text>
        <View style={styles.stationGrid}>
          {HYROX_STATIONS.map((s) => {
            const selected = s.id === stationId
            return (
              <Pressable
                key={s.id}
                onPress={() => setStationId(s.id)}
                style={[
                  styles.stationChip,
                  {
                    backgroundColor: selected ? theme.hero : theme.cardElevated,
                  },
                ]}
              >
                <Ionicons
                  name={
                    s.ioniconName as React.ComponentProps<
                      typeof Ionicons
                    >['name']
                  }
                  size={14}
                  color={selected ? '#000' : theme.subtitleText}
                />
                <Text
                  style={[
                    styles.stationChipText,
                    { color: selected ? '#000' : theme.text },
                  ]}
                >
                  {s.short}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View
          style={[styles.summaryCard, { backgroundColor: theme.cardElevated }]}
        >
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {station.label}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text
                style={[styles.summaryLabel, { color: theme.subtitleText }]}
              >
                Target
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatStationTime(station.targetSeconds)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text
                style={[styles.summaryLabel, { color: theme.subtitleText }]}
              >
                PR
              </Text>
              <Text style={[styles.summaryValue, { color: theme.hero }]}>
                {summary.pr ? formatStationTime(summary.pr.timeSeconds) : '—'}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text
                style={[styles.summaryLabel, { color: theme.subtitleText }]}
              >
                Attempts
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {summary.attemptCount}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.subtitleText }]}>
          Time (mm:ss)
        </Text>
        <TextInput
          value={timeText}
          onChangeText={setTimeText}
          placeholder="4:23"
          placeholderTextColor={theme.subtitleText}
          keyboardType="numbers-and-punctuation"
          autoFocus
          style={[
            styles.input,
            {
              backgroundColor: theme.cardElevated,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
        />

        {station.supportsWeight ? (
          <>
            <Text style={[styles.label, { color: theme.subtitleText }]}>
              Weight (kg, optional)
            </Text>
            <TextInput
              value={weightText}
              onChangeText={setWeightText}
              placeholder={
                station.defaultWeightKg
                  ? `${station.defaultWeightKg}`
                  : 'Weight'
              }
              placeholderTextColor={theme.subtitleText}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardElevated,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          </>
        ) : null}

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={[styles.saveButton, { backgroundColor: theme.hero }]}
        >
          <Text style={styles.saveButtonText}>Save attempt</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.subtitleText }]}>
          Recent attempts
        </Text>
        <View style={{ gap: 8 }}>
          {recentAttempts.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.attemptRow,
                { backgroundColor: theme.cardElevated },
              ]}
            >
              <View>
                <Text style={[styles.attemptTime, { color: theme.text }]}>
                  {formatStationTime(entry.timeSeconds)}
                </Text>
                <Text
                  style={[styles.attemptMeta, { color: theme.subtitleText }]}
                >
                  {new Date(entry.recordedAt).toLocaleDateString()}{' '}
                  {entry.weightKg != null ? `· ${entry.weightKg}kg` : ''}
                </Text>
              </View>
            </View>
          ))}
          {summary.attemptCount === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subtitleText }]}>
              No attempts yet. Log your first time above.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stationChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCell: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  attemptRow: {
    padding: 12,
    borderRadius: 12,
  },
  attemptTime: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  attemptMeta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
})
