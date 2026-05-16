import React from 'react'
import { View } from 'react-native'

// ── Helpers ──────────────────────────────────────────────────────────

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

/** Deterministic seeded PRNG (mulberry32) — same seed → same pattern */
export function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return () => {
    h |= 0
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generatePattern(seed: string, length = 9): number[] {
  const rand = seededRandom(seed)
  return Array.from({ length }, () => 0.2 + rand() * 0.8)
}

// ── Mini bar chart ────────────────────────────────────────────────────

export function MiniBars({
  progress,
  color,
  pattern,
  seed,
  height = 32,
}: {
  progress: number
  color: string
  pattern?: number[]
  seed?: string
  height?: number
}) {
  const bars =
    pattern ??
    (seed
      ? generatePattern(seed)
      : [0.35, 0.55, 0.45, 0.7, 0.5, 0.8, 0.6, 0.75, 0.65])
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height,
        marginVertical: 10,
      }}
    >
      {bars.map((h, i) => {
        const filled = (i + 1) / bars.length <= progress
        return (
          <View
            key={i}
            style={{
              flex: 1,
              borderRadius: 2,
              minHeight: 4,
              height: h * height,
              backgroundColor: filled ? `${color}CC` : `${color}30`,
            }}
          />
        )
      })}
    </View>
  )
}

// ── Line sparkline ────────────────────────────────────────────────────

export function LineSparkline({
  color,
  seed,
  width = 110,
  height = 32,
}: {
  color: string
  seed: string
  width?: number
  height?: number
}) {
  const rand = seededRandom(seed)
  const raw = Array.from({ length: 9 }, (_, i) => {
    const base = 0.3 + rand() * 0.5
    const wave = Math.sin((i / 8) * Math.PI) * 0.2
    return clamp(base + wave, 0.05, 1)
  })
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const range = max - min || 1
  const pts = raw.map((v, i) => ({
    x: (i / (raw.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }))

  return (
    <View
      style={{
        width,
        height,
        marginVertical: 10,
        position: 'relative',
      }}
    >
      {pts.slice(0, -1).map((pt, i) => {
        const next = pts[i + 1]
        const dx = next.x - pt.x
        const dy = next.y - pt.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI
        const midX = (pt.x + next.x) / 2
        const midY = (pt.y + next.y) / 2
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: len,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              left: midX - len / 2,
              top: midY - 1,
              opacity: 0.9,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        )
      })}
      {pts.map((pt, i) => (
        <View
          key={`dot-${i}`}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            left: pt.x - 2,
            top: pt.y - 2,
          }}
        />
      ))}
    </View>
  )
}

// ── Arc gauge ─────────────────────────────────────────────────────────

export function ArcGauge({
  progress,
  color,
  bg,
  size = 52,
}: {
  progress: number
  color: string
  bg: string
  size?: number
}) {
  const p = clamp(progress, 0, 1)
  const deg = p * 360
  const rightDeg = Math.min(deg, 180)
  const leftDeg = deg > 180 ? deg - 180 : 0
  const thickness = 6
  const inner = size - thickness * 2

  return (
    <View
      style={{
        width: size,
        height: size,
        alignSelf: 'center',
        marginVertical: 6,
      }}
    >
      {/* Track ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: `${color}25`,
        }}
      />
      {/* Right half fill */}
      <View
        style={{
          position: 'absolute',
          width: size / 2,
          height: size,
          left: size / 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: color,
            left: -size / 2,
            transform: [{ rotate: `${rightDeg - 180}deg` }],
          }}
        />
      </View>
      {/* Left half fill — only when > 50% */}
      {deg > 180 && (
        <View
          style={{
            position: 'absolute',
            width: size / 2,
            height: size,
            left: 0,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: thickness,
              borderColor: color,
              transform: [{ rotate: `${leftDeg}deg` }],
            }}
          />
        </View>
      )}
      {/* Inner fill to create donut */}
      <View
        style={{
          position: 'absolute',
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: bg,
          top: thickness,
          left: thickness,
        }}
      />
    </View>
  )
}
