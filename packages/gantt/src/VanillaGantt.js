import './vanilla-gantt.css'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HOUR = 60 * 60 * 1000

const DEFAULT_OPTIONS = {
  records: [],
  recordKeyField: 'id',
  taskKeyField: 'id',
  minDate: '',
  maxDate: '',
  rowHeight: 78,
  taskHeight: 36,
  headerRowHeight: 24,
  taskListTable: {
    tableWidth: 'auto',
    minTableWidth: 120,
    maxTableWidth: 640,
    columnResizable: true,
    columns: [
      { field: 'name', title: '工位', width: 170, tree: true }
    ],
    renderHeader: null,
    renderCell: null
  },
  timelineHeader: {
    backgroundColor: '#fff',
    colWidth: 56,
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 2, rowHeight: 24, colWidth: 56 }
    ]
  },
  taskBar: {
    tasksField: 'tasks',
    startDateField: 'startDate',
    endDateField: 'endDate',
    progressField: 'progress',
    laneField: 'lane',
    statusField: 'status',
    labelText: 'title',
    subLabelText: 'subtitle',
    barStyle: null,
    projectStyle: null,
    customLayout: null,
    clip: true,
    draggable: true,
    dragStep: 60 * 1000,
    tooltip: {
      visible: true,
      customLayout: null,
      className: '',
      offsetX: 12,
      offsetY: 12
    },
    onClick: null,
    onContextMenu: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onDragStart: null,
    onDrag: null,
    onDragEnd: null,
    lanes: [
      { key: 'plan', offset: 8, height: 36 },
      { key: 'load', offset: 52, height: 6 },
      { key: 'unload', offset: 66, height: 6 }
    ]
  },
  dependency: {
    links: [],
    linkLineStyle: null
  },
  grid: {
    backgroundColor: '#f7fbfb',
    alternatingBackgroundColor: '#f8fbfb',
    verticalLine: { lineColor: '#e8eeee' },
    horizontalLine: { lineColor: '#edf1f2' },
    backgroundRanges: [],
    rowBackgroundRanges: []
  },
  markLine: null,
  onScroll: null
}

export default class VanillaGantt {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container
    if (!this.container) {
      throw new Error('VanillaGantt requires a valid container.')
    }

