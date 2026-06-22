import type { RenderSnapshot, VirtualRowWindow, VirtualWindow } from '../types/internal'
import { toTime } from '../utils/time'

export function buildRenderSnapshot(gantt: any): RenderSnapshot {
  const xWindow = gantt.activeVirtualWindow || gantt.virtualWindow
  const yWindow = gantt.activeVirtualRowWindow || gantt.virtualRowWindow
  const dependencySnapshot = gantt.buildDependencySnapshot()
  const renderedRowEntries = gantt.renderedEntriesInWindow(yWindow)
  const renderedRows = renderedRowEntries.map(entry => entry.row)
  const visibleRowIds = renderedRows.reduce((ids, row) => {
    ids[gantt.recordKey(row)] = true
    return ids
  }, {})
  const rowLines = renderedRowEntries.map(({ row, bottom }) => ({ key: gantt.recordKey(row), y: bottom }))
  const visibleTasks = collectVisibleTasks(gantt, renderedRowEntries, xWindow)
  const parentTimelineTasks = collectParentTimelineTasks(gantt, renderedRowEntries, xWindow)
  const renderTasks = [...parentTimelineTasks, ...visibleTasks]
  renderTasks.forEach((task, index) => {
    task.__renderIndex = index
  })
  const taskLayoutByKey = gantt.createTaskLayoutByKey(renderTasks)
  const activeNormalizedLinks = gantt.activeLinkTaskKeys || gantt.dependency.showLinks === true
    ? dependencySnapshot.normalizedLinks
    : []
  const visibleLinks = activeNormalizedLinks.filter(link => taskLayoutByKey[link.from] && taskLayoutByKey[link.to])
  const connectedTaskKeys = visibleLinks.reduce((map, link) => {
    map[link.from] = true
    map[link.to] = true
    return map
  }, {})
  const visibleMilestones = collectVisibleMilestones(gantt, visibleTasks, xWindow)
  const baseUnits = gantt.baseUnits
  const majorUnits = gantt.majorUnits
  const verticalLines = baseUnits.map(unit => ({ key: `line-${unit.key}`, x: unit.x, startDate: unit.startDate }))
  const backgroundShades = collectBackgroundShades(gantt, majorUnits)
  const visibleBackgroundRanges = collectVisibleBackgroundRanges(gantt, xWindow)
  const visibleRowBackgroundRanges = collectVisibleRowBackgroundRanges(gantt, visibleRowIds, xWindow)

  return {
    xWindow,
    yWindow,
    renderedRowEntries,
    renderedRows,
    visibleRowIds,
    rowLines,
    verticalLines,
    backgroundShades,
    visibleBackgroundRanges,
    visibleRowBackgroundRanges,
    visibleTasks,
    parentTimelineTasks,
    renderTasks,
    stripedTasks: renderTasks.filter(task => task.striped),
    visibleMilestones,
    taskLayoutByKey,
    dependencySnapshot,
    normalizedLinks: dependencySnapshot.normalizedLinks,
    linkKeySet: dependencySnapshot.linkKeySet,
    linkAdjacencyByTaskKey: dependencySnapshot.linkAdjacencyByTaskKey,
    firstLinkGroupByTaskKey: dependencySnapshot.firstLinkGroupByTaskKey,
    activeNormalizedLinks,
    visibleLinks,
    connectedTaskKeys,
    markLines: gantt.markLines
  }
}

export function collectVisibleTasks(gantt: any, renderedRowEntries: any[], xWindow: VirtualWindow) {
  const tasks = []
  const tasksField = gantt.taskBar.tasksField
  renderedRowEntries.forEach(({ row, top }) => {
    if (row.children) return
    const rowKey = gantt.recordKey(row)
    const rowTasks = gantt.tasksInWindow
      ? gantt.tasksInWindow(rowKey, xWindow)
      : (Array.isArray(row[tasksField]) ? row[tasksField] : [])
    if (gantt.denseRenderOptions) {
      collectVisibleTasksForDenseRender(gantt, row, top, rowTasks, xWindow, tasks, rowKey)
      return
    }
    rowTasks.forEach(task => {
      if (!gantt.overlapsWindowRange(gantt.taskStart(task), gantt.taskEnd(task), xWindow)) return
      tasks.push({
        ...task,
        __rowId: rowKey,
        __rowRecord: row,
        __rowTop: top
      })
    })
  })
  return tasks
}

