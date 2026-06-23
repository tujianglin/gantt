import './vanilla-gantt.css'
import { DEFAULT_MILESTONE_TOOLTIP, DEFAULT_OPTIONS, DEFAULT_TASK_TOOLTIP } from './config/defaultOptions'
import {
  appendGrid as renderBodyGrid,
  appendGridSliced as renderBodyGridSliced,
  renderBodySvgContent as renderBodySvg,
  renderDefs as renderBodyDefs
} from './core/bodyRenderer'
import { buildDependencySnapshot, linkNetworkByTask } from './core/dependency'
import { getCachedDependencySnapshot, invalidateDependencySnapshot } from './core/dependencyState'
import {
  hideTaskTooltip as hideMeasuredTaskTooltip,
  positionTaskTooltip as positionMeasuredTaskTooltip,
  scheduleTaskForeignObjectMeasure as scheduleTaskMeasure,
  showMilestoneTooltip as showMeasuredMilestoneTooltip,
  showTaskTooltip as showMeasuredTaskTooltip
} from './core/measurements'
import {
  bindDelegatedLinkInteractions as bindDelegatedLinkEvents,
  bindDelegatedLinkConnectorInteractions as bindDelegatedLinkConnectorEvents,
  bindDelegatedTaskInteractions as bindDelegatedTaskEvents,
  bindLinkConnector as bindLinkConnectorEvents,
  bindMilestoneInteractions as bindMilestoneEvents,
  bindTaskInteractions as bindTaskEvents
} from './core/interactions'
import { buildRenderSnapshot } from './core/renderSnapshot'
import { clearTaskLayerPatchCache } from './core/renderLayers'
import { createTaskLayoutByKey, getTaskLayout } from './core/taskLayout'
import {
  applyTimelineSvgViewport as applyTimelineViewport,
  renderTimelineSvgContent as renderTimelineSvg,
  renderTimelineUnit as renderTimelineUnitNode
} from './core/timelineRenderer'
import { getVirtualRowWindow, getVirtualWindow, renderedEntriesInWindow, shouldRefreshVirtualRows, shouldRefreshVirtualWindow } from './core/virtualScroll'
import { HOUR } from './utils/constants'
import { attrs, el, svgEl } from './utils/dom'
import { mergeOptions } from './utils/options'
import { alignToFlex, applyTableHeaderStyle } from './utils/style'
import { toKeyList } from './utils/list'
import { formatDateTime, formatLocalDateTime, toTime } from './utils/time'

export default class VanillaGantt {
  [key: string]: any

  constructor(container: string | HTMLElement, options: Record<string, any> = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container
    if (!this.container) {
      throw new Error('VanillaGantt requires a valid container.')
    }

    this.options = mergeOptions(DEFAULT_OPTIONS, options)
    this.expandedRows = {}
    this.scrollTop = 0
    this.scrollLeft = 0
    this.disposers = []
    this.virtualDisposers = []
    this.leftVirtualDisposers = []
    this.taskMeasureFrames = []
    this.taskMeasureQueue = []
    this.taskMeasureFrame = null
    this.taskMeasuredHeightByKey = {}
    this.bodyRenderFrame = null
    this.bodyRenderToken = 0
    this.useSlicedBodyRender = false
    this.pendingHideLoadingAfterBodyRender = false
    this.virtualRenderFrame = null
    this.optionsRenderFrame = null
    this.hideLoadingFrame = null
    this.pendingVirtualRender = { x: false, y: false }
    this.pendingScrollbarDragRender = { x: false, y: false }
    this.loadingVisible = false
    this.customScrollbarUpdater = null
    this.customScrollbarDragActive = false
    this.scrollbarDragRenderTimer = null
    this.scrollbarDragRenderStartedAt = 0
    this.rowCache = null
    this.timelineUnitsCache = null
    this.currentRenderSnapshot = null
    this.dependencyVersion = 0
    this.cachedDependencySnapshot = null
    this.cachedDependencySnapshotVersion = -1
    this.cachedDependencyLinksRef = null
    clearTaskLayerPatchCache(this)
    this.activeVirtualWindow = null
    this.activeVirtualRowWindow = null
    this.activeDrag = null
    this.activeRowDragKey = null
    this.activeTooltip = null
    this.activeTooltipKey = null
    this.tooltipShowTimer = null
    this.hoveredTaskKey = null
    this.hoveredTaskNode = null
    this.tooltipPositionFrame = null
    this.pendingTooltipPosition = null
    this.activeLinkTaskKey = null
    this.activeLinkGroupKey = null
    this.activeLinkTaskKeys = null
    this.activeSelectedLinkKey = null
    this.activeLinkCreate = null
    this.suppressClickUntil = 0
    this.suppressClickTaskKey = null
    this.seedExpandedRows(this.options.records)
    this.render()
  }

  setOptions(options = {}) {
    const previousOptions = this.options
    const previousRecords = previousOptions.records
    const previousHeaderHeight = this.headerHeight
    const previousScrollbarAlwaysVisible = (previousOptions.scrollbar || {}).alwaysVisible
    const change = this.classifyOptionPatch(options)
    const nextOptions = mergeOptions(this.options, options)
    this.options = nextOptions
    if (change.dependencyChanged) invalidateDependencySnapshot(this)
    if (change.timelineChanged) this.timelineUnitsCache = null
    if (options.records || options.taskBar) {
      this.taskMeasuredHeightByKey = {}
      clearTaskLayerPatchCache(this)
    }
    if (change.recordsChanged) this.invalidateRowCache()
    if (options.records && options.records !== previousRecords) {
      this.seedExpandedRows(options.records, true)
    }

    if (this.canPatchScrollbarOnly(options, previousScrollbarAlwaysVisible)) {
      this.syncScrollbarLayout()
      return
    }

    if (this.canPatchInteractionOnly(change)) {
      this.patchInteractionOptions()
      return
    }

    if (this.canPatchTableLayoutOnly(change)) {
      this.syncTableLayout()
      return
    }

    if (this.canPatchTimeRangeOnly(change, previousHeaderHeight)) {
      if (this.isLoadingEnabled && change.timelineChanged) {
        this.showLoading()
        this.schedulePatchedLayout(() => this.refreshTimeRangeLayout())
      } else {
        this.refreshTimeRangeLayout()
      }
      return
    }

    if (this.canPatchRecordsOnly(change, previousHeaderHeight)) {
      if (this.isLoadingEnabled) {
        this.showLoading()
        this.schedulePatchedLayout(() => this.refreshRecordsLayout())
      } else {
        this.refreshRecordsLayout()
      }
      return
    }

    if (this.canPatchBodyOnly(change)) {
      this.refreshBodyLayout()
      return
    }

    this.activeVirtualRowWindow = null
    if (this.isLoadingEnabled) {
      this.showLoading()
      this.scheduleOptionsRender()
    } else {
      this.render()
    }
  }

  classifyOptionPatch(options = {}) {
    const keys = Object.keys(options || {})
    const hasOnly = allowed => keys.length > 0 && keys.every(key => allowed.includes(key))
    const tablePatch = options.taskListTable || {}
    const tableKeys = Object.keys(tablePatch)
    const tableLayoutKeys = ['tableWidth', 'minTableWidth', 'maxTableWidth', 'columnResizable']
    const timelineKeys = ['minDate', 'maxDate', 'timelineHeader']
    return {
      keys,
      recordsChanged: Object.prototype.hasOwnProperty.call(options, 'records'),
      timelineChanged: keys.some(key => timelineKeys.includes(key)),
      tableChanged: Object.prototype.hasOwnProperty.call(options, 'taskListTable'),
      tableLayoutOnly: keys.length === 1 &&
        Object.prototype.hasOwnProperty.call(options, 'taskListTable') &&
        tableKeys.length > 0 &&
        tableKeys.every(key => tableLayoutKeys.includes(key)),
      scrollbarChanged: Object.prototype.hasOwnProperty.call(options, 'scrollbar'),
      interactionChanged: keys.some(key => ['onScroll', 'performance', 'loading'].includes(key)),
      dependencyChanged: Object.prototype.hasOwnProperty.call(options, 'dependency'),
      gridChanged: Object.prototype.hasOwnProperty.call(options, 'grid'),
      markLineChanged: Object.prototype.hasOwnProperty.call(options, 'markLine'),
      taskBarChanged: Object.prototype.hasOwnProperty.call(options, 'taskBar'),
      virtualScrollChanged: Object.prototype.hasOwnProperty.call(options, 'virtualScroll'),
      onlyInteraction: hasOnly(['onScroll', 'performance', 'loading']),
      onlyRecords: hasOnly(['records']),
      onlyBody: hasOnly(['dependency', 'grid', 'markLine', 'taskBar', 'performance'])
    }
  }

