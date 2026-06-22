<template>
  <section class="extension-demo">
    <div class="extension-toolbar">
      <label>
        <span>关键词</span>
        <input v-model.trim="query" type="search" placeholder="任务/资源/负责人" @keyup.enter="applyFilter" />
      </label>
      <label>
        <span>状态</span>
        <select v-model="status">
          <option value="">全部</option>
          <option value="ready">待排产</option>
          <option value="running">执行中</option>
          <option value="warning">预警</option>
          <option value="done">已完成</option>
          <option value="outside">外协</option>
        </select>
      </label>
      <button type="button" @click="applyFilter">筛选</button>
      <button type="button" @click="clearFilter">清空</button>
      <button type="button" @click="highlightWarnings">高亮预警</button>
      <button type="button" @click="scrollToRow">定位资源行</button>
      <select v-model="targetRow">
        <option v-for="row in records" :key="row.id" :value="row.id">{{ row.name }}</option>
      </select>
      <strong>{{ message }}</strong>
    </div>

    <div class="extension-body">
      <aside class="extension-results">
        <div class="extension-results__head">
          <strong>结果 {{ filteredTasks.length }}</strong>
          <button type="button" @click="clearHighlight">取消高亮</button>
        </div>
        <button
          v-for="item in filteredTasks"
          :key="item.task.id"
          type="button"
          class="extension-result"
          @click="focusTask(item.task.id)"
        >
          <span>{{ item.task.title }}</span>
          <small>{{ item.row.name }} / {{ item.task.subtitle }}</small>
        </button>
      </aside>
      <div ref="gantt" class="extension-chart"></div>
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

function createTask(id, title, subtitle, startDate, endDate, status, progress) {
  return { id, title, subtitle, startDate, endDate, status, progress }
}

function createRecords() {
  return [
    {
      id: 'ext-line-a',
      name: '总装线 A',
      area: '一车间',
      owner: '周工',
      tasks: [
        createTask('ext-a-1', '结构件备料', 'AX-01', '2026-04-06T08:00:00', '2026-04-06T14:00:00', 'ready', 20),
        createTask('ext-a-2', '总装联调', 'AX-02', '2026-04-06T15:00:00', '2026-04-07T10:00:00', 'running', 58),
        createTask('ext-a-3', '终检放行', 'AX-03', '2026-04-07T12:00:00', '2026-04-07T18:00:00', 'done', 100)
      ]
    },
    {
      id: 'ext-line-b',
      name: '热处理 B',
      area: '二车间',
      owner: '吴工',
      tasks: [
        createTask('ext-b-1', '炉温准备', 'HT-11', '2026-04-06T06:00:00', '2026-04-06T12:00:00', 'done', 100),
        createTask('ext-b-2', '淬火批次', 'HT-12', '2026-04-06T13:00:00', '2026-04-07T03:00:00', 'warning', 42),
        createTask('ext-b-3', '回火保温', 'HT-13', '2026-04-07T05:00:00', '2026-04-07T16:00:00', 'running', 64)
      ]
    },
    {
      id: 'ext-line-c',
      name: '精加工 C',
      area: '三车间',
      owner: '陈工',
      tasks: [
        createTask('ext-c-1', '粗铣定位', 'JC-21', '2026-04-06T09:00:00', '2026-04-06T18:00:00', 'running', 72),
        createTask('ext-c-2', '精磨尺寸', 'JC-22', '2026-04-07T02:00:00', '2026-04-07T14:00:00', 'ready', 0),
        createTask('ext-c-3', '外观复核', 'JC-23', '2026-04-07T16:00:00', '2026-04-08T00:00:00', 'warning', 28)
      ]
    },
    {
      id: 'ext-line-d',
      name: '外协 D',
      area: '供应链',
      owner: '赵工',
      tasks: [
        createTask('ext-d-1', '表面处理', 'WX-31', '2026-04-06T10:00:00', '2026-04-07T08:00:00', 'outside', 35),
        createTask('ext-d-2', '物流回厂', 'WX-32', '2026-04-07T09:00:00', '2026-04-07T20:00:00', 'outside', 10)
      ]
    },
    {
      id: 'ext-line-e',
      name: '包装 E',
      area: '成品区',
      owner: '钱工',
      tasks: [
        createTask('ext-e-1', '包装准备', 'PK-41', '2026-04-07T08:00:00', '2026-04-07T13:00:00', 'ready', 0),
        createTask('ext-e-2', '成品入库', 'PK-42', '2026-04-07T14:00:00', '2026-04-08T02:00:00', 'done', 100)
      ]
    }
  ]
}