function collectVisibleTasksForDenseRender(
  gantt: any,
  row: Record<string, any>,
  top: number,
  rowTasks: Record<string, any>[],
  xWindow: VirtualWindow,
  tasks: Record<string, any>[],
  rowKey: string | number
) {
  const groups: Record<string, any> = {}

  rowTasks.forEach(task => {
    if (!gantt.overlapsWindowRange(gantt.taskStart(task), gantt.taskEnd(task), xWindow)) return
    if (!gantt.shouldDenseRenderTask(task)) {
      tasks.push({
        ...task,
        __rowId: rowKey,
        __rowRecord: row,
        __rowTop: top
      })
      return
    }

    const style = gantt.denseTaskStyle(task, row)
    const groupKey = `${rowKey}::${style.fill}::${style.opacity}::${style.className || ''}::${style.shape || 'rect'}`
    const startTime = toTime(gantt.taskStart(task))
    const endTime = toTime(gantt.taskEnd(task))
    const x = gantt.timeToX(startTime)
    const y = top + gantt.taskOffsetY(task)
    const width = gantt.durationWidth(startTime, endTime)
    const height = gantt.taskRenderHeight(task)

    if (!groups[groupKey]) {
      groups[groupKey] = {
        [gantt.options.taskKeyField]: `__dense_${rowKey}_${Object.keys(groups).length}`,
        [gantt.taskBar.startDateField]: startTime,
        [gantt.taskBar.endDateField]: endTime,
        [gantt.taskBar.statusField]: gantt.taskStatus(task),
        __rowId: rowKey,
        __rowRecord: row,
        __rowTop: top,
        __denseGroup: {
          fill: style.fill,
          opacity: style.opacity,
          className: style.className,
          shape: style.shape,
          entries: [],
          count: 0
        },
        height,
        offsetY: y - top
      }
    }

    const group = groups[groupKey]
    group[gantt.taskBar.startDateField] = Math.min(group[gantt.taskBar.startDateField], startTime)
    group[gantt.taskBar.endDateField] = Math.max(group[gantt.taskBar.endDateField], endTime)
    group.__denseGroup.entries.push({
      x,
      y,
      width,
      height
    })
    group.__denseGroup.count += 1
  })

  Object.keys(groups).forEach(key => {
    tasks.push(groups[key])
  })
}

export function collectParentTimelineTasks(gantt: any, renderedRowEntries: any[], xWindow: VirtualWindow) {
  const tasks = []
  renderedRowEntries.forEach(({ row, top }) => {
    if (!row.children || gantt.isExpanded(row)) return
    const descendantIds = gantt.rowMetrics.descendantKeysByRowId[gantt.recordKey(row)] || []
    const childTasks = []
    descendantIds.forEach(recordKey => {
      ;(gantt.rowMetrics.tasksByRowId[recordKey] || []).forEach(task => {
        if (!gantt.isPrimaryTask(task)) return
        if (!gantt.overlapsWindowRange(gantt.taskStart(task), gantt.taskEnd(task), xWindow)) return
        childTasks.push(task)
      })
    })
    const primaryTasks = childTasks.filter(task => {
      return task.__rowId !== undefined &&
        gantt.isPrimaryTask(task) &&
        gantt.overlapsWindowRange(gantt.taskStart(task), gantt.taskEnd(task), xWindow)
    })
    if (!primaryTasks.length) return

    const start = Math.min(...primaryTasks.map(task => toTime(gantt.taskStart(task))))
    const end = Math.max(...primaryTasks.map(task => toTime(gantt.taskEnd(task))))
    const progressTasks = primaryTasks.filter(task => gantt.taskProgress(task) !== undefined)
    const progress = progressTasks.length
      ? Math.round(progressTasks.reduce((total, task) => total + gantt.taskProgress(task), 0) / progressTasks.length)
      : undefined

    tasks.push({
      [gantt.options.taskKeyField]: `${gantt.recordKey(row)}__aggregate`,
      [gantt.taskBar.startDateField]: start,
      [gantt.taskBar.endDateField]: end,
      [gantt.taskBar.progressField]: progress,
      [gantt.taskBar.statusField]: gantt.taskStatus(primaryTasks[0]),
      title: row.name,
      subtitle: `${primaryTasks.length} 个工单`,
      workStatus: gantt.aggregateWorkStatus(primaryTasks),
      completed: primaryTasks.every(task => task.completed),
      predecessorIncomplete: primaryTasks.some(task => task.predecessorIncomplete),
      height: Math.max(28, gantt.rowHeight(row) - 12),
      offsetY: 6,
      parentAggregate: true,
      __rowId: gantt.recordKey(row),
      __rowRecord: row,
      __rowTop: top
    })
  })
  return tasks
}

export function collectVisibleMilestones(gantt: any, visibleTasks: any[], xWindow: VirtualWindow) {
  const milestones = []
  visibleTasks.forEach(task => {
    gantt.taskMilestones(task).forEach((milestone, index) => {
      const date = toTime(gantt.milestoneDate(milestone))
      if (!Number.isFinite(date)) return
      if (date < xWindow.timeStart || date > xWindow.timeEnd) return
      milestones.push({ task, milestone, index })
    })
  })
  return milestones
}

export function collectBackgroundShades(gantt: any, majorUnits: any[]) {
  const fill = gantt.grid.alternatingBackgroundColor
  if (!fill) return []
  return majorUnits.filter(unit => unit.dateIndex % 2 === 0).map(unit => ({
    key: `shade-${unit.key}`,
    x: unit.x,
    width: unit.width,
    fill
  }))
}

export function collectVisibleBackgroundRanges(gantt: any, xWindow: VirtualWindow) {
  return (gantt.grid.backgroundRanges || []).filter(range => {
    return toTime(range.endDate) > xWindow.timeStart &&
      toTime(range.startDate) < xWindow.timeEnd
  })
}

export function collectVisibleRowBackgroundRanges(
  gantt: any,
  visibleRowIds: Record<string, boolean>,
  xWindow: VirtualWindow
) {
  return (gantt.grid.rowBackgroundRanges || []).filter(range => {
    return visibleRowIds[range.recordKey] &&
      !gantt.isExpandedParentRow(range.recordKey) &&
      toTime(range.endDate) > xWindow.timeStart &&
      toTime(range.startDate) < xWindow.timeEnd
  })
}
