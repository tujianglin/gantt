<template>
  <section class="context-page" @click="closeMenu">
    <div class="context-toolbar">
      <span>右击任务显示操作菜单</span>
      <strong>{{ message }}</strong>
    </div>
    <div ref="gantt" class="context-chart"></div>
    <div
      v-if="menu.visible"
      class="context-menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button type="button" @click="editTask">编辑</button>
      <button type="button" class="context-menu__danger" @click="deleteTask">删除</button>
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

function createRecords() {
  return [
    {
      id: 'unit-a',
      name: '热处理炉 A',
      owner: '王工',
      tasks: [
        { id: 'ctx-1', title: '工单 A001', subtitle: '待排产', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T10:00:00', status: 'waiting' },
        { id: 'ctx-2', title: '工单 A002', subtitle: '生产中', startDate: '2026-03-30T12:00:00', endDate: '2026-03-31T08:00:00', status: 'running', progress: 45 }
      ]
    },
    {
      id: 'unit-b',
      name: '外协加工 B',
      owner: '李工',
      tasks: [
        { id: 'ctx-3', title: '外协 B001', subtitle: '已下发', startDate: '2026-03-30T06:00:00', endDate: '2026-03-31T02:00:00', status: 'outside' },
        { id: 'ctx-4', title: '外协 B002', subtitle: '待确认', startDate: '2026-03-31T04:00:00', endDate: '2026-04-01T00:00:00', status: 'waiting' }
      ]
    },
    {
      id: 'unit-c',
      name: '总装线 C',
      owner: '赵工',
      tasks: [
        { id: 'ctx-5', title: '总装 C001', subtitle: '锁定', startDate: '2026-03-30T08:00:00', endDate: '2026-03-30T22:00:00', status: 'locked', locked: true }
      ]
    }
  ]
}

export default {
  name: 'ContextMenuDemo',
  data() {
    const records = createRecords()
    return {
      gantt: null,
      records,
      message: '请选择一个任务',
      menu: {
        visible: false,
        x: 0,
        y: 0,
        task: null,
        row: null
      },
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-01T08:00:00',
        taskListTable: {
          tableWidth: 260,
          columns: [
            { field: 'name', title: '资源', width: 160, tree: true },
            { field: 'owner', title: '负责人', width: 100 }
          ]
        },
        timelineHeader: {
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' } },
            { unit: 'hour', step: 2, colWidth: 58, rowHeight: 24 }
          ]
        },
        taskBar: {
          customLayout: this.renderTask,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          },
          onClick: ({ task }) => {
            this.closeMenu()
            this.message = `点击：${task.title}`
          },
          onContextMenu: this.openMenu
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#e4ecef' },
          horizontalLine: { lineColor: '#e2ebee' }
        },
        records
      }
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
    document.addEventListener('scroll', this.closeMenu, true)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
    document.removeEventListener('scroll', this.closeMenu, true)
  },
  methods: {
    openMenu({ task, row, event }) {
      event.preventDefault()
      event.stopPropagation()
      const menuWidth = 128
      const menuHeight = 84
      this.menu = {
        visible: true,
        x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
        y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
        task,
        row
      }
      this.message = `右键：${task.title}`
    },
    closeMenu() {
      if (!this.menu.visible) return
      this.menu.visible = false
    },
    editTask() {
      const task = this.menu.task
      if (!task) return
      task.editing = true
      task.subtitle = '编辑中'
      this.message = `编辑：${task.title}`
      this.closeMenu()
      this.syncGantt()
    },
    deleteTask() {
      const task = this.menu.task
      if (!task) return
      this.removeTaskById(task.id, this.records)
      this.message = `删除：${task.title}`
      this.closeMenu()
      this.syncGantt()
    },
    removeTaskById(taskId, records) {
      records.forEach(record => {
        if (Array.isArray(record.tasks)) {
          record.tasks = record.tasks.filter(task => task.id !== taskId)
        }
        if (record.children) this.removeTaskById(taskId, record.children)
      })
    },
    syncGantt() {
      this.options.records = this.records
      if (this.gantt) this.gantt.setOptions({ records: this.records })
    },
    renderTask({ task, progress }) {
      const progressBar = progress === undefined
        ? ''
        : `<i class="context-task__progress" style="width:${Math.max(0, Math.min(100, progress))}%"></i>`
      return `
        <div class="context-task context-task--${escapeHtml(task.status || 'normal')}${task.editing ? ' context-task--editing' : ''}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
          ${progressBar}
        </div>
      `
    },
    renderTooltip({ task, row, startDate, endDate }) {
      return `
        <div class="context-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row && row.name)}</span>
          <time>${startDate.toLocaleString()} - ${endDate.toLocaleString()}</time>
        </div>
      `
    }
  }
}
</script>

<style>
.context-page {
  position: relative;
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.context-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
  color: #53646b;
  font-size: 13px;
}

.context-toolbar strong {
  color: #176b87;
  font-weight: 700;
}

.context-chart {
  min-height: 0;
  flex: 1;
  border: 1px solid #dfe8e8;
}

.context-menu {
  position: fixed;
  z-index: 40;
  width: 128px;
  padding: 6px;
  border: 1px solid #cdd9dd;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(36, 54, 64, 0.16);
}

.context-menu button {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #31454d;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.context-menu button:hover {
  background: #eef6f7;
}

.context-menu__danger {
  color: #c73535 !important;
}

.context-menu__danger:hover {
  background: #fff0f0 !important;
}

.context-task {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 8px 10px;
  border: 1px solid #8ecbc4;
  border-radius: 4px;
  background: #dff4f1;
  overflow: hidden;
}

.context-task--running {
  background: #a8eee5;
}

.context-task--waiting {
  border-color: #e6c45c;
  background: #fff0b5;
}

.context-task--outside {
  border-color: #b394de;
  background: #eadcff;
}

.context-task--locked {
  border-color: #bec9cd;
  background: #e6eaec;
}

.context-task--editing {
  box-shadow: inset 0 0 0 2px #168dff;
}

.context-task strong,
.context-task span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-task strong {
  color: #263f46;
  font-size: 13px;
}

.context-task span {
  margin-top: 4px;
  color: #607179;
  font-size: 11px;
}

.context-task__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background: #2fba63;
}

.context-tooltip {
  min-width: 220px;
  display: grid;
  gap: 4px;
  color: #33474f;
}

.context-tooltip span,
.context-tooltip time {
  color: #67777d;
  font-size: 12px;
}
</style>
