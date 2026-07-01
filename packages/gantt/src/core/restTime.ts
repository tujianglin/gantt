import { toTime } from '../utils/time'

export const DEFAULT_REST_TIME_OPTIONS = {
  enabled: false,
  ranges: [],
  rowRanges: [],
  rowRangesField: 'restTimes',
  taskRangesField: 'restTimes',
  modeField: 'restTimeMode',
  renderMode: 'dent',
  dentHeight: 12,
  bridgeHeight: 8,
  minWidth: 2
}

export function normalizeRestTimeOptions(restTime: any) {
  if (restTime === true) {
    return { ...DEFAULT_REST_TIME_OPTIONS, enabled: true }
  }
  if (!restTime || restTime === false || restTime.enabled === false) return null
  return {
    ...DEFAULT_REST_TIME_OPTIONS,
    ...restTime,
    enabled: true,
    ranges: Array.isArray(restTime.ranges) ? restTime.ranges : [],
    rowRanges: Array.isArray(restTime.rowRanges) ? restTime.rowRanges : []
  }
}

export function resolveRestTimeRanges(restTime: any, task: any, row: any, rowKey: string | number) {
  const options = normalizeRestTimeOptions(restTime)
  if (!options) return []

  const modeField = options.modeField || DEFAULT_REST_TIME_OPTIONS.modeField
  const rowRangesField = options.rowRangesField || DEFAULT_REST_TIME_OPTIONS.rowRangesField
  const taskRangesField = options.taskRangesField || DEFAULT_REST_TIME_OPTIONS.taskRangesField
  const normalizedRowKey = String(rowKey)

  let ranges = asArray(options.ranges)
  const optionRowRanges = asArray(options.rowRanges).filter(range => String(range.recordKey) === normalizedRowKey)
  const rowFieldRanges = asArray(row && row[rowRangesField])
  const rowMode = row && row[modeField]

  if (rowMode === 'disabled') return []
  ranges = rowMode === 'override'
    ? [...optionRowRanges, ...rowFieldRanges]
    : [...ranges, ...optionRowRanges, ...rowFieldRanges]

  const taskMode = task && task[modeField]
  if (taskMode === 'disabled') return []

  const taskFieldRanges = asArray(task && task[taskRangesField])
  ranges = taskMode === 'override' ? taskFieldRanges : [...ranges, ...taskFieldRanges]

  return ranges
}

export function createRestTimeSegments(
  ranges: any[],
  taskStart: any,
  taskEnd: any,
  taskWidth: number,
  minWidth = DEFAULT_REST_TIME_OPTIONS.minWidth
) {
  const startTime = toTime(taskStart)
  const endTime = toTime(taskEnd)
  const width = Number(taskWidth)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return []
  if (!Number.isFinite(width) || width <= 0) return []

  const clippedRanges = asArray(ranges)
    .map(range => {
      const rangeStart = toTime(range.startDate)
      const rangeEnd = toTime(range.endDate)
      if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) return null
      const clippedStart = Math.max(startTime, rangeStart)
      const clippedEnd = Math.min(endTime, rangeEnd)
      if (clippedEnd <= clippedStart) return null
      return { startTime: clippedStart, endTime: clippedEnd }
    })
    .filter(Boolean)
    .sort((a, b) => a.startTime - b.startTime)

  const mergedRanges = mergeRanges(clippedRanges)
  const minimumWidth = Number.isFinite(Number(minWidth)) ? Math.max(0, Number(minWidth)) : 0
  const duration = endTime - startTime

  return mergedRanges
    .map(range => {
      const left = ((range.startTime - startTime) / duration) * width
      const segmentWidth = ((range.endTime - range.startTime) / duration) * width
      return {
        startDate: new Date(range.startTime),
        endDate: new Date(range.endTime),
        startTime: range.startTime,
        endTime: range.endTime,
        left,
        width: segmentWidth,
        leftPercent: (left / width) * 100,
        widthPercent: (segmentWidth / width) * 100
      }
    })
    .filter(segment => segment.width >= minimumWidth)
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function mergeRanges(ranges: Array<{ startTime: number, endTime: number }>) {
  return ranges.reduce((merged, range) => {
    const previous = merged[merged.length - 1]
    if (!previous || range.startTime > previous.endTime) {
      merged.push({ ...range })
    } else {
      previous.endTime = Math.max(previous.endTime, range.endTime)
    }
    return merged
  }, [] as Array<{ startTime: number, endTime: number }>)
}
