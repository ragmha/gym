import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useThemeColor } from '@/hooks/useThemeColor'

const TABS = ['Overview', 'Recovery'] as const
export type Tab = (typeof TABS)[number]

interface SummaryTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function SummaryTabs({ activeTab, onTabChange }: SummaryTabsProps) {
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const surfaceColor = useThemeColor({}, 'cardSurface')

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab === activeTab
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && { backgroundColor: surfaceColor }]}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? textColor : subtitleColor },
                isActive && styles.tabTextActive,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    gap: 6,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    fontWeight: '700',
  },
})
