<template>
  <div ref="host" class="vanilla-gantt-host"></div>
</template>

<script>
import { VanillaGantt } from '../lib'

export default {
  name: 'VanillaGanttHost',
  props: {
    rows: { type: Array, default: () => [] },
    tasks: { type: Array, default: () => [] },
    blocks: { type: Array, default: () => [] },
    links: { type: Array, default: () => [] },
    restRanges: { type: Array, default: () => [] },
    start: { type: String, required: true },
    end: { type: String, required: true },
    now: { type: String, default: '' },
    timeScale: { type: Object, required: true },
    rowHeight: { type: Number, default: 78 },
    taskHeight: { type: Number, default: 36 },
    initialLeftWidth: { type: Number, default: 170 },
    lanes: { type: Array, default: undefined },
    renderRow: { type: Function, default: null },
    renderTask: { type: Function, default: null },
    renderTimeline: { type: Function, default: null }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.host, this.createOptions())
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  watch: {
    rows: { handler: 'syncOptions', deep: true },
    tasks: { handler: 'syncOptions', deep: true },
    blocks: { handler: 'syncOptions', deep: true },
    links: { handler: 'syncOptions', deep: true },
    restRanges: { handler: 'syncOptions', deep: true },
    start: 'syncOptions',
    end: 'syncOptions',
    now: 'syncOptions',
    timeScale: { handler: 'syncOptions', deep: true },
    rowHeight: 'syncOptions',
    taskHeight: 'syncOptions',
    initialLeftWidth: 'syncOptions',
    lanes: { handler: 'syncOptions', deep: true },
    renderRow: 'syncOptions',
    renderTask: 'syncOptions',
    renderTimeline: 'syncOptions'
  },
  methods: {
    createOptions() {
      return {
        rows: this.rows,
        tasks: this.tasks,
        blocks: this.blocks,
        links: this.links,
        restRanges: this.restRanges,
        start: this.start,
        end: this.end,
        now: this.now,
        timeScale: this.timeScale,
        rowHeight: this.rowHeight,
        taskHeight: this.taskHeight,
        leftWidth: this.initialLeftWidth,
        lanes: this.lanes,
        renderRow: this.renderRow,
        renderTask: this.renderTask,
        renderTimeline: this.renderTimeline
      }
    },
    syncOptions() {
      if (this.gantt) this.gantt.setOptions(this.createOptions())
    }
  }
}
</script>

<style scoped>
.vanilla-gantt-host {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
