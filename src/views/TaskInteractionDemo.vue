<template>
  <section class="interaction-demo">
    <div class="interaction-demo__toolbar">
      <label>
        <span>连接线</span>
        <select v-model="showLinks">
          <option :value="false">点击任务显示</option>
          <option :value="true">默认显示</option>
        </select>
      </label>
      <label>
        <span>Tooltip</span>
        <select v-model="tooltipVisible">
          <option :value="true">开启</option>
          <option :value="false">关闭</option>
        </select>
      </label>
    </div>
    <div class="interaction-demo__body">
      <div ref="gantt" class="interaction-demo__chart"></div>
      <aside class="interaction-demo__log">
        <h3>事件</h3>
        <p v-for="item in logs" :key="item.id">{{ item.text }}</p>
      </aside>
    </div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${day} ${hour}:${minute}`
}

export default {
  name: 'TaskInteractionDemo',
  data() {
    return {
      gantt: null,
      showLinks: false,
      tooltipVisible: true,
      logs: [
        { id: 1, text: '点击任务显示当前任务所在连接组' }
      ],
      logSeed: 1,
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-01T12:00:00',
        rowHeight: 82,
        taskListTable: {
          tableWidth: 220,
          columns: [
            { field: 'name', title: '资源', width: 140, tree: true },
            { field: 'owner', title: '负责人', width: 80 }
          ]
        },
        timelineHeader: {
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' } },
            { unit: 'hour', step: 2, colWidth: 60, rowHeight: 24 }
          ]
        },
        taskBar: {
          customLayout: this.renderTask,
          draggable: ({ task }) => task.locked !== true,
          dragStep: 15 * 60 * 1000,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          },
          onClick: ({ task }) => this.addEvent(`点击 ${task.title}`),
          onContextMenu: ({ task }) => this.addEvent(`右键 ${task.title}`),
          onMouseEnter: ({ task }) => this.addEvent(`移入 ${task.title}`),
          onMouseLeave: ({ task }) => this.addEvent(`移出 ${task.title}`),
          onDragStart: ({ task }) => this.addEvent(`开始拖拽 ${task.title}`),
          onDrag: ({ sourceTask, startDate }) => this.addEvent(`拖拽中 ${sourceTask.title} -> ${formatTime(startDate)}`),
          onDragEnd: ({ sourceTask, startDate, endDate }) => this.addEvent(`拖拽完成 ${sourceTask.title}: ${formatTime(startDate)}-${formatTime(endDate)}`)
        },
        dependency: {
          showLinks: false,
          highlightConnected: true,
          dimOpacity: 0.18,
          linkLineStyle: { lineColor: '#168dff', lineWidth: 2 },
          links: [
            { id: 'flow-a', type: 'finish_to_start', from: 'int-task-1', to: ['int-task-2', 'int-task-3'], color: '#168dff' },
            { id: 'flow-b', type: 'start_to_start', from: 'int-task-4', to: 'int-task-5', color: '#40c51b', dashed: true }
          ]
        },
        records: [
          {
            id: 'line-1',
            name: '产线 1',
            owner: '王工',
            tasks: [
              { id: 'int-task-1', title: '下料', subtitle: '可拖拽', startDate: '2026-03-30T04:00:00', endDate: '2026-03-30T12:00:00', status: 'running', progress: 50 },
              { id: 'int-task-2', title: '热处理', subtitle: '依赖下料', startDate: '2026-03-30T14:00:00', endDate: '2026-03-31T02:00:00', status: 'waiting' },
              { id: 'int-task-3', title: '质检', subtitle: '依赖下料', startDate: '2026-03-31T04:00:00', endDate: '2026-03-31T08:00:00', status: 'normal' }
            ]
          },
          {
            id: 'line-2',
            name: '产线 2',
            owner: '李工',
            tasks: [
              { id: 'int-task-4', title: '粗加工', subtitle: '固定', startDate: '2026-03-30T06:00:00', endDate: '2026-03-30T18:00:00', status: 'locked', locked: true },
              { id: 'int-task-5', title: '外协', subtitle: '虚线依赖', startDate: '2026-03-30T10:00:00', endDate: '2026-03-31T10:00:00', status: 'outside' }
            ]
          }
        ]
      }
    }
  },
  watch: {
    showLinks(value) {
      this.options.dependency.showLinks = value
      this.syncGantt()
    },
    tooltipVisible(value) {
      this.options.taskBar.tooltip.visible = value
      this.syncGantt()
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    syncGantt() {
      if (this.gantt) this.gantt.setOptions(this.options)
    },
    addEvent(text) {
      this.logSeed += 1
      this.logs.unshift({ id: this.logSeed, text })
      this.logs = this.logs.slice(0, 8)
    },
    renderTask({ task, progress }) {
      const progressBar = progress === undefined
        ? ''
        : `<i class="interaction-task__progress" style="width:${Math.max(0, Math.min(100, progress))}%"></i>`
      return `
        <div class="interaction-task interaction-task--${escapeHtml(task.status || 'normal')}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
          <button data-vg-no-drag type="button">查看</button>
          ${progressBar}
        </div>
      `
    },
    renderTooltip({ task, row, startDate, endDate }) {
      return `
        <div class="interaction-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row && row.name)} / ${escapeHtml(task.subtitle)}</span>
          <time>${escapeHtml(formatTime(startDate))} - ${escapeHtml(formatTime(endDate))}</time>
        </div>
      `
    }
  }
}
</script>

<style>
.interaction-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.interaction-demo__toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.interaction-demo__toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.interaction-demo__toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.interaction-demo__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  border: 1px solid #dfe8e8;
}

.interaction-demo__chart {
  min-width: 0;
  min-height: 0;
}

.interaction-demo__log {
  min-width: 0;
  padding: 12px;
  border-left: 1px solid #dfe8e8;
  background: #fff;
  overflow: auto;
}

.interaction-demo__log h3 {
  margin-bottom: 10px;
  color: #314047;
  font-size: 14px;
}

.interaction-demo__log p {
  min-height: 24px;
  color: #5d6b70;
  font-size: 12px;
  line-height: 1.5;
}

.interaction-task {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 7px 10px;
  border: 1px solid #85c8c1;
  background: #dff4f1;
  overflow: hidden;
}

.interaction-task--running {
  background: #a8eee5;
}

.interaction-task--waiting {
  background: #fff0b5;
  border-color: #e5c75f;
}

.interaction-task--outside {
  background: #ecd9ff;
  border-color: #bd94e5;
}

.interaction-task--locked {
  background: #e4e8e9;
  border-color: #c1cccf;
}

.interaction-task strong,
.interaction-task span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interaction-task strong {
  color: #27413e;
  font-size: 13px;
}

.interaction-task span {
  margin-top: 3px;
  color: #64767a;
  font-size: 11px;
}

.interaction-task button {
  position: absolute;
  right: 6px;
  bottom: 6px;
  height: 20px;
  padding: 0 6px;
  border: 1px solid #9fb9bd;
  border-radius: 3px;
  background: #fff;
  color: #526367;
  font-size: 11px;
}

.interaction-task__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background: #40c51b;
}

.interaction-tooltip {
  display: grid;
  gap: 4px;
  min-width: 180px;
  color: #344247;
}

.interaction-tooltip strong {
  font-size: 13px;
}

.interaction-tooltip span,
.interaction-tooltip time {
  color: #68777b;
  font-size: 12px;
}
</style>