    this.options = mergeOptions(DEFAULT_OPTIONS, options)
    this.expandedRows = {}
    this.scrollTop = 0
    this.scrollLeft = 0
    this.disposers = []
    this.activeDrag = null
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
    this.render()
  }

  destroy() {
    this.cleanup()
    this.container.innerHTML = ''
  }

  cleanup() {
    this.hideTaskTooltip()
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
  }

  render() {
    this.cleanup()

    const root = el('div', 'vg')
    root.style.setProperty('--vg-left-width', `${this.tableWidth}px`)
    this.rootEl = root

    const left = el('div', 'vg-left')
    const right = el('div', 'vg-right')

    left.append(this.renderLeftHeader(), this.renderLeftBody(), this.renderResizeHandle(root))
    right.append(this.renderTimeline(), this.renderBody())
    root.append(left, right)

    this.container.innerHTML = ''
    this.container.append(root)

    if (this.scrollEl) {
      this.scrollEl.scrollTop = this.scrollTop
      this.scrollEl.scrollLeft = this.scrollLeft
    }
  }

  renderLeftHeader() {
    const header = el('div', 'vg-left-header')
    header.style.height = `${this.headerHeight}px`
    header.style.gridTemplateColumns = this.tableGridTemplateColumns
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
    const content = el('div', 'vg-table-header-content')
    content.style.justifyContent = alignToFlex(column.headerAlign || column.align || 'left')
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
    if (typeof this.taskListTable.tableWidth === 'number') {
      this.taskListTable.tableWidth = this.sourceTableColumns.reduce((total, item) => total + this.columnWidth(item), 0)
    }
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

  renderLeftBody() {
    const body = el('div', 'vg-left-body')
    const inner = el('div', 'vg-left-body-inner')
    inner.style.height = `${this.bodyHeight}px`
    inner.style.transform = `translateY(-${this.scrollTop}px)`
    this.leftBodyInner = inner

    this.visibleRows.forEach(row => {
      const rowEl = el('div', `vg-row${row.children ? ' vg-row--group' : ''}`)
      rowEl.style.height = `${row.height || this.options.rowHeight}px`
      rowEl.style.gridTemplateColumns = this.tableGridTemplateColumns
      this.tableColumns.forEach((column, columnIndex) => {
        rowEl.append(this.renderTableCell(row, column, columnIndex))
      })
      inner.append(rowEl)
    })

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
      button.textContent = this.isExpanded(row) ? '⌄' : '›'
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
      this.disposers.push(() => node.removeEventListener('click', onClick))
    })
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
    stage.style.transform = `translateX(-${this.scrollLeft}px)`
    this.timelineStage = stage

    const svg = svgEl('svg', 'vg-timeline-svg')
    attrs(svg, {
      width: this.chartWidth,
      height: this.headerHeight,
      viewBox: `0 0 ${this.chartWidth} ${this.headerHeight}`
    })

    let y = 0
    this.timelineUnitsByScale.forEach((units, scaleIndex) => {
      const scale = this.timelineScales[scaleIndex]
      const height = this.scaleRowHeight(scale)
      units.forEach(unit => {
        svg.append(this.renderTimelineUnit(unit, y, height, scale, scaleIndex))
      })
      y += height
    })

    stage.append(svg)
    viewport.append(stage)
    return viewport
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
    if (custom) {
      fo.append(custom)
    } else {
      const cell = el('div', `vg-timeline-cell${scaleIndex === 0 ? ' vg-timeline-cell--major' : ''}`)
      applyTimelineStyle(cell, scale.style)
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

    const svg = svgEl('svg', 'vg-svg')
    attrs(svg, {
      width: this.chartWidth,
      height: this.bodyHeight,
      viewBox: `0 0 ${this.chartWidth} ${this.bodyHeight}`
    })

    svg.append(this.renderDefs())
    this.appendGrid(svg)
    stage.append(svg)
    scroll.append(stage)

    const onScroll = () => {
      this.scrollTop = scroll.scrollTop
      this.scrollLeft = scroll.scrollLeft
      if (this.leftBodyInner) {
        this.leftBodyInner.style.transform = `translateY(-${this.scrollTop}px)`
      }
      if (this.timelineStage) {
        this.timelineStage.style.transform = `translateX(-${this.scrollLeft}px)`
      }
      if (typeof this.options.onScroll === 'function') {
        this.options.onScroll({ scrollLeft: this.scrollLeft, scrollTop: this.scrollTop })
      }
    }
    scroll.addEventListener('scroll', onScroll)
    this.disposers.push(() => scroll.removeEventListener('scroll', onScroll))
    this.scrollEl = scroll

    return scroll
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
    if (this.grid.backgroundColor) {
      svg.append(this.rect(0, 0, this.chartWidth, this.bodyHeight, this.grid.backgroundColor))
    }

    this.backgroundShades.forEach(shade => {
      svg.append(this.rect(shade.x, 0, shade.width, this.bodyHeight, shade.fill))
    })

    this.visibleBackgroundRanges.forEach(range => {
      const rect = this.rect(
        this.timeToX(range.startDate),
        0,
        this.durationWidth(range.startDate, range.endDate),
        this.bodyHeight,
        range.color || range.fill || '#edf1f1'
      )
      rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
      svg.append(rect)
    })

    this.verticalLines.forEach((item, index) => {
      const style = this.resolveStyle(this.grid.verticalLine, { index, dateIndex: index, date: item.startDate, ganttInstance: this })
      const line = this.line(item.x, 0, item.x, this.bodyHeight, style.lineColor || '#e8eeee')
      this.applyLineStyle(line, style)
      svg.append(line)
    })

    this.rowLines.forEach((item, index) => {
      const style = this.resolveStyle(this.grid.horizontalLine, { index, ganttInstance: this })
      const line = this.line(0, item.y, this.chartWidth, item.y, style.lineColor || '#edf1f2')
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
        range.height || this.options.rowHeight,
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

    this.visibleLinks.forEach(link => {
      this.appendLink(svg, link)
    })

    this.renderTasks.forEach(task => {
      svg.append(this.renderTask(task))
    })
  }

  appendMarkLine(svg, markLine) {
    const x = this.timeToX(markLine.date)
    if (x < 0 || x > this.chartWidth) return

    const style = markLine.style || {}
    const line = this.line(x, 0, x, this.bodyHeight, style.lineColor || '#35cce0')
    this.applyLineStyle(line, { lineDash: [4, 4], ...style })
    svg.append(line)

    if (!markLine.content) return
    const text = svgEl('text', 'vg-mark-line-text')
    attrs(text, {
      x: x + 6,
      y: 16,
      fill: markLine.contentStyle && markLine.contentStyle.color ? markLine.contentStyle.color : style.lineColor || '#35cce0'
    })
    text.textContent = markLine.content
    svg.append(text)
  }

  appendLink(svg, link) {
    const from = this.taskLayoutByKey[firstKey(link.linkedFromTaskKey)]
    const to = this.taskLayoutByKey[firstKey(link.linkedToTaskKey)]
    if (!from || !to) return

    const points = this.linkPoints(link.type, from, to)
    const style = {
      ...(this.dependency.linkLineStyle || {}),
      ...(link.linkLineStyle || {})
    }
    const line = this.line(points.x1, points.y1, points.x2, points.y2, style.lineColor || link.color || '#43c51a')
    this.applyLineStyle(line, { lineWidth: 2, ...style })
    if (link.dashed) line.setAttribute('stroke-dasharray', '5 4')
    svg.append(line)
    svg.append(this.circle(points.x1, points.y1, 5, style.lineColor || link.color || '#43c51a'))
    svg.append(this.circle(points.x2, points.y2, 5, style.lineColor || link.color || '#43c51a'))
  }

  linkPoints(type, from, to) {
    const fromStart = from.x
    const fromEnd = from.x + from.width
    const toStart = to.x
    const toEnd = to.x + to.width
    const normalizedType = type || 'finish_to_start'

    if (normalizedType === 'start_to_start') {
      return { x1: fromStart, y1: from.centerY, x2: toStart, y2: to.centerY }
    }
    if (normalizedType === 'finish_to_finish') {
      return { x1: fromEnd, y1: from.centerY, x2: toEnd, y2: to.centerY }
    }
    if (normalizedType === 'start_to_finish') {
      return { x1: fromStart, y1: from.centerY, x2: toEnd, y2: to.centerY }
    }
    return { x1: fromEnd, y1: from.centerY, x2: toStart, y2: to.centerY }
  }

  renderTask(task) {
    const width = this.durationWidth(this.taskStart(task), this.taskEnd(task))
    const height = this.taskRenderHeight(task)
    const fo = svgEl('foreignObject', 'vg-task-fo')
    attrs(fo, {
      x: this.timeToX(this.taskStart(task)),
      y: this.taskY(task),
      width,
      height
    })

    const row = this.rowById[task.__rowId]
    const payload = this.createTaskPayload(task, {
      row,
      width,
      height,
      x: this.timeToX(this.taskStart(task)),
      y: this.taskY(task)
    })
    const custom = this.resolveContent(this.taskBar.customLayout, payload)
    fo.append(custom || this.renderDefaultTask(task))
    this.bindTaskInteractions(fo, task)
    return fo
  }

  bindTaskInteractions(node, task) {
    if (this.isTaskDraggable(task)) {
      node.classList.add('vg-task-fo--draggable')
    }

    const onClick = event => {
      const taskKey = this.taskKey(task)
      if (this.suppressClickTaskKey === taskKey && Date.now() < this.suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      this.callTaskCallback('onClick', task, event)
    }
    const onContextMenu = event => {
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
      this.startTaskDrag(node, task, event)
    }

    node.addEventListener('click', onClick)
    node.addEventListener('contextmenu', onContextMenu)
    node.addEventListener('mouseenter', onMouseEnter)
    node.addEventListener('mousemove', onMouseMove)
    node.addEventListener('mouseleave', onMouseLeave)
    node.addEventListener('pointerdown', onPointerDown)
    this.disposers.push(() => {
      node.removeEventListener('click', onClick)
      node.removeEventListener('contextmenu', onContextMenu)
      node.removeEventListener('mouseenter', onMouseEnter)
      node.removeEventListener('mousemove', onMouseMove)
      node.removeEventListener('mouseleave', onMouseLeave)
      node.removeEventListener('pointerdown', onPointerDown)
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
    this.positionTaskTooltip(event)
  }

  positionTaskTooltip(event) {
    if (!this.tooltipEl || !event) return
    const tooltip = this.taskTooltip || {}
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

  callTaskCallback(name, task, event, payload) {
    const callback = this.taskBar[name]
    if (typeof callback !== 'function') return undefined
    return callback(payload || this.createTaskPayload(task, { event }))
  }

  isTaskDraggable(task) {
    if (task.draggable !== undefined) return task.draggable !== false
    if (task.parentAggregate) return false
    const draggable = this.taskBar.draggable
    if (typeof draggable === 'function') {
      return draggable(this.createTaskPayload(task)) !== false
    }
    return draggable !== false
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
      top += row.height || this.options.rowHeight
    }
    return 0
  }

  taskY(task) {
    return this.rowTop(task.__rowId) + this.taskOffsetY(task)
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
    return style.width || this.options.taskHeight
  }

  createUnits(scale, scaleIndex) {
    const units = []
    const unit = scale.unit || 'hour'
    const step = scale.step || 1
    let cursor = this.floorDate(new Date(this.startTime), unit, scale.startOfWeek)
    let dateIndex = 0
    while (cursor.getTime() < this.endTime) {
      const unitStart = Math.max(cursor.getTime(), this.startTime)
      const next = this.addUnit(cursor, unit, step)
      const unitEnd = Math.min(next.getTime(), this.endTime)
      if (unitEnd > unitStart) {
        const info = {
          type: unit,
          unit,
          step,
          scaleIndex,
          dateIndex,
          key: `${unit}-${cursor.toISOString()}`,
          title: this.formatUnitLabel(cursor, unit),
          label: this.formatTimelineLabel(scale, unitStart, unitEnd, dateIndex),
          startDate: new Date(unitStart),
          endDate: new Date(unitEnd),
          days: Math.max(1, Math.ceil((unitEnd - unitStart) / (24 * HOUR))),
          x: this.timeToX(unitStart),
          width: Math.max(1, this.timeToX(unitEnd) - this.timeToX(unitStart))
        }
        units.push(info)
        dateIndex += 1
      }
      cursor = next
    }
    return units
  }

  formatTimelineLabel(scale, startTime, endTime, dateIndex) {
    if (typeof scale.format === 'function') {
      return scale.format({
        dateIndex,
        startDate: new Date(startTime),
        endDate: new Date(endTime)
      })
    }
    return this.formatUnitLabel(new Date(startTime), scale.unit)
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
    if (tooltip === false) return null
    if (tooltip === true || tooltip === undefined || tooltip === null) return DEFAULT_OPTIONS.taskBar.tooltip
    return tooltip
  }

  get dependency() {
    return this.options.dependency || {}
  }

  get grid() {
    return this.options.grid || {}
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
    return this.visibleRows.reduce((height, row) => height + (row.height || this.options.rowHeight), 0)
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

  get timelineScales() {
    return (this.timelineHeader.scales || []).filter(scale => scale.visible !== false)
  }

  get timelineUnitsByScale() {
    return this.timelineScales.map((scale, index) => this.createUnits(scale, index))
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
    let top = 0
    return this.visibleRows.map(row => {
      top += row.height || this.options.rowHeight
      return { key: this.recordKey(row), y: top }
    })
  }

  get backgroundShades() {
    const fill = this.grid.alternatingBackgroundColor
    if (!fill) return []
    return this.majorUnits.filter((unit, index) => index % 2 === 0).map(unit => ({
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

  get visibleRowIds() {
    return this.visibleRows.reduce((ids, row) => {
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

  get visibleTasks() {
    return this.allTasks.filter(task => {
      const row = this.rowById[task.__rowId]
      return row &&
        !row.children &&
        this.visibleRowIds[task.__rowId] &&
        this.overlapsRange(this.taskStart(task), this.taskEnd(task))
    })
  }

  get parentTimelineTasks() {
    const tasks = []
    this.visibleRows.forEach(row => {
      if (!row.children || this.isExpanded(row)) return
      const descendantIds = this.getDescendantRecordKeys(row)
      const childTasks = this.allTasks.filter(task => {
        return descendantIds.includes(task.__rowId) &&
          this.isPrimaryTask(task) &&
          this.overlapsRange(this.taskStart(task), this.taskEnd(task))
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
        height: Math.max(28, (row.height || this.options.rowHeight) - 12),
        offsetY: 6,
        parentAggregate: true,
        __rowId: this.recordKey(row)
      })
    })
    return tasks
  }

  get visibleBackgroundRanges() {
    return (this.grid.backgroundRanges || []).filter(range => {
      return toTime(range.endDate) > this.startTime && toTime(range.startDate) < this.endTime
    })
  }

  get visibleRowBackgroundRanges() {
    return (this.grid.rowBackgroundRanges || []).filter(range => {
      return this.visibleRowIds[range.recordKey] &&
        !this.isExpandedParentRow(range.recordKey) &&
        toTime(range.endDate) > this.startTime &&
        toTime(range.startDate) < this.endTime
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
    return (this.dependency.links || []).filter(link => {
      return this.taskLayoutByKey[firstKey(link.linkedFromTaskKey)] &&
        this.taskLayoutByKey[firstKey(link.linkedToTaskKey)]
    })
  }

  get taskMinWidth() {
    if (typeof this.taskBar.barStyle === 'function') return 4
    const style = this.resolveStyle(this.taskBar.barStyle, {})
    return style.minSize || 4
  }
}

function mergeOptions(base, patch) {
  const baseTaskBar = base.taskBar || {}
  const patchTaskBar = patch.taskBar || {}
  return {
    ...base,
    ...patch,
    taskListTable: {
      ...(base.taskListTable || {}),
      ...(patch.taskListTable || {})
    },
    timelineHeader: {
      ...(base.timelineHeader || {}),
      ...(patch.timelineHeader || {}),
      scales: patch.timelineHeader && patch.timelineHeader.scales
        ? patch.timelineHeader.scales
        : (base.timelineHeader && base.timelineHeader.scales) || []
    },
    taskBar: {
      ...baseTaskBar,
      ...patchTaskBar,
      tooltip: mergeNestedOption(baseTaskBar.tooltip, patchTaskBar.tooltip),
      lanes: patchTaskBar.lanes
        ? patchTaskBar.lanes
        : baseTaskBar.lanes || []
    },
    dependency: {
      ...(base.dependency || {}),
      ...(patch.dependency || {}),
      links: patch.dependency && patch.dependency.links
        ? patch.dependency.links
        : (base.dependency && base.dependency.links) || []
    },
    grid: {
      ...(base.grid || {}),
      ...(patch.grid || {}),
      backgroundRanges: patch.grid && patch.grid.backgroundRanges
        ? patch.grid.backgroundRanges
        : (base.grid && base.grid.backgroundRanges) || [],
      rowBackgroundRanges: patch.grid && patch.grid.rowBackgroundRanges
        ? patch.grid.rowBackgroundRanges
        : (base.grid && base.grid.rowBackgroundRanges) || []
    },
    records: patch.records || base.records || []
  }
}

function mergeNestedOption(base, patch) {
  if (patch === undefined) return base
  if (patch === false || patch === true || patch === null) return patch
  if (typeof patch === 'object' && !Array.isArray(patch)) {
    return {
      ...(typeof base === 'object' && base ? base : {}),
      ...patch
    }
  }
  return patch
}

function applyTimelineStyle(node, style = {}) {
  if (style.backgroundColor) node.style.background = style.backgroundColor
  if (style.color) node.style.color = style.color
  if (style.fontSize) node.style.fontSize = `${style.fontSize}px`
  if (style.fontWeight) node.style.fontWeight = style.fontWeight
  if (style.textAlign) node.style.justifyContent = alignToFlex(style.textAlign)
}

function alignToFlex(value) {
  if (value === 'left' || value === 'start') return 'flex-start'
  if (value === 'right' || value === 'end') return 'flex-end'
  return 'center'
}

function firstKey(value) {
  return Array.isArray(value) ? value[0] : value
}

function el(tag, className = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function svgEl(tag, className = '') {
  const node = document.createElementNS(SVG_NS, tag)
  if (className) node.setAttribute('class', className)
  return node
}

function attrs(node, values) {
  Object.keys(values).forEach(key => {
    if (values[key] !== undefined && values[key] !== null) {
      node.setAttribute(key, values[key])
    }
  })
}

function toTime(value) {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function formatDateTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day} ${hour}:${minute}`
}

function formatLocalDateTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  const second = String(value.getSeconds()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}T${hour}:${minute}:${second}`
}
