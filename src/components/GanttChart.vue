<template>
  <div class="gantt" :style="{ '--left-width': `${leftWidth}px` }">
    <div class="gantt-left">
      <div class="left-header" :style="{ height: `${headerHeight}px` }">
        <slot name="table-header">
          <div class="left-title">工位</div>
          <select class="date-select">
            <option>03-31</option>
            <option>04-01</option>
          </select>
        </slot>
      </div>

      <div class="left-body">
        <div
          class="left-body-inner"
          :style="{ height: `${bodyHeight}px`, transform: `translateY(-${scrollTop}px)` }"
        >
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="resource-row"
            :class="{ 'resource-row--group': row.type === 'group' || row.children }"
            :style="{ height: `${row.height || rowHeight}px` }"
          >
            <slot name="row" :row="row" :expanded="isExpanded(row)" :toggle="() => toggleRow(row)">
              <div
                class="resource-name"
                :style="{ paddingLeft: `${row.level * 16}px` }"
                @click="row.children && toggleRow(row)"
              >
                <button v-if="row.children" class="resource-toggle" type="button">
                  {{ isExpanded(row) ? '⌄' : '›' }}
                </button>
                {{ row.name }}
              </div>
              <div v-if="row.load !== undefined" class="resource-load">
                <span>当日负载</span>
                <i :style="{ width: `${row.load}%`, background: loadColor(row.load) }"></i>
                <b :style="{ color: loadColor(row.load) }">{{ row.load }}%</b>
              </div>
            </slot>
          </div>
        </div>
      </div>

      <span class="resize-handle" @mousedown="startResize"></span>
    </div>

    <div class="gantt-right">
      <div class="timeline-viewport" :style="{ height: `${headerHeight}px` }">
        <div
          class="timeline-stage"
          :style="{
            width: `${chartWidth}px`,
            transform: `translateX(-${scrollLeft}px)`
          }"
        >
          <svg
            class="timeline-svg"
            :width="chartWidth"
            :height="headerHeight"
            :viewBox="`0 0 ${chartWidth} ${headerHeight}`"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g class="timeline">
              <foreignObject
                v-for="day in majorUnits"
                :key="day.key"
                :x="day.x"
                y="0"
                :width="day.width"
                :height="dayHeaderHeight"
              >
                <component :is="timelineComponent" :unit="day" />
              </foreignObject>
              <foreignObject
                v-for="hour in minorUnits"
                :key="hour.key"
                :x="hour.x"
                :y="dayHeaderHeight"
                :width="hour.width"
                :height="hourHeaderHeight"
              >
                <component :is="timelineComponent" :unit="hour" />
              </foreignObject>
            </g>
          </svg>
        </div>
      </div>

      <div ref="scroll" class="gantt-scroll" @scroll="onScroll">
        <div class="scroll-stage" :style="{ width: `${chartWidth}px`, minWidth: `${chartWidth}px` }">
          <svg
            class="gantt-svg"
            :width="chartWidth"
            :height="bodyHeight"
            :viewBox="`0 0 ${chartWidth} ${bodyHeight}`"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="diagonal-stripe" patternUnits="userSpaceOnUse" width="8" height="8">
                <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#86ddd4" stroke-width="1" />
              </pattern>
            </defs>

            <g class="grid">
              <rect
                v-for="shade in backgroundShades"
                :key="shade.key"
                :x="shade.x"
                y="0"
                :width="shade.width"
                :height="bodyHeight"
                :fill="shade.fill"
              />
              <rect
                v-for="range in visibleRestRanges"
                :key="range.id"
                :x="timeToX(range.start)"
                y="0"
                :width="durationWidth(range.start, range.end)"
                :height="bodyHeight"
                :fill="range.fill || '#edf1f1'"
                :opacity="range.opacity === undefined ? 1 : range.opacity"
              />
              <line
                v-for="line in verticalLines"
                :key="line.key"
                :x1="line.x"
                y1="0"
                :x2="line.x"
                :y2="bodyHeight"
                stroke="#e8eeee"
              />
              <line
                v-for="line in rowLines"
                :key="line.key"
                x1="0"
                :y1="line.y"
                :x2="chartWidth"
                :y2="line.y"
                stroke="#edf1f2"
              />
              <line
                :x1="nowX"
                y1="0"
                :x2="nowX"
                :y2="bodyHeight"
                stroke="#35cce0"
                stroke-dasharray="4 4"
              />

              <rect
                v-for="block in visibleBlocks"
                :key="block.id"
                :x="timeToX(block.start)"
                :y="rowTop(block.rowId) + block.offsetY"
                :width="durationWidth(block.start, block.end)"
                :height="block.height"
                :fill="block.fill"
                :opacity="block.opacity || 1"
              />

              <rect
                v-for="stripe in stripedTasks"
                :key="`${stripe.id}-stripe`"
                :x="timeToX(stripe.start)"
                :y="taskY(stripe)"
                :width="durationWidth(stripe.start, stripe.end)"
                :height="taskRenderHeight(stripe)"
                fill="url(#diagonal-stripe)"
              />

              <g v-for="link in visibleLinks" :key="link.id">
                <line
                  :x1="timeToX(link.fromTime)"
                  :y1="rowTop(link.fromRowId) + link.fromY"
                  :x2="timeToX(link.toTime)"
                  :y2="rowTop(link.toRowId) + link.toY"
                  :stroke="link.color"
                  :stroke-dasharray="link.dashed ? '5 4' : ''"
                  stroke-width="2"
                />
                <circle :cx="timeToX(link.fromTime)" :cy="rowTop(link.fromRowId) + link.fromY" r="5" :fill="link.color" />
                <circle :cx="timeToX(link.toTime)" :cy="rowTop(link.toRowId) + link.toY" r="5" :fill="link.color" />
              </g>

              <foreignObject
                v-for="task in renderTasks"
                :key="task.id"
                :x="timeToX(task.start)"
                :y="taskY(task)"
                :width="durationWidth(task.start, task.end)"
                :height="taskRenderHeight(task)"
              >
                <component
                  :is="task.component || taskComponent"
                  :task="task"
                  :row="rowById[task.rowId]"
                />
              </foreignObject>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DefaultTask from './DefaultTask.vue'
