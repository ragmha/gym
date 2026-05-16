import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { activeParser } from '@/lib/aiParser'
import { getActiveBarcodeLookup } from '@/lib/foodDatabase'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useMealStore } from '@/stores/MealStore'

type Mode = 'menu' | 'photo' | 'barcode' | 'manual'

export default function ScanScreen() {
  const router = useRouter()
  const cardBg = useThemeColor({}, 'cardBackground')
  const bg = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const accent = useThemeColor({}, 'accent')

  const { addMeal } = useMealStore()
  const [mode, setMode] = useState<Mode>('menu')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [permission, requestPermission] = useCameraPermissions()

  const handlePhoto = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      })
      if (result.canceled) {
        setBusy(false)
        return
      }
      const photoUri = result.assets[0]?.uri
      if (!photoUri) {
        setError('No photo selected.')
        setBusy(false)
        return
      }
      const parsed = await activeParser.parse({
        photoUri,
        hint: hint || undefined,
      })
      if (!parsed.ok) {
        setError(`Could not parse meal (${parsed.error.kind}).`)
        setBusy(false)
        return
      }
      const saved = await addMeal({
        name: parsed.meal.name,
        caloriesKcal: parsed.meal.calories_kcal,
        proteinG: parsed.meal.protein_g,
        carbG: parsed.meal.carb_g,
        fatG: parsed.meal.fat_g,
        source: 'photo',
        photoUri,
        aiConfidence: parsed.meal.ai_confidence,
      })
      router.replace({
        pathname: '/nutrition/edit/[id]',
        params: { id: saved.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setBusy(false)
    }
  }, [addMeal, hint, router])

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (busy) return
      setBusy(true)
      setError(null)
      try {
        const lookup = await getActiveBarcodeLookup().lookup(data)
        if (!lookup) {
          setError(`Barcode ${data} not found in our database.`)
          setBusy(false)
          return
        }
        const saved = await addMeal({
          name: lookup.name,
          caloriesKcal: lookup.calories_kcal,
          proteinG: lookup.protein_g,
          carbG: lookup.carb_g,
          fatG: lookup.fat_g,
          source: 'barcode',
          barcode: data,
          aiConfidence: lookup.ai_confidence,
        })
        router.replace({
          pathname: '/nutrition/edit/[id]',
          params: { id: saved.id },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setBusy(false)
      }
    },
    [addMeal, busy, router],
  )

  const handleManualSubmit = useCallback(async () => {
    const name = hint.trim() || 'Meal'
    setBusy(true)
    try {
      const saved = await addMeal({
        name,
        caloriesKcal: 0,
        proteinG: 0,
        carbG: 0,
        fatG: 0,
        source: 'manual',
      })
      router.replace({
        pathname: '/nutrition/edit/[id]',
        params: { id: saved.id },
      })
    } finally {
      setBusy(false)
    }
  }, [addMeal, hint, router])

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg }]}
      edges={['top']}
    >
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
        <Text style={[styles.title, { color: textColor }]}>Add a meal</Text>
        <View style={{ width: 24 }} />
      </View>

      {mode === 'menu' && (
        <View style={styles.menu}>
          <ModeButton
            icon="camera"
            label="Snap photo"
            description="AI estimates calories + macros"
            color={accent}
            cardBg={cardBg}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPress={() => setMode('photo')}
          />
          <ModeButton
            icon="barcode"
            label="Scan barcode"
            description="Look up packaged food"
            color="#0ea5e9"
            cardBg={cardBg}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPress={() => setMode('barcode')}
          />
          <ModeButton
            icon="create"
            label="Manual entry"
            description="Enter values yourself"
            color="#a855f7"
            cardBg={cardBg}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPress={() => setMode('manual')}
          />
        </View>
      )}

      {mode === 'photo' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Optional hint (e.g. “grilled salmon, 200g”)
          </Text>
          <TextInput
            value={hint}
            onChangeText={setHint}
            placeholder="Describe the meal"
            placeholderTextColor={subtitleColor}
            style={[
              styles.input,
              { backgroundColor: cardBg, color: textColor },
            ]}
            editable={!busy}
          />
          <Pressable
            disabled={busy}
            onPress={handlePhoto}
            style={[
              styles.primary,
              { backgroundColor: accent, opacity: busy ? 0.6 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="image" size={18} color="#fff" />
                <Text style={styles.primaryText}>Choose photo</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {mode === 'barcode' && (
        <View style={styles.barcodeWrap}>
          {!permission ? null : !permission.granted ? (
            <View style={[styles.permission, { backgroundColor: cardBg }]}>
              <Ionicons name="lock-closed" size={28} color={subtitleColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Camera access needed
              </Text>
              <Pressable
                onPress={requestPermission}
                style={[styles.primary, { backgroundColor: accent }]}
              >
                <Text style={styles.primaryText}>Grant permission</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
              }}
              onBarcodeScanned={busy ? undefined : handleBarcodeScanned}
            />
          )}
          <Text style={[styles.helper, { color: subtitleColor }]}>
            Point at any product barcode. Try one of: 5060469981420,
            5410076721023, 722252100610.
          </Text>
        </View>
      )}

      {mode === 'manual' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Meal name
          </Text>
          <TextInput
            value={hint}
            onChangeText={setHint}
            placeholder="e.g. Greek salad"
            placeholderTextColor={subtitleColor}
            style={[
              styles.input,
              { backgroundColor: cardBg, color: textColor },
            ]}
            editable={!busy}
          />
          <Pressable
            disabled={busy}
            onPress={handleManualSubmit}
            style={[
              styles.primary,
              { backgroundColor: accent, opacity: busy ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

function ModeButton({
  icon,
  label,
  description,
  color,
  cardBg,
  textColor,
  subtitleColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description: string
  color: string
  cardBg: string
  textColor: string
  subtitleColor: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[modeBtnStyles.row, { backgroundColor: cardBg }]}
    >
      <View style={[modeBtnStyles.icon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={modeBtnStyles.body}>
        <Text style={[modeBtnStyles.label, { color: textColor }]}>{label}</Text>
        <Text style={[modeBtnStyles.description, { color: subtitleColor }]}>
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
    </Pressable>
  )
}

const modeBtnStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 2 },
})

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  menu: { paddingHorizontal: 16, paddingTop: 8 },
  section: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  barcodeWrap: { flex: 1, padding: 16, gap: 12 },
  camera: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  permission: { padding: 24, borderRadius: 14, alignItems: 'center', gap: 8 },
  helper: { fontSize: 12, textAlign: 'center' },
  errorWrap: { padding: 16 },
  errorText: { color: '#ef4444', fontSize: 13 },
})
