export function bindDelegatedTaskInteractions(gantt: any, svg: SVGElement) {
  const taskNodeFromEvent = (event: any) => {
    const target = event.target && event.target.closest
      ? event.target.closest('.vg-task-fo[data-task-key]')
      : null
    return target && svg.contains(target) ? target : null
  }
  const taskFromNode = (node: Element | null) => {
    if (!node) return null
    const key = node.getAttribute('data-task-key')
    if (key === undefined || key === null) return null
    const layout = gantt.currentRenderSnapshot && gantt.currentRenderSnapshot.taskLayoutByKey
      ? gantt.currentRenderSnapshot.taskLayoutByKey[key]
      : null
    return layout ? layout.task : gantt.renderTasks.find((item: any) => String(gantt.taskKey(item)) === String(key))
  }

  const onClick = (event: any) => {
    const node = taskNodeFromEvent(event)
    if (!node || event.__vgTaskClickHandled) return
    event.__vgTaskClickHandled = true
    const task = taskFromNode(node)
    if (!task) return
    const taskKey = gantt.taskKey(task)
    if (gantt.suppressClickTaskKey === taskKey && Date.now() < gantt.suppressClickUntil) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    const shouldRender = gantt.activateTaskLinkGroup(task)
    gantt.callTaskCallback('onClick', task, event)
    event.stopImmediatePropagation()
    if (shouldRender) gantt.render()
  }
  const onContextMenu = (event: any) => {
    const node = taskNodeFromEvent(event)
    if (!node || event.__vgTaskContextMenuHandled) return
    event.__vgTaskContextMenuHandled = true
    const task = taskFromNode(node)
    if (!task || typeof gantt.taskBar.onContextMenu !== 'function') return
    event.preventDefault()
    event.stopImmediatePropagation()
    gantt.callTaskCallback('onContextMenu', task, event)
  }
  const onPointerDown = (event: any) => {
    const node = taskNodeFromEvent(event)
    if (!node || event.__vgTaskPointerDownHandled) return
    event.__vgTaskPointerDownHandled = true
    const task = taskFromNode(node)
    if (!task) return
    gantt.startTaskDrag(node, task, event)
  }
  const onMouseOver = (event: any) => {
    const node = taskNodeFromEvent(event)
    if (!node) return
    if (event.relatedTarget && node.contains(event.relatedTarget)) return
    const task = taskFromNode(node)
    if (!task) return
    const taskKey = gantt.taskKey(task)
    if (gantt.hoveredTaskKey === taskKey && gantt.hoveredTaskNode === node) return
    promoteTaskNodeOnHover(gantt, node)
    gantt.hoveredTaskKey = taskKey
    gantt.callTaskCallback('onMouseEnter', task, event)
    gantt.showTaskTooltip(task, event)
  }
  const onMouseMove = (event: any) => {
    if (!gantt.hoveredTaskNode && !taskNodeFromEvent(event)) return
    gantt.positionTaskTooltip(event)
  }
  const onMouseOut = (event: any) => {
    const node = taskNodeFromEvent(event)
    if (!node) return
    if (event.relatedTarget && node.contains(event.relatedTarget)) return
    if (isPointerStillInsideNode(node, event)) return
    const task = taskFromNode(node)
    if (task) gantt.callTaskCallback('onMouseLeave', task, event)
    gantt.hoveredTaskKey = null
    clearTaskNodeHover(gantt, node)
    gantt.hideTaskTooltip()
  }

  svg.addEventListener('click', onClick)
  svg.addEventListener('contextmenu', onContextMenu)
  svg.addEventListener('pointerdown', onPointerDown)
  svg.addEventListener('mouseover', onMouseOver)
  svg.addEventListener('mousemove', onMouseMove)
  svg.addEventListener('mouseout', onMouseOut)
  gantt.virtualDisposers.push(() => {
    svg.removeEventListener('click', onClick)
    svg.removeEventListener('contextmenu', onContextMenu)
    svg.removeEventListener('pointerdown', onPointerDown)
    svg.removeEventListener('mouseover', onMouseOver)
    svg.removeEventListener('mousemove', onMouseMove)
    svg.removeEventListener('mouseout', onMouseOut)
  })
}