import DefaultTimelineCell from './DefaultTimelineCell.vue'

const HOUR = 60 * 60 * 1000

export default {
  name: 'GanttChart',
  props: {
    rows: {
      type: Array,
      required: true
    },
    tasks: {
      type: Array,
      default: () => []
    },
    blocks: {
      type: Array,
      default: () => []
    },
    links: {
      type: Array,
      default: () => []
    },
    restRanges: {
      type: Array,
      default: () => []
    },
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    },
    now: {
      type: String,
      default: ''
    },
    pxPerHour: {
      type: Number,
      default: 28
    },
    timeScale: {
      type: Object,
      default: () => ({
        unit: 'hour',
        step: 2,
        pxPerUnit: 56,
        topUnit: 'day'
      })
    },
    rowHeight: {
      type: Number,
      default: 78
    },
    taskHeight: {
      type: Number,
      default: 36
    },
    initialLeftWidth: {
      type: Number,
      default: 170
    },
    taskComponent: {
      type: [Object, String],
      default: () => DefaultTask
    },
    timelineComponent: {
      type: [Object, String],
      default: () => DefaultTimelineCell
    },
    lanes: {
      type: Array,
      default: () => [
        { key: 'plan', offset: 8, height: 36 },
        { key: 'load', offset: 52, height: 6 },
        { key: 'unload', offset: 66, height: 6 }
      ]
    }
  },
  data() {
    return {
      leftWidth: this.initialLeftWidth,
      expandedRows: {},
      scrollTop: 0,
      scrollLeft: 0,
      resizing: false,
      resizeStartX: 0,
      resizeStartWidth: 0,
      dayHeaderHeight: 24,
      hourHeaderHeight: 24
    }
  },
  computed: {
    startTime() {
      return new Date(this.start).getTime()
    },
    endTime() {
      return new Date(this.end).getTime()
    },
    headerHeight() {
      return this.dayHeaderHeight + this.hourHeaderHeight
    },
    bodyHeight() {
      return this.visibleRows.reduce((height, row) => height + (row.height || this.rowHeight), 0)
    },
    totalHeight() {
      return this.headerHeight + this.bodyHeight
    },
    rangeMs() {
      return Math.max(1, this.endTime - this.startTime)
    },
    chartWidth() {
      const rangeWidth = (this.rangeMs / this.scaleMs) * this.scalePx
      return Math.max(1, Math.ceil(rangeWidth))
    },
    normalizedScale() {
      const scale = this.timeScale || {}
      return {
        unit: scale.unit || 'hour',
        step: scale.step || 2,
        pxPerUnit: scale.pxPerUnit || this.pxPerHour * (scale.step || 2),
        topUnit: scale.topUnit || 'day'
      }
    },
    scaleMs() {
      return this.unitToMs(this.normalizedScale.unit) * this.normalizedScale.step
    },
    scalePx() {
      return this.normalizedScale.pxPerUnit
    },
    pxPerMs() {
      return this.scalePx / this.scaleMs
    },
    rowById() {
      return this.flatRows.reduce((map, row) => {
        map[row.id] = row
        return map
      }, {})
    },
    laneByKey() {
      return this.lanes.reduce((map, lane) => {
        map[lane.key] = lane
        return map
      }, {})
    },
    flatRows() {
      const rows = []
      const walk = (items, level = 0) => {
        items.forEach(row => {
          rows.push({ ...row, level })
          if (row.children) walk(row.children, level + 1)
        })
      }
      walk(this.rows)
      return rows
    },
    visibleRows() {
      const rows = []
      const walk = (items, level = 0, parentVisible = true) => {
        if (!parentVisible) return
        items.forEach(row => {
          const normalized = { ...row, level }
          rows.push(normalized)
          if (row.children) {
            walk(row.children, level + 1, this.isExpanded(normalized))
          }
        })
      }
      walk(this.rows)
      return rows
    },
    visibleRowIds() {
      return this.visibleRows.reduce((ids, row) => {
        ids[row.id] = true
        return ids
      }, {})
    },
    majorUnits() {
      return this.createUnits(this.normalizedScale.topUnit)
    },
    minorUnits() {
      return this.createUnits(this.normalizedScale.unit, this.normalizedScale.step)
    },
    verticalLines() {
      return this.minorUnits.map(unit => ({
        key: `line-${unit.key}`,
        x: unit.x
      }))
    },
    rowLines() {
      let top = 0
      return this.visibleRows.map(row => {
        top += row.height || this.rowHeight
        return {
          key: row.id,
          y: top
        }
      })
    },
    nowX() {
      return this.timeToX(this.now || this.start)
    },
    backgroundShades() {
      return this.majorUnits.map(day => ({
        key: `shade-${day.key}`,
        x: day.x,
        width: day.width,
        fill: '#f8fbfb'
      }))
    },
    stripedTasks() {
      return this.renderTasks.filter(task => task.striped)
    },
    renderTasks() {
      return [...this.parentTimelineTasks, ...this.visibleTasks]
    },
    visibleTasks() {
      return this.tasks.filter(task => this.visibleRowIds[task.rowId])
    },
    parentTimelineTasks() {
      const tasks = []

      this.visibleRows.forEach(row => {
        if (!row.children) return
        if (this.isExpanded(row)) return

        const descendantIds = this.getDescendantRowIds(row)
        if (!descendantIds.length) return

        const rowHeight = row.height || this.rowHeight
        const childTasks = this.tasks.filter(task => {
          return descendantIds.includes(task.rowId) && this.isPrimaryTask(task) && this.overlapsRange(task.start, task.end)
        })

        if (!childTasks.length) return

        const start = Math.min(...childTasks.map(task => new Date(task.start).getTime()))
        const end = Math.max(...childTasks.map(task => new Date(task.end).getTime()))
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
          replan: childTasks.some(task => task.replan === 'after') ? 'after' : childTasks.some(task => task.replan === 'before') ? 'before' : undefined,
          height: Math.max(28, rowHeight - 12),
          offsetY: 6,
          parentAggregate: true
        })
      })

      return tasks
    },
    visibleBlocks() {
      return this.blocks.filter(block => this.visibleRowIds[block.rowId] && !this.isExpandedParentRow(block.rowId))
    },
    visibleLinks() {
      return this.links.filter(link => this.visibleRowIds[link.fromRowId] && this.visibleRowIds[link.toRowId])
    },
    visibleRestRanges() {
      return this.restRanges.filter(range => new Date(range.end).getTime() > this.startTime && new Date(range.start).getTime() < this.endTime)
    }
  },
  created() {
    this.seedExpandedRows(this.rows)
  },
  mounted() {
    document.addEventListener('mousemove', this.onResize)
    document.addEventListener('mouseup', this.stopResize)
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.onResize)
    document.removeEventListener('mouseup', this.stopResize)
  },
  methods: {
    timeToX(value) {
      const time = typeof value === 'number' ? value : new Date(value).getTime()
      return (time - this.startTime) * this.pxPerMs
    },
    durationWidth(start, end) {
      return Math.max(4, this.timeToX(end) - this.timeToX(start))
    },
    taskY(task) {
      return this.rowTop(task.rowId) + this.taskOffsetY(task)
    },
    taskOffsetY(task) {
      if (task.summary && task.offsetY !== undefined) {
        return task.offsetY
      }
      if (task.lane && this.laneByKey[task.lane]) {
        return this.laneByKey[task.lane].offset
      }
      return task.offsetY === undefined ? 10 : task.offsetY
    },
    taskRenderHeight(task) {
      if (task.summary && task.height !== undefined) {
        return task.height
      }
      if (task.lane && this.laneByKey[task.lane]) {
        return this.laneByKey[task.lane].height
      }
      return task.height || this.taskHeight
    },
    rowTop(rowId) {
      let top = 0
      for (const row of this.visibleRows) {
        if (row.id === rowId) return top
        top += row.height || this.rowHeight
      }
      return 0
    },
    unitToMs(unit) {
      if (unit === 'year') return 365 * 24 * HOUR
      if (unit === 'month') return 30 * 24 * HOUR
      if (unit === 'week') return 7 * 24 * HOUR
      if (unit === 'day') return 24 * HOUR
      if (unit === 'minute') return 60 * 1000
      return HOUR
    },
    createUnits(unit, step = 1) {
      const units = []
      let cursor = this.floorDate(new Date(this.start), unit)

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
    },
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
    },
    addUnit(date, unit, step = 1) {
      const next = new Date(date)
      if (unit === 'minute') next.setMinutes(next.getMinutes() + step)
      else if (unit === 'hour') next.setHours(next.getHours() + step)
      else if (unit === 'day') next.setDate(next.getDate() + step)
      else if (unit === 'week') next.setDate(next.getDate() + 7 * step)
      else if (unit === 'month') next.setMonth(next.getMonth() + step)
      else if (unit === 'year') next.setFullYear(next.getFullYear() + step)
      return next
    },
    formatUnitLabel(date, unit) {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      if (unit === 'year') return `${date.getFullYear()}`
      if (unit === 'month') return `${date.getFullYear()}-${month}`
      if (unit === 'week') return `${month}-${day}周`
      if (unit === 'day') return `${month}-${day}`
      if (unit === 'minute') return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      return String(date.getHours()).padStart(2, '0')
    },
    seedExpandedRows(rows) {
      rows.forEach(row => {
        if (row.children) {
          this.$set(this.expandedRows, row.id, row.expanded !== false)
          this.seedExpandedRows(row.children)
        }
      })
    },
    isExpanded(row) {
      return row.children ? this.expandedRows[row.id] !== false : false
    },
    toggleRow(row) {
      if (!row.children) return
      this.$set(this.expandedRows, row.id, !this.isExpanded(row))
    },
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
    },
    overlapsRange(start, end) {
      return new Date(end).getTime() > this.startTime && new Date(start).getTime() < this.endTime
    },
    isPrimaryTask(task) {
      if (task.logistics) return false
      if (!task.lane) return true
      return task.lane === 'plan' || task.lane.startsWith('plan-')
    },
    isExpandedParentRow(rowId) {
      const row = this.rowById[rowId]
      return row && row.children && this.isExpanded(row)
    },
    aggregateWorkStatus(tasks) {
      if (tasks.some(task => task.workStatus === 'severe-delay')) return 'severe-delay'
      if (tasks.some(task => task.workStatus === 'slight-delay')) return 'slight-delay'
      if (tasks.every(task => task.workStatus === 'not-started')) return 'not-started'
      return 'progress-normal'
    },
    loadColor(load) {
      if (load >= 90) return '#ff4d5a'
      if (load >= 70) return '#f7a600'
      return '#43c51a'
    },
    startResize(event) {
      this.resizing = true
      this.resizeStartX = event.clientX
      this.resizeStartWidth = this.leftWidth
      event.preventDefault()
    },
    onResize(event) {
      if (!this.resizing) return
      const nextWidth = this.resizeStartWidth + event.clientX - this.resizeStartX
      this.leftWidth = Math.min(360, Math.max(120, nextWidth))
    },
    stopResize() {
      this.resizing = false
    },
    onScroll() {
      this.scrollTop = this.$refs.scroll.scrollTop
      this.scrollLeft = this.$refs.scroll.scrollLeft
      this.$emit('scroll', {
        scrollLeft: this.scrollLeft,
        scrollTop: this.scrollTop
      })
    }
  }
}
</script>

