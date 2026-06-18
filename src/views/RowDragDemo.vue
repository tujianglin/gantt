<template>
  <section class="row-drag-page">
    <div class="row-drag-toolbar">
      <span>仅拖动左侧图标可调整同级顺序</span>
      <strong>{{ orderText }}</strong>
    </div>
    <div ref="gantt" class="row-drag-chart"></div>
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

function task(item, startDate, endDate, status = 'task') {
  return {
    id: `${item.id}-task`,
    title: item.name,
    startDate,
    endDate,
    status,
    height: 22,
    offsetY: 8
  }
}

export default {
  name: 'RowDragDemo',
  data() {
    const records = [
      {
        id: 'row-1',
        index: 1,
        name: 'Software Development',
        type: 'group',
        expanded: true,
        tasks: [],
        children: [
          {
            id: 'row-2',
            index: 2,
            name: 'Project Feature Requirements',
            type: 'task',
            tasks: []
          },
          {
            id: 'row-3',
            index: 3,
            name: 'Determine project scope',
            type: 'task',
            muted: true,
            tasks: []
          },
          {
            id: 'row-4',
            index: 4,
            name: 'milestone',
            type: 'milestone',
            tasks: []
          }
        ]
      },
      {
        id: 'row-5',
        index: 5,
        name: 'Scope',
        type: 'group',
        expanded: true,
        tasks: [],
        children: [
          {
            id: 'row-6',
            index: 6,
            name: 'Determine project scope',
            type: 'task',
            tasks: []
          },
          {
            id: 'row-7',
            index: 7,
            name: 'Software Development',
            type: 'task',
            tasks: []
          }
        ]
      },
      {
        id: 'row-8',
        index: 8,
        name: 'Scope',
        type: 'scope',
        tasks: []
      },
      {
        id: 'row-9',
        index: 9,
        name: 'Determine project scope',
        type: 'task',
        tasks: []
      },
      {
        id: 'row-10',
        index: 10,
        name: 'Software Development',
        type: 'task',
        tasks: []
      }
    ]

    const flat = []
    const walk = items => {
      items.forEach(item => {
        flat.push(item)
        if (item.children) walk(item.children)
      })
    }
    walk(records)
    const taskRanges = {
      'row-1': ['2026-03-30T00:00:00', '2026-04-03T00:00:00', 'group'],
      'row-2': ['2026-03-30T02:00:00', '2026-03-30T08:00:00', 'short'],
      'row-3': ['2026-03-30T08:00:00', '2026-03-30T20:00:00', 'short'],
      'row-4': ['2026-03-30T20:00:00', '2026-03-31T04:00:00', 'milestone'],
      'row-5': ['2026-03-30T00:00:00', '2026-04-01T12:00:00', 'scope'],
      'row-6': ['2026-03-30T00:00:00', '2026-04-01T12:00:00', 'done'],
      'row-7': ['2026-03-30T12:00:00', '2026-04-01T12:00:00', 'group'],
      'row-8': ['2026-03-30T18:00:00', '2026-03-31T06:00:00', 'scope'],
      'row-9': ['2026-03-31T06:00:00', '2026-04-01T06:00:00', 'short'],
      'row-10': ['2026-03-30T00:00:00', '2026-04-01T12:00:00', 'group']
    }
    flat.forEach(item => {
      const range = taskRanges[item.id]
      item.tasks = range ? [task(item, range[0], range[1], range[2])] : []
    })

    return {
      gantt: null,
      records,
      orderText: this.formatOrder(records),
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-04T00:00:00',
        rowHeight: 40,
        taskListTable: {
          tableWidth: 250,
          columnResizable: false,
          rowDraggable: true,
          onRowDragEnd: this.handleRowDragEnd,
          headerStyle: {
            backgroundColor: '#eef2f4',
            color: '#3f464a',
            fontWeight: '700'
          },
          columns: [
            { field: 'index', title: '行号', width: 80, renderCell: this.renderIndexCell },
            { field: 'name', title: 'title', width: 170, tree: true, renderCell: this.renderNameCell }
          ]
        },
        timelineHeader: {
          scales: [
            { unit: 'week', step: 1, rowHeight: 22, colWidth: 180, style: { backgroundColor: '#eef2f4', fontWeight: '700' } },
            { unit: 'day', step: 1, colWidth: 52, rowHeight: 22, style: { backgroundColor: '#eef2f4' } }
          ]
        },
        taskBar: {
          customLayout: this.renderTask,
          barStyle: { minSize: 4 }
        },
        markLine: {
          date: '2026-03-31T12:00:00',
          style: { lineColor: '#635bff', lineDash: [6, 4], lineWidth: 1 }
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#e3e9eb' },
          horizontalLine: { lineColor: '#e3e9eb' }
        },
        records
      }
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    formatOrder(records) {
      return records.map(item => item.index).join(' / ')
    },
    handleRowDragEnd({ records }) {
      this.orderText = this.formatOrder(records)
    },
    renderIndexCell({ value }) {
      return `
        <div class="row-index-cell">
          <span class="row-drag-handle" data-vg-row-drag-handle title="拖拽排序">⠿</span>
          <span>${escapeHtml(value)}</span>
        </div>
      `
    },
    renderNameCell({ row, value, expanded }) {
      const arrow = row.children
        ? `<button class="row-tree-toggle" type="button" data-vg-toggle data-vg-no-row-drag>${expanded ? '▾' : '▸'}</button>`
        : row.type === 'scope' || row.type === 'milestone'
          ? '<span class="row-tree-spacer"></span>'
          : '<span class="row-name-arrow">▶</span>'
      return `
        <div class="row-name-cell${row.muted ? ' row-name-cell--muted' : ''}" style="padding-left:${row.level * 16}px">
          ${arrow}
          <span>${escapeHtml(value)}</span>
        </div>
      `
    },
    renderTask({ task }) {
      const label = task.status === 'group' ? 'Software Development 31%' : task.title
      return `
        <div class="row-demo-task row-demo-task--${escapeHtml(task.status || 'task')}">
          <span>${escapeHtml(label)}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.row-drag-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.row-drag-toolbar {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border: 1px solid #d9e4e4;
  border-bottom: 0;
  background: #fff;
  color: #526367;
  font-size: 13px;
}

.row-drag-toolbar strong {
  color: #297bff;
  font-weight: 700;
}

.row-drag-chart {
  min-height: 0;
  flex: 1;
}

.row-drag-chart .vg-table-header-cell {
  color: #f0132f;
  font-size: 16px;
}

.row-index-cell {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4b4f52;
  font-size: 16px;
}

.row-drag-handle {
  color: #7d878b;
  font-size: 16px;
  line-height: 1;
  cursor: grab;
  user-select: none;
}

.row-drag-handle:active {
  cursor: grabbing;
}

.row-name-cell {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #42484c;
  font-size: 16px;
}

.row-name-cell--muted {
  color: #777;
}

.row-name-cell span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-name-arrow,
.row-tree-spacer,
.row-tree-toggle {
  width: 14px;
  height: 18px;
  flex: 0 0 14px;
}

.row-name-arrow {
  color: #6e777b;
  font-size: 11px;
}

.row-tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6e777b;
  font-size: 12px;
  cursor: pointer;
}

.row-demo-task {
  width: 100%;
  height: 100%;
  border: 1px solid #101010;
  border-radius: 11px;
  background: #8ee5dc;
  color: #ff001f;
  overflow: hidden;
}

.row-demo-task span {
  display: block;
  padding: 2px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  line-height: 18px;
}

.row-demo-task--group {
  background: linear-gradient(90deg, #8ee5dc 0 44%, #ef9300 44% 100%);
}

.row-demo-task--scope {
  background: #ef9300;
}

.row-demo-task--done {
  background: #8ee5dc;
}

.row-demo-task--short {
  background: #8ee5dc;
}

.row-demo-task--milestone {
  width: 22px;
  height: 22px;
  margin: 0 auto;
  transform: rotate(45deg);
  border-color: #0b7f31;
  border-radius: 0;
  background: #e00;
}

.row-demo-task--milestone span {
  display: none;
}
</style>