  canPatchScrollbarOnly(options, previousAlwaysVisible) {
    const keys = Object.keys(options || {})
    if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(options, 'scrollbar')) return false
    const nextAlwaysVisible = (this.options.scrollbar || {}).alwaysVisible
    return previousAlwaysVisible === nextAlwaysVisible && this.scrollEl && this.scrollWrap
  }

  canPatchInteractionOnly(change) {
    return change.onlyInteraction && this.rootEl
  }

  patchInteractionOptions() {
    if (!this.isLoadingEnabled) this.hideLoading()
  }

  canPatchTableLayoutOnly(change) {
    return change.tableLayoutOnly && this.rootEl && this.leftHeaderEl && this.leftBodyInner
  }

  canPatchTimeRangeOnly(change, previousHeaderHeight) {
    if (!change.keys.length) return false
    return change.keys.every(key => ['minDate', 'maxDate', 'markLine', 'timelineHeader'].includes(key)) &&
      previousHeaderHeight === this.headerHeight &&
      this.timelineStage &&
      this.timelineSvg &&
      this.bodyStage &&
      this.bodySvg
  }

  canPatchRecordsOnly(change, previousHeaderHeight) {
    return change.onlyRecords &&
      this.options.minDate &&
      this.options.maxDate &&
      previousHeaderHeight === this.headerHeight &&
      this.rootEl &&
      this.leftBodyInner &&
      this.bodyStage &&
      this.bodySvg
  }

  canPatchBodyOnly(change) {
    return change.onlyBody &&
      !change.taskBarChanged &&
      this.bodyStage &&
      this.bodySvg
  }

  syncScrollbarLayout() {
    const width = `${this.scrollbarWidth}px`
    const height = `${this.scrollbarHeight}px`
    ;[this.scrollWrap, this.scrollEl].forEach(node => {
      if (!node || !node.style) return
      node.style.setProperty('--vg-scrollbar-width', width)
      node.style.setProperty('--vg-scrollbar-height', height)
    })
    if (this.customScrollbarUpdater) this.customScrollbarUpdater(true)
  }

  refreshBodyLayout() {
    this.renderBodySvgContent()
    if (this.customScrollbarUpdater) this.customScrollbarUpdater(true)
  }

  refreshRecordsLayout() {
    this.activeVirtualRowWindow = this.virtualRowWindow
    if (this.bodyStage) {
      this.bodyStage.style.height = `${this.bodyHeight}px`
    }
    if (this.leftBodyInner) {
      this.leftBodyInner.style.height = `${this.bodyHeight}px`
    }
    if (this.scrollEl) {
      const maxTop = Math.max(0, this.bodyHeight - this.scrollEl.clientHeight)
      if (this.scrollTop > maxTop) {
        this.scrollTop = maxTop
        this.scrollEl.scrollTop = maxTop
      }
    }
    this.renderLeftBodyContent()
    this.renderBodySvgContent()
    if (this.customScrollbarUpdater) this.customScrollbarUpdater(true)
  }

  refreshTimeRangeLayout() {
    this.activeVirtualWindow = this.virtualWindow
    if (this.timelineViewport && this.timelineHeader.backgroundColor) {
      this.timelineViewport.style.background = this.timelineHeader.backgroundColor
    }
    if (this.timelineStage) {
      this.timelineStage.style.width = `${this.chartWidth}px`
      this.timelineStage.style.transform = `translate3d(-${this.scrollLeft}px, 0, 0)`
    }
    if (this.timelineSvg && this.timelineHeader.backgroundColor) {
      this.timelineSvg.style.background = this.timelineHeader.backgroundColor
    }
    if (this.bodyStage) {
      this.bodyStage.style.width = `${this.chartWidth}px`
      this.bodyStage.style.minWidth = `${this.chartWidth}px`
    }
    if (this.scrollEl) {
      const maxLeft = Math.max(0, this.chartWidth - this.scrollEl.clientWidth)
      if (this.scrollLeft > maxLeft) {
        this.scrollLeft = maxLeft
        this.scrollEl.scrollLeft = maxLeft
      }
    }
    this.renderTimelineSvgContent()
    this.renderBodySvgContent()
    if (this.customScrollbarUpdater) this.customScrollbarUpdater(true)
  }

  destroy() {
    this.cleanup()
    this.container.innerHTML = ''
  }

  cleanup() {
    this.hideTaskTooltip()
    if (this.virtualRenderFrame) {
      cancelAnimationFrame(this.virtualRenderFrame)
      this.virtualRenderFrame = null
    }
    this.cancelBodyRenderSlice()
    if (this.optionsRenderFrame) {
      cancelAnimationFrame(this.optionsRenderFrame)
      this.optionsRenderFrame = null
    }
    if (this.hideLoadingFrame) {
      cancelAnimationFrame(this.hideLoadingFrame)
      this.hideLoadingFrame = null
    }
    this.pendingVirtualRender = { x: false, y: false }
    this.pendingScrollbarDragRender = { x: false, y: false }
    if (this.scrollbarDragRenderTimer) {
      clearTimeout(this.scrollbarDragRenderTimer)
      this.scrollbarDragRenderTimer = null
    }
    this.scrollbarDragRenderStartedAt = 0
    this.customScrollbarDragActive = false
    this.customScrollbarUpdater = null
    this.cleanupVirtualContent()
    this.cleanupLeftVirtualContent()
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
  }

  cleanupVirtualContent() {
    this.cancelBodyRenderSlice()
    this.taskMeasureFrames.forEach(frame => cancelAnimationFrame(frame))
    this.taskMeasureFrames = []
    if (this.taskMeasureFrame) {
      cancelAnimationFrame(this.taskMeasureFrame)
      this.taskMeasureFrame = null
    }
    this.taskMeasureQueue = []
    this.hoveredTaskNode = null
    this.hoveredTaskKey = null
    this.virtualDisposers.forEach(dispose => dispose())
    this.virtualDisposers = []
    this.currentRenderSnapshot = null
  }

  cancelBodyRenderSlice() {
    this.bodyRenderToken += 1
    this.pendingHideLoadingAfterBodyRender = false
    if (this.bodyRenderFrame) {
      cancelAnimationFrame(this.bodyRenderFrame)
      this.bodyRenderFrame = null
    }
  }

  cleanupLeftVirtualContent() {
    this.leftVirtualDisposers.forEach(dispose => dispose())
    this.leftVirtualDisposers = []
  }

  invalidateRowCache() {
    this.rowCache = null
  }

  buildRowCache() {
    const flatRows = []
    const visibleRows = []
    const rowById = {}
    const visibleEntryById = {}
    const tasksByRowId = {}
    const rawTasksByRowId = {}
    const sortedTasksByRowId = {}
    const maxTaskDurationByRowId = {}
    const descendantKeysByRowId = {}
    const allTasks = []
    const tasksField = this.taskBar.tasksField
    const filterActive = this.isFilterActive
    const visibleRowKeySet = {}
    const includeRowTasksOnMatch = this.filterIncludeRowTasksOnMatch

    const walkFlatRecord = (record, level = 0) => {
      const recordKey = this.recordKey(record)
      const normalized = { ...record, __recordKey: recordKey, level }
      flatRows.push(normalized)
      rowById[recordKey] = normalized

      const rowTasks = Array.isArray(record[tasksField])
        ? record[tasksField].map(task => ({
          ...task,
          __rowId: recordKey,
          __rowRecord: normalized,
          __startTime: toTime(this.taskStart(task)),
          __endTime: toTime(this.taskEnd(task))
        }))
        : []
      rawTasksByRowId[recordKey] = rowTasks

      const descendants = []
      ;(record.children || []).forEach(child => {
        const childKey = this.recordKey(child)
        descendants.push(childKey)
        const childDescendants = walkFlatRecord(child, level + 1)
        childDescendants.forEach(key => descendants.push(key))
      })
      descendantKeysByRowId[recordKey] = descendants
      return descendants
    }

    const rebuildTaskIndexes = row => {
      const recordKey = this.recordKey(row)
      const rowTasks = tasksByRowId[recordKey] || []
      sortedTasksByRowId[recordKey] = rowTasks.slice().sort((left, right) => {
        const leftStart = Number.isFinite(left.__startTime) ? left.__startTime : Number.POSITIVE_INFINITY
        const rightStart = Number.isFinite(right.__startTime) ? right.__startTime : Number.POSITIVE_INFINITY
        return leftStart - rightStart
      })
      maxTaskDurationByRowId[recordKey] = rowTasks.reduce((maxDuration, task) => {
        if (!Number.isFinite(task.__startTime) || !Number.isFinite(task.__endTime)) return maxDuration
        return Math.max(maxDuration, Math.max(0, task.__endTime - task.__startTime))
      }, 0)
      rowTasks.forEach(task => allTasks.push(task))
    }

    const evaluateVisibility = record => {
      const recordKey = this.recordKey(record)
      const normalized = rowById[recordKey]
      const rowTasks = rawTasksByRowId[recordKey] || []
      const matchingTasks = filterActive
        ? rowTasks.filter(task => this.matchesTaskFilter(task, normalized))
        : rowTasks
      const rowMatched = filterActive ? this.matchesRowFilter(normalized) : false
      let childVisible = false
      ;(record.children || []).forEach(child => {
        childVisible = evaluateVisibility(child) || childVisible
      })

      const visible = !filterActive || rowMatched || matchingTasks.length > 0 || childVisible
      if (visible) visibleRowKeySet[recordKey] = true

      normalized.__filterMatched = filterActive && rowMatched
      normalized.__taskFilterMatched = filterActive && matchingTasks.length > 0
      rowTasks.forEach(task => {
        task.__filterMatched = filterActive && matchingTasks.includes(task)
      })
      tasksByRowId[recordKey] = !filterActive || (rowMatched && includeRowTasksOnMatch)
        ? rowTasks
        : matchingTasks

      return visible
    }

    const walkFlat = (items, level = 0) => {
      items.forEach(record => {
        walkFlatRecord(record, level)
      })
    }

    const walkVisible = (items, level = 0) => {
      items.forEach(record => {
        const recordKey = this.recordKey(record)
        if (filterActive && !visibleRowKeySet[recordKey]) return
        const normalized = rowById[recordKey] || { ...record, __recordKey: recordKey, level }
        normalized.level = level
        visibleRows.push(normalized)
        if (record.children && this.isExpanded(normalized)) {
          walkVisible(record.children, level + 1)
        }
      })
    }

    walkFlat(this.options.records)
    this.options.records.forEach(record => evaluateVisibility(record))
    flatRows.forEach(row => rebuildTaskIndexes(row))
    walkVisible(this.options.records)

    let top = 0
    const visibleRowEntries = visibleRows.map(row => {
      const height = this.rowHeight(row)
      const entry = {
        row,
        top,
        bottom: top + height,
        height
      }
      top += height
      visibleEntryById[this.recordKey(row)] = entry
      return entry
    })

    return {
      flatRows,
      visibleRows,
      visibleRowEntries,
      visibleEntryById,
      rowById,
      tasksByRowId,
      sortedTasksByRowId,
      maxTaskDurationByRowId,
      descendantKeysByRowId,
      allTasks,
      bodyHeight: top
    }
  }

  renderedEntriesInWindow(window) {
    return renderedEntriesInWindow(this, window)
  }

  tasksInWindow(rowKey, window) {
    const tasks = this.rowMetrics.sortedTasksByRowId[rowKey] || []
    if (!tasks.length) return tasks

    const maxDuration = this.rowMetrics.maxTaskDurationByRowId[rowKey] || 0
    const startIndex = this.lowerBoundTaskStart(tasks, window.timeStart - maxDuration)
    const endIndex = this.lowerBoundTaskStart(tasks, window.timeEnd)
    const result = []
    for (let index = startIndex; index < endIndex; index += 1) {
      const task = tasks[index]
      if (!Number.isFinite(task.__startTime) || !Number.isFinite(task.__endTime)) continue
      if (task.__endTime > window.timeStart && task.__startTime < window.timeEnd) {
        result.push(task)
      }
    }
    return result
  }

  lowerBoundTaskStart(tasks, time) {
    let low = 0
    let high = tasks.length
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const startTime = Number.isFinite(tasks[mid].__startTime) ? tasks[mid].__startTime : Number.POSITIVE_INFINITY
      if (startTime < time) low = mid + 1
      else high = mid
    }
    return low
  }

  setFilter(filter = null) {
    this.setOptions({ filter })
  }

  clearFilter() {
    this.setOptions({ filter: null })
  }

  setHighlight(highlight = null) {
    this.setOptions({ highlight })
  }

  clearHighlight() {
    this.setOptions({ highlight: null })
  }

  scrollToRow(rowKey, options = {}) {
    if (!this.scrollEl) return false
    const entry = this.rowMetrics.visibleEntryById[rowKey]
    if (!entry) return false

    const align = options.align || 'center'
    const viewportHeight = this.verticalViewportHeight
    const nextTop = this.scrollOffsetForAlign(entry.top, entry.bottom, viewportHeight, align, this.scrollTop)
    const maxTop = Math.max(0, this.bodyHeight - viewportHeight)
    this.scrollTop = this.clampValue(nextTop, 0, maxTop)
    this.scrollEl.scrollTop = this.scrollTop
    return true
  }

  scrollToTask(taskKey, options = {}) {
    if (!this.scrollEl) return false
    const task = this.findTaskByKey(taskKey)
    if (!task) return false

    this.scrollToRow(task.__rowId, { align: options.rowAlign || options.alignY || 'center' })

    const align = options.align || options.alignX || 'center'
    const startX = this.timeToX(this.taskStart(task))
    const endX = startX + this.durationWidth(this.taskStart(task), this.taskEnd(task))
    const viewportWidth = this.horizontalViewportWidth
    const nextLeft = this.scrollOffsetForAlign(startX, endX, viewportWidth, align, this.scrollLeft)
    const maxLeft = Math.max(0, this.chartWidth - viewportWidth)
    this.scrollLeft = this.clampValue(nextLeft, 0, maxLeft)
    this.scrollEl.scrollLeft = this.scrollLeft

    if (options.highlight !== false) {
      this.setHighlight({
        taskKeys: [taskKey],
        rowKeys: [task.__rowId]
      })
    }
    return true
  }

  findTaskByKey(taskKey) {
    return this.rowMetrics.allTasks.find(task => this.isSameKey(this.taskKey(task), taskKey)) || null
  }

  scrollOffsetForAlign(start, end, viewportSize, align, current) {
    if (align === 'start') return start
    if (align === 'end') return end - viewportSize
    if (align === 'nearest') {
      if (start >= current && end <= current + viewportSize) return current
      if (start < current) return start
      return end - viewportSize
    }
    return start - (viewportSize - Math.max(1, end - start)) / 2
  }

  clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  buildRenderSnapshot() {
    return buildRenderSnapshot(this)
  }

  buildDependencySnapshot() {
    return getCachedDependencySnapshot(this, () => buildDependencySnapshot(this))
  }

  createTaskLayoutByKey(renderTasks) {
    return createTaskLayoutByKey(this, renderTasks)
  }

  getTaskLayout(task, snapshot = this.currentRenderSnapshot) {
    return getTaskLayout(this, task, snapshot)
  }

  render() {
    this.invalidateRowCache()
    this.timelineUnitsCache = null
    this.cleanup()
    this.activeVirtualWindow = this.virtualWindow
    this.activeVirtualRowWindow = this.virtualRowWindow

    const root = el('div', 'vg')
    root.style.setProperty('--vg-left-width', `${this.tableWidth}px`)
    this.rootEl = root

    const left = el('div', 'vg-left')
    const right = el('div', 'vg-right')

    left.append(this.renderLeftHeader(), this.renderLeftBody(), this.renderResizeHandle(root))
    right.append(this.renderTimeline(), this.renderBody())
    root.append(left, right)
    if (this.loadingVisible) {
      root.append(this.renderLoadingOverlay())
    }
    this.bindLinkDeleteKeyboard()

    this.container.innerHTML = ''
    this.container.append(root)

    if (this.scrollEl) {
      this.scrollEl.scrollTop = this.scrollTop
      this.scrollEl.scrollLeft = this.scrollLeft
    }
  }

  scheduleOptionsRender() {
    if (this.optionsRenderFrame) return
    this.optionsRenderFrame = requestAnimationFrame(() => {
      this.optionsRenderFrame = requestAnimationFrame(() => {
        this.optionsRenderFrame = null
        this.useSlicedBodyRender = this.loadingOptions.bodyRenderSlice !== false
        this.render()
        this.useSlicedBodyRender = false
        if (this.bodyRenderFrame) {
          this.pendingHideLoadingAfterBodyRender = true
        } else {
          this.hideLoadingFrame = requestAnimationFrame(() => {
            this.hideLoadingFrame = null
            this.hideLoading()
          })
        }
      })
    })
  }

  schedulePatchedLayout(callback) {
    if (this.optionsRenderFrame) return
    this.optionsRenderFrame = requestAnimationFrame(() => {
      this.optionsRenderFrame = requestAnimationFrame(() => {
        this.optionsRenderFrame = null
        this.useSlicedBodyRender = this.loadingOptions.bodyRenderSlice !== false
        callback()
        this.useSlicedBodyRender = false
        if (this.bodyRenderFrame) {
          this.pendingHideLoadingAfterBodyRender = true
        } else {
          this.hideLoadingFrame = requestAnimationFrame(() => {
            this.hideLoadingFrame = null
            this.hideLoading()
          })
        }
      })
    })
  }

  showLoading() {
    this.loadingVisible = true
    const host = this.rootEl || this.container
    if (!host.querySelector('.vg-loading')) {
      host.append(this.renderLoadingOverlay())
    }
  }

  hideLoading() {
    this.loadingVisible = false
    const node = this.container.querySelector('.vg-loading')
    if (node && node.parentNode) node.parentNode.removeChild(node)
  }

  renderLoadingOverlay() {
    const loading = this.loadingOptions
    const overlay = el('div', `vg-loading${loading.className ? ` ${loading.className}` : ''}`)
    const custom = this.resolveContent(loading.customLayout, {
      gantt: this,
      ganttInstance: this,
      text: loading.text || '加载中...'
    })
    if (custom) {
      overlay.append(custom)
    } else {
      const content = el('div', 'vg-loading-content')
      const spinner = el('span', 'vg-loading-spinner')
      const text = el('span', 'vg-loading-text')
      text.textContent = loading.text || '加载中...'
      content.append(spinner, text)
      overlay.append(content)
    }
    return overlay
  }

  renderLeftHeader() {
    const header = el('div', 'vg-left-header')
    header.style.height = `${this.headerHeight}px`
    header.style.gridTemplateColumns = this.tableGridTemplateColumns
    applyTableHeaderStyle(header, this.taskListTable.headerStyle)
    this.leftHeaderEl = header
    const custom = this.resolveContent(this.taskListTable.renderHeader, { gantt: this })
    if (custom) {
      header.append(custom)
    } else {
      this.tableColumns.forEach((column, columnIndex) => {
        header.append(this.renderTableHeaderCell(column, columnIndex))
      })
    }
    return header
  }

  renderTableHeaderCell(column, columnIndex) {
    const cell = el('div', `vg-table-header-cell${column.className ? ` ${column.className}` : ''}`)
    const headerStyle = {
      ...(this.taskListTable.headerStyle || {}),
      ...(column.headerStyle || {})
    }
    applyTableHeaderStyle(cell, headerStyle)
    const content = el('div', 'vg-table-header-content')
    content.style.justifyContent = alignToFlex(column.headerAlign || headerStyle.textAlign || column.align || 'left')
    const custom = this.resolveContent(column.renderHeader, {
      column,
      columnIndex,
      gantt: this
    })
    if (custom) {
      content.append(custom)
    } else {
      content.textContent = column.title || column.field || ''
    }
    cell.append(content)

    if (this.isColumnResizable(column)) {
      cell.append(this.renderColumnResizeHandle(column, columnIndex))
    }
    return cell
  }

  renderColumnResizeHandle(column, columnIndex) {
    const handle = el('span', 'vg-column-resize-handle')
    const onMouseDown = event => {
      const startX = event.clientX
      const startWidth = this.columnWidth(column)
      const onMove = moveEvent => {
        const next = startWidth + moveEvent.clientX - startX
        this.resizeColumn(columnIndex, next)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      event.preventDefault()
      event.stopPropagation()
    }
    handle.addEventListener('mousedown', onMouseDown)
    this.disposers.push(() => handle.removeEventListener('mousedown', onMouseDown))
    return handle
  }

  resizeColumn(columnIndex, width) {
    const sourceColumn = this.sourceTableColumns[columnIndex]
    if (!sourceColumn) return

    const minWidth = Number(sourceColumn.minWidth || 48)
    const maxWidth = Number(sourceColumn.maxWidth || 600)
    sourceColumn.width = Math.min(maxWidth, Math.max(minWidth, Math.round(width)))
    this.syncTableLayout()
  }

  syncTableLayout() {
    const width = this.tableWidth
    if (this.rootEl) this.rootEl.style.setProperty('--vg-left-width', `${width}px`)
    if (this.leftHeaderEl) this.leftHeaderEl.style.gridTemplateColumns = this.tableGridTemplateColumns
    if (this.leftBodyInner) {
      Array.from(this.leftBodyInner.children).forEach(row => {
        row.style.gridTemplateColumns = this.tableGridTemplateColumns
      })
    }
  }

  addLeftDisposer(dispose) {
    this.leftVirtualDisposers.push(dispose)
  }

  renderLeftBody() {
    const body = el('div', 'vg-left-body')
    const inner = el('div', 'vg-left-body-inner')
    inner.style.height = `${this.bodyHeight}px`
    inner.style.position = this.isVerticalVirtualScrollEnabled ? 'relative' : ''
    inner.style.transform = `translate3d(0, -${this.scrollTop}px, 0)`
    this.leftBodyInner = inner

    this.renderLeftBodyContent()

    body.append(inner)
    const onWheel = event => {
      if (!this.scrollEl || !event.deltaY) return
      this.scrollEl.scrollTop += event.deltaY
      event.preventDefault()
    }
    body.addEventListener('wheel', onWheel, { passive: false })
    this.disposers.push(() => body.removeEventListener('wheel', onWheel))
    return body
  }

  renderLeftBodyContent() {
    if (!this.leftBodyInner) return
    this.cleanupLeftVirtualContent()
    this.leftBodyInner.innerHTML = ''
    this.leftBodyInner.style.height = `${this.bodyHeight}px`
    this.leftBodyInner.style.position = this.isVerticalVirtualScrollEnabled ? 'relative' : ''
    this.activeVirtualRowWindow = this.virtualRowWindow

    const fragment = document.createDocumentFragment()
    this.renderedRowEntries.forEach(({ row, top }) => {
      const rowClass = [
        'vg-row',
        row.children ? 'vg-row--group' : '',
        row.__filterMatched || row.__taskFilterMatched ? 'vg-row--matched' : '',
        this.isRowHighlighted(row) ? 'vg-row--highlighted' : ''
      ].filter(Boolean).join(' ')
      const rowEl = el('div', rowClass)
      rowEl.style.height = `${this.rowHeight(row)}px`
      rowEl.style.gridTemplateColumns = this.tableGridTemplateColumns
      if (this.isVerticalVirtualScrollEnabled) {
        rowEl.style.position = 'absolute'
        rowEl.style.left = '0'
        rowEl.style.right = '0'
        rowEl.style.top = `${top}px`
      }
      this.tableColumns.forEach((column, columnIndex) => {
        rowEl.append(this.renderTableCell(row, column, columnIndex))
      })
      if (this.isRowDraggable(row)) {
        this.bindRowDrag(rowEl, row)
      }
      fragment.append(rowEl)
    })
    this.leftBodyInner.append(fragment)
  }

  bindRowDrag(rowEl, row) {
    const rowKey = this.recordKey(row)
    const dragHandles = Array.from(rowEl.querySelectorAll('[data-vg-row-drag-handle]'))
    const hasHandle = dragHandles.length > 0
    rowEl.classList.add('vg-row--draggable')
    rowEl.classList.toggle('vg-row--handle-draggable', hasHandle)
    rowEl.draggable = !hasHandle
    rowEl.dataset.rowKey = String(rowKey)
    dragHandles.forEach(handle => {
      handle.draggable = true
    })

    const onDragStart = event => {
      const fromHandle = event.target && event.target.closest && event.target.closest('[data-vg-row-drag-handle]')
      if (hasHandle && !fromHandle) {
        event.preventDefault()
        return
      }
      if (event.target && event.target.closest && event.target.closest('button,input,select,textarea,a,[data-vg-no-row-drag]')) {
        event.preventDefault()
        return
      }
      this.activeRowDragKey = rowKey
      rowEl.classList.add('vg-row--dragging')
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(rowKey))
      }
    }
    const onDragOver = event => {
      if (!this.activeRowDragKey || String(this.activeRowDragKey) === String(rowKey)) return
      event.preventDefault()
      rowEl.classList.add('vg-row--drag-over')
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    }
    const onDragLeave = () => {
      rowEl.classList.remove('vg-row--drag-over')
    }
    const onDrop = event => {
      event.preventDefault()
      rowEl.classList.remove('vg-row--drag-over')
      this.moveRowRecord(this.activeRowDragKey, rowKey)
    }
    const onDragEnd = () => {
      rowEl.classList.remove('vg-row--dragging', 'vg-row--drag-over')
      this.activeRowDragKey = null
    }

    rowEl.addEventListener('dragstart', onDragStart)
    rowEl.addEventListener('dragover', onDragOver)
    rowEl.addEventListener('dragleave', onDragLeave)
    rowEl.addEventListener('drop', onDrop)
    rowEl.addEventListener('dragend', onDragEnd)
    this.addLeftDisposer(() => {
      rowEl.removeEventListener('dragstart', onDragStart)
      rowEl.removeEventListener('dragover', onDragOver)
      rowEl.removeEventListener('dragleave', onDragLeave)
      rowEl.removeEventListener('drop', onDrop)
      rowEl.removeEventListener('dragend', onDragEnd)
    })
  }

  renderTableCell(row, column, columnIndex) {
    const cell = el('div', `vg-table-cell${column.className ? ` ${column.className}` : ''}`)
    cell.style.justifyContent = alignToFlex(column.align || 'left')

    const value = this.getCellValue(row, column, columnIndex)
    const payload = {
      value,
      record: row,
      row,
      column,
      columnIndex,
      expanded: this.isExpanded(row),
      toggle: () => this.toggleRow(row),
      gantt: this
    }
    const custom = this.resolveContent(column.renderCell || this.taskListTable.renderCell, payload)
    if (custom) {
      cell.append(custom)
      this.bindTemplateToggle(cell, row)
      return cell
    }

    if (this.isTreeColumn(column, columnIndex)) {
      cell.append(this.renderTreeCell(row, value))
    } else if (column.field === 'load') {
      cell.append(this.renderLoadCell(row, value))
    } else {
      cell.textContent = value === undefined || value === null ? '' : String(value)
    }
    return cell
  }

  renderTreeCell(row, value) {
    const name = el('div', `vg-row-name${row.children ? ' vg-row-name--toggle' : ''}`)
    name.style.paddingLeft = `${row.level * 16}px`
    if (row.children) {
      const button = el('button', 'vg-row-toggle')
      button.type = 'button'
      button.setAttribute('aria-label', this.isExpanded(row) ? '收起' : '展开')
      button.setAttribute('aria-expanded', String(this.isExpanded(row)))
      if (this.isExpanded(row)) {
        button.classList.add('vg-row-toggle--expanded')
      }
      name.append(button)
      name.addEventListener('click', () => this.toggleRow(row))
    }
    name.append(document.createTextNode(value === undefined || value === null ? '' : String(value)))
    return name
  }

  renderLoadCell(row, value) {
    const loadValue = value === undefined ? row.load : value
    if (loadValue === undefined || loadValue === null) return document.createTextNode('')

    const load = el('div', 'vg-row-load')
    const bar = el('i')
    bar.style.width = `${loadValue}%`
    bar.style.background = this.loadColor(loadValue)
    const valueNode = el('b')
    valueNode.textContent = `${loadValue}%`
    valueNode.style.color = this.loadColor(loadValue)
    load.append(bar, valueNode)
    return load
  }

  getCellValue(row, column, columnIndex) {
    if (typeof column.valueGetter === 'function') {
      return column.valueGetter({
        record: row,
        row,
        column,
        columnIndex,
        gantt: this
      })
    }
    return column.field ? row[column.field] : undefined
  }

  isTreeColumn(column, columnIndex) {
    return column.tree === true || (column.tree !== false && columnIndex === 0 && column.field === 'name')
  }

  isColumnResizable(column) {
    if (column.resizable === false) return false
    return this.taskListTable.columnResizable !== false
  }

  bindTemplateToggle(root, row) {
    if (!row.children) return
    root.querySelectorAll('[data-vg-toggle]').forEach(node => {
      const onClick = event => {
        event.preventDefault()
        event.stopPropagation()
        this.toggleRow(row)
      }
      node.addEventListener('click', onClick)
      this.addLeftDisposer(() => node.removeEventListener('click', onClick))
    })
  }

  isRowDraggable(row) {
    const draggable = this.taskListTable.rowDraggable
    if (typeof draggable === 'function') {
      return draggable({
        record: row,
        row,
        gantt: this
      }) === true
    }
    return draggable === true
  }

  moveRowRecord(sourceKey, targetKey) {
    if (sourceKey === undefined || sourceKey === null || targetKey === undefined || targetKey === null) return
    if (String(sourceKey) === String(targetKey)) return

    const source = this.findRecordLocation(sourceKey)
    const target = this.findRecordLocation(targetKey)
    if (!source || !target || source.list !== target.list) return

    const [record] = source.list.splice(source.index, 1)
    const nextIndex = source.index < target.index ? target.index - 1 : target.index
    source.list.splice(nextIndex, 0, record)
    this.activeRowDragKey = null

    if (typeof this.taskListTable.onRowDragEnd === 'function') {
      this.taskListTable.onRowDragEnd({
        record,
        sourceIndex: source.index,
        targetIndex: nextIndex,
        records: source.list,
        gantt: this
      })
    }
    this.render()
  }

  findRecordLocation(recordKey, records = this.options.records) {
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]
      if (String(this.recordKey(record)) === String(recordKey)) {
        return { record, list: records, index }
      }
      if (record.children) {
        const found = this.findRecordLocation(recordKey, record.children)
        if (found) return found
      }
    }
    return null
  }

  renderResizeHandle(root) {
    const handle = el('span', 'vg-resize-handle')
    const onMouseDown = event => {
      const startX = event.clientX
      const startWidth = this.tableWidth
      const onMove = moveEvent => {
        const next = startWidth + moveEvent.clientX - startX
        this.taskListTable.tableWidth = Math.min(
          this.taskListTable.maxTableWidth,
          Math.max(this.taskListTable.minTableWidth, next)
        )
        root.style.setProperty('--vg-left-width', `${this.taskListTable.tableWidth}px`)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      event.preventDefault()
    }
    handle.addEventListener('mousedown', onMouseDown)
    this.disposers.push(() => handle.removeEventListener('mousedown', onMouseDown))
    return handle
  }

  renderTimeline() {
    const viewport = el('div', 'vg-timeline-viewport')
    viewport.style.height = `${this.headerHeight}px`
    if (this.timelineHeader.backgroundColor) {
      viewport.style.background = this.timelineHeader.backgroundColor
    }
    this.timelineViewport = viewport

    const stage = el('div', 'vg-timeline-stage')
    stage.style.width = `${this.chartWidth}px`
    stage.style.height = `${this.headerHeight}px`
    stage.style.position = 'relative'
    stage.style.transform = `translate3d(-${this.scrollLeft}px, 0, 0)`
    this.timelineStage = stage

    const svg = svgEl('svg', 'vg-timeline-svg')
    if (this.timelineHeader.backgroundColor) {
      svg.style.background = this.timelineHeader.backgroundColor
    }
    this.timelineSvg = svg
    this.applyTimelineSvgViewport(svg)
    this.renderTimelineSvgContent(svg)

    stage.append(svg)
    viewport.append(stage)
    return viewport
  }

  renderTimelineSvgContent(svg = this.timelineSvg) {
    return renderTimelineSvg(this, svg)
  }

  applyTimelineSvgViewport(svg = this.timelineSvg) {
    return applyTimelineViewport(this, svg)
  }

  renderTimelineUnit(unit, y, height, scale, scaleIndex) {
    return renderTimelineUnitNode(this, unit, y, height, scale, scaleIndex)
  }

  shouldRenderTimelineUnitContent(unit, scale) {
    const minWidth = Number(
      scale.minLabelWidth === undefined
        ? this.timelineHeader.minLabelWidth
        : scale.minLabelWidth
    )
    return !Number.isFinite(minWidth) || minWidth <= 0 || unit.width >= minWidth
  }

  renderBody() {
    const wrap = el('div', `vg-scroll-wrap${this.scrollbarOptions.alwaysVisible ? ' vg-scroll-wrap--custom' : ''}`)
    wrap.style.setProperty('--vg-scrollbar-width', `${this.scrollbarWidth}px`)
    wrap.style.setProperty('--vg-scrollbar-height', `${this.scrollbarHeight}px`)
    this.scrollWrap = wrap
    const scroll = el('div', `vg-scroll${this.scrollbarOptions.alwaysVisible ? ' vg-scroll--custom' : ''}`)
    scroll.style.setProperty('--vg-scrollbar-width', `${this.scrollbarWidth}px`)
    scroll.style.setProperty('--vg-scrollbar-height', `${this.scrollbarHeight}px`)
    const stage = el('div', 'vg-stage')
    stage.style.width = `${this.chartWidth}px`
    stage.style.minWidth = `${this.chartWidth}px`
    stage.style.height = `${this.bodyHeight}px`
    stage.style.position = 'relative'
    this.bodyStage = stage

    const svg = svgEl('svg', 'vg-svg')
    this.bodySvg = svg
    this.applyBodySvgViewport(svg)
    this.renderBodySvgContent(svg)
    const onCanvasClick = () => {
      const clearedGroup = this.clearActiveLinkGroup()
      const clearedLink = this.clearActiveLinkSelection()
      if (clearedGroup || clearedLink) this.render()
    }
    svg.addEventListener('click', onCanvasClick)
    this.disposers.push(() => svg.removeEventListener('click', onCanvasClick))
    stage.append(svg)
    scroll.append(stage)

    const onScroll = () => {
      const previousScrollLeft = this.scrollLeft
      const previousScrollTop = this.scrollTop
      this.scrollTop = scroll.scrollTop
      this.scrollLeft = scroll.scrollLeft
      if (previousScrollTop !== this.scrollTop && this.leftBodyInner) {
        this.leftBodyInner.style.transform = `translate3d(0, -${this.scrollTop}px, 0)`
      }
      if (previousScrollLeft !== this.scrollLeft && this.timelineStage) {
        this.timelineStage.style.transform = `translate3d(-${this.scrollLeft}px, 0, 0)`
      }
      if (typeof this.options.onScroll === 'function') {
        this.options.onScroll({ scrollLeft: this.scrollLeft, scrollTop: this.scrollTop })
      }
      if (this.customScrollbarUpdater) this.customScrollbarUpdater()
      const refreshX = previousScrollLeft !== this.scrollLeft && this.shouldRefreshVirtualWindow()
      const refreshY = previousScrollTop !== this.scrollTop && this.shouldRefreshVirtualRows()
      if (refreshX || refreshY) {
        const reason = { x: refreshX, y: refreshY }
        if (this.customScrollbarDragActive) this.scheduleScrollbarDragVirtualRender(reason)
        else this.scheduleVirtualRender(reason)
      }
    }
    scroll.addEventListener('scroll', onScroll)
    this.disposers.push(() => scroll.removeEventListener('scroll', onScroll))
    this.scrollEl = scroll
    wrap.append(scroll)
    if (this.scrollbarOptions.alwaysVisible) {
      this.renderCustomScrollbars(wrap, scroll)
    }

    return wrap
  }

  renderCustomScrollbars(wrap, scroll) {
    const vTrack = el('div', 'vg-scrollbar vg-scrollbar--vertical')
    const hTrack = el('div', 'vg-scrollbar vg-scrollbar--horizontal')
    const vThumb = el('div', 'vg-scrollbar-thumb')
    const hThumb = el('div', 'vg-scrollbar-thumb')
    const corner = el('div', 'vg-scrollbar-corner')
    vTrack.append(vThumb)
    hTrack.append(hThumb)
    wrap.append(vTrack, hTrack, corner)

    let updateFrame = null
    let dragFrame = null
    let isDragging = false
    let pendingDragAxis = null
    let pendingDragScroll = 0
    let metrics = null
    let cleanupActiveDrag = null
    const measure = () => {
      const verticalTrackSize = Math.max(1, wrap.clientHeight - this.scrollbarHeight)
      const horizontalTrackSize = Math.max(1, wrap.clientWidth - this.scrollbarWidth)
      const maxTop = Math.max(1, scroll.scrollHeight - scroll.clientHeight)
      const maxLeft = Math.max(1, scroll.scrollWidth - scroll.clientWidth)
      const measuredVerticalThumbSize = Math.max(28, Math.round((scroll.clientHeight / Math.max(scroll.scrollHeight, 1)) * verticalTrackSize))
      const measuredHorizontalThumbSize = Math.max(28, Math.round((scroll.clientWidth / Math.max(scroll.scrollWidth, 1)) * horizontalTrackSize))
      const verticalThumbSize = Math.min(verticalTrackSize, measuredVerticalThumbSize)
      const horizontalThumbSize = Math.min(horizontalTrackSize, measuredHorizontalThumbSize)
      metrics = {
        verticalTrackSize,
        horizontalTrackSize,
        maxTop,
        maxLeft,
        verticalThumbSize,
        horizontalThumbSize,
        verticalTravel: Math.max(0, verticalTrackSize - verticalThumbSize),
        horizontalTravel: Math.max(0, horizontalTrackSize - horizontalThumbSize)
      }
      vThumb.style.height = `${metrics.verticalThumbSize}px`
      hThumb.style.width = `${metrics.horizontalThumbSize}px`
      return metrics
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

    const renderThumbs = () => {
      const current = metrics || measure()
      const top = (scroll.scrollTop / current.maxTop) * current.verticalTravel
      const left = (scroll.scrollLeft / current.maxLeft) * current.horizontalTravel
      vThumb.style.transform = `translate3d(0, ${top}px, 0)`
      hThumb.style.transform = `translate3d(${left}px, 0, 0)`
    }

    const renderThumbAt = (axis, scrollValue) => {
      const current = metrics || measure()
      if (axis === 'y') {
        const top = (scrollValue / current.maxTop) * current.verticalTravel
        vThumb.style.transform = `translate3d(0, ${top}px, 0)`
      } else {
        const left = (scrollValue / current.maxLeft) * current.horizontalTravel
        hThumb.style.transform = `translate3d(${left}px, 0, 0)`
      }
    }

    const update = (forceMeasure = false) => {
      if (forceMeasure) metrics = null
      if (isDragging) return
      if (updateFrame) return
      updateFrame = requestAnimationFrame(() => {
        updateFrame = null
        renderThumbs()
      })
    }

    const setScrollFromPointer = (axis, nextScroll) => {
      const current = metrics || measure()
      const maxScroll = axis === 'y' ? current.maxTop : current.maxLeft
      const clampedScroll = clamp(nextScroll, 0, maxScroll)
      pendingDragAxis = axis
      pendingDragScroll = clampedScroll
      if (dragFrame) return clampedScroll
      dragFrame = requestAnimationFrame(() => {
        dragFrame = null
        renderThumbAt(pendingDragAxis, pendingDragScroll)
        if (pendingDragAxis === 'y') scroll.scrollTop = pendingDragScroll
        else scroll.scrollLeft = pendingDragScroll
      })
      return clampedScroll
    }

    const bindDrag = (thumb, axis) => {
      const onPointerDown = event => {
        if (event.button !== 0) return
        const current = measure()
        const startClient = axis === 'y' ? event.clientY : event.clientX
        const startScroll = axis === 'y' ? scroll.scrollTop : scroll.scrollLeft
        const travel = Math.max(1, axis === 'y' ? current.verticalTravel : current.horizontalTravel)
        const maxScroll = axis === 'y' ? current.maxTop : current.maxLeft
        let nextScroll = startScroll
        const onMove = moveEvent => {
          const currentClient = axis === 'y' ? moveEvent.clientY : moveEvent.clientX
          nextScroll = setScrollFromPointer(axis, startScroll + ((currentClient - startClient) / travel) * maxScroll)
          moveEvent.preventDefault()
        }
        const stopDrag = (applyPendingScroll, flushRender) => {
          isDragging = false
          this.customScrollbarDragActive = false
          cleanupActiveDrag = null
          wrap.classList.remove('vg-scroll-wrap--dragging')
          if (dragFrame) {
            cancelAnimationFrame(dragFrame)
            dragFrame = null
            if (applyPendingScroll) {
              if (axis === 'y') scroll.scrollTop = nextScroll
              else scroll.scrollLeft = nextScroll
              renderThumbs()
            }
          }
          if (flushRender) this.flushScrollbarDragVirtualRender()
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          document.removeEventListener('pointercancel', onUp)
          if (thumb.releasePointerCapture && event.pointerId !== undefined) {
            try {
              thumb.releasePointerCapture(event.pointerId)
            } catch (error) {
              // Pointer capture may already be released by the browser.
            }
          }
        }
        const onUp = () => stopDrag(true, true)
        isDragging = true
        this.customScrollbarDragActive = true
        if (updateFrame) {
          cancelAnimationFrame(updateFrame)
          updateFrame = null
        }
        cleanupActiveDrag = () => stopDrag(false, false)
        wrap.classList.add('vg-scroll-wrap--dragging')
        if (thumb.setPointerCapture && event.pointerId !== undefined) {
          thumb.setPointerCapture(event.pointerId)
        }
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
        document.addEventListener('pointercancel', onUp)
        event.preventDefault()
      }
      thumb.addEventListener('pointerdown', onPointerDown)
      this.disposers.push(() => thumb.removeEventListener('pointerdown', onPointerDown))
    }

    const bindTrackJump = (track, thumb, axis) => {
      const onPointerDown = event => {
        if (event.button !== 0 || event.target === thumb) return
        const current = measure()
        const rect = track.getBoundingClientRect()
        const pointerOffset = axis === 'y' ? event.clientY - rect.top : event.clientX - rect.left
        const thumbSize = axis === 'y' ? current.verticalThumbSize : current.horizontalThumbSize
        const travel = Math.max(1, axis === 'y' ? current.verticalTravel : current.horizontalTravel)
        const maxScroll = axis === 'y' ? current.maxTop : current.maxLeft
        const nextScroll = ((pointerOffset - thumbSize / 2) / travel) * maxScroll
        if (axis === 'y') scroll.scrollTop = clamp(nextScroll, 0, maxScroll)
        else scroll.scrollLeft = clamp(nextScroll, 0, maxScroll)
        renderThumbs()
        event.preventDefault()
      }
      track.addEventListener('pointerdown', onPointerDown)
      this.disposers.push(() => track.removeEventListener('pointerdown', onPointerDown))
    }

    bindDrag(vThumb, 'y')
    bindDrag(hThumb, 'x')
    bindTrackJump(vTrack, vThumb, 'y')
    bindTrackJump(hTrack, hThumb, 'x')
    this.customScrollbarUpdater = update
    this.disposers.push(() => {
      if (cleanupActiveDrag) cleanupActiveDrag()
      if (updateFrame) cancelAnimationFrame(updateFrame)
      if (dragFrame) cancelAnimationFrame(dragFrame)
    })
    update(true)
  }

  renderBodySvgContent(svg = this.bodySvg) {
    return renderBodySvg(this, svg)
  }

  shouldSliceBodyRender() {
    return this.useSlicedBodyRender === true &&
      this.loadingVisible &&
      this.loadingOptions.bodyRenderSlice !== false
  }

  emitBodyRenderPerformance(svg, snapshot, metrics) {
    if (!this.isPerformanceEnabled) return
    const totalEnd = metrics.totalEnd === undefined ? this.now() : metrics.totalEnd
    const renderStats = metrics.renderStats || {}
    this.emitRenderPerformance({
      type: 'body',
      sliced: metrics.sliced === true,
      duration: totalEnd - metrics.totalStart,
      totalDuration: totalEnd - metrics.totalStart,
      snapshotDuration: metrics.snapshotEnd - metrics.snapshotStart,
      domDuration: totalEnd - metrics.domStart,
      renderedRowCount: snapshot.renderedRowEntries.length,
      visibleTaskCount: snapshot.visibleTasks.length,
      renderTaskCount: snapshot.renderTasks.length,
      visibleLinkCount: snapshot.visibleLinks.length,
      visibleMilestoneCount: snapshot.visibleMilestones.length,
      svgNodeCount: renderStats.nodeCount || 0,
      taskNodeCount: renderStats.taskNodeCount || 0,
      linkNodeCount: renderStats.linkNodeCount || 0,
      milestoneNodeCount: renderStats.milestoneNodeCount || 0,
      connectorNodeCount: renderStats.connectorNodeCount || 0
    })
  }

  now() {
    return typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now()
  }

  emitRenderPerformance(payload) {
    const options = this.performanceOptions
    if (typeof options.onRender === 'function') {
      options.onRender(payload)
    }
    if (options.console && typeof console !== 'undefined' && console.info) {
      console.info('[VanillaGantt performance]', payload)
    }
  }

  applyBodySvgViewport(svg = this.bodySvg) {
    if (!svg) return
    const xWindow = this.activeVirtualWindow || this.virtualWindow
    const yWindow = this.activeVirtualRowWindow || this.virtualRowWindow
    const width = Math.max(1, xWindow.xEnd - xWindow.xStart)
    const height = Math.max(1, yWindow.yEnd - yWindow.yStart)
    attrs(svg, {
      width,
      height,
      viewBox: `${xWindow.xStart} ${yWindow.yStart} ${width} ${height}`
    })
    svg.style.position = 'absolute'
    svg.style.left = `${xWindow.xStart}px`
    svg.style.top = `${yWindow.yStart}px`
    svg.style.width = `${width}px`
    svg.style.height = `${height}px`
  }

  shouldRefreshVirtualWindow() {
    return shouldRefreshVirtualWindow(this)
  }

  shouldRefreshVirtualRows() {
    return shouldRefreshVirtualRows(this)
  }

  scheduleVirtualRender(reason = { x: true, y: true }) {
    this.pendingVirtualRender.x = this.pendingVirtualRender.x || reason.x !== false
    this.pendingVirtualRender.y = this.pendingVirtualRender.y || reason.y !== false
    if (this.virtualRenderFrame) return
    this.virtualRenderFrame = requestAnimationFrame(() => {
      const shouldRenderX = this.pendingVirtualRender.x
      const shouldRenderY = this.pendingVirtualRender.y
      this.pendingVirtualRender = { x: false, y: false }
      this.virtualRenderFrame = null
      if (shouldRenderX) {
        this.activeVirtualWindow = this.virtualWindow
        this.renderTimelineSvgContent()
      }
      if (shouldRenderY) {
        this.activeVirtualRowWindow = this.virtualRowWindow
        this.renderLeftBodyContent()
      }
      this.renderBodySvgContent()
      if (this.customScrollbarUpdater) this.customScrollbarUpdater()
    })
  }

  scheduleScrollbarDragVirtualRender(reason = { x: true, y: true }) {
    this.pendingScrollbarDragRender.x = this.pendingScrollbarDragRender.x || reason.x !== false
    this.pendingScrollbarDragRender.y = this.pendingScrollbarDragRender.y || reason.y !== false
    const now = performance.now()
    if (!this.scrollbarDragRenderStartedAt) {
      this.scrollbarDragRenderStartedAt = now
    }
    if (this.scrollbarDragRenderTimer) {
      clearTimeout(this.scrollbarDragRenderTimer)
      this.scrollbarDragRenderTimer = null
    }
    const elapsed = now - this.scrollbarDragRenderStartedAt
    const delay = elapsed >= this.scrollbarDragRenderMaxWait ? 0 : this.scrollbarDragRenderDelay
    this.scrollbarDragRenderTimer = setTimeout(() => {
      this.scrollbarDragRenderTimer = null
      this.scrollbarDragRenderStartedAt = 0
      const pending = this.pendingScrollbarDragRender
      this.pendingScrollbarDragRender = { x: false, y: false }
      if (pending.x || pending.y) this.scheduleVirtualRender(pending)
    }, delay)
  }

  flushScrollbarDragVirtualRender() {
    if (this.scrollbarDragRenderTimer) {
      clearTimeout(this.scrollbarDragRenderTimer)
      this.scrollbarDragRenderTimer = null
    }
    this.scrollbarDragRenderStartedAt = 0
    const pending = this.pendingScrollbarDragRender
    this.pendingScrollbarDragRender = { x: false, y: false }
    if (pending.x || pending.y) this.scheduleVirtualRender(pending)
  }

  renderDefs() {
    return renderBodyDefs()
  }

  appendGrid(svg) {
    return renderBodyGrid(this, svg)
  }

  appendGridSliced(svg, snapshot, metrics) {
    return renderBodyGridSliced(this, svg, snapshot, metrics)
  }

  appendMarkLine(svg, markLine) {
    const x = this.timeToX(markLine.date)
    const window = this.activeVirtualWindow || this.virtualWindow
    const rowWindow = this.activeVirtualRowWindow || this.virtualRowWindow
    if (x < window.xStart || x > window.xEnd) return

    const style = markLine.style || {}
    const line = this.line(x, rowWindow.yStart, x, rowWindow.yEnd, style.lineColor || '#35cce0')
    this.applyLineStyle(line, { lineDash: [4, 4], ...style })
    svg.append(line)

    if (!markLine.content) return
    const text = svgEl('text', 'vg-mark-line-text')
    attrs(text, {
      x: x + 6,
      y: rowWindow.yStart + 16,
      fill: markLine.contentStyle && markLine.contentStyle.color ? markLine.contentStyle.color : style.lineColor || '#35cce0'
    })
    text.textContent = markLine.content
    svg.append(text)
  }

  appendLink(svg, link, snapshot = this.currentRenderSnapshot) {
    const layoutByKey = snapshot ? snapshot.taskLayoutByKey : this.taskLayoutByKey
    const from = layoutByKey[link.from]
    const to = layoutByKey[link.to]
    if (!from || !to) return

    const lineMode = this.linkLineMode(link)
    const route = this.linkRoute(link.type, from, to, lineMode.path)
    const style = {
      ...(this.dependency.linkLineStyle || {}),
      ...(link.linkLineStyle || {})
    }
    const color = style.lineColor || link.color || '#168dff'
    const path = this.path(route.d, color)
    const linkKey = this.linkKey(link)
    const linkGroupKey = this.linkGroupKey(link)
    attrs(path, {
      fill: 'none',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      'data-link-key': linkKey,
      'data-link-group-key': linkGroupKey
    })
    if (this.dependency.linkSelectable || this.dependency.linkDeletable) {
      path.classList.add('vg-link--selectable')
    }
    if (this.isLinkSelected(link)) {
      path.classList.add('vg-link--active')
    }
    this.applyLineStyle(path, { lineWidth: 2, ...style })
    this.applyLinkPattern(path, lineMode.pattern, link)
    const startCircle = this.circle(route.start.x, route.start.y, 4, color)
    const arrow = this.arrow(route.end.x, route.end.y, route.direction, color)
    ;[startCircle, arrow].forEach(node => {
      attrs(node, {
        'data-link-key': linkKey,
        'data-link-group-key': linkGroupKey
      })
      if (this.dependency.linkSelectable || this.dependency.linkDeletable) {
        node.classList.add('vg-link--selectable')
      }
      if (this.isLinkSelected(link)) {
        node.classList.add('vg-link--active')
      }
    })
    startCircle.classList.add('vg-link-start')
    if (this.isLinkDimmed(link)) {
      const opacity = String(this.dependency.dimOpacity === undefined ? 0.18 : this.dependency.dimOpacity)
      path.setAttribute('opacity', opacity)
      startCircle.setAttribute('opacity', opacity)
      arrow.setAttribute('opacity', opacity)
    }
    svg.append(path)
    svg.append(startCircle)
    svg.append(arrow)
  }

  linkLineMode(link = {}) {
    const globalMode = this.dependency.lineMode || {}
    const linkMode = link.lineMode || {}
    const pattern = link.linePattern || linkMode.pattern || (link.dashed ? 'dashed' : globalMode.pattern || 'solid')
    const path = link.pathMode || linkMode.path || globalMode.path || 'polyline'
    return { pattern, path }
  }

  linkKey(link) {
    if (!link) return ''
    return `${String(link.from)}->${String(link.to)}`
  }

  linkGroupKey(link) {
    if (!link) return ''
    if (link.__groupKey !== undefined && link.__groupKey !== null) return String(link.__groupKey)
    if (link.id !== undefined && link.id !== null) return String(link.id)
    return this.linkKey(link)
  }

  findLinkByKey(linkKey) {
    if (!linkKey) return null
    return this.normalizedLinks.find(link => this.linkKey(link) === String(linkKey)) || null
  }

  isLinkSelected(link) {
    return !!this.activeSelectedLinkKey && this.activeSelectedLinkKey === this.linkKey(link)
  }

  activateLink(link, event) {
    const nextKey = this.linkKey(link)
    const changed = this.activeSelectedLinkKey !== nextKey
    this.activeSelectedLinkKey = nextKey
    this.activeSelectedLink = link
    return changed
  }

  clearActiveLinkSelection() {
    if (!this.activeSelectedLinkKey && !this.activeSelectedLink) return false
    this.activeSelectedLinkKey = null
    this.activeSelectedLink = null
    return true
  }

  bindLinkDeleteKeyboard() {
    const onKeyDown = event => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target
      if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (this.deleteActiveLink(event)) {
        event.preventDefault()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    this.disposers.push(() => document.removeEventListener('keydown', onKeyDown))
  }

  deleteActiveLink(event) {
    if (!this.dependency.linkDeletable || !this.activeSelectedLinkKey) return false
    const link = this.findLinkByKey(this.activeSelectedLinkKey)
    if (!link) {
      this.clearActiveLinkSelection()
      return false
    }
    const payload = {
      link,
      event,
      ganttInstance: this,
      gantt: this
    }
    if (typeof this.dependency.onLinkDelete === 'function' && this.dependency.onLinkDelete(payload) === false) {
      return false
    }

    const groupKey = this.linkGroupKey(link)
    this.dependency.links = (this.dependency.links || []).filter(item => {
      const itemGroupKey = item.id === undefined || item.id === null ? null : String(item.id)
      if (itemGroupKey && itemGroupKey === groupKey) return false
      return !this.linkContainsPair(item, this.activeSelectedLinkKey)
    })
    this.clearActiveLinkSelection()
    invalidateDependencySnapshot(this)
    this.renderBodySvgContent()
    return true
  }

  linkContainsPair(link, pairKey) {
    const fromKeys = toKeyList(link.from)
    const toKeys = toKeyList(link.to)
    return fromKeys.some(from => toKeys.some(to => `${String(from)}->${String(to)}` === pairKey))
  }

  applyLinkPattern(path, pattern = 'solid', link = {}) {
    if (link.dashed || pattern === 'dashed') {
      path.setAttribute('stroke-dasharray', '6 4')
      return
    }
    if (pattern === 'dotted') {
      path.setAttribute('stroke-dasharray', '1 6')
      path.setAttribute('stroke-linecap', 'round')
      return
    }
    path.removeAttribute('stroke-dasharray')
  }

  linkCreateRules() {
    return this.dependency.linkCreateRules || {}
  }

  isSameKey(left, right) {
    return String(left) === String(right)
  }

  keyInList(list, key) {
    if (!Array.isArray(list) || !list.length) return false
    return list.some(item => this.isSameKey(item, key))
  }

  isLinkCreateDisabledTask(task) {
    const disabledKeys = this.dependency.linkCreateDisabledTaskKeys || []
    return this.keyInList(disabledKeys, this.taskKey(task))
  }

  isConnectorAllowed(task, side) {
    if (!task) return false
    const key = this.taskKey(task)
    const rules = this.linkCreateRules()
    if (this.isLinkCreateDisabledTask(task)) return false

    if (side === 'finish') {
      if (this.keyInList(rules.disabledFromTaskKeys, key)) return false
      if (Array.isArray(rules.fromTaskKeys) && rules.fromTaskKeys.length) {
        return this.keyInList(rules.fromTaskKeys, key)
      }
      return true
    }

    if (this.keyInList(rules.disabledToTaskKeys, key)) return false
    if (Array.isArray(rules.toTaskKeys) && rules.toTaskKeys.length) {
      return this.keyInList(rules.toTaskKeys, key)
    }
    return true
  }

  isAllowedLinkPair(fromKey, toKey) {
    const rules = this.linkCreateRules()
    if (!Array.isArray(rules.pairs) || !rules.pairs.length) return true
    return rules.pairs.some(pair => {
      if (!pair) return false
      const fromList = toKeyList(pair.from)
      const toList = toKeyList(pair.to)
      return fromList.some(from => this.isSameKey(from, fromKey)) && toList.some(to => this.isSameKey(to, toKey))
    })
  }

  isDuplicateLink(fromKey, toKey) {
    return this.linkKeySet.has(`${String(fromKey)}->${String(toKey)}`)
  }

  canCreateLink(fromTask, toTask) {
    const fromKey = this.taskKey(fromTask)
    const toKey = this.taskKey(toTask)
    const rules = this.linkCreateRules()
    if (fromKey === undefined || fromKey === null || toKey === undefined || toKey === null) return false
    if (this.isSameKey(fromKey, toKey)) return false
    if (!this.isConnectorAllowed(fromTask, 'finish')) return false
    if (!this.isConnectorAllowed(toTask, 'start')) return false
    if (!this.isAllowedLinkPair(fromKey, toKey)) return false
    if (rules.allowDuplicate !== true && this.isDuplicateLink(fromKey, toKey)) return false
    if (typeof rules.validate === 'function') {
      return rules.validate({
        fromTask,
        toTask,
        fromKey,
        toKey,
        fromSide: 'finish',
        toSide: 'start',
        ganttInstance: this,
        gantt: this
      }) !== false
    }
    return true
  }

  appendLinkConnectors(svg, snapshot = this.currentRenderSnapshot) {
    if (!this.dependency.linkCreatable) return
    const renderTasks = snapshot ? snapshot.renderTasks : this.renderTasks
    const layoutByKey = snapshot ? snapshot.taskLayoutByKey : this.taskLayoutByKey
    renderTasks.forEach(task => {
      const key = this.taskKey(task)
      const layout = layoutByKey[key]
      if (key === undefined || key === null || !layout) return
      ;['start', 'finish'].forEach(side => {
        if (!this.isConnectorAllowed(task, side)) return
        const point = this.linkConnectorPoint(layout, side)
        svg.append(this.renderLinkConnector(task, side, point))
      })
    })
  }

  renderLinkConnector(task, side, point) {
    const connector = this.dependency.linkConnector || {}
    const sideRenderer = side === 'start' ? connector.startLayout : connector.finishLayout
    const renderer = sideRenderer || connector.customLayout
    const key = this.taskKey(task)
    const width = Number(connector.width || (connector.size || 14))
    const height = Number(connector.height || (connector.size || 14))
    const payload = {
      task,
      taskRecord: task,
      taskKey: key,
      side,
      point,
      x: point.x,
      y: point.y,
      width,
      height,
      ganttInstance: this,
      gantt: this
    }
    const custom = this.resolveContent(renderer, payload)

    if (!custom) {
      const circle = this.circle(point.x, point.y, 5, '#fff')
      circle.classList.add('vg-link-connector', `vg-link-connector--${side}`)
      attrs(circle, {
        'data-task-key': key,
        'data-link-side': side,
        stroke: side === 'start' ? '#40c51b' : '#168dff',
        'stroke-width': 2
      })
      return circle
    }

    const fo = svgEl('foreignObject', `vg-link-connector vg-link-connector-fo vg-link-connector--${side}`)
    attrs(fo, {
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      'data-task-key': key,
      'data-link-side': side
    })
    const content = el('div', `vg-link-connector vg-link-connector-content vg-link-connector--${side}`)
    attrs(content, {
      'data-task-key': key,
      'data-link-side': side
    })
    content.append(custom)
    fo.append(content)
    return fo
  }

  bindDelegatedLinkConnectorInteractions(svg) {
    return bindDelegatedLinkConnectorEvents(this, svg)
  }

  bindDelegatedLinkInteractions(svg) {
    return bindDelegatedLinkEvents(this, svg)
  }

  bindLinkConnector(node, task, side) {
    return bindLinkConnectorEvents(this, node, task, side)
  }

  startLinkCreate(task, side, event) {
    if (event.button !== undefined && event.button !== 0) return
    if (side !== 'finish') return
    if (!this.isConnectorAllowed(task, side)) return
    const taskKey = this.taskKey(task)
    const layout = this.taskLayoutByKey[taskKey]
    if (!layout || !this.bodySvg) return

    const start = this.linkConnectorPoint(layout, side)
    const path = this.path('', '#168dff')
    path.classList.add('vg-link-create-path')
    attrs(path, {
      fill: 'none',
      'stroke-width': 2,
      'pointer-events': 'none'
    })
    this.applyLinkPattern(path, this.linkLineMode({}).pattern)
    this.bodySvg.append(path)
    this.activeLinkCreate = {
      fromTask: task,
      fromKey: taskKey,
      fromSide: side,
      start,
      path
    }

    const onMove = moveEvent => this.moveLinkCreate(moveEvent)
    const onUp = upEvent => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      this.endLinkCreate(upEvent)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    this.virtualDisposers.push(() => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    })
    this.moveLinkCreate(event)
    event.preventDefault()
    event.stopPropagation()
  }

  moveLinkCreate(event) {
    const drag = this.activeLinkCreate
    if (!drag || !drag.path) return
    const point = this.clientPointToChart(event.clientX, event.clientY)
    drag.path.setAttribute('d', this.linkDraftRoute(drag.start, point))
  }

  endLinkCreate(event) {
    const drag = this.activeLinkCreate
    if (!drag) return
    const target = this.findTaskAtClientPoint(event.clientX, event.clientY)
    if (drag.path && drag.path.parentNode) drag.path.parentNode.removeChild(drag.path)
    this.activeLinkCreate = null

    if (!target || target.side !== 'start') return
    if (!this.canCreateLink(drag.fromTask, target.task)) return
    const link = {
      id: `link-${drag.fromKey}-${target.taskKey}-${Date.now()}`,
      from: drag.fromKey,
      to: target.taskKey,
      type: this.linkTypeFromSides(drag.fromSide, target.side),
      fromSide: drag.fromSide,
      toSide: target.side
    }
    const payload = {
      link,
      fromTask: drag.fromTask,
      toTask: target.task,
      fromSide: drag.fromSide,
      toSide: target.side,
      event,
      ganttInstance: this,
      gantt: this
    }

    if (typeof this.dependency.onLinkCreate === 'function' && this.dependency.onLinkCreate(payload) === false) return
    this.dependency.links = [...(this.dependency.links || []), link]
    invalidateDependencySnapshot(this)
    this.renderBodySvgContent()
  }

  findTaskAtClientPoint(clientX, clientY) {
    const elements = document.elementsFromPoint(clientX, clientY)
    for (const element of elements) {
      const connector = element.closest && element.closest('.vg-link-connector--start')
      if (!connector) continue
      const taskKey = connector.getAttribute('data-task-key')
      const task = this.renderTasks.find(item => String(this.taskKey(item)) === String(taskKey))
      if (!task || !this.isConnectorAllowed(task, 'start')) continue
      return {
        task,
        taskKey,
        side: 'start'
      }
    }
    return null
  }

  clientPointToChart(clientX, clientY) {
    const rect = this.bodySvg.getBoundingClientRect()
    const xWindow = this.activeVirtualWindow || this.virtualWindow
    const yWindow = this.activeVirtualRowWindow || this.virtualRowWindow
    const scaleX = rect.width ? (xWindow.xEnd - xWindow.xStart) / rect.width : 1
    const scaleY = rect.height ? (yWindow.yEnd - yWindow.yStart) / rect.height : 1
    return {
      x: xWindow.xStart + (clientX - rect.left) * scaleX,
      y: yWindow.yStart + (clientY - rect.top) * scaleY
    }
  }

  linkConnectorPoint(layout, side) {
    return {
      x: side === 'start' ? layout.x : layout.x + layout.width,
      y: layout.centerY
    }
  }

  linkDraftRoute(start, end) {
    const mode = this.linkLineMode({}).path
    return this.createLinkPath(start, end, mode)
  }

  createLinkPath(start, end, mode = 'polyline') {
    const direction = end.x >= start.x ? 1 : -1
    const gap = Math.abs(end.x - start.x)
    if (mode === 'straight' || mode === 'oblique') {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    }
    if (mode === 'curved') {
      const c1 = start.x + direction * Math.max(24, gap / 2)
      const c2 = end.x - direction * Math.max(24, gap / 2)
      return `M ${start.x} ${start.y} C ${c1} ${start.y} ${c2} ${end.y} ${end.x} ${end.y}`
    }
    const elbow = start.x + direction * Math.max(24, gap / 2)
    if (mode === 'smoothstep' && Math.abs(end.y - start.y) > 2) {
      const verticalDirection = end.y >= start.y ? 1 : -1
      const radius = Math.min(14, Math.abs(end.y - start.y) / 2, Math.max(8, gap / 4))
      return `M ${start.x} ${start.y} H ${elbow - direction * radius} C ${elbow - direction * radius / 2} ${start.y} ${elbow} ${start.y + verticalDirection * radius / 2} ${elbow} ${start.y + verticalDirection * radius} V ${end.y - verticalDirection * radius} C ${elbow} ${end.y - verticalDirection * radius / 2} ${elbow + direction * radius / 2} ${end.y} ${elbow + direction * radius} ${end.y} H ${end.x}`
    }
    return `M ${start.x} ${start.y} H ${elbow} V ${end.y} H ${end.x}`
  }

  linkTypeFromSides(fromSide, toSide) {
    if (fromSide === 'start' && toSide === 'start') return 'start_to_start'
    if (fromSide === 'start' && toSide === 'finish') return 'start_to_finish'
    if (fromSide === 'finish' && toSide === 'finish') return 'finish_to_finish'
    return 'finish_to_start'
  }

  linkRoute(type, from, to, pathMode = 'polyline') {
    const fromStart = from.x
    const fromEnd = from.x + from.width
    const toStart = to.x
    const toEnd = to.x + to.width
    const normalizedType = type || 'finish_to_start'
    let start
    let end

    if (normalizedType === 'start_to_start') {
      start = { x: fromStart, y: from.centerY }
      end = { x: toStart, y: to.centerY }
    } else if (normalizedType === 'finish_to_finish') {
      start = { x: fromEnd, y: from.centerY }
      end = { x: toEnd, y: to.centerY }
    } else if (normalizedType === 'start_to_finish') {
      start = { x: fromStart, y: from.centerY }
      end = { x: toEnd, y: to.centerY }
    } else {
      start = { x: fromEnd, y: from.centerY }
      end = { x: toStart, y: to.centerY }
    }

    const direction = end.x >= start.x ? 1 : -1
    return {
      start,
      end,
      direction,
      d: this.createLinkPath(start, end, pathMode)
    }
  }

  renderTask(task) {
    if (task.__denseGroup) {
      return this.renderDenseTaskGroup(task)
    }

    const layout = this.getTaskLayout(task)
    const width = layout.width
    const height = layout.height
    const fo = svgEl('foreignObject', 'vg-task-fo')
    attrs(fo, {
      x: layout.x,
      y: layout.y,
      width,
      height,
      'data-task-key': this.taskKey(task)
    })
    if (task.__filterMatched) {
      fo.classList.add('vg-task-fo--matched')
    }
    if (this.isTaskHighlighted(task)) {
      fo.classList.add('vg-task-fo--highlighted')
    }

    const row = task.__rowRecord || this.rowById[task.__rowId]
    const payload = this.createTaskPayload(task, {
      row,
      width,
      height,
      x: layout.x,
      y: layout.y
    })
    const custom = this.resolveContent(this.taskBar.customLayout, payload)
    fo.append(custom || this.renderDefaultTask(task))
    if (custom && task.height === undefined) {
      this.scheduleTaskForeignObjectMeasure(fo, height, task)
    }
    if (this.isTaskDimmed(task)) {
      const opacity = String(this.dependency.dimOpacity === undefined ? 0.18 : this.dependency.dimOpacity)
      fo.classList.add('vg-task-fo--dimmed')
      fo.style.setProperty('--vg-dim-opacity', opacity)
      Array.from(fo.children).forEach(child => {
        if (child && child.style) child.style.opacity = opacity
      })
    }
    if (this.isTaskDraggable(task)) {
      fo.classList.add('vg-task-fo--draggable')
    }
    return fo
  }

  renderDenseTaskGroup(task) {
    const group = task.__denseGroup || {}
    const entries = Array.isArray(group.entries) ? group.entries : []
    const shape = group.shape === 'circle' ? 'circle' : 'rect'
    const path = svgEl('path', `vg-task-dense${group.className ? ` ${group.className}` : ''}`)
    const d = entries.map(entry => {
      const x = this.pathNumber(entry.x)
      const y = this.pathNumber(entry.y)
      const width = this.pathNumber(Math.max(0.5, entry.width))
      const height = this.pathNumber(Math.max(0.5, entry.height))
      if (shape === 'circle') {
        const radius = this.pathNumber(Math.max(0.5, Math.min(width, height) / 2))
        const cx = this.pathNumber(x + width / 2)
        const cy = this.pathNumber(y + height / 2)
        const left = this.pathNumber(cx - radius)
        const diameter = this.pathNumber(radius * 2)
        return `M${left} ${cy}a${radius} ${radius} 0 1 0 ${diameter} 0a${radius} ${radius} 0 1 0 ${-diameter} 0`
      }
      return `M${x} ${y}h${width}v${height}h${-width}Z`
    }).join('')

    attrs(path, {
      d,
      fill: group.fill || '#69c9c0',
      'data-task-key': this.taskKey(task),
      'data-dense-count': group.count || entries.length,
      'aria-hidden': 'true'
    })
    if (group.opacity !== undefined) {
      path.setAttribute('opacity', String(group.opacity))
    }
    path.style.pointerEvents = 'none'
    return path
  }

  pathNumber(value) {
    return Math.round(Number(value || 0) * 100) / 100
  }

  shouldDenseRenderTask(task) {
    const options = this.denseRenderOptions
    if (!options || task.__denseGroup || task.parentAggregate || task.striped) return false
    if (this.taskMilestones(task).length) return false
    if (task.draggable === true || this.taskBar.draggable === true || this.dependency.linkCreatable) return false

    const startTime = toTime(this.taskStart(task))
    const endTime = toTime(this.taskEnd(task))
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return false

    const width = this.durationWidth(startTime, endTime)
    const maxTaskWidth = Number(options.maxTaskWidth === undefined ? 8 : options.maxTaskWidth)
    return Number.isFinite(maxTaskWidth) && maxTaskWidth > 0 && width <= maxTaskWidth
  }

  denseTaskStyle(task, row) {
    const options = this.denseRenderOptions || {}
    const payload = {
      taskRecord: task,
      task,
      rowRecord: row,
      row,
      ganttInstance: this,
      gantt: this
    }
    const fill = typeof options.fill === 'function'
      ? options.fill(payload)
      : options.fill
    const opacity = typeof options.opacity === 'function'
      ? options.opacity(payload)
      : options.opacity
    const className = typeof options.className === 'function'
      ? options.className(payload)
      : options.className
    const style = fill ? null : this.resolveStyle(this.taskBar.barStyle, {
      taskRecord: task,
      index: task.__renderIndex || 0,
      startDate: new Date(toTime(this.taskStart(task))),
      endDate: new Date(toTime(this.taskEnd(task))),
      ganttInstance: this
    })

    return {
      fill: fill || task.fill || task.color || (style && style.barColor) || '#69c9c0',
      opacity: Number.isFinite(Number(opacity)) ? Math.max(0, Math.min(1, Number(opacity))) : undefined,
      className: className || '',
      shape: options.shape === 'circle' ? 'circle' : 'rect'
    }
  }

  bindDelegatedTaskInteractions(svg) {
    return bindDelegatedTaskEvents(this, svg)
  }

  scheduleTaskForeignObjectMeasure(fo, fallbackHeight, task = null) {
    return scheduleTaskMeasure(this, fo, fallbackHeight, task)
  }

  renderMilestone(item) {
    const style = this.milestoneStyle(item)
    const width = Number(item.milestone.width || style.width || 20)
    const height = Number(item.milestone.height || style.height || 28)
    const x = this.timeToX(this.milestoneDate(item.milestone)) - width / 2
    const y = this.taskY(item.task) + (this.taskRenderHeight(item.task) - height) / 2
    const fo = svgEl('foreignObject', 'vg-milestone-fo')
    attrs(fo, {
      x,
      y,
      width,
      height
    })

    const payload = this.createMilestonePayload(item, { x, y, width, height })
    const custom = this.resolveContent(this.taskBar.milestoneCustomLayout, payload)
    fo.append(custom || this.renderDefaultMilestone(payload))
    this.bindMilestoneInteractions(fo, item)
    return fo
  }

  renderDefaultMilestone() {
    const root = el('div', 'vg-milestone')
    const pole = el('i')
    const flag = el('b')
    root.append(pole, flag)
    return root
  }

  bindMilestoneInteractions(node, item) {
    return bindMilestoneEvents(this, node, item)
  }

  bindTaskInteractions(node, task) {
    return bindTaskEvents(this, node, task)
  }

  startTaskDrag(node, task, event) {
    if (!this.isTaskDraggable(task)) return
    if (event.button !== undefined && event.button !== 0) return
    if (event.target && event.target.closest && event.target.closest('[data-vg-no-drag]')) return

    const sourceTask = this.findSourceTask(task)
    if (!sourceTask) return

    const startTime = toTime(this.taskStart(sourceTask))
    const endTime = toTime(this.taskEnd(sourceTask))
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return

    const startPayload = this.createTaskPayload(task, {
      event,
      sourceTask,
      startDate: new Date(startTime),
      endDate: new Date(endTime),
      originalStartDate: new Date(startTime),
      originalEndDate: new Date(endTime)
    })
    if (this.callTaskCallback('onDragStart', task, event, startPayload) === false) return

    this.hideTaskTooltip()
    node.classList.add('vg-task-fo--dragging')
    if (node.setPointerCapture && event.pointerId !== undefined) {
      node.setPointerCapture(event.pointerId)
    }

    const drag = {
      node,
      task,
      sourceTask,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      originalStartTime: startTime,
      originalEndTime: endTime,
      nextStartTime: startTime,
      nextEndTime: endTime,
      moved: false
    }
    this.activeDrag = drag

    const onMove = moveEvent => this.moveTaskDrag(moveEvent)
    const onUp = upEvent => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      this.endTaskDrag(upEvent)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    this.disposers.push(() => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    })

    event.preventDefault()
    event.stopPropagation()
  }

  moveTaskDrag(event) {
    const drag = this.activeDrag
    if (!drag) return
    if (drag.pointerId !== undefined && event.pointerId !== undefined && drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startClientX
    if (Math.abs(deltaX) < 2 && !drag.moved) return

    const deltaMs = this.snapDragDelta(deltaX / this.pxPerMs)
    const nextRange = this.clampDragRange(drag.originalStartTime + deltaMs, drag.originalEndTime + deltaMs)
    drag.nextStartTime = nextRange.start
    drag.nextEndTime = nextRange.end
    drag.moved = true
    drag.node.setAttribute('x', this.timeToX(nextRange.start))

    this.callTaskCallback('onDrag', drag.task, event, this.createTaskPayload(drag.task, {
      event,
      sourceTask: drag.sourceTask,
      startDate: new Date(nextRange.start),
      endDate: new Date(nextRange.end),
      originalStartDate: new Date(drag.originalStartTime),
      originalEndDate: new Date(drag.originalEndTime)
    }))
    event.preventDefault()
  }

  endTaskDrag(event) {
    const drag = this.activeDrag
    if (!drag) return
    this.activeDrag = null
    drag.node.classList.remove('vg-task-fo--dragging')
    if (drag.node.releasePointerCapture && drag.pointerId !== undefined) {
      try {
        drag.node.releasePointerCapture(drag.pointerId)
      } catch (error) {}
    }

    if (drag.moved) {
      this.updateTaskTime(drag.sourceTask, drag.nextStartTime, drag.nextEndTime)
      this.suppressClickTaskKey = this.taskKey(drag.task)
      this.suppressClickUntil = Date.now() + 300
      this.callTaskCallback('onDragEnd', drag.task, event, this.createTaskPayload(drag.task, {
        event,
        sourceTask: drag.sourceTask,
        startDate: new Date(drag.nextStartTime),
        endDate: new Date(drag.nextEndTime),
        originalStartDate: new Date(drag.originalStartTime),
        originalEndDate: new Date(drag.originalEndTime)
      }))
      this.render()
    }
  }

  showTaskTooltip(task, event) {
    return showMeasuredTaskTooltip(this, task, event)
  }

  showMilestoneTooltip(item, event) {
    return showMeasuredMilestoneTooltip(this, item, event)
  }

  positionTaskTooltip(event) {
    return positionMeasuredTaskTooltip(this, event)
  }

  hideTaskTooltip() {
    return hideMeasuredTaskTooltip(this)
  }

  renderDefaultTaskTooltip(payload) {
    const root = el('div', 'vg-tooltip-default')
    const title = el('div', 'vg-tooltip-title')
    title.textContent = this.taskLabel(payload.task, this.taskBar.labelText)
    const time = el('div', 'vg-tooltip-time')
    time.textContent = `${formatDateTime(payload.startDate)} - ${formatDateTime(payload.endDate)}`
    root.append(title, time)
    const subtitle = this.taskLabel(payload.task, this.taskBar.subLabelText)
    if (subtitle) {
      const meta = el('div', 'vg-tooltip-meta')
      meta.textContent = subtitle
      root.append(meta)
    }
    return root
  }

  renderDefaultMilestoneTooltip(payload) {
    const root = el('div', 'vg-tooltip-default')
    const title = el('div', 'vg-tooltip-title')
    title.textContent = payload.milestone.title || '里程碑'
    const time = el('div', 'vg-tooltip-time')
    time.textContent = formatDateTime(payload.date)
    root.append(title, time)
    return root
  }

  createTaskPayload(task, extra = {}) {
    const row = extra.row || this.rowById[task.__rowId]
    const sourceTask = extra.sourceTask || this.findSourceTask(task) || task
    const startTime = extra.startDate ? extra.startDate.getTime() : toTime(this.taskStart(sourceTask))
    const endTime = extra.endDate ? extra.endDate.getTime() : toTime(this.taskEnd(sourceTask))
    const width = extra.width === undefined ? this.durationWidth(this.taskStart(task), this.taskEnd(task)) : extra.width
    const height = extra.height === undefined ? this.taskRenderHeight(task) : extra.height

    return {
      taskRecord: sourceTask,
      task,
      sourceTask,
      rowRecord: row,
      row,
      taskKey: this.taskKey(task),
      rowKey: task.__rowId,
      x: extra.x === undefined ? this.timeToX(this.taskStart(task)) : extra.x,
      y: extra.y === undefined ? this.taskY(task) : extra.y,
      width,
      height,
      startDate: new Date(startTime),
      endDate: new Date(endTime),
      originalStartDate: extra.originalStartDate,
      originalEndDate: extra.originalEndDate,
      progress: this.taskProgress(task),
      event: extra.event,
      ganttInstance: this,
      gantt: this
    }
  }

  createMilestonePayload(item, extra = {}) {
    const row = this.rowById[item.task.__rowId]
    return {
      milestone: item.milestone,
      milestoneRecord: item.milestone,
      task: item.task,
      taskRecord: item.task,
      row,
      rowRecord: row,
      taskKey: this.taskKey(item.task),
      rowKey: item.task.__rowId,
      index: item.index,
      date: new Date(toTime(this.milestoneDate(item.milestone))),
      x: extra.x,
      y: extra.y,
      width: extra.width,
      height: extra.height,
      event: extra.event,
      ganttInstance: this,
      gantt: this
    }
  }

  callTaskCallback(name, task, event, payload) {
    const callback = this.taskBar[name]
    if (typeof callback !== 'function') return undefined
    return callback(payload || this.createTaskPayload(task, { event }))
  }

  isTaskDraggable(task) {
    if (task.draggable !== undefined) return task.draggable === true
    if (task.parentAggregate) return false
    const draggable = this.taskBar.draggable
    if (typeof draggable === 'function') {
      return draggable(this.createTaskPayload(task)) === true
    }
    return draggable === true
  }

  findSourceTask(task) {
    const rowKey = task.__rowId
    const taskKey = this.taskKey(task)
    if (!rowKey || !taskKey) return null
    const record = this.findRecordByKey(rowKey)
    const tasks = record && Array.isArray(record[this.taskBar.tasksField]) ? record[this.taskBar.tasksField] : []
    return tasks.find(item => this.taskKey(item) === taskKey) || null
  }

  findRecordByKey(recordKey, records = this.options.records) {
    for (const record of records || []) {
      if (this.recordKey(record) === recordKey) return record
      if (record.children) {
        const found = this.findRecordByKey(recordKey, record.children)
        if (found) return found
      }
    }
    return null
  }

  snapDragDelta(deltaMs) {
    const step = Number(this.taskBar.dragStep || 0)
    if (!step) return deltaMs
    return Math.round(deltaMs / step) * step
  }

  clampDragRange(startTime, endTime) {
    const duration = endTime - startTime
    if (duration >= this.rangeMs) {
      return { start: this.startTime, end: this.endTime }
    }
    let start = startTime
    let end = endTime
    if (start < this.startTime) {
      start = this.startTime
      end = start + duration
    }
    if (end > this.endTime) {
      end = this.endTime
      start = end - duration
    }
    return { start, end }
  }

  updateTaskTime(task, startTime, endTime) {
    const startField = this.taskBar.startDateField
    const endField = this.taskBar.endDateField
    task[startField] = this.createTimeValueLike(task[startField], startTime)
    task[endField] = this.createTimeValueLike(task[endField], endTime)
  }

  createTimeValueLike(source, time) {
    if (source instanceof Date) return new Date(time)
    if (typeof source === 'number') return time
    return formatLocalDateTime(new Date(time))
  }

  renderDefaultTask(task) {
    const status = this.taskStatus(task)
    const root = el('div', `vg-task vg-task--${status || 'normal'}`)
    const style = this.taskStyle(task)
    this.applyTaskStyle(root, style, task)

    const title = el('div', 'vg-task-title')
    title.textContent = this.taskLabel(task, this.taskBar.labelText)
    const meta = el('div', 'vg-task-meta')
    meta.textContent = this.taskLabel(task, this.taskBar.subLabelText)
    root.append(title, meta)

    const progressValue = this.taskProgress(task)
    if (progressValue !== undefined) {
      const progress = el('div', 'vg-task-progress')
      const bar = el('i')
      bar.style.width = `${progressValue}%`
      if (style.completedBarColor) bar.style.background = style.completedBarColor
      progress.append(bar)
      root.append(progress)
    }

    if (task.locked) {
      const lock = el('span', 'vg-task-lock')
      lock.textContent = '▣'
      root.append(lock)
    }

    return root
  }

  applyTaskStyle(node, style, task) {
    if (!style) return
    const progressValue = this.taskProgress(task)
    const background = progressValue >= 100 && style.completedBarColor ? style.completedBarColor : style.barColor
    if (background) node.style.background = background
    if (style.borderColor) node.style.borderColor = style.borderColor
    if (style.borderLineWidth !== undefined) node.style.borderWidth = `${style.borderLineWidth}px`
    if (style.borderWidth !== undefined) node.style.borderWidth = `${style.borderWidth}px`
    if (style.cornerRadius !== undefined) node.style.borderRadius = `${style.cornerRadius}px`
  }

  rect(x, y, width, height, fill) {
    const rect = svgEl('rect')
    attrs(rect, { x, y, width, height, fill })
    return rect
  }

  line(x1, y1, x2, y2, stroke) {
    const line = svgEl('line')
    attrs(line, { x1, y1, x2, y2, stroke })
    return line
  }

  circle(cx, cy, r, fill) {
    const circle = svgEl('circle')
    attrs(circle, { cx, cy, r, fill })
    return circle
  }

  path(d, stroke) {
    const path = svgEl('path', 'vg-link-path')
    attrs(path, { d, stroke })
    return path
  }

  arrow(x, y, direction, fill) {
    const arrow = svgEl('path', 'vg-link-arrow')
    const d = direction >= 0
      ? `M ${x} ${y} l -8 -4 v 8 Z`
      : `M ${x} ${y} l 8 -4 v 8 Z`
    attrs(arrow, { d, fill })
    return arrow
  }

  applyLineStyle(line, style = {}) {
    if (style.lineWidth !== undefined) line.setAttribute('stroke-width', style.lineWidth)
    if (style.lineDash) line.setAttribute('stroke-dasharray', style.lineDash.join(' '))
  }

  resolveStyle(style, payload) {
    if (typeof style === 'function') return style(payload) || {}
    return style || {}
  }

  resolveContent(renderer, payload) {
    if (typeof renderer !== 'function') return null
    const result = renderer(payload)
    if (result === undefined || result === null) return null
    if (result instanceof Node) return result
    if (result.rootContainer instanceof Node) return result.rootContainer
    const template = document.createElement('template')
    template.innerHTML = String(result).trim()
    return template.content
  }

  seedExpandedRows(records, applyExplicit = false) {
    records.forEach(record => {
      if (record.children) {
        const key = this.recordKey(record)
        if (applyExplicit && record.expanded !== undefined) {
          this.expandedRows[key] = record.expanded !== false
        } else if (this.expandedRows[key] === undefined) {
          this.expandedRows[key] = record.expanded !== false
        }
        this.seedExpandedRows(record.children, applyExplicit)
      }
    })
  }

  isExpanded(row) {
    return row.children ? this.expandedRows[this.recordKey(row)] !== false : false
  }

  toggleRow(row) {
    if (!row.children) return
    const key = this.recordKey(row)
    this.expandedRows[key] = !this.isExpanded(row)
    this.invalidateRowCache()
    this.render()
  }

  recordKey(record) {
    return record.__recordKey || record[this.options.recordKeyField]
  }

  taskKey(task) {
    return task[this.options.taskKeyField]
  }

  taskStart(task) {
    return task[this.taskBar.startDateField]
  }

  taskEnd(task) {
    return task[this.taskBar.endDateField]
  }

  taskProgress(task) {
    return task[this.taskBar.progressField]
  }

  taskLane(task) {
    return task[this.taskBar.laneField]
  }

  taskStatus(task) {
    return task[this.taskBar.statusField]
  }

  taskMilestones(task) {
    const value = task[this.taskBar.milestoneField]
    return Array.isArray(value) ? value : []
  }

  milestoneDate(milestone) {
    return milestone[this.taskBar.milestoneDateField || 'date']
  }

  taskLabel(task, label) {
    if (!label) return ''
    if (typeof label === 'function') return label(task)
    return task[label] === undefined ? String(label) : String(task[label])
  }

  taskStyle(task) {
    const style = task.parentAggregate ? this.taskBar.projectStyle : this.taskBar.barStyle
    const index = task.__renderIndex === undefined
      ? this.renderTasks.findIndex(item => this.taskKey(item) === this.taskKey(task))
      : task.__renderIndex
    return this.resolveStyle(style, {
      taskRecord: task,
      index,
      startDate: new Date(toTime(this.taskStart(task))),
      endDate: new Date(toTime(this.taskEnd(task))),
      ganttInstance: this
    })
  }

  milestoneStyle(item) {
    return this.resolveStyle(this.taskBar.milestoneStyle, {
      milestone: item.milestone,
      milestoneRecord: item.milestone,
      task: item.task,
      taskRecord: item.task,
      index: item.index,
      date: new Date(toTime(this.milestoneDate(item.milestone))),
      ganttInstance: this
    })
  }

  isTaskDimmed(task) {
    if (!this.dependency.highlightConnected) return false
    const key = this.taskKey(task)
    if (key === undefined || key === null) return false
    if (this.activeLinkTaskKeys) return !this.activeLinkTaskKeys[key]
    if (!this.visibleLinks.length) return false
    return !this.connectedTaskKeys[key]
  }

  isTaskHighlighted(task) {
    return this.keyInList(this.highlightOptions.taskKeys, this.taskKey(task))
  }

  isRowHighlighted(row) {
    return this.keyInList(this.highlightOptions.rowKeys, this.recordKey(row))
  }

  isLinkDimmed(link) {
    if (!this.dependency.highlightConnected || !this.activeLinkTaskKeys) return false
    return !this.activeLinkTaskKeys[link.from] || !this.activeLinkTaskKeys[link.to]
  }

  activateTaskLinkGroup(task) {
    const taskKey = this.taskKey(task)
    const network = this.linkNetworkByTask(taskKey)
    const nextTaskKey = network ? taskKey : null
    const nextGroupKey = network ? network.key : null
    const changed = this.activeLinkTaskKey !== nextTaskKey || this.activeLinkGroupKey !== nextGroupKey
    this.activeLinkTaskKey = nextTaskKey
    this.activeLinkGroupKey = nextGroupKey
    this.activeLinkTaskKeys = network ? network.taskKeys : null
    return changed
  }

  clearActiveLinkGroup() {
    if (!this.activeLinkTaskKey && !this.activeLinkGroupKey && !this.activeLinkTaskKeys) return false
    this.activeLinkTaskKey = null
    this.activeLinkGroupKey = null
    this.activeLinkTaskKeys = null
    return true
  }

  timeToX(value) {
    return (toTime(value) - this.startTime) * this.pxPerMs
  }

  durationWidth(start, end) {
    return Math.max(this.taskMinWidth, this.timeToX(end) - this.timeToX(start))
  }

  rowTop(recordKey) {
    const entry = this.rowMetrics.visibleEntryById[recordKey]
    return entry ? entry.top : 0
  }

  taskY(task) {
    const top = task.__rowTop === undefined ? this.rowTop(task.__rowId) : task.__rowTop
    return top + this.taskOffsetY(task)
  }

  rowHeight(row) {
    const explicitHeight = Number(row && row.height)
    if (Number.isFinite(explicitHeight) && explicitHeight > 0) return explicitHeight

    if (this.options.rowHeight === 'auto') {
      return this.autoRowHeight(row)
    }

    const configuredHeight = Number(this.options.rowHeight)
    return Number.isFinite(configuredHeight) && configuredHeight > 0
      ? configuredHeight
      : DEFAULT_OPTIONS.rowHeight
  }

  autoRowHeight(row) {
    const tasks = row && Array.isArray(row[this.taskBar.tasksField]) ? row[this.taskBar.tasksField] : []
    const taskBottom = tasks.reduce((bottom, task) => {
      return Math.max(bottom, this.taskOffsetY(task) + this.autoRowTaskHeight(task))
    }, 0)
    return Math.max(DEFAULT_OPTIONS.rowHeight, Math.ceil(taskBottom + 8))
  }

  autoRowTaskHeight(task) {
    if (!task) return DEFAULT_OPTIONS.taskHeight
    const explicitHeight = Number(task.height)
    if (Number.isFinite(explicitHeight) && explicitHeight > 0) return explicitHeight
    const lane = this.taskLane(task)
    if (lane && this.laneByKey[lane]) return this.laneByKey[lane].height
    const configuredHeight = Number(this.options.taskHeight)
    return Number.isFinite(configuredHeight) && configuredHeight > 0
      ? configuredHeight
      : DEFAULT_OPTIONS.taskHeight
  }

  taskOffsetY(task) {
    if (task.parentAggregate && task.offsetY !== undefined) return task.offsetY
    const lane = this.taskLane(task)
    if (lane && this.laneByKey[lane]) return this.laneByKey[lane].offset
    return task.offsetY === undefined ? 10 : task.offsetY
  }

  taskRenderHeight(task) {
    if (task.parentAggregate && task.height !== undefined) return task.height
    const lane = this.taskLane(task)
    if (lane && this.laneByKey[lane]) return this.laneByKey[lane].height
    if (task.height) return task.height
    const style = this.taskStyle(task)
    return style.height || this.options.taskHeight
  }

  createUnits(scale, scaleIndex, rangeStartTime = this.startTime, rangeEndTime = this.endTime) {
    const units = []
    const unit = scale.unit || 'hour'
    const step = scale.step || 1
    let cursor = this.floorDate(new Date(this.startTime), unit, scale.startOfWeek)
    let dateIndex = 0
    const fixedStepMs = ['minute', 'hour', 'day', 'week'].includes(unit)
      ? this.unitToMs(unit) * step
      : 0
    if (fixedStepMs > 0) {
      const skipped = Math.max(0, Math.floor((rangeStartTime - cursor.getTime()) / fixedStepMs) - 1)
      if (skipped > 0) {
        cursor = new Date(cursor.getTime() + skipped * fixedStepMs)
        dateIndex = skipped
      }
    } else {
      while (this.addUnit(cursor, unit, step).getTime() <= rangeStartTime && cursor.getTime() < this.endTime) {
        cursor = this.addUnit(cursor, unit, step)
        dateIndex += 1
      }
    }

    while (cursor.getTime() < this.endTime && cursor.getTime() < rangeEndTime) {
      const unitStart = Math.max(cursor.getTime(), this.startTime)
      const next = this.addUnit(cursor, unit, step)
      const unitEnd = Math.min(next.getTime(), this.endTime)
      if (unitEnd > rangeStartTime && unitStart < rangeEndTime && unitEnd > unitStart) {
        const info = {
          type: unit,
          unit,
          step,
          scaleIndex,
          dateIndex,
          key: `${unit}-${cursor.toISOString()}`,
          title: this.formatUnitLabel(cursor, unit),
          startDate: new Date(unitStart),
          endDate: new Date(unitEnd),
          days: Math.max(1, Math.ceil((unitEnd - unitStart) / (24 * HOUR))),
          x: this.timeToX(unitStart),
          width: Math.max(1, this.timeToX(unitEnd) - this.timeToX(unitStart))
        }
        info.label = this.formatTimelineLabel(scale, info)
        units.push(info)
      }
      dateIndex += 1
      cursor = next
    }
    return units
  }

  formatTimelineLabel(scale, dateInfo) {
    if (typeof scale.format === 'function') {
      return scale.format(dateInfo)
    }
    return this.formatUnitLabel(dateInfo.startDate, scale.unit)
  }

  floorDate(date, unit, startOfWeek = 'monday') {
    const next = new Date(date)
    next.setSeconds(0, 0)
    if (unit !== 'minute') next.setMinutes(0)
    if (!['minute', 'hour'].includes(unit)) next.setHours(0)
    if (unit === 'week') {
      const day = next.getDay() || 7
      const offset = startOfWeek === 'sunday' ? next.getDay() : day - 1
      next.setDate(next.getDate() - offset)
    }
    if (unit === 'month') next.setDate(1)
    if (unit === 'year') {
      next.setMonth(0)
      next.setDate(1)
    }
    return next
  }

  addUnit(date, unit, step = 1) {
    const next = new Date(date)
    if (unit === 'minute') next.setMinutes(next.getMinutes() + step)
    else if (unit === 'hour') next.setHours(next.getHours() + step)
    else if (unit === 'day') next.setDate(next.getDate() + step)
    else if (unit === 'week') next.setDate(next.getDate() + 7 * step)
    else if (unit === 'month') next.setMonth(next.getMonth() + step)
    else if (unit === 'year') next.setFullYear(next.getFullYear() + step)
    return next
  }

  unitToMs(unit) {
    if (unit === 'year') return 365 * 24 * HOUR
    if (unit === 'month') return 30 * 24 * HOUR
    if (unit === 'week') return 7 * 24 * HOUR
    if (unit === 'day') return 24 * HOUR
    if (unit === 'minute') return 60 * 1000
    return HOUR
  }

  formatUnitLabel(date, unit) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    if (unit === 'year') return `${date.getFullYear()}`
    if (unit === 'month') return `${date.getFullYear()}-${month}`
    if (unit === 'week') return `${month}-${day}周`
    if (unit === 'day') return `${month}-${day}`
    if (unit === 'minute') return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return String(date.getHours()).padStart(2, '0')
  }

  scaleRowHeight(scale) {
    return scale.rowHeight || this.options.headerRowHeight
  }

  timelineCellStyle(scale) {
    const style = {
      ...(this.timelineHeader.style || {}),
      ...(scale.style || {})
    }
    if (!style.backgroundColor && this.timelineHeader.backgroundColor) {
      style.backgroundColor = this.timelineHeader.backgroundColor
    }
    return style
  }

  timelineCustomCellStyle(scale) {
    return {
      ...(this.timelineHeader.style || {}),
      ...(scale.style || {})
    }
  }

  matchesRowFilter(row) {
    const filter = this.filterOptions
    if (!filter) return false
    const text = this.filterText
    const rowKeys = filter.rowKeys || []
    const hasRowConstraint = text || rowKeys.length || typeof filter.row === 'function'
    if (!hasRowConstraint) return false
    if (rowKeys.length && !this.keyInList(rowKeys, this.recordKey(row))) return false
    if (text && !this.objectContainsText(row, text, ['children', this.taskBar.tasksField])) return false
    if (typeof filter.row === 'function') {
      return filter.row({
        record: row,
        row,
        rowKey: this.recordKey(row),
        ganttInstance: this,
        gantt: this
      }) !== false
    }
    return true
  }

  matchesTaskFilter(task, row) {
    const filter = this.filterOptions
    if (!filter) return false
    const text = this.filterText
    const statuses = filter.statuses || filter.status || []
    const statusList = Array.isArray(statuses) ? statuses : [statuses]
    const taskKeys = filter.taskKeys || []
    const hasTimeConstraint = filter.startDate !== undefined || filter.endDate !== undefined
    const hasTaskConstraint = text ||
      statusList.length ||
      taskKeys.length ||
      hasTimeConstraint ||
      typeof filter.task === 'function'
    if (!hasTaskConstraint) return false

    if (taskKeys.length && !this.keyInList(taskKeys, this.taskKey(task))) return false
    if (statusList.length && !statusList.some(status => String(status) === String(this.taskStatus(task)))) return false
    if (text && !this.objectContainsText(task, text, ['milestones'])) return false
    if (hasTimeConstraint && !this.taskOverlapsFilterRange(task)) return false
    if (typeof filter.task === 'function') {
      return filter.task({
        taskRecord: task,
        task,
        rowRecord: row,
        row,
        taskKey: this.taskKey(task),
        rowKey: this.recordKey(row),
        startDate: new Date(toTime(this.taskStart(task))),
        endDate: new Date(toTime(this.taskEnd(task))),
        ganttInstance: this,
        gantt: this
      }) !== false
    }
    return true
  }

  taskOverlapsFilterRange(task) {
    const filter = this.filterOptions || {}
    const start = filter.startDate === undefined ? Number.NEGATIVE_INFINITY : toTime(filter.startDate)
    const end = filter.endDate === undefined ? Number.POSITIVE_INFINITY : toTime(filter.endDate)
    const taskStart = toTime(this.taskStart(task))
    const taskEnd = toTime(this.taskEnd(task))
    if (!Number.isFinite(taskStart) || !Number.isFinite(taskEnd)) return false
    return taskEnd > start && taskStart < end
  }

  objectContainsText(record, text, ignoredKeys = []) {
    if (!record || !text) return false
    const normalized = String(text).toLowerCase()
    return Object.keys(record).some(key => {
      if (key.startsWith('__') || ignoredKeys.includes(key)) return false
      const value = record[key]
      if (value === undefined || value === null) return false
      if (typeof value === 'object') return false
      return String(value).toLowerCase().includes(normalized)
    })
  }

  getDescendantRecordKeys(row) {
    const ids = []
    const walk = children => {
      children.forEach(child => {
        ids.push(this.recordKey(child))
        if (child.children) walk(child.children)
      })
    }
    walk(row.children || [])
    return ids
  }

  overlapsRange(start, end) {
    return toTime(end) > this.startTime && toTime(start) < this.endTime
  }

  overlapsVirtualRange(start, end) {
    if (!this.isVirtualScrollEnabled) return this.overlapsRange(start, end)
    return toTime(end) > this.virtualWindow.timeStart && toTime(start) < this.virtualWindow.timeEnd
  }

  overlapsWindowRange(start, end, window = this.activeVirtualWindow || this.virtualWindow) {
    if (!this.isVirtualScrollEnabled) return this.overlapsRange(start, end)
    return toTime(end) > window.timeStart && toTime(start) < window.timeEnd
  }

  isPrimaryTask(task) {
    if (task.logistics) return false
    const lane = this.taskLane(task)
    if (!lane) return true
    return lane === 'plan' || String(lane).startsWith('plan-')
  }

  isExpandedParentRow(recordKey) {
    const row = this.rowById[recordKey]
    return row && row.children && this.isExpanded(row)
  }

  aggregateWorkStatus(tasks) {
    if (tasks.some(task => task.workStatus === 'severe-delay')) return 'severe-delay'
    if (tasks.some(task => task.workStatus === 'slight-delay')) return 'slight-delay'
    if (tasks.every(task => task.workStatus === 'not-started')) return 'not-started'
    return 'progress-normal'
  }

  loadColor(load) {
    if (load >= 90) return '#ff4d5a'
    if (load >= 70) return '#f7a600'
    return '#43c51a'
  }

  get taskListTable() {
    return this.options.taskListTable || {}
  }

  get rowMetrics() {
    if (!this.rowCache) {
      this.rowCache = this.buildRowCache()
    }
    return this.rowCache
  }

  get timelineHeader() {
    return this.options.timelineHeader || {}
  }

  get taskBar() {
    return this.options.taskBar || {}
  }

  get filterOptions() {
    return this.options.filter && typeof this.options.filter === 'object' ? this.options.filter : null
  }

  get filterText() {
    const text = this.filterOptions && this.filterOptions.text
    return text === undefined || text === null ? '' : String(text).trim().toLowerCase()
  }

  get filterIncludeRowTasksOnMatch() {
    const filter = this.filterOptions
    return !filter || filter.includeRowTasksOnMatch !== false
  }

  get isFilterActive() {
    const filter = this.filterOptions
    if (!filter) return false
    return Boolean(
      this.filterText ||
      (filter.statuses && filter.statuses.length) ||
      filter.status ||
      (filter.rowKeys && filter.rowKeys.length) ||
      (filter.taskKeys && filter.taskKeys.length) ||
      filter.startDate !== undefined ||
      filter.endDate !== undefined ||
      typeof filter.row === 'function' ||
      typeof filter.task === 'function'
    )
  }

  get highlightOptions() {
    return this.options.highlight && typeof this.options.highlight === 'object' ? this.options.highlight : {}
  }

  get denseRenderOptions() {
    const options = this.taskBar.denseRender
    if (options === true) return { enabled: true }
    if (!options || options === false || options.enabled === false) return null
    return options
  }

  get taskTooltip() {
    const tooltip = this.taskBar.tooltip
    if (tooltip === false || tooltip === undefined || tooltip === null) return null
    if (tooltip === true) return DEFAULT_TASK_TOOLTIP
    return {
      ...DEFAULT_TASK_TOOLTIP,
      ...tooltip
    }
  }

  get milestoneTooltip() {
    const tooltip = this.taskBar.milestoneTooltip
    if (tooltip === false || tooltip === undefined || tooltip === null) return null
    if (tooltip === true) return DEFAULT_MILESTONE_TOOLTIP
    return {
      ...DEFAULT_MILESTONE_TOOLTIP,
      ...tooltip
    }
  }

  get dependency() {
    return this.options.dependency || {}
  }

  get grid() {
    return this.options.grid || {}
  }

  get virtualScroll() {
    return this.options.virtualScroll || {}
  }

  get loadingOptions() {
    return this.options.loading || {}
  }

  get isLoadingEnabled() {
    return this.loadingOptions.enabled === true
  }

  get bodyRenderSliceBudget() {
    const budget = Number(this.loadingOptions.bodyRenderSliceBudget)
    return Number.isFinite(budget) && budget > 0 ? budget : 8
  }

  get performanceOptions() {
    return this.options.performance || {}
  }

  get isPerformanceEnabled() {
    return this.performanceOptions.enabled === true
  }

  get scrollbarOptions() {
    return this.options.scrollbar || {}
  }

  get scrollbarWidth() {
    const width = Number(this.scrollbarOptions.width)
    return Number.isFinite(width) && width >= 0 ? width : 10
  }

  get scrollbarHeight() {
    const height = Number(this.scrollbarOptions.height)
    return Number.isFinite(height) && height >= 0 ? height : this.scrollbarWidth
  }

  get scrollbarDragRenderDelay() {
    const delay = Number(this.scrollbarOptions.dragRenderDelay)
    return Number.isFinite(delay) && delay >= 0 ? delay : 80
  }

  get scrollbarDragRenderMaxWait() {
    const wait = Number(this.scrollbarOptions.dragRenderMaxWait)
    return Number.isFinite(wait) && wait >= 0 ? wait : 260
  }

  get tableWidth() {
    if (typeof this.taskListTable.tableWidth === 'number') return this.taskListTable.tableWidth
    return this.tableColumns.reduce((total, column) => total + this.columnWidth(column), 0)
  }

  get tableColumns() {
    return this.sourceTableColumns.map(column => ({
      width: 120,
      ...column
    }))
  }

  get sourceTableColumns() {
    return this.taskListTable.columns && this.taskListTable.columns.length
      ? this.taskListTable.columns
      : DEFAULT_OPTIONS.taskListTable.columns
  }

  get tableGridTemplateColumns() {
    return this.tableColumns.map((column, index) => {
      const width = this.columnWidth(column)
      if (index === this.tableColumns.length - 1) return `minmax(${width}px, 1fr)`
      return `${width}px`
    }).join(' ')
  }

  columnWidth(column) {
    return Number(column.width || column.minWidth || 120)
  }

  get startTime() {
    const value = this.options.minDate || this.derivedStartTime
    return toTime(value)
  }

  get endTime() {
    const value = this.options.maxDate || this.derivedEndTime
    return toTime(value)
  }

  get derivedStartTime() {
    const values = this.allTasks.map(task => toTime(this.taskStart(task))).filter(Number.isFinite)
    return values.length ? Math.min(...values) : Date.now()
  }

  get derivedEndTime() {
    const values = this.allTasks.map(task => toTime(this.taskEnd(task))).filter(Number.isFinite)
    return values.length ? Math.max(...values) : this.derivedStartTime + 24 * HOUR
  }

  get headerHeight() {
    return this.timelineScales.reduce((total, scale) => total + this.scaleRowHeight(scale), 0)
  }

  get bodyHeight() {
    return this.rowMetrics.bodyHeight
  }

  get rangeMs() {
    return Math.max(1, this.endTime - this.startTime)
  }

  get baseTimelineScale() {
    const scales = this.timelineScales
    return scales[scales.length - 1] || DEFAULT_OPTIONS.timelineHeader.scales[1]
  }

  get scaleMs() {
    return this.unitToMs(this.baseTimelineScale.unit) * (this.baseTimelineScale.step || 1)
  }

  get scalePx() {
    return this.baseTimelineScale.colWidth || this.timelineHeader.colWidth || DEFAULT_OPTIONS.timelineHeader.colWidth
  }

  get pxPerMs() {
    return this.scalePx / this.scaleMs
  }

  get chartWidth() {
    return Math.max(1, Math.ceil((this.rangeMs / this.scaleMs) * this.scalePx))
  }

  get isVirtualScrollEnabled() {
    return this.virtualScroll.enabled !== false
  }

  get isVerticalVirtualScrollEnabled() {
    return this.isVirtualScrollEnabled && this.virtualScroll.rowEnabled !== false
  }

  get horizontalViewportWidth() {
    const scrollWidth = this.scrollEl && this.scrollEl.clientWidth ? this.scrollEl.clientWidth : 0
    if (scrollWidth > 0) return scrollWidth
    const containerWidth = this.container && this.container.clientWidth ? this.container.clientWidth : 0
    return Math.max(1, containerWidth - this.tableWidth || 1200)
  }

  get virtualBufferPx() {
    return Math.max(0, Number(this.virtualScroll.bufferPx === undefined ? 1200 : this.virtualScroll.bufferPx))
  }

  get virtualRowBufferPx() {
    return Math.max(0, Number(this.virtualScroll.rowBufferPx === undefined ? this.virtualBufferPx : this.virtualScroll.rowBufferPx))
  }

  get verticalViewportHeight() {
    const scrollHeight = this.scrollEl && this.scrollEl.clientHeight ? this.scrollEl.clientHeight : 0
    if (scrollHeight > 0) return scrollHeight
    const containerHeight = this.container && this.container.clientHeight ? this.container.clientHeight : 0
    return Math.max(1, containerHeight - this.headerHeight || 800)
  }

  get virtualWindow() {
    return getVirtualWindow(this)
  }

  get virtualRowWindow() {
    return getVirtualRowWindow(this)
  }

  get timelineScales() {
    return (this.timelineHeader.scales || []).filter(scale => scale.visible !== false)
  }

  get timelineUnitsByScale() {
    const window = this.activeVirtualWindow || this.virtualWindow
    const key = [
      window.xStart,
      window.xEnd,
      window.timeStart,
      window.timeEnd,
      this.startTime,
      this.endTime,
      this.timelineScales.map(scale => [
        scale.unit,
        scale.step,
        scale.colWidth,
        scale.rowHeight,
        scale.visible === false ? 0 : 1
      ].join(':')).join('|')
    ].join('/')
    if (this.timelineUnitsCache && this.timelineUnitsCache.key === key) {
      return this.timelineUnitsCache.units
    }
    const units = this.timelineScales.map((scale, index) => this.createUnits(scale, index, window.timeStart, window.timeEnd))
    this.timelineUnitsCache = { key, units }
    return units
  }

  get majorUnits() {
    return this.timelineUnitsByScale[0] || []
  }

  get baseUnits() {
    const units = this.timelineUnitsByScale
    return units[units.length - 1] || []
  }

  get verticalLines() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.verticalLines
    return this.baseUnits.map(unit => ({ key: `line-${unit.key}`, x: unit.x, startDate: unit.startDate }))
  }

  get rowLines() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.rowLines
    return this.renderedRowEntries.map(({ row, bottom }) => ({ key: this.recordKey(row), y: bottom }))
  }

  get backgroundShades() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.backgroundShades
    const fill = this.grid.alternatingBackgroundColor
    if (!fill) return []
    return this.majorUnits.filter(unit => unit.dateIndex % 2 === 0).map(unit => ({
      key: `shade-${unit.key}`,
      x: unit.x,
      width: unit.width,
      fill
    }))
  }

  get flatRows() {
    return this.rowMetrics.flatRows
  }

  get visibleRows() {
    return this.rowMetrics.visibleRows
  }

  get visibleRowEntries() {
    return this.rowMetrics.visibleRowEntries
  }

  get renderedRowEntries() {
    if (!this.isVerticalVirtualScrollEnabled) return this.visibleRowEntries
    const window = this.activeVirtualRowWindow || this.virtualRowWindow
    return this.renderedEntriesInWindow(window)
  }

  get renderedRows() {
    return this.renderedRowEntries.map(entry => entry.row)
  }

  get visibleRowIds() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleRowIds
    return this.renderedRows.reduce((ids, row) => {
      ids[this.recordKey(row)] = true
      return ids
    }, {})
  }

  get rowById() {
    return this.rowMetrics.rowById
  }

  get laneByKey() {
    return (this.taskBar.lanes || []).reduce((map, lane) => {
      map[lane.key] = lane
      return map
    }, {})
  }

  get allTasks() {
    return this.rowMetrics.allTasks
  }

  get renderTasks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.renderTasks
    return [...this.parentTimelineTasks, ...this.visibleTasks]
  }

  get stripedTasks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.stripedTasks
    return this.renderTasks.filter(task => task.striped)
  }

  get visibleMilestones() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleMilestones
    const milestones = []
    this.visibleTasks.forEach(task => {
      this.taskMilestones(task).forEach((milestone, index) => {
        const date = toTime(this.milestoneDate(milestone))
        if (!Number.isFinite(date)) return
        if (date < this.virtualWindow.timeStart || date > this.virtualWindow.timeEnd) return
        milestones.push({ task, milestone, index })
      })
    })
    return milestones
  }

  get visibleTasks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleTasks
    const tasks = []
    const tasksField = this.taskBar.tasksField
    this.renderedRowEntries.forEach(({ row, top }) => {
      if (row.children) return
      const rowKey = this.recordKey(row)
      const rowTasks = this.tasksInWindow
        ? this.tasksInWindow(rowKey, this.virtualWindow)
        : (Array.isArray(row[tasksField]) ? row[tasksField] : [])
      rowTasks.forEach(task => {
        if (!this.overlapsVirtualRange(this.taskStart(task), this.taskEnd(task))) return
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

  get parentTimelineTasks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.parentTimelineTasks
    const tasks = []
    this.renderedRowEntries.forEach(({ row, top }) => {
      if (!row.children || this.isExpanded(row)) return
      const descendantIds = this.getDescendantRecordKeys(row)
      const childTasks = this.allTasks.filter(task => {
        return descendantIds.includes(task.__rowId) &&
          this.isPrimaryTask(task) &&
          this.overlapsVirtualRange(this.taskStart(task), this.taskEnd(task))
      })
      if (!childTasks.length) return

      const start = Math.min(...childTasks.map(task => toTime(this.taskStart(task))))
      const end = Math.max(...childTasks.map(task => toTime(this.taskEnd(task))))
      const progressTasks = childTasks.filter(task => this.taskProgress(task) !== undefined)
      const progress = progressTasks.length
        ? Math.round(progressTasks.reduce((total, task) => total + this.taskProgress(task), 0) / progressTasks.length)
        : undefined

      tasks.push({
        [this.options.taskKeyField]: `${this.recordKey(row)}__aggregate`,
        [this.taskBar.startDateField]: start,
        [this.taskBar.endDateField]: end,
        [this.taskBar.progressField]: progress,
        [this.taskBar.statusField]: this.taskStatus(childTasks[0]),
        title: row.name,
        subtitle: `${childTasks.length} 个工单`,
        workStatus: this.aggregateWorkStatus(childTasks),
        completed: childTasks.every(task => task.completed),
        predecessorIncomplete: childTasks.some(task => task.predecessorIncomplete),
        height: Math.max(28, this.rowHeight(row) - 12),
        offsetY: 6,
        parentAggregate: true,
        __rowId: this.recordKey(row),
        __rowRecord: row,
        __rowTop: top
      })
    })
    return tasks
  }

  get visibleBackgroundRanges() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleBackgroundRanges
    return (this.grid.backgroundRanges || []).filter(range => {
      return toTime(range.endDate) > this.virtualWindow.timeStart && toTime(range.startDate) < this.virtualWindow.timeEnd
    })
  }

  get visibleRowBackgroundRanges() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleRowBackgroundRanges
    return (this.grid.rowBackgroundRanges || []).filter(range => {
      return this.visibleRowIds[range.recordKey] &&
        !this.isExpandedParentRow(range.recordKey) &&
        toTime(range.endDate) > this.virtualWindow.timeStart &&
        toTime(range.startDate) < this.virtualWindow.timeEnd
    })
  }

  get markLines() {
    if (!this.options.markLine || this.options.markLine === true) return []
    return Array.isArray(this.options.markLine) ? this.options.markLine : [this.options.markLine]
  }

  get taskLayoutByKey() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.taskLayoutByKey
    return this.renderTasks.reduce((map, task) => {
      const key = this.taskKey(task)
      if (key === undefined || key === null) return map
      const y = this.taskY(task)
      const height = this.taskRenderHeight(task)
      map[key] = {
        task,
        x: this.timeToX(this.taskStart(task)),
        y,
        width: this.durationWidth(this.taskStart(task), this.taskEnd(task)),
        height,
        centerY: y + height / 2
      }
      return map
    }, {})
  }

  get visibleLinks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.visibleLinks
    return this.activeNormalizedLinks.filter(link => {
      return this.taskLayoutByKey[link.from] && this.taskLayoutByKey[link.to]
    })
  }

  get activeNormalizedLinks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.activeNormalizedLinks
    if (this.activeLinkTaskKeys) {
      return this.normalizedLinks
    }
    return this.dependency.showLinks === true ? this.normalizedLinks : []
  }

  get normalizedLinks() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.normalizedLinks
    return this.buildDependencySnapshot().normalizedLinks
  }

  get linkKeySet() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.linkKeySet
    return this.buildDependencySnapshot().linkKeySet
  }

  get linkAdjacencyByTaskKey() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.linkAdjacencyByTaskKey
    return this.buildDependencySnapshot().linkAdjacencyByTaskKey
  }

  get firstLinkGroupByTaskKey() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.firstLinkGroupByTaskKey
    return this.buildDependencySnapshot().firstLinkGroupByTaskKey
  }

  firstLinkGroupKeyByTask(taskKey) {
    if (taskKey === undefined || taskKey === null) return null
    return this.firstLinkGroupByTaskKey[taskKey] || null
  }

  linkNetworkByTask(taskKey) {
    return linkNetworkByTask(this, taskKey)
  }

  get connectedTaskKeys() {
    if (this.currentRenderSnapshot) return this.currentRenderSnapshot.connectedTaskKeys
    return this.visibleLinks.reduce((map, link) => {
      map[link.from] = true
      map[link.to] = true
      return map
    }, {})
  }

  get taskMinWidth() {
    if (typeof this.taskBar.barStyle === 'function') return 4
    const style = this.resolveStyle(this.taskBar.barStyle, {})
    return style.minSize || 4
  }
}
