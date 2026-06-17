<template>
  <section class="demo-view">
    <DemoToolbar
      :start="start"
      :end="end"
      :scale-key="scaleKey"
      :scales="scaleOptions"
      @update:start="updateOption('start', $event)"
      @update:end="updateOption('end', $event)"
      @update:scale-key="updateScale($event)"
    />
    <div class="actions">
      <button type="button" @click="collapseFirstGroup">收起第一组</button>
      <button type="button" @click="expandAll">全部展开</button>
      <button type="button" @click="zoomIn">放大刻度</button>
    </div>
    <div ref="gantt" class="vanilla-host"></div>
  </section>
</template>

<script>
import DemoToolbar from '../components/DemoToolbar.vue'
import { createScheduleData } from '../demo/scheduleData'
import { scaleOptions } from '../demo/timeScales'
import { VanillaGantt } from '../lib'

export default {
  name: 'VanillaGanttDemo',
  components: {
    DemoToolbar
  },
  data() {
    const data = createScheduleData()
    return {
      ...data,
      start: '2026-03-30T02:00',
      end: '2026-04-01T18:00',
      scaleKey: '2h',
      scaleOptions,
      gantt: null
    }
  },
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, {
      rows: this.rows,
      tasks: this.tasks,
      blocks: this.blocks,
      links: this.links,
      restRanges: this.restRanges,
      start: this.start,
      end: this.end,
      now: '2026-03-30T12:00',
      timeScale: this.timeScale,
      renderTask: ({ task }) => {
        const node = document.createElement('div')
        node.className = `demo-vanilla-task demo-vanilla-task--${task.status || 'normal'}`
        if (task.status === 'load' || task.status === 'unload') return node

        const title = document.createElement('strong')
        title.textContent = task.title
        const meta = document.createElement('span')
        meta.textContent = task.subtitle || ''
        node.append(title, meta)
        return node
      }
    })
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    updateOption(key, value) {
      this[key] = value
      this.gantt.setOptions({ [key]: value })
    },
    updateScale(value) {
      this.scaleKey = value
      this.gantt.setOptions({ timeScale: this.timeScale })
    },
    collapseFirstGroup() {
      const rows = this.rows.map((row, index) => index === 0 ? { ...row, expanded: false } : row)
      this.rows = rows
      this.gantt.setOptions({ rows })
    },
    expandAll() {
      const expand = rows => rows.map(row => ({
        ...row,
        expanded: true,
        children: row.children ? expand(row.children) : undefined
      }))
      this.rows = expand(this.rows)
      this.gantt.setOptions({ rows: this.rows })
    },
    zoomIn() {
      this.gantt.setOptions({
        timeScale: {
          ...this.timeScale,
          pxPerUnit: this.timeScale.pxPerUnit + 24
        }
      })
    }
  }
}
</script>

<style>
.demo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.actions button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #cfdada;
  border-radius: 3px;
  background: #fff;
  color: #344247;
  cursor: pointer;
}

.vanilla-host {
  min-height: 0;
  flex: 1;
}

.demo-vanilla-task {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border: 1px solid rgba(29, 93, 86, 0.12);
  background: #a7eee6;
  color: #27413e;
  overflow: hidden;
}

.demo-vanilla-task--planned {
  background: #fff1b8;
}

.demo-vanilla-task--warning {
  border-color: #ff5b62;
  background: #ffe3e5;
}

.demo-vanilla-task--selected {
  border: 2px solid #49c419;
  background: #f7ed9d;
}

.demo-vanilla-task--blue {
  background: #bfe8ff;
}

.demo-vanilla-task--load,
.demo-vanilla-task--unload {
  padding: 0;
  border: 0;
}

.demo-vanilla-task--load {
  background: #6eddd8;
}

.demo-vanilla-task--unload {
  background: #45a2ff;
}

.demo-vanilla-task strong,
.demo-vanilla-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-vanilla-task strong {
  font-size: 12px;
}

.demo-vanilla-task span {
  font-size: 11px;
}
</style>
