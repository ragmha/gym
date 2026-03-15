import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export interface DataTableColumn<Row extends Record<string, unknown>> {
  key: keyof Row
  title: string
  width?: number
  render?: (row: Row) => React.ReactNode
}

interface DataTableProps<Row extends Record<string, unknown>> {
  columns: readonly DataTableColumn<Row>[]
  rows: readonly Row[]
  getRowKey?: (row: Row, index: number) => string
}

export function DataTable<Row extends Record<string, unknown>>({
  columns,
  rows,
  getRowKey,
}: DataTableProps<Row>) {
  const {
    text,
    subtitleText: subtitle,
    border,
    cardSurface: surface,
  } = useTheme()

  const resolveRowKey = (row: Row, index: number) => {
    if (getRowKey) return getRowKey(row, index)

    const candidate = row.id
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate)
    }

    return String(index)
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View
        style={[
          styles.table,
          { backgroundColor: surface, borderColor: border },
        ]}
      >
        <View
          style={[styles.row, styles.headerRow, { borderBottomColor: border }]}
        >
          {columns.map((column) => (
            <View
              key={String(column.key)}
              style={[
                styles.cell,
                column.width ? { width: column.width } : styles.flexCell,
              ]}
            >
              <Text style={[styles.headerText, { color: subtitle }]}>
                {column.title}
              </Text>
            </View>
          ))}
        </View>
        {rows.map((row, index) => (
          <View
            key={resolveRowKey(row, index)}
            style={[
              styles.row,
              index < rows.length - 1 && {
                borderBottomColor: border,
                borderBottomWidth: 1,
              },
            ]}
          >
            {columns.map((column) => (
              <View
                key={String(column.key)}
                style={[
                  styles.cell,
                  column.width ? { width: column.width } : styles.flexCell,
                ]}
              >
                {column.render ? (
                  column.render(row)
                ) : (
                  <Text style={[styles.bodyText, { color: text }]}>
                    {String(row[column.key] ?? '')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  table: {
    minWidth: '100%',
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  headerRow: {
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  flexCell: {
    flex: 1,
  },
  headerText: {
    ...Typography.labelSm,
  },
  bodyText: {
    ...Typography.bodySm,
  },
})
