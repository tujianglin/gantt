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

  const tooltipKey = `task:${gantt.taskKey(task)}`
  if (gantt.activeTooltipKey === tooltipKey && gantt.tooltipEl) {
    positionTaskTooltip(gantt, event)
    return
  }

  scheduleTooltipShow(gantt, tooltip, tooltipKey, event, () => {
    const payload = gantt.createTaskPayload(task, { event })
    return gantt.resolveContent(tooltip.customLayout, payload) || gantt.renderDefaultTaskTooltip(payload)
  })
}

export function showMilestoneTooltip(gantt: any, item: any, event: MouseEvent) {
  const tooltip = gantt.milestoneTooltip
  if (!tooltip || tooltip.visible === false) return

  const tooltipKey = milestoneTooltipKey(gantt, item)
  if (gantt.activeTooltipKey === tooltipKey && gantt.tooltipEl) {
    positionTaskTooltip(gantt, event)
    return
  }

  scheduleTooltipShow(gantt, tooltip, tooltipKey, event, () => {
    const payload = gantt.createMilestonePayload(item, { event })
    return gantt.resolveContent(tooltip.customLayout, payload) || gantt.renderDefaultMilestoneTooltip(payload)
  })
}

function milestoneTooltipKey(gantt: any, item: any) {
  const taskKey = item.task ? gantt.taskKey(item.task) : ''
  const milestone = item.milestone || {}
  const milestoneKey = milestone.id || milestone.key || gantt.milestoneDate(milestone) || item.index || ''
  return `milestone:${taskKey}:${milestoneKey}:${item.index || 0}`
}

function scheduleTooltipShow(gantt: any, tooltip: any, tooltipKey: string, event: MouseEvent, createContent: () => Node | string | null) {
  clearTooltipShowTimer(gantt)
  positionTaskTooltip(gantt, event)

  const show = () => {
    gantt.tooltipShowTimer = null
    const content = createContent()
    if (!content) return

    const tooltipPosition = gantt.pendingTooltipPosition
    hideTaskTooltip(gantt)
    const node = el('div', `vg-tooltip${tooltip.className ? ` ${tooltip.className}` : ''}`)
    node.append(content)
    document.body.append(node)
    gantt.tooltipEl = node
    gantt.activeTooltip = tooltip
    gantt.activeTooltipKey = tooltipKey
    applyTaskTooltipPosition(gantt, tooltipPosition)
  }

  const delay = Math.max(0, Number(tooltip.showDelay || 0))
  if (delay > 0) {
    gantt.tooltipShowTimer = window.setTimeout(show, delay)
    return
  }
  show()
}

function clearTooltipShowTimer(gantt: any) {
  if (!gantt.tooltipShowTimer) return
  clearTimeout(gantt.tooltipShowTimer)
  gantt.tooltipShowTimer = null
}

export function positionTaskTooltip(gantt: any, event: MouseEvent) {
  if (!event) return
  gantt.pendingTooltipPosition = {
    clientX: event.clientX,
    clientY: event.clientY
  }
  if (!gantt.tooltipEl) return
  if (gantt.tooltipPositionFrame) return

  gantt.tooltipPositionFrame = requestAnimationFrame(() => {
    gantt.tooltipPositionFrame = null
    const position = gantt.pendingTooltipPosition
    gantt.pendingTooltipPosition = null
    applyTaskTooltipPosition(gantt, position)
  })
}

function applyTaskTooltipPosition(gantt: any, position: { clientX: number, clientY: number } | null) {
  if (!gantt.tooltipEl || !position) return
  const tooltip = gantt.activeTooltip || gantt.taskTooltip || {}
  const offsetX = tooltip.offsetX === undefined ? 12 : Number(tooltip.offsetX)
  const offsetY = tooltip.offsetY === undefined ? 12 : Number(tooltip.offsetY)
  const rect = gantt.tooltipEl.getBoundingClientRect()
  const maxLeft = window.innerWidth - rect.width - 8
  const maxTop = window.innerHeight - rect.height - 8
  const left = Math.max(8, Math.min(maxLeft, position.clientX + offsetX))
  const top = Math.max(8, Math.min(maxTop, position.clientY + offsetY))
  gantt.tooltipEl.style.left = `${left}px`
  gantt.tooltipEl.style.top = `${top}px`
}

export function hideTaskTooltip(gantt: any) {
  clearTooltipShowTimer(gantt)
  if (gantt.tooltipPositionFrame) {
    cancelAnimationFrame(gantt.tooltipPositionFrame)
    gantt.tooltipPositionFrame = null
  }
  gantt.pendingTooltipPosition = null
  if (!gantt.tooltipEl) return
  gantt.tooltipEl.remove()
  gantt.tooltipEl = null
  gantt.activeTooltip = null
  gantt.activeTooltipKey = null
}
