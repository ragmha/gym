export function localDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('A valid date is required for a health snapshot')
  }
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `count` local calendar days ending on `endDate`, oldest first, each at local noon. */
export function localDaysEnding(endDate: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(endDate)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - (count - 1 - index))
    return day
  })
}