function promoteTaskNodeOnHover(gantt: any, node: Element) {
  if (gantt.hoveredTaskNode === node) return
  if (gantt.hoveredTaskNode) clearTaskNodeHover(gantt, gantt.hoveredTaskNode)
  gantt.hoveredTaskNode = node
  if (!gantt.taskBar.hoverBringToFront) return
  node.classList.add('vg-task-fo--hover')
  if (!node.parentNode) return
  ;(node as any).__vgHoverOriginalParent = node.parentNode
  ;(node as any).__vgHoverOriginalNextSibling = node.nextSibling
  node.parentNode.appendChild(node)
}

function clearTaskNodeHover(gantt: any, node: Element) {
  node.classList.remove('vg-task-fo--hover')
  const parent = (node as any).__vgHoverOriginalParent
  const nextSibling = (node as any).__vgHoverOriginalNextSibling
  if (parent && node.parentNode === parent) {
    if (!nextSibling || nextSibling.parentNode === parent) {
      parent.insertBefore(node, nextSibling)
    } else {
      parent.appendChild(node)
    }
  }
  delete (node as any).__vgHoverOriginalParent
  delete (node as any).__vgHoverOriginalNextSibling
  if (gantt.hoveredTaskNode === node) gantt.hoveredTaskNode = null
}

function isPointerStillInsideNode(node: Element, event: MouseEvent) {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return false
  if (event.clientX === undefined || event.clientY === undefined) return false
  const target = document.elementFromPoint(event.clientX, event.clientY)
  return Boolean(target && node.contains(target))
}

export function bindDelegatedLinkConnectorInteractions(gantt: any, svg: SVGElement) {
  const onPointerDown = (event: any) => {
    const target = event.target && event.target.closest
      ? event.target.closest('.vg-link-connector--finish[data-task-key]')
      : null
    if (!target || !svg.contains(target)) return
    const taskKey = target.getAttribute('data-task-key')
    const layout = gantt.currentRenderSnapshot && gantt.currentRenderSnapshot.taskLayoutByKey
      ? gantt.currentRenderSnapshot.taskLayoutByKey[taskKey]
      : null
    const task = layout ? layout.task : gantt.renderTasks.find((item: any) => String(gantt.taskKey(item)) === String(taskKey))
    if (!task) return
    gantt.startLinkCreate(task, 'finish', event)
  }
  svg.addEventListener('pointerdown', onPointerDown)
  gantt.virtualDisposers.push(() => svg.removeEventListener('pointerdown', onPointerDown))
}

export function bindDelegatedLinkInteractions(gantt: any, svg: SVGElement) {
  const linkNodeFromEvent = (event: any) => {
    const target = event.target && event.target.closest
      ? event.target.closest('[data-link-key]')
      : null
    return target && svg.contains(target) ? target : null
  }
  const activate = (event: any) => {
    if (!gantt.dependency.linkSelectable && !gantt.dependency.linkDeletable) return
    const node = linkNodeFromEvent(event)
    if (!node) return
    const linkKey = node.getAttribute('data-link-key')
    const link = gantt.findLinkByKey(linkKey)
    if (!link) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (gantt.activateLink(link, event)) gantt.renderBodySvgContent()
  }
  svg.addEventListener('click', activate)
  svg.addEventListener('contextmenu', activate)
  gantt.virtualDisposers.push(() => {
    svg.removeEventListener('click', activate)
    svg.removeEventListener('contextmenu', activate)
  })
}

export function bindLinkConnector(gantt: any, node: Element, task: any, side: string) {
  if (side !== 'finish') return
  const onPointerDown = (event: any) => gantt.startLinkCreate(task, side, event)
  node.addEventListener('pointerdown', onPointerDown)
  gantt.virtualDisposers.push(() => node.removeEventListener('pointerdown', onPointerDown))
}