export default {
  name: 'FeatureExtensionsDemo',
  data() {
    const records = createRecords()
    return {
      gantt: null,
      query: '',
      status: '',
      targetRow: records[1].id,
      records,
      message: '筛选、定位和高亮扩展 API',
      options: {
        minDate: '2026-04-06T00:00:00',
        maxDate: '2026-04-08T06:00:00',
        rowHeight: 70,
        taskListTable: {
          tableWidth: 300,
          columns: [
            { field: 'name', title: '资源', width: 140 },
            { field: 'area', title: '区域', width: 80 },
            { field: 'owner', title: '负责人', width: 80 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f7fbfd',
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' } },
            { unit: 'hour', step: 2, colWidth: 56, rowHeight: 24 }
          ]
        },
        virtualScroll: {
          enabled: true,
          bufferPx: 600,
          rowEnabled: true,
          rowBufferPx: 240
        },
        scrollbar: {
          alwaysVisible: true,
          width: 12,
          height: 12
        },
        taskBar: {
          customLayout: this.renderTask,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          },
          onClick: ({ task, row }) => {
            this.message = `点击 ${row.name} / ${task.title}`
            this.gantt.setHighlight({ taskKeys: [task.id], rowKeys: [row.id] })
          }
        },
        records
      }
    }
  },
  computed: {
    filteredTasks() {
      const text = this.query.toLowerCase()
      const status = this.status
      const items = []
      this.records.forEach(row => {
        const rowMatched = this.matchesText(row, text)
        row.tasks.forEach(task => {
          const statusMatched = !status || task.status === status
          const textMatched = !text || rowMatched || this.matchesText(task, text)
          if (statusMatched && textMatched) items.push({ row, task })
        })
      })
      return items
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    applyFilter() {
      const filter = {
        text: this.query,
        statuses: this.status ? [this.status] : [],
        includeRowTasksOnMatch: true
      }
      this.gantt.setFilter(filter)
      this.gantt.setHighlight({
        taskKeys: this.filteredTasks.map(item => item.task.id),
        rowKeys: this.filteredTasks.map(item => item.row.id)
      })
      this.message = `筛选结果 ${this.filteredTasks.length} 个任务`
    },
    clearFilter() {
      this.query = ''
      this.status = ''
      this.gantt.clearFilter()
      this.gantt.clearHighlight()
      this.message = '已清空筛选'
    },
    clearHighlight() {
      this.gantt.clearHighlight()
      this.message = '已取消高亮'
    },
    highlightWarnings() {
      const warnings = []
      this.records.forEach(row => {
        row.tasks.forEach(task => {
          if (task.status === 'warning') warnings.push({ row, task })
        })
      })
      this.gantt.setHighlight({
        taskKeys: warnings.map(item => item.task.id),
        rowKeys: warnings.map(item => item.row.id)
      })
      this.message = `高亮 ${warnings.length} 个预警任务`
    },
    focusTask(taskId) {
      const ok = this.gantt.scrollToTask(taskId, { align: 'center', rowAlign: 'center', highlight: true })
      this.message = ok ? `定位任务 ${taskId}` : `任务 ${taskId} 当前不可见`
    },
    scrollToRow() {
      const ok = this.gantt.scrollToRow(this.targetRow, { align: 'center' })
      this.gantt.setHighlight({ rowKeys: [this.targetRow] })
      this.message = ok ? `定位资源 ${this.targetRow}` : `资源 ${this.targetRow} 当前不可见`
    },
    matchesText(record, text) {
      if (!text) return true
      return Object.keys(record).some(key => {
        const value = record[key]
        if (value === undefined || value === null || typeof value === 'object') return false
        return String(value).toLowerCase().includes(text)
      })
    },
    renderTask({ task, progress }) {
      const progressWidth = Math.max(0, Math.min(100, Number(progress) || 0))
      return `
        <div class="extension-task extension-task--${escapeHtml(task.status || 'ready')}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
          <i style="width:${progressWidth}%"></i>
        </div>
      `
    },
    renderTooltip({ task, row, startDate, endDate }) {
      return `
        <div class="extension-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row.name)} / ${escapeHtml(row.owner)}</span>
          <span>${escapeHtml(startDate.toLocaleString())} - ${escapeHtml(endDate.toLocaleString())}</span>
          <span>状态：${escapeHtml(task.status)}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.extension-demo {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
  background: #f4f7f8;
}

.extension-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe6ea;
  border-bottom: 0;
  background: #fff;
}

.extension-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #52656b;
  font-size: 13px;
}

.extension-toolbar input,
.extension-toolbar select,
.extension-toolbar button {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #30444c;
}

.extension-toolbar button {
  cursor: pointer;
}

.extension-toolbar strong {
  color: #176b87;
  font-size: 13px;
}

.extension-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  border: 1px solid #dbe6ea;
  background: #fff;
}

.extension-results {
  min-height: 0;
  overflow: auto;
  border-right: 1px solid #dbe6ea;
  background: #fbfdfd;
}

.extension-results__head {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 1px solid #e5eeee;
}

.extension-results__head strong {
  color: #253f45;
  font-size: 13px;
}

.extension-results__head button {
  height: 26px;
  padding: 0 8px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #52656b;
  cursor: pointer;
}

.extension-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 0;
  border-bottom: 1px solid #e9f0f1;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.extension-result:hover {
  background: #eef8ff;
}

.extension-result span {
  color: #263f45;
  font-size: 13px;
  font-weight: 700;
}

.extension-result small {
  color: #65777d;
  font-size: 12px;
}

.extension-chart {
  min-width: 0;
  min-height: 0;
}

.extension-task {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 7px 8px;
  overflow: hidden;
  border: 1px solid rgba(29, 93, 86, 0.12);
  border-radius: 4px;
  background: #dff4f1;
  color: #24454a;
  font-size: 12px;
}

.extension-task strong,
.extension-task span {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.extension-task span {
  margin-top: 3px;
  color: #5a7076;
}

.extension-task i {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  background: rgba(22, 141, 255, 0.46);
}

.extension-task--running {
  background: #e5f0ff;
}

.extension-task--warning {
  background: #fff0d6;
  border-color: #f3b34f;
}

.extension-task--done {
  background: #e8f5df;
}

.extension-task--outside {
  background: #efe8ff;
}

.extension-tooltip {
  min-width: 230px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
