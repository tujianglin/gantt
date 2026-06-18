import type { RowEntry, VirtualRowWindow, VirtualWindow } from '../types/internal'

export function renderedEntriesInWindow(gantt: any, window: VirtualRowWindow): RowEntry[] {
  const entries = gantt.rowMetrics.visibleRowEntries
  if (!gantt.isVerticalVirtualScrollEnabled) return entries
  let low = 0
  let high = entries.length - 1
  let startIndex = entries.length
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (entries[mid].bottom >= window.yStart) {
      startIndex = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  const result = []
  for (let index = startIndex; index < entries.length; index += 1) {
    const entry = entries[index]
    if (entry.top > window.yEnd) break
    result.push(entry)
  }
  return result
}

export function getVirtualWindow(gantt: any): VirtualWindow {
  if (!gantt.isVirtualScrollEnabled) {
    return {
      xStart: 0,
      xEnd: gantt.chartWidth,
      timeStart: gantt.startTime,
      timeEnd: gantt.endTime,
      renderedForLeft: gantt.scrollLeft
    }
  }
  const viewportWidth = gantt.horizontalViewportWidth
  const xStart = Math.max(0, gantt.scrollLeft - gantt.virtualBufferPx)
  const xEnd = Math.min(gantt.chartWidth, gantt.scrollLeft + viewportWidth + gantt.virtualBufferPx)
  return {
    xStart,
    xEnd,
    timeStart: gantt.startTime + xStart / gantt.pxPerMs,
    timeEnd: gantt.startTime + xEnd / gantt.pxPerMs,
    renderedForLeft: gantt.scrollLeft
  }
}

export function getVirtualRowWindow(gantt: any): VirtualRowWindow {
  if (!gantt.isVerticalVirtualScrollEnabled) {
    return {
      yStart: 0,
      yEnd: gantt.bodyHeight,
      renderedForTop: gantt.scrollTop
    }
  }
  const viewportHeight = gantt.verticalViewportHeight
  return {
    yStart: Math.max(0, gantt.scrollTop - gantt.virtualRowBufferPx),
    yEnd: Math.min(gantt.bodyHeight, gantt.scrollTop + viewportHeight + gantt.virtualRowBufferPx),
    renderedForTop: gantt.scrollTop
  }
}

export function shouldRefreshVirtualWindow(gantt: any): boolean {
  if (!gantt.isVirtualScrollEnabled || !gantt.activeVirtualWindow) return false
  const threshold = Math.max(240, gantt.virtualBufferPx * 0.5)
  return Math.abs(gantt.scrollLeft - gantt.activeVirtualWindow.renderedForLeft) > threshold
}

export function shouldRefreshVirtualRows(gantt: any): boolean {
  if (!gantt.isVerticalVirtualScrollEnabled || !gantt.activeVirtualRowWindow) return false
  const threshold = Math.max(240, gantt.virtualRowBufferPx * 0.75)
  return Math.abs(gantt.scrollTop - gantt.activeVirtualRowWindow.renderedForTop) > threshold
}
