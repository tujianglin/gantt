import { el } from '../utils/dom'

export function scheduleTaskForeignObjectMeasure(gantt: any, fo: SVGForeignObjectElement, fallbackHeight: number, task: any = null) {
  const key = task ? gantt.taskKey(task) : null
  const cachedHeight = key !== undefined && key !== null ? gantt.taskMeasuredHeightByKey[key] : null
  if (cachedHeight && cachedHeight > fallbackHeight) {
    fo.setAttribute('height', String(cachedHeight))
    return
  }

  gantt.taskMeasureQueue.push({ fo, fallbackHeight, key })
  if (gantt.taskMeasureFrame) return
  gantt.taskMeasureFrame = requestAnimationFrame(() => {
    gantt.taskMeasureFrame = null
    const queue = gantt.taskMeasureQueue
    gantt.taskMeasureQueue = []
    queue.forEach((item: any) => {
      const content = item.fo.firstElementChild
      if (!(content instanceof HTMLElement)) return

      const rectHeight = content.getBoundingClientRect().height
      const measuredHeight = Math.ceil(Math.max(content.scrollHeight, content.offsetHeight, rectHeight))
      if (item.key !== undefined && item.key !== null) {
        gantt.taskMeasuredHeightByKey[item.key] = measuredHeight
      }
      if (measuredHeight > item.fallbackHeight) {
        item.fo.setAttribute('height', String(measuredHeight))
      }
    })
  })
}

export function showTaskTooltip(gantt: any, task: any, event: MouseEvent) {
  const tooltip = gantt.taskTooltip
  if (!tooltip || tooltip.visible === false) return

  const payload = gantt.createTaskPayload(task, { event })
  const content = gantt.resolveContent(tooltip.customLayout, payload) || gantt.renderDefaultTaskTooltip(payload)
  if (!content) return

  hideTaskTooltip(gantt)
  const node = el('div', `vg-tooltip${tooltip.className ? ` ${tooltip.className}` : ''}`)
  node.append(content)
  document.body.append(node)
  gantt.tooltipEl = node
  gantt.activeTooltip = tooltip
  positionTaskTooltip(gantt, event)
}

export function showMilestoneTooltip(gantt: any, item: any, event: MouseEvent) {
  const tooltip = gantt.milestoneTooltip
  if (!tooltip || tooltip.visible === false) return

  const payload = gantt.createMilestonePayload(item, { event })
  const content = gantt.resolveContent(tooltip.customLayout, payload) || gantt.renderDefaultMilestoneTooltip(payload)
  if (!content) return

  hideTaskTooltip(gantt)
  const node = el('div', `vg-tooltip${tooltip.className ? ` ${tooltip.className}` : ''}`)
  node.append(content)
  document.body.append(node)
  gantt.tooltipEl = node
  gantt.activeTooltip = tooltip
  positionTaskTooltip(gantt, event)
}

export function positionTaskTooltip(gantt: any, event: MouseEvent) {
  if (!gantt.tooltipEl || !event) return
  const tooltip = gantt.activeTooltip || gantt.taskTooltip || {}
  const offsetX = tooltip.offsetX === undefined ? 12 : Number(tooltip.offsetX)
  const offsetY = tooltip.offsetY === undefined ? 12 : Number(tooltip.offsetY)
  const rect = gantt.tooltipEl.getBoundingClientRect()
  const maxLeft = window.innerWidth - rect.width - 8
  const maxTop = window.innerHeight - rect.height - 8
  const left = Math.max(8, Math.min(maxLeft, event.clientX + offsetX))
  const top = Math.max(8, Math.min(maxTop, event.clientY + offsetY))
  gantt.tooltipEl.style.left = `${left}px`
  gantt.tooltipEl.style.top = `${top}px`
}

export function hideTaskTooltip(gantt: any) {
  if (!gantt.tooltipEl) return
  gantt.tooltipEl.remove()
  gantt.tooltipEl = null
  gantt.activeTooltip = null
}
