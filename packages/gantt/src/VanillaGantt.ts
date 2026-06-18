import './vanilla-gantt.css'
import { DEFAULT_MILESTONE_TOOLTIP, DEFAULT_OPTIONS, DEFAULT_TASK_TOOLTIP } from './config/defaultOptions'
import { HOUR } from './utils/constants'
import { attrs, el, svgEl } from './utils/dom'
import { toKeyList } from './utils/list'
import { mergeOptions } from './utils/options'
import { alignToFlex, applyTableHeaderStyle, applyTimelineStyle, applyTimelineStyleToContent } from './utils/style'
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
    this.virtualRenderFrame = null
    this.optionsRenderFrame = null
    this.hideLoadingFrame = null
    this.pendingVirtualRender = { x: false, y: false }
    this.loadingVisible = false
    this.activeVirtualWindow = null
    this.activeVirtualRowWindow = null
    this.activeDrag = null
    this.activeRowDragKey = null
    this.activeTooltip = null
    this.activeLinkTaskKey = null
    this.activeLinkGroupKey = null
    this.activeLinkTaskKeys = null
    this.activeLinkCreate = null
    this.suppressClickUntil = 0
    this.suppressClickTaskKey = null
    this.seedExpandedRows(this.options.records)
    this.render()
  }

  setOptions(options = {}) {
    const previousRecords = this.options.records
    this.options = mergeOptions(this.options, options)
    if (options.records && options.records !== previousRecords) {
      this.seedExpandedRows(options.records, true)
    }
    this.activeVirtualRowWindow = null
    if (this.isLoadingEnabled) {
      this.showLoading()
      this.scheduleOptionsRender()
    } else {
      this.render()
    }
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
    if (this.optionsRenderFrame) {
      cancelAnimationFrame(this.optionsRenderFrame)
      this.optionsRenderFrame = null
    }
    if (this.hideLoadingFrame) {
      cancelAnimationFrame(this.hideLoadingFrame)
      this.hideLoadingFrame = null
    }
    this.pendingVirtualRender = { x: false, y: false }
    this.cleanupVirtualContent()
    this.cleanupLeftVirtualContent()
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
  }

  cleanupVirtualContent() {
    this.taskMeasureFrames.forEach(frame => cancelAnimationFrame(frame))
    this.taskMeasureFrames = []
    this.virtualDisposers.forEach(dispose => dispose())
    this.virtualDisposers = []
  }

  cleanupLeftVirtualContent() {
    this.leftVirtualDisposers.forEach(dispose => dispose())
    this.leftVirtualDisposers = []
  }

  render() {
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
      this.optionsRenderFrame = null
      this.render()
      this.hideLoadingFrame = requestAnimationFrame(() => {
        this.hideLoadingFrame = null
        this.hideLoading()
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
      const rowEl = el('div', `vg-row${row.children ? ' vg-row--group' : ''}`)
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
    if (!svg) return
    this.applyTimelineSvgViewport(svg)
    svg.innerHTML = ''
    let y = 0
    this.timelineUnitsByScale.forEach((units, scaleIndex) => {
      const scale = this.timelineScales[scaleIndex]
      const height = this.scaleRowHeight(scale)
      units.forEach(unit => {
        svg.append(this.renderTimelineUnit(unit, y, height, scale, scaleIndex))
      })
      y += height
    })
  }

  applyTimelineSvgViewport(svg = this.timelineSvg) {
    if (!svg) return
    const window = this.activeVirtualWindow || this.virtualWindow
    const width = Math.max(1, window.xEnd - window.xStart)
    attrs(svg, {
      width,
      height: this.headerHeight,
      viewBox: `${window.xStart} 0 ${width} ${this.headerHeight}`
    })
    svg.style.position = 'absolute'
    svg.style.left = `${window.xStart}px`
    svg.style.top = '0'
    svg.style.width = `${width}px`
    svg.style.height = `${this.headerHeight}px`
  }

  renderTimelineUnit(unit, y, height, scale, scaleIndex) {
    const fo = svgEl('foreignObject')
    attrs(fo, {
      x: unit.x,
      y,
      width: unit.width,
      height
    })
    const custom = this.resolveContent(scale.customLayout || this.timelineHeader.customLayout, {
      dateInfo: unit,
      unit,
      scale,
      scaleIndex,
      major: scaleIndex === 0,
      gantt: this
    })
    const style = this.timelineCellStyle(scale)
    if (custom) {
      applyTimelineStyleToContent(custom, this.timelineCustomCellStyle(scale))
      fo.append(custom)
    } else {
      const cell = el('div', `vg-timeline-cell${scaleIndex === 0 ? ' vg-timeline-cell--major' : ''}`)
      applyTimelineStyle(cell, style)
      cell.textContent = unit.label
      fo.append(cell)
    }
    return fo
  }

  renderBody() {
    const scroll = el('div', 'vg-scroll')
    const stage = el('div', 'vg-stage')
    stage.style.width = `${this.chartWidth}px`
    stage.style.minWidth = `${this.chartWidth}px`
    stage.style.height = `${this.bodyHeight}px`
    stage.style.position = 'relative'

    const svg = svgEl('svg', 'vg-svg')
    this.bodySvg = svg
    this.applyBodySvgViewport(svg)
    this.renderBodySvgContent(svg)
    const onCanvasClick = () => {
      if (this.clearActiveLinkGroup()) this.render()
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
      if (this.leftBodyInner) {
        this.leftBodyInner.style.transform = `translate3d(0, -${this.scrollTop}px, 0)`
      }
      if (this.timelineStage) {
        this.timelineStage.style.transform = `translate3d(-${this.scrollLeft}px, 0, 0)`
      }
      if (typeof this.options.onScroll === 'function') {
        this.options.onScroll({ scrollLeft: this.scrollLeft, scrollTop: this.scrollTop })
      }
      const refreshX = previousScrollLeft !== this.scrollLeft && this.shouldRefreshVirtualWindow()
      const refreshY = previousScrollTop !== this.scrollTop && this.shouldRefreshVirtualRows()
      if (refreshX || refreshY) this.scheduleVirtualRender({ x: refreshX, y: refreshY })
    }
    scroll.addEventListener('scroll', onScroll)
    this.disposers.push(() => scroll.removeEventListener('scroll', onScroll))
    this.scrollEl = scroll

    return scroll
  }

  renderBodySvgContent(svg = this.bodySvg) {
    if (!svg) return
    this.cleanupVirtualContent()
    this.applyBodySvgViewport(svg)
    svg.innerHTML = ''
    svg.append(this.renderDefs())
    this.appendGrid(svg)
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
    if (!this.isVirtualScrollEnabled || !this.activeVirtualWindow) return false
    const threshold = Math.max(240, this.virtualBufferPx * 0.5)
    return Math.abs(this.scrollLeft - this.activeVirtualWindow.renderedForLeft) > threshold
  }

  shouldRefreshVirtualRows() {
    if (!this.isVerticalVirtualScrollEnabled || !this.activeVirtualRowWindow) return false
    const threshold = Math.max(240, this.virtualRowBufferPx * 0.75)
    return Math.abs(this.scrollTop - this.activeVirtualRowWindow.renderedForTop) > threshold
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
    })
  }

  renderDefs() {
    const defs = svgEl('defs')
    const pattern = svgEl('pattern')
    attrs(pattern, {
      id: 'vg-diagonal-stripe',
      patternUnits: 'userSpaceOnUse',
      width: 8,
      height: 8
    })
    const path = svgEl('path')
    attrs(path, {
      d: 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4',
      stroke: '#86ddd4',
      'stroke-width': 1
    })
    pattern.append(path)
    defs.append(pattern)
    return defs
  }

  appendGrid(svg) {
    const xWindow = this.activeVirtualWindow || this.virtualWindow
    const yWindow = this.activeVirtualRowWindow || this.virtualRowWindow
    const viewportWidth = Math.max(1, xWindow.xEnd - xWindow.xStart)
    const viewportHeight = Math.max(1, yWindow.yEnd - yWindow.yStart)

    if (this.grid.backgroundColor) {
      svg.append(this.rect(xWindow.xStart, yWindow.yStart, viewportWidth, viewportHeight, this.grid.backgroundColor))
    }

    this.backgroundShades.forEach(shade => {
      svg.append(this.rect(shade.x, yWindow.yStart, shade.width, viewportHeight, shade.fill))
    })

    this.visibleBackgroundRanges.forEach(range => {
      const rect = this.rect(
        this.timeToX(range.startDate),
        yWindow.yStart,
        this.durationWidth(range.startDate, range.endDate),
        viewportHeight,
        range.color || range.fill || '#edf1f1'
      )
      rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
      svg.append(rect)
    })

    this.verticalLines.forEach((item, index) => {
      const style = this.resolveStyle(this.grid.verticalLine, { index, dateIndex: index, date: item.startDate, ganttInstance: this })
      const line = this.line(item.x, yWindow.yStart, item.x, yWindow.yEnd, style.lineColor || '#e8eeee')
      this.applyLineStyle(line, style)
      svg.append(line)
    })

    this.rowLines.forEach((item, index) => {
      const style = this.resolveStyle(this.grid.horizontalLine, { index, ganttInstance: this })
      const line = this.line(xWindow.xStart, item.y, xWindow.xEnd, item.y, style.lineColor || '#edf1f2')
      this.applyLineStyle(line, style)
      svg.append(line)
    })

    this.markLines.forEach(markLine => {
      this.appendMarkLine(svg, markLine)
    })

    this.visibleRowBackgroundRanges.forEach(range => {
      const rect = this.rect(
        this.timeToX(range.startDate),
        this.rowTop(range.recordKey) + (range.offsetY || 0),
        this.durationWidth(range.startDate, range.endDate),
        range.height || this.rowHeight(this.rowById[range.recordKey] || {}),
        range.color || range.fill || '#dcf8c9'
      )
      rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
      svg.append(rect)
    })

    this.stripedTasks.forEach(task => {
      const rect = this.rect(
        this.timeToX(this.taskStart(task)),
        this.taskY(task),
        this.durationWidth(this.taskStart(task), this.taskEnd(task)),
        this.taskRenderHeight(task),
        'url(#vg-diagonal-stripe)'
      )
      svg.append(rect)
    })

    this.renderTasks.forEach(task => {
      svg.append(this.renderTask(task))
    })

    this.visibleMilestones.forEach(item => {
      svg.append(this.renderMilestone(item))
    })

    this.visibleLinks.forEach(link => {
      this.appendLink(svg, link)
    })

    this.appendLinkConnectors(svg)
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

  appendLink(svg, link) {
    const from = this.taskLayoutByKey[link.from]
    const to = this.taskLayoutByKey[link.to]
    if (!from || !to) return

    const lineMode = this.linkLineMode(link)
    const route = this.linkRoute(link.type, from, to, lineMode.path)
    const style = {
      ...(this.dependency.linkLineStyle || {}),
      ...(link.linkLineStyle || {})
    }
    const color = style.lineColor || link.color || '#168dff'
    const path = this.path(route.d, color)
    attrs(path, {
      fill: 'none',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    })
    this.applyLineStyle(path, { lineWidth: 2, ...style })
    this.applyLinkPattern(path, lineMode.pattern, link)
    const startCircle = this.circle(route.start.x, route.start.y, 4, color)
    const arrow = this.arrow(route.end.x, route.end.y, route.direction, color)
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
    return this.normalizedLinks.some(link => this.isSameKey(link.from, fromKey) && this.isSameKey(link.to, toKey))
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

  appendLinkConnectors(svg) {
    if (!this.dependency.linkCreatable) return
    this.renderTasks.forEach(task => {
      const key = this.taskKey(task)
      const layout = this.taskLayoutByKey[key]
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
      this.bindLinkConnector(circle, task, side)
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
    this.bindLinkConnector(fo, task, side)
    return fo
  }

  bindLinkConnector(node, task, side) {
    if (side !== 'finish') return
    const onPointerDown = event => this.startLinkCreate(task, side, event)
    node.addEventListener('pointerdown', onPointerDown)
    this.virtualDisposers.push(() => node.removeEventListener('pointerdown', onPointerDown))
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
    const width = this.durationWidth(this.taskStart(task), this.taskEnd(task))
    const height = this.taskRenderHeight(task)
    const fo = svgEl('foreignObject', 'vg-task-fo')
    attrs(fo, {
      x: this.timeToX(this.taskStart(task)),
      y: this.taskY(task),
      width,
      height,
      'data-task-key': this.taskKey(task)
    })

    const row = task.__rowRecord || this.rowById[task.__rowId]
    const payload = this.createTaskPayload(task, {
      row,
      width,
      height,
      x: this.timeToX(this.taskStart(task)),
      y: this.taskY(task)
    })
    const custom = this.resolveContent(this.taskBar.customLayout, payload)
    fo.append(custom || this.renderDefaultTask(task))
    this.scheduleTaskForeignObjectMeasure(fo, height)
    if (this.isTaskDimmed(task)) {
      const opacity = String(this.dependency.dimOpacity === undefined ? 0.18 : this.dependency.dimOpacity)
      fo.classList.add('vg-task-fo--dimmed')
      fo.style.setProperty('--vg-dim-opacity', opacity)
      Array.from(fo.children).forEach(child => {
        if (child && child.style) child.style.opacity = opacity
      })
    }
    this.bindTaskInteractions(fo, task)
    return fo
  }

  scheduleTaskForeignObjectMeasure(fo, fallbackHeight) {
    const frame = requestAnimationFrame(() => {
      this.taskMeasureFrames = this.taskMeasureFrames.filter(item => item !== frame)
      const content = fo.firstElementChild
      if (!(content instanceof HTMLElement)) return

      const rectHeight = content.getBoundingClientRect().height
      const measuredHeight = Math.ceil(Math.max(content.scrollHeight, content.offsetHeight, rectHeight))
      if (measuredHeight > fallbackHeight) {
        fo.setAttribute('height', String(measuredHeight))
      }
    })
    this.taskMeasureFrames.push(frame)
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
    const onMouseEnter = event => {
      this.showMilestoneTooltip(item, event)
    }
    const onMouseMove = event => {
      this.positionTaskTooltip(event)
    }
    const onMouseLeave = () => {
      this.hideTaskTooltip()
    }
    node.addEventListener('mouseenter', onMouseEnter)
    node.addEventListener('mousemove', onMouseMove)
    node.addEventListener('mouseleave', onMouseLeave)
    this.virtualDisposers.push(() => {
      node.removeEventListener('mouseenter', onMouseEnter)
      node.removeEventListener('mousemove', onMouseMove)
      node.removeEventListener('mouseleave', onMouseLeave)
    })
  }

  bindTaskInteractions(node, task) {
    if (this.isTaskDraggable(task)) {
      node.classList.add('vg-task-fo--draggable')
    }

    const onClick = event => {
      if (event.__vgTaskClickHandled) return
      event.__vgTaskClickHandled = true
      const taskKey = this.taskKey(task)
      if (this.suppressClickTaskKey === taskKey && Date.now() < this.suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const shouldRender = this.activateTaskLinkGroup(task)
      this.callTaskCallback('onClick', task, event)
      event.stopPropagation()
      if (shouldRender) this.render()
    }
    const onContextMenu = event => {
      if (event.__vgTaskContextMenuHandled) return
      event.__vgTaskContextMenuHandled = true
      if (typeof this.taskBar.onContextMenu !== 'function') return
      event.preventDefault()
      this.callTaskCallback('onContextMenu', task, event)
    }
    const onMouseEnter = event => {
      this.callTaskCallback('onMouseEnter', task, event)
      this.showTaskTooltip(task, event)
    }
    const onMouseMove = event => {
      this.positionTaskTooltip(event)
    }
    const onMouseLeave = event => {
      this.callTaskCallback('onMouseLeave', task, event)
      this.hideTaskTooltip()
    }
    const onPointerDown = event => {
      if (event.__vgTaskPointerDownHandled) return
      event.__vgTaskPointerDownHandled = true
      this.startTaskDrag(node, task, event)
    }

    const eventTargets = [node]
    Array.from(node.children || []).forEach(child => eventTargets.push(child))

    eventTargets.forEach(target => {
      target.addEventListener('click', onClick)
      target.addEventListener('contextmenu', onContextMenu)
      target.addEventListener('pointerdown', onPointerDown)
    })
    node.addEventListener('mouseenter', onMouseEnter)
    node.addEventListener('mousemove', onMouseMove)
    node.addEventListener('mouseleave', onMouseLeave)
    this.virtualDisposers.push(() => {
      eventTargets.forEach(target => {
        target.removeEventListener('click', onClick)
        target.removeEventListener('contextmenu', onContextMenu)
        target.removeEventListener('pointerdown', onPointerDown)
      })
      node.removeEventListener('mouseenter', onMouseEnter)
      node.removeEventListener('mousemove', onMouseMove)
      node.removeEventListener('mouseleave', onMouseLeave)
    })
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
    const tooltip = this.taskTooltip
    if (!tooltip || tooltip.visible === false) return

    const payload = this.createTaskPayload(task, { event })
    const content = this.resolveContent(tooltip.customLayout, payload) || this.renderDefaultTaskTooltip(payload)
    if (!content) return

    this.hideTaskTooltip()
    const node = el('div', `vg-tooltip${tooltip.className ? ` ${tooltip.className}` : ''}`)
    node.append(content)
    document.body.append(node)
    this.tooltipEl = node
    this.activeTooltip = tooltip
    this.positionTaskTooltip(event)
  }

  showMilestoneTooltip(item, event) {
    const tooltip = this.milestoneTooltip
    if (!tooltip || tooltip.visible === false) return

    const payload = this.createMilestonePayload(item, { event })
    const content = this.resolveContent(tooltip.customLayout, payload) || this.renderDefaultMilestoneTooltip(payload)
    if (!content) return

    this.hideTaskTooltip()
    const node = el('div', `vg-tooltip${tooltip.className ? ` ${tooltip.className}` : ''}`)
    node.append(content)
    document.body.append(node)
    this.tooltipEl = node
    this.activeTooltip = tooltip
    this.positionTaskTooltip(event)
  }

  positionTaskTooltip(event) {
    if (!this.tooltipEl || !event) return
    const tooltip = this.activeTooltip || this.taskTooltip || {}
    const offsetX = tooltip.offsetX === undefined ? 12 : Number(tooltip.offsetX)
    const offsetY = tooltip.offsetY === undefined ? 12 : Number(tooltip.offsetY)
    const rect = this.tooltipEl.getBoundingClientRect()
    const maxLeft = window.innerWidth - rect.width - 8
    const maxTop = window.innerHeight - rect.height - 8
    const left = Math.max(8, Math.min(maxLeft, event.clientX + offsetX))
    const top = Math.max(8, Math.min(maxTop, event.clientY + offsetY))
    this.tooltipEl.style.left = `${left}px`
    this.tooltipEl.style.top = `${top}px`
  }

  hideTaskTooltip() {
    if (!this.tooltipEl) return
    this.tooltipEl.remove()
    this.tooltipEl = null
    this.activeTooltip = null
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
    return this.resolveStyle(style, {
      taskRecord: task,
      index: this.renderTasks.findIndex(item => this.taskKey(item) === this.taskKey(task)),
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
    let top = 0
    for (const row of this.visibleRows) {
      if (this.recordKey(row) === recordKey) return top
      top += this.rowHeight(row)
    }
    return 0
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

  get timelineHeader() {
    return this.options.timelineHeader || {}
  }

  get taskBar() {
    return this.options.taskBar || {}
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
    return this.visibleRows.reduce((height, row) => height + this.rowHeight(row), 0)
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
    if (!this.isVirtualScrollEnabled) {
      return {
        xStart: 0,
        xEnd: this.chartWidth,
        timeStart: this.startTime,
        timeEnd: this.endTime,
        renderedForLeft: this.scrollLeft
      }
    }
    const viewportWidth = this.horizontalViewportWidth
    const xStart = Math.max(0, this.scrollLeft - this.virtualBufferPx)
    const xEnd = Math.min(this.chartWidth, this.scrollLeft + viewportWidth + this.virtualBufferPx)
    return {
      xStart,
      xEnd,
      timeStart: this.startTime + xStart / this.pxPerMs,
      timeEnd: this.startTime + xEnd / this.pxPerMs,
      renderedForLeft: this.scrollLeft
    }
  }

  get virtualRowWindow() {
    if (!this.isVerticalVirtualScrollEnabled) {
      return {
        yStart: 0,
        yEnd: this.bodyHeight,
        renderedForTop: this.scrollTop
      }
    }
    const viewportHeight = this.verticalViewportHeight
    return {
      yStart: Math.max(0, this.scrollTop - this.virtualRowBufferPx),
      yEnd: Math.min(this.bodyHeight, this.scrollTop + viewportHeight + this.virtualRowBufferPx),
      renderedForTop: this.scrollTop
    }
  }

  get timelineScales() {
    return (this.timelineHeader.scales || []).filter(scale => scale.visible !== false)
  }

  get timelineUnitsByScale() {
    const window = this.activeVirtualWindow || this.virtualWindow
    return this.timelineScales.map((scale, index) => this.createUnits(scale, index, window.timeStart, window.timeEnd))
  }

  get majorUnits() {
    return this.timelineUnitsByScale[0] || []
  }

  get baseUnits() {
    const units = this.timelineUnitsByScale
    return units[units.length - 1] || []
  }

  get verticalLines() {
    return this.baseUnits.map(unit => ({ key: `line-${unit.key}`, x: unit.x, startDate: unit.startDate }))
  }

  get rowLines() {
    return this.renderedRowEntries.map(({ row, bottom }) => ({ key: this.recordKey(row), y: bottom }))
  }

  get backgroundShades() {
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
    const rows = []
    const walk = (items, level = 0) => {
      items.forEach(record => {
        rows.push({ ...record, __recordKey: this.recordKey(record), level })
        if (record.children) walk(record.children, level + 1)
      })
    }
    walk(this.options.records)
    return rows
  }

  get visibleRows() {
    const rows = []
    const walk = (items, level = 0) => {
      items.forEach(record => {
        const normalized = { ...record, __recordKey: this.recordKey(record), level }
        rows.push(normalized)
        if (record.children && this.isExpanded(normalized)) {
          walk(record.children, level + 1)
        }
      })
    }
    walk(this.options.records)
    return rows
  }

  get visibleRowEntries() {
    let top = 0
    return this.visibleRows.map(row => {
      const height = this.rowHeight(row)
      const entry = {
        row,
        top,
        bottom: top + height,
        height
      }
      top += height
      return entry
    })
  }

  get renderedRowEntries() {
    if (!this.isVerticalVirtualScrollEnabled) return this.visibleRowEntries
    const window = this.activeVirtualRowWindow || this.virtualRowWindow
    return this.visibleRowEntries.filter(entry => entry.bottom >= window.yStart && entry.top <= window.yEnd)
  }

  get renderedRows() {
    return this.renderedRowEntries.map(entry => entry.row)
  }

  get visibleRowIds() {
    return this.renderedRows.reduce((ids, row) => {
      ids[this.recordKey(row)] = true
      return ids
    }, {})
  }

  get rowById() {
    return this.flatRows.reduce((map, row) => {
      map[this.recordKey(row)] = row
      return map
    }, {})
  }

  get laneByKey() {
    return (this.taskBar.lanes || []).reduce((map, lane) => {
      map[lane.key] = lane
      return map
    }, {})
  }

  get allTasks() {
    const tasks = []
    const tasksField = this.taskBar.tasksField
    const walk = records => {
      records.forEach(record => {
        const recordKey = this.recordKey(record)
        const rowTasks = Array.isArray(record[tasksField]) ? record[tasksField] : []
        rowTasks.forEach(task => {
          tasks.push({
            ...task,
            __rowId: recordKey
          })
        })
        if (record.children) walk(record.children)
      })
    }
    walk(this.options.records)
    return tasks
  }

  get renderTasks() {
    return [...this.parentTimelineTasks, ...this.visibleTasks]
  }

  get stripedTasks() {
    return this.renderTasks.filter(task => task.striped)
  }

  get visibleMilestones() {
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
    const tasks = []
    const tasksField = this.taskBar.tasksField
    this.renderedRowEntries.forEach(({ row, top }) => {
      if (row.children) return
      const rowTasks = Array.isArray(row[tasksField]) ? row[tasksField] : []
      rowTasks.forEach(task => {
        if (!this.overlapsVirtualRange(this.taskStart(task), this.taskEnd(task))) return
        tasks.push({
          ...task,
          __rowId: this.recordKey(row),
          __rowRecord: row,
          __rowTop: top
        })
      })
    })
    return tasks
  }

  get parentTimelineTasks() {
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
    return (this.grid.backgroundRanges || []).filter(range => {
      return toTime(range.endDate) > this.virtualWindow.timeStart && toTime(range.startDate) < this.virtualWindow.timeEnd
    })
  }

  get visibleRowBackgroundRanges() {
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
    return this.renderTasks.reduce((map, task) => {
      const key = this.taskKey(task)
      if (!key) return map
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
    return this.activeNormalizedLinks.filter(link => {
      return this.taskLayoutByKey[link.from] && this.taskLayoutByKey[link.to]
    })
  }

  get activeNormalizedLinks() {
    if (this.activeLinkTaskKeys) {
      return this.normalizedLinks
    }
    return this.dependency.showLinks === true ? this.normalizedLinks : []
  }

  get normalizedLinks() {
    const links = []
    const used = new Set()
    ;(this.dependency.links || []).forEach((link, linkIndex) => {
      const fromKeys = toKeyList(link.from)
      const toKeys = toKeyList(link.to)
      const groupKey = link.id === undefined || link.id === null
        ? `link-${linkIndex}`
        : String(link.id)
      fromKeys.forEach(from => {
        toKeys.forEach(to => {
          if (from === undefined || from === null || to === undefined || to === null) return
          const uniqueKey = `${String(from)}->${String(to)}`
          if (used.has(uniqueKey)) return
          used.add(uniqueKey)
          links.push({
            ...link,
            from,
            to,
            __groupKey: groupKey
          })
        })
      })
    })
    return links
  }

  firstLinkGroupKeyByTask(taskKey) {
    if (taskKey === undefined || taskKey === null) return null
    const link = this.normalizedLinks.find(item => item.from === taskKey || item.to === taskKey)
    return link ? link.__groupKey : null
  }

  linkNetworkByTask(taskKey) {
    if (taskKey === undefined || taskKey === null) return null
    const links = this.normalizedLinks
    if (!links.some(link => this.isSameKey(link.from, taskKey) || this.isSameKey(link.to, taskKey))) return null

    const taskKeys = Object.create(null)
    const queue = [taskKey]
    taskKeys[taskKey] = true

    while (queue.length) {
      const current = queue.shift()
      links.forEach(link => {
        if (!this.isSameKey(link.from, current) && !this.isSameKey(link.to, current)) return
        ;[link.from, link.to].forEach(nextKey => {
          if (taskKeys[nextKey]) return
          taskKeys[nextKey] = true
          queue.push(nextKey)
        })
      })
    }

    return {
      key: Object.keys(taskKeys).sort().join('|'),
      taskKeys
    }
  }

  get connectedTaskKeys() {
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
