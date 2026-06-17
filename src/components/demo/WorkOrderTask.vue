<template>
  <div
    class="work-task"
    :class="[
      `work-task--${task.status || 'normal'}`,
      `work-task--${task.workStatus || 'progress-normal'}`,
      {
        'work-task--summary': task.summary,
        'work-task--logistics': task.logistics,
        'work-task--completed': task.completed,
        'work-task--predecessor': task.predecessorIncomplete,
        'work-task--before': task.replan === 'before',
        'work-task--after': task.replan === 'after'
      }
    ]"
  >
    <template v-if="!task.logistics">
      <span v-if="!task.summary" class="work-task-dot"></span>
      <div class="work-task-title">{{ task.title }}</div>
      <div class="work-task-meta">
        {{ task.subtitle }}
        <span v-if="task.progress !== undefined">（{{ task.progress }}%）</span>
      </div>
      <div v-if="task.progress !== undefined && !task.summary" class="work-task-progress">
        <i :style="{ width: `${task.progress}%` }"></i>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'WorkOrderTask',
  props: {
    task: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.work-task {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(35, 101, 94, 0.12);
  background: #a8eee5;
  color: #27413e;
  overflow: hidden;
}

.work-task--planned {
  background: #fff0b5;
}

.work-task--blue {
  background: #bfe7ff;
}

.work-task--pink {
  background: #ffd9e8;
}

.work-task--purple {
  background: #ecd9ff;
}

.work-task--predecessor::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  background: #ffe8bd;
}

.work-task--completed {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(41, 164, 154, 0.24) 0,
    rgba(41, 164, 154, 0.24) 2px,
    transparent 2px,
    transparent 8px
  );
}

.work-task--before {
  border: 2px solid #40c51b;
}

.work-task--after {
  border: 2px solid #ff4b55;
}

.work-task-title {
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  line-height: 1.2;
}

.work-task-meta {
  position: relative;
  z-index: 1;
  margin-top: 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  line-height: 1.15;
}

.work-task-meta span {
  color: #41c51b;
}

.work-task-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #40c51b;
}

.work-task--not-started .work-task-dot {
  background: #d8d8d8;
}

.work-task--slight-delay .work-task-dot {
  background: #ffa51d;
}

.work-task--severe-delay .work-task-dot {
  background: #ff4756;
}

.work-task-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  background: #d9d9d9;
}

.work-task-progress i {
  display: block;
  height: 100%;
  background: #40c51b;
}

.work-task--logistics {
  padding: 0;
  border: 0;
  font-size: 0;
}

.work-task--load-done {
  background: #d9d9d9;
}

.work-task--load-running {
  background: #2f9bff;
}

.work-task--load-waiting {
  background: #bfe7ff;
}

.work-task--unload-done {
  background: #969696;
}

.work-task--unload-running {
  background: #9652e6;
}

.work-task--unload-waiting {
  background: #eadbff;
}

.work-task--summary {
  padding: 0 5px;
  opacity: 0.82;
}

.work-task--summary .work-task-title {
  font-size: 10px;
  line-height: 100%;
}

.work-task--summary .work-task-meta,
.work-task--summary .work-task-dot,
.work-task--summary .work-task-progress {
  display: none;
}
</style>
