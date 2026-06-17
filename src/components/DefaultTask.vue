<template>
  <div
    class="task-card"
    :class="[`task-card--${task.status || 'normal'}`, { 'task-card--summary': task.summary }]"
  >
    <div class="task-title">{{ task.title }}</div>
    <div class="task-meta">{{ task.subtitle }}</div>
    <div v-if="task.progress !== undefined" class="task-progress">
      <span :style="{ width: `${task.progress}%` }"></span>
    </div>
    <span v-if="task.locked" class="task-lock">▣</span>
  </div>
</template>

<script>
export default {
  name: 'DefaultTask',
  props: {
    task: {
      type: Object,
      required: true
    },
    row: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.task-card {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 5px 8px;
  border: 1px solid rgba(29, 93, 86, 0.12);
  background: #a7eee6;
  color: #27413e;
  font-size: 12px;
  line-height: 1.25;
  overflow: hidden;
}

.task-card--planned {
  background: #fff1b8;
}

.task-card--warning {
  background: #ffe3e5;
  border-color: #ff5b62;
}

.task-card--selected {
  background: #f7ed9d;
  border: 2px solid #49c419;
}

.task-card--blue {
  background: #bfe8ff;
}

.task-card--load,
.task-card--unload {
  padding: 0;
  border: 0;
  font-size: 0;
}

.task-card--load {
  background: #6eddd8;
}

.task-card--unload {
  background: #45a2ff;
}

.task-card--load .task-title,
.task-card--load .task-meta,
.task-card--unload .task-title,
.task-card--unload .task-meta {
  display: none;
}

.task-card--summary {
  padding: 0 5px;
  border-color: rgba(35, 85, 82, 0.1);
  font-size: 10px;
  line-height: 1;
  opacity: 0.82;
}

.task-card--summary .task-meta,
.task-card--summary .task-progress,
.task-card--summary .task-lock {
  display: none;
}

.task-card--summary .task-title {
  line-height: 100%;
}

.task-title,
.task-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 4px;
  height: 3px;
  background: rgba(255, 255, 255, 0.6);
}

.task-progress span {
  display: block;
  height: 100%;
  background: #20c25f;
}

.task-lock {
  position: absolute;
  right: 5px;
  bottom: 3px;
  color: #615939;
  font-size: 11px;
}
</style>