<style scoped>
.gantt {
  display: grid;
  grid-template-columns: var(--left-width) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid #dfe8e8;
  background: #fff;
  color: #2d3d42;
  overflow: hidden;
}

.gantt-left {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #d8e1e1;
  background: #fff;
}

.left-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-bottom: 1px solid #dbe4e4;
  background: #eef5f5;
}

.left-title {
  font-size: 13px;
  font-weight: 700;
  color: #445054;
}

.date-select {
  width: 88px;
  height: 30px;
  border: 1px solid #cfdada;
  border-radius: 2px;
  color: #4d5557;
  background: #fff;
}

.left-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-body-inner {
  will-change: transform;
}

.resource-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 8px;
  border-bottom: 1px solid #edf1f1;
  background: #fff;
}

.resource-row--group {
  background: #fbfdfd;
}

.resource-name {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 18px;
  gap: 4px;
  font-size: 13px;
  color: #465154;
}

.resource-toggle {
  width: 18px;
  height: 18px;
  border: 0;
  background: transparent;
  color: #819093;
  font-size: 18px;
  line-height: 18px;
  cursor: pointer;
}

.resource-load {
  display: grid;
  grid-template-columns: 48px 1fr 34px;
  align-items: center;
  align-self: stretch;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: #96a1a4;
}

.resource-load i {
  display: block;
  height: 3px;
}

.resource-load b {
  font-weight: 500;
  text-align: right;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
}

.resize-handle:hover {
  background: rgba(42, 169, 184, 0.14);
}

.gantt-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #f7fbfb;
}

.timeline-viewport {
  flex: 0 0 auto;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 0 #dbe4e4;
}

.timeline-stage {
  height: 100%;
  will-change: transform;
}

.timeline-svg {
  display: block;
  background: #fff;
}

.gantt-scroll {
  flex: 1;
  overflow: auto;
  min-width: 0;
  min-height: 0;
  background: #f7fbfb;
}

.scroll-stage {
  min-height: 100%;
}

.gantt-svg {
  display: block;
  background: #fff;
}
</style>
