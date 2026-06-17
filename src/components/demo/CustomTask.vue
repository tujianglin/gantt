<template>
  <div
    class="custom-task"
    :class="[
      `custom-task--${task.status || 'normal'}`,
      { 'custom-task--late': task.status === 'warning', 'custom-task--summary': task.summary }
    ]"
  >
    <strong>{{ task.title }}</strong>
    <span>{{ task.subtitle }}</span>
  </div>
</template>

<script>
export default {
  name: 'CustomTask',
  props: {
    task: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.custom-task {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border-left: 4px solid #168f87;
  background: #e9fbf7;
  color: #234441;
  box-shadow: inset 0 0 0 1px #a5e4dc;
  overflow: hidden;
}

.custom-task--late {
  border-left-color: #ef4444;
  background: #fff0f1;
  box-shadow: inset 0 0 0 1px #ff9aa0;
}

.custom-task--load,
.custom-task--unload {
  padding: 0;
  border-left: 0;
  box-shadow: none;
  font-size: 0;
}

.custom-task--load {
  background: #6eddd8;
}

.custom-task--unload {
  background: #45a2ff;
}

.custom-task--load strong,
.custom-task--load span,
.custom-task--unload strong,
.custom-task--unload span {
  display: none;
}

.custom-task--summary {
  gap: 0;
  padding: 0 5px;
  border-left-width: 2px;
  opacity: 0.84;
}

.custom-task--summary span {
  display: none;
}

.custom-task strong,
.custom-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-task strong {
  font-size: 12px;
}

.custom-task span {
  font-size: 11px;
  color: #637174;
}

.custom-task--summary strong {
  font-size: 10px;
}
</style>
