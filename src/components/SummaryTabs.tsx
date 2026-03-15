import React from 'react'
import { StyleSheet, View } from 'react-native'

import { SegmentedTabs } from '@/components/ui/SegmentedTabs'

const TABS = ['Overview', 'Recovery'] as const
export type Tab = (typeof TABS)[number]

interface SummaryTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function SummaryTabs({ activeTab, onTabChange }: SummaryTabsProps) {
  return (
    <View style={styles.container}>
      <SegmentedTabs
        options={TABS.map((tab) => ({ value: tab, label: tab }))}
        value={activeTab}
        onChange={onTabChange}
        tone="neutral"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
})
