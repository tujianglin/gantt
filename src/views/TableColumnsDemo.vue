<template>
  <section class="table-demo">
    <div class="table-demo__toolbar">
      <label>
        <span>表格宽度</span>
        <select v-model="tableWidthMode">
          <option value="auto">自动</option>
          <option value="fixed">固定 420</option>
        </select>
      </label>
    </div>
    <div ref="gantt" class="table-demo__chart"></div>
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

export default {
  name: 'TableColumnsDemo',
  data() {
    return {
      tableWidthMode: 'auto',
      gantt: null,
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-01T00:00:00',
        rowHeight: 72,
        taskListTable: {
          tableWidth: 'auto',
          minTableWidth: 260,
          maxTableWidth: 620,
          columnResizable: true,
          headerStyle: {
            backgroundColor: '#eaf3f8',
            color: '#2f4858',
            fontWeight: '700'
          },
          columns: [
            {
              field: 'name',
              title: '资源',
              width: 160,
              minWidth: 120,
              tree: true,
              renderCell: this.renderResourceCell
            },
            {
              field: 'stage',
              title: '工序',
              width: 86,
              minWidth: 70,
              renderHeader: () => '<span class="table-demo__header">工序</span>'
            },
            {
              field: 'load',
              title: '负载',
              width: 100,
              minWidth: 82,
              align: 'right',
              headerAlign: 'right',
              renderCell: this.renderLoadCell
            },
            {
              title: '任务数',
              width: 76,
              minWidth: 68,
              align: 'right',
              headerAlign: 'right',
              valueGetter: ({ row }) => (row.tasks || []).length || ''
            },
            {
              field: 'owner',
              title: '负责人',
              width: 96,
              minWidth: 80,
              headerStyle: { backgroundColor: '#dcecf4' }
            }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f7fbfd',
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' } },
            { unit: 'hour', step: 2, colWidth: 58, rowHeight: 24 }
          ]
        },
        taskBar: {
          labelText: 'title',
          subLabelText: 'subtitle',
          barStyle: ({ taskRecord }) => ({
            barColor: taskRecord.status === 'warning' ? '#ffe4ad' : '#bfe7ff',
            completedBarColor: '#40c51b',
            borderColor: taskRecord.status === 'warning' ? '#e5a735' : '#6bbde8',
            cornerRadius: 2
          })
        },
        records: [
          {
            id: 'heat',
            name: '热处理',
            stage: '分组',
            owner: '王工',
            load: 82,
            expanded: true,
            height: 48,
            children: [
              {
                id: 'heat-1',
                name: '热处理炉 1',
                stage: '热处理',
                owner: '陈工',
                load: 76,
                tasks: [
                  { id: 'table-task-1', title: '工单 HT-001', subtitle: '76%', startDate: '2026-03-30T04:00:00', endDate: '2026-03-30T16:00:00', progress: 76 }
                ]
              },
              {
                id: 'heat-2',
                name: '热处理炉 2',
                stage: '热处理',
                owner: '李工',
                load: 92,
                tasks: [
                  { id: 'table-task-2', title: '工单 HT-002', subtitle: '预警', startDate: '2026-03-30T12:00:00', endDate: '2026-03-31T10:00:00', status: 'warning', progress: 45 }
                ]
              }
            ]
          },
          {
            id: 'outside-1',
            name: '外协加工 1',
            stage: '外协',
            owner: '赵工',
            load: 58,
            tasks: [
              { id: 'table-task-3', title: '工单 WX-001', subtitle: '58%', startDate: '2026-03-30T08:00:00', endDate: '2026-03-31T04:00:00', progress: 58 }
            ]
          }
        ]
      }
    }
  },
  watch: {
    tableWidthMode(value) {
      this.options.taskListTable.tableWidth = value === 'fixed' ? 420 : 'auto'
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
    renderResourceCell({ row, value, expanded }) {
      const toggle = row.children
        ? `<button class="table-demo__toggle" type="button" data-vg-toggle aria-label="${expanded ? '收起' : '展开'}">${expanded ? '▾' : '▸'}</button>`
        : '<span class="table-demo__toggle-spacer"></span>'
      return `
        <div class="table-demo__resource" style="padding-left:${row.level * 14}px">
          ${toggle}
          <span>${escapeHtml(value)}</span>
        </div>
      `
    },
    renderLoadCell({ value }) {
      const load = Number(value) || 0
      const color = load >= 90 ? '#ff4d5a' : load >= 75 ? '#f7a600' : '#40c51b'
      return `
        <div class="table-demo__load">
          <i style="width:${Math.max(0, Math.min(100, load))}%;background:${color}"></i>
          <b style="color:${color}">${load}%</b>
        </div>
      `
    }
  }
}
</script>

<style>
.table-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-demo__toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.table-demo__toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.table-demo__toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.table-demo__chart {
  min-height: 0;
  flex: 1;
}

.table-demo__header {
  color: #2f4858;
}

.table-demo__resource {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #465154;
}

.table-demo__resource span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-demo__toggle,
.table-demo__toggle-spacer {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}

.table-demo__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #819093;
  cursor: pointer;
}

.table-demo__load {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(28px, 1fr) 34px;
  align-items: center;
  gap: 6px;
}

.table-demo__load i {
  display: block;
  height: 3px;
}

.table-demo__load b {
  font-size: 11px;
  font-weight: 600;
  text-align: right;
}
</style>
