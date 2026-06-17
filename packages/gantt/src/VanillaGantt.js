import './vanilla-gantt.css'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HOUR = 60 * 60 * 1000

const DEFAULT_OPTIONS = {
  rows: [],
  tasks: [],
  blocks: [],
  links: [],
  restRanges: [],
  start: '',
  end: '',
  now: '',
  rowHeight: 78,
  taskHeight: 36,
  leftWidth: 170,
  minLeftWidth: 120,
  maxLeftWidth: 360,
  dayHeaderHeight: 24,
  hourHeaderHeight: 24,
  timeScale: {
    unit: 'hour',
    step: 2,
    pxPerUnit: 56,
    topUnit: 'day'
  },
  lanes: [
    { key: 'plan', offset: 8, height: 36 },
    { key: 'load', offset: 52, height: 6 },
    { key: 'unload', offset: 66, height: 6 }
  ],
  renderTableHeader: null,
  renderRow: null,
  renderTask: null,
  renderTimeline: null,
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
    this.seedExpandedRows(this.options.rows)
    this.render()
  }

  setOptions(options = {}) {
    const previousRows = this.options.rows
    this.options = mergeOptions(this.options, options)
    if (options.rows && options.rows !== previousRows) {
      this.seedExpandedRows(options.rows, true)
    }
    this.render()
  }

  destroy() {
    this.cleanup()
    this.container.innerHTML = ''
  }

  cleanup() {
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
  }

  render() {
    this.cleanup()

    const root = el('div', 'vg')
    root.style.setProperty('--vg-left-width', `${this.options.leftWidth}px`)

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
    const custom = this.resolveContent(this.options.renderTableHeader, { gantt: this })
    if (custom) {
      header.append(custom)
    } else {
      header.textContent = '工位'
    }
    return header
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
      const custom = this.resolveContent(this.options.renderRow, {
        row,
        expanded: this.isExpanded(row),
        toggle: () => this.toggleRow(row),
        gantt: this
      })

      if (custom) {
        rowEl.append(custom)
      } else {
        rowEl.append(this.renderDefaultRow(row))
      }
      inner.append(rowEl)
    })

    body.append(inner)
    return body
  }

  renderDefaultRow(row) {
    const fragment = document.createDocumentFragment()
    const name = el('div', `vg-row-name${row.children ? ' vg-row-name--toggle' : ''}`)
    name.style.paddingLeft = `${row.level * 16}px`
    if (row.children) {
      const button = el('button', 'vg-row-toggle')
      button.type = 'button'
      button.textContent = this.isExpanded(row) ? '⌄' : '›'
      name.append(button)
      name.addEventListener('click', () => this.toggleRow(row))
    }
    name.append(document.createTextNode(row.name || ''))
    fragment.append(name)

    if (row.load !== undefined) {
      const load = el('div', 'vg-row-load')
      const label = el('span')
      label.textContent = '当日负载'
      const bar = el('i')
      bar.style.width = `${row.load}%`
      bar.style.background = this.loadColor(row.load)
      const value = el('b')
      value.textContent = `${row.load}%`
      value.style.color = this.loadColor(row.load)
      load.append(label, bar, value)
      fragment.append(load)
    }

    return fragment
  }

  renderResizeHandle(root) {
    const handle = el('span', 'vg-resize-handle')
    const onMouseDown = event => {
      const startX = event.clientX
      const startWidth = this.options.leftWidth
      const onMove = moveEvent => {
        const next = startWidth + moveEvent.clientX - startX
        this.options.leftWidth = Math.min(this.options.maxLeftWidth, Math.max(this.options.minLeftWidth, next))
        root.style.setProperty('--vg-left-width', `${this.options.leftWidth}px`)
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

    this.majorUnits.forEach(unit => {
      svg.append(this.renderTimelineUnit(unit, 0, this.options.dayHeaderHeight, true))
    })
    this.minorUnits.forEach(unit => {
      svg.append(this.renderTimelineUnit(unit, this.options.dayHeaderHeight, this.options.hourHeaderHeight, false))
    })

    stage.append(svg)
    viewport.append(stage)
    return viewport
  }

  renderTimelineUnit(unit, y, height, major) {
    const fo = svgEl('foreignObject')
    attrs(fo, {
      x: unit.x,
      y,
      width: unit.width,
      height
    })
    const content = this.resolveContent(this.options.renderTimeline, { unit, major, gantt: this })
    if (content) {
      fo.append(content)
    } else {
      const cell = el('div', `vg-timeline-cell${major ? ' vg-timeline-cell--major' : ''}`)
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
    this.backgroundShades.forEach(shade => {
      svg.append(this.rect(shade.x, 0, shade.width, this.bodyHeight, shade.fill))
    })
    this.visibleRestRanges.forEach(range => {
      const rect = this.rect(this.timeToX(range.start), 0, this.durationWidth(range.start, range.end), this.bodyHeight, range.fill || '#edf1f1')
      rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
      svg.append(rect)
    })
    this.verticalLines.forEach(line => {
      svg.append(this.line(line.x, 0, line.x, this.bodyHeight, '#e8eeee'))
    })
    this.rowLines.forEach(line => {
      svg.append(this.line(0, line.y, this.chartWidth, line.y, '#edf1f2'))
    })

    if (this.options.now) {
      const now = this.line(this.nowX, 0, this.nowX, this.bodyHeight, '#35cce0')
      now.setAttribute('stroke-dasharray', '4 4')
      svg.append(now)
    }

    this.visibleBlocks.forEach(block => {
      const rect = this.rect(
        this.timeToX(block.start),
        this.rowTop(block.rowId) + (block.offsetY || 0),
        this.durationWidth(block.start, block.end),
        block.height || this.options.rowHeight,
        block.fill || '#dcf8c9'
      )
      rect.setAttribute('opacity', block.opacity || 1)
      svg.append(rect)
    })

    this.stripedTasks.forEach(task => {
      const rect = this.rect(
        this.timeToX(task.start),
        this.taskY(task),
        this.durationWidth(task.start, task.end),
        this.taskRenderHeight(task),
        'url(#vg-diagonal-stripe)'
      )
      svg.append(rect)
    })

    this.visibleLinks.forEach(link => {
      const line = this.line(
        this.timeToX(link.fromTime),
        this.rowTop(link.fromRowId) + link.fromY,
        this.timeToX(link.toTime),
        this.rowTop(link.toRowId) + link.toY,
        link.color || '#43c51a'
      )
      line.setAttribute('stroke-width', 2)
      if (link.dashed) line.setAttribute('stroke-dasharray', '5 4')
      svg.append(line)
      svg.append(this.circle(this.timeToX(link.fromTime), this.rowTop(link.fromRowId) + link.fromY, 5, link.color || '#43c51a'))
      svg.append(this.circle(this.timeToX(link.toTime), this.rowTop(link.toRowId) + link.toY, 5, link.color || '#43c51a'))
    })

    this.renderTasks.forEach(task => {
      svg.append(this.renderTask(task))
    })
  }

  renderTask(task) {
    const fo = svgEl('foreignObject')
    attrs(fo, {
      x: this.timeToX(task.start),
      y: this.taskY(task),
      width: this.durationWidth(task.start, task.end),
      height: this.taskRenderHeight(task)
    })

    const row = this.rowById[task.rowId]
    const custom = this.resolveContent(this.options.renderTask, { task, row, gantt: this })
    fo.append(custom || this.renderDefaultTask(task))
    return fo
  }

  renderDefaultTask(task) {
    const root = el('div', `vg-task vg-task--${task.status || 'normal'}`)
    const title = el('div', 'vg-task-title')
    title.textContent = task.title || ''
    const meta = el('div', 'vg-task-meta')
    meta.textContent = task.subtitle || ''
    root.append(title, meta)

    if (task.progress !== undefined) {
      const progress = el('div', 'vg-task-progress')
      const bar = el('i')
      bar.style.width = `${task.progress}%`
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

  resolveContent(renderer, payload) {
    if (typeof renderer !== 'function') return null
    const result = renderer(payload)
    if (result === undefined || result === null) return null
    if (result instanceof Node) return result
    const wrapper = el('div')
    wrapper.innerHTML = String(result)
    return wrapper
  }

  seedExpandedRows(rows, applyExplicit = false) {
    rows.forEach(row => {
      if (row.children) {
        if (applyExplicit && row.expanded !== undefined) {
          this.expandedRows[row.id] = row.expanded !== false
        } else if (this.expandedRows[row.id] === undefined) {
          this.expandedRows[row.id] = row.expanded !== false
        }
        this.seedExpandedRows(row.children, applyExplicit)
      }
    })
  }

  isExpanded(row) {
    return row.children ? this.expandedRows[row.id] !== false : false
  }

  toggleRow(row) {
    if (!row.children) return
    this.expandedRows[row.id] = !this.isExpanded(row)
    this.render()
  }

  timeToX(value) {
    return (toTime(value) - this.startTime) * this.pxPerMs
  }

  durationWidth(start, end) {
    return Math.max(4, this.timeToX(end) - this.timeToX(start))
  }

  rowTop(rowId) {
    let top = 0
    for (const row of this.visibleRows) {
      if (row.id === rowId) return top
      top += row.height || this.options.rowHeight
    }
    return 0
  }

  taskY(task) {
    return this.rowTop(task.rowId) + this.taskOffsetY(task)
  }

  taskOffsetY(task) {
    if (task.summary && task.offsetY !== undefined) return task.offsetY
    if (task.lane && this.laneByKey[task.lane]) return this.laneByKey[task.lane].offset
    return task.offsetY === undefined ? 10 : task.offsetY
  }

  taskRenderHeight(task) {
    if (task.summary && task.height !== undefined) return task.height
    if (task.lane && this.laneByKey[task.lane]) return this.laneByKey[task.lane].height
    return task.height || this.options.taskHeight
  }

  createUnits(unit, step = 1) {
    const units = []
    let cursor = this.floorDate(new Date(this.options.start), unit)
    while (cursor.getTime() < this.endTime) {
      const unitStart = Math.max(cursor.getTime(), this.startTime)
      const next = this.addUnit(cursor, unit, step)
      const unitEnd = Math.min(next.getTime(), this.endTime)
      if (unitEnd > unitStart) {
        units.push({
          type: unit,
          key: `${unit}-${cursor.toISOString()}`,
          label: this.formatUnitLabel(cursor, unit),
          x: this.timeToX(unitStart),
          width: this.durationWidth(unitStart, unitEnd)
        })
      }
      cursor = next
    }
    return units
  }

  floorDate(date, unit) {
    const next = new Date(date)
    next.setSeconds(0, 0)
    if (unit !== 'minute') next.setMinutes(0)
    if (!['minute', 'hour'].includes(unit)) next.setHours(0)
    if (unit === 'week') {
      const day = next.getDay() || 7
      next.setDate(next.getDate() - day + 1)
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

  getDescendantRowIds(row) {
    const ids = []
    const walk = children => {
      children.forEach(child => {
        ids.push(child.id)
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
    if (!task.lane) return true
    return task.lane === 'plan' || task.lane.startsWith('plan-')
  }

  isExpandedParentRow(rowId) {
    const row = this.rowById[rowId]
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

  get startTime() {
    return toTime(this.options.start)
  }

  get endTime() {
    return toTime(this.options.end)
  }

  get headerHeight() {
    return this.options.dayHeaderHeight + this.options.hourHeaderHeight
  }

  get bodyHeight() {
    return this.visibleRows.reduce((height, row) => height + (row.height || this.options.rowHeight), 0)
  }

  get rangeMs() {
    return Math.max(1, this.endTime - this.startTime)
  }

  get normalizedScale() {
    return {
      unit: this.options.timeScale.unit || 'hour',
      step: this.options.timeScale.step || 2,
      pxPerUnit: this.options.timeScale.pxPerUnit || 56,
      topUnit: this.options.timeScale.topUnit || 'day'
    }
  }

  get scaleMs() {
    return this.unitToMs(this.normalizedScale.unit) * this.normalizedScale.step
  }

  get scalePx() {
    return this.normalizedScale.pxPerUnit
  }

  get pxPerMs() {
    return this.scalePx / this.scaleMs
  }

  get chartWidth() {
    return Math.max(1, Math.ceil((this.rangeMs / this.scaleMs) * this.scalePx))
  }

  get flatRows() {
    const rows = []
    const walk = (items, level = 0) => {
      items.forEach(row => {
        rows.push({ ...row, level })
        if (row.children) walk(row.children, level + 1)
      })
    }
    walk(this.options.rows)
    return rows
  }

  get visibleRows() {
    const rows = []
    const walk = (items, level = 0) => {
      items.forEach(row => {
        const normalized = { ...row, level }
        rows.push(normalized)
        if (row.children && this.isExpanded(normalized)) {
          walk(row.children, level + 1)
        }
      })
    }
    walk(this.options.rows)
    return rows
  }

  get visibleRowIds() {
    return this.visibleRows.reduce((ids, row) => {
      ids[row.id] = true
      return ids
    }, {})
  }

  get rowById() {
    return this.flatRows.reduce((map, row) => {
      map[row.id] = row
      return map
    }, {})
  }

  get laneByKey() {
    return this.options.lanes.reduce((map, lane) => {
      map[lane.key] = lane
      return map
    }, {})
  }

  get majorUnits() {
    return this.createUnits(this.normalizedScale.topUnit)
  }

  get minorUnits() {
    return this.createUnits(this.normalizedScale.unit, this.normalizedScale.step)
  }

  get verticalLines() {
    return this.minorUnits.map(unit => ({ key: `line-${unit.key}`, x: unit.x }))
  }

  get rowLines() {
    let top = 0
    return this.visibleRows.map(row => {
      top += row.height || this.options.rowHeight
      return { key: row.id, y: top }
    })
  }

  get nowX() {
    return this.timeToX(this.options.now || this.options.start)
  }

  get backgroundShades() {
    return this.majorUnits.map(unit => ({
      key: `shade-${unit.key}`,
      x: unit.x,
      width: unit.width,
      fill: '#f8fbfb'
    }))
  }

  get renderTasks() {
    return [...this.parentTimelineTasks, ...this.visibleTasks]
  }

  get stripedTasks() {
    return this.renderTasks.filter(task => task.striped)
  }

  get visibleTasks() {
    return this.options.tasks.filter(task => this.visibleRowIds[task.rowId])
  }

  get parentTimelineTasks() {
    const tasks = []
    this.visibleRows.forEach(row => {
      if (!row.children || this.isExpanded(row)) return
      const descendantIds = this.getDescendantRowIds(row)
      const childTasks = this.options.tasks.filter(task => {
        return descendantIds.includes(task.rowId) && this.isPrimaryTask(task) && this.overlapsRange(task.start, task.end)
      })
      if (!childTasks.length) return

      const start = Math.min(...childTasks.map(task => toTime(task.start)))
      const end = Math.max(...childTasks.map(task => toTime(task.end)))
      const progressTasks = childTasks.filter(task => task.progress !== undefined)
      const progress = progressTasks.length
        ? Math.round(progressTasks.reduce((total, task) => total + task.progress, 0) / progressTasks.length)
        : undefined

      tasks.push({
        id: `${row.id}__aggregate`,
        rowId: row.id,
        title: row.name,
        subtitle: `${childTasks.length} 个工单`,
        start,
        end,
        status: childTasks[0].status,
        workStatus: this.aggregateWorkStatus(childTasks),
        progress,
        completed: childTasks.every(task => task.completed),
        predecessorIncomplete: childTasks.some(task => task.predecessorIncomplete),
        height: Math.max(28, (row.height || this.options.rowHeight) - 12),
        offsetY: 6,
        parentAggregate: true
      })
    })
    return tasks
  }

  get visibleBlocks() {
    return this.options.blocks.filter(block => this.visibleRowIds[block.rowId] && !this.isExpandedParentRow(block.rowId))
  }

  get visibleLinks() {
    return this.options.links.filter(link => this.visibleRowIds[link.fromRowId] && this.visibleRowIds[link.toRowId])
  }

  get visibleRestRanges() {
    return this.options.restRanges.filter(range => toTime(range.end) > this.startTime && toTime(range.start) < this.endTime)
  }
}

function mergeOptions(base, patch) {
  return {
    ...base,
    ...patch,
    timeScale: {
      ...(base.timeScale || {}),
      ...(patch.timeScale || {})
    },
    lanes: patch.lanes || base.lanes || [],
    rows: patch.rows || base.rows || [],
    tasks: patch.tasks || base.tasks || [],
    blocks: patch.blocks || base.blocks || [],
    links: patch.links || base.links || [],
    restRanges: patch.restRanges || base.restRanges || []
  }
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
    node.setAttribute(key, values[key])
  })
}

function toTime(value) {
  return typeof value === 'number' ? value : new Date(value).getTime()
}
