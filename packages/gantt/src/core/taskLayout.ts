import { toTime } from '../utils/time'
import type { RenderSnapshot, TaskLayout } from '../types/internal'

export function createTaskLayoutByKey(gantt: any, renderTasks: Array<Record<string, any>>): Record<string, TaskLayout> {
  return renderTasks.reduce((map, task) => {
    const key = gantt.taskKey(task)
    if (key === undefined || key === null) return map
    const start = gantt.taskStart(task)
    const end = gantt.taskEnd(task)
    const startTime = toTime(start)
    const endTime = toTime(end)
    const y = gantt.taskY(task)
    const height = gantt.taskRenderHeight(task)
    map[key] = {
      task,
      start,
      end,
      startTime,
      endTime,
      x: gantt.timeToX(start),
      y,
      width: gantt.durationWidth(start, end),
      height,
      centerY: y + height / 2
    }
    return map
  }, {})
}

export function getTaskLayout(gantt: any, task: Record<string, any>, snapshot: RenderSnapshot | null = null): TaskLayout {
  const key = gantt.taskKey(task)
  const layout = key !== undefined && key !== null && snapshot && snapshot.taskLayoutByKey
    ? snapshot.taskLayoutByKey[key]
    : null
  if (layout) return layout

  const start = gantt.taskStart(task)
  const end = gantt.taskEnd(task)
  const y = gantt.taskY(task)
  const height = gantt.taskRenderHeight(task)
  return {
    task,
    start,
    end,
    startTime: toTime(start),
    endTime: toTime(end),
    x: gantt.timeToX(start),
    y,
    width: gantt.durationWidth(start, end),
    height,
    centerY: y + height / 2
  }
}