export function bindMilestoneInteractions(gantt: any, node: Element, item: any) {
  const onMouseEnter = (event: MouseEvent) => {
    gantt.showMilestoneTooltip(item, event)
  }
  const onMouseMove = (event: MouseEvent) => {
    gantt.positionTaskTooltip(event)
  }
  const onMouseLeave = () => {
    gantt.hideTaskTooltip()
  }
  node.addEventListener('mouseenter', onMouseEnter)
  node.addEventListener('mousemove', onMouseMove)
  node.addEventListener('mouseleave', onMouseLeave)
  gantt.virtualDisposers.push(() => {
    node.removeEventListener('mouseenter', onMouseEnter)
    node.removeEventListener('mousemove', onMouseMove)
    node.removeEventListener('mouseleave', onMouseLeave)
  })
}

export function bindTaskInteractions(gantt: any, node: Element, task: any) {
  if (gantt.isTaskDraggable(task)) {
    node.classList.add('vg-task-fo--draggable')
  }

  const onClick = (event: any) => {
    if (event.__vgTaskClickHandled) return
    event.__vgTaskClickHandled = true
    const taskKey = gantt.taskKey(task)
    if (gantt.suppressClickTaskKey === taskKey && Date.now() < gantt.suppressClickUntil) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const shouldRender = gantt.activateTaskLinkGroup(task)
    gantt.callTaskCallback('onClick', task, event)
    event.stopPropagation()
    if (shouldRender) gantt.render()
  }
  const onContextMenu = (event: any) => {
    if (event.__vgTaskContextMenuHandled) return
    event.__vgTaskContextMenuHandled = true
    if (typeof gantt.taskBar.onContextMenu !== 'function') return
    event.preventDefault()
    gantt.callTaskCallback('onContextMenu', task, event)
  }
  const onMouseEnter = (event: MouseEvent) => {
    const taskKey = gantt.taskKey(task)
    if (gantt.hoveredTaskKey === taskKey && gantt.hoveredTaskNode === node) return
    promoteTaskNodeOnHover(gantt, node)
    gantt.hoveredTaskKey = taskKey
    gantt.callTaskCallback('onMouseEnter', task, event)
    gantt.showTaskTooltip(task, event)
  }
  const onMouseMove = (event: MouseEvent) => {
    gantt.positionTaskTooltip(event)
  }
  const onMouseLeave = (event: MouseEvent) => {
    if (isPointerStillInsideNode(node, event)) return
    gantt.callTaskCallback('onMouseLeave', task, event)
    gantt.hoveredTaskKey = null
    clearTaskNodeHover(gantt, node)
    gantt.hideTaskTooltip()
  }
  const onPointerDown = (event: any) => {
    if (event.__vgTaskPointerDownHandled) return
    event.__vgTaskPointerDownHandled = true
    gantt.startTaskDrag(node, task, event)
  }

  const eventTargets = [node]
  Array.from(node.children || []).forEach(child => eventTargets.push(child))

  eventTargets.forEach(target => {
    target.addEventListener('click', onClick)
    target.addEventListener('contextmenu', onContextMenu)
    target.addEventListener('pointerdown', onPointerDown)
  })
  node.addEventListener('mouseenter', onMouseEnter)
  node.addEventListener('mousemove', onMouseMove)
  node.addEventListener('mouseleave', onMouseLeave)
  gantt.virtualDisposers.push(() => {
    eventTargets.forEach(target => {
      target.removeEventListener('click', onClick)
      target.removeEventListener('contextmenu', onContextMenu)
      target.removeEventListener('pointerdown', onPointerDown)
    })
    node.removeEventListener('mouseenter', onMouseEnter)
    node.removeEventListener('mousemove', onMouseMove)
    node.removeEventListener('mouseleave', onMouseLeave)
  })
}
