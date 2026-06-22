import { attrs, svgEl } from '../utils/dom'
import { pruneTaskLayerPatchCache, renderTaskWithPatch, resetTaskLayerPatch } from './renderLayers'

export interface BodyRenderStats {
  nodeCount: number
  taskNodeCount: number
  linkNodeCount: number
  milestoneNodeCount: number
  connectorNodeCount: number
}

export function createBodyRenderStats(): BodyRenderStats {
  return {
    nodeCount: 0,
    taskNodeCount: 0,
    linkNodeCount: 0,
    milestoneNodeCount: 0,
    connectorNodeCount: 0
  }
}

function countElementTree(node: Node | null): number {
  if (!node) return 0
  let count = node.nodeType === Node.ELEMENT_NODE ? 1 : 0
  let child = node.firstChild
  while (child) {
    count += countElementTree(child)
    child = child.nextSibling
  }
  return count
}

function trackNode<T extends Node>(node: T, stats: BodyRenderStats, bucket?: keyof Omit<BodyRenderStats, 'nodeCount'>): T {
  const count = countElementTree(node)
  stats.nodeCount += count
  if (bucket) stats[bucket] += count
  return node
}

function canRenderLink(gantt: any, link: any, snapshot: any): boolean {
  const layoutByKey = snapshot ? snapshot.taskLayoutByKey : gantt.taskLayoutByKey
  return !!(layoutByKey && layoutByKey[link.from] && layoutByKey[link.to])
}

function appendLinkConnectors(gantt: any, parent: Node, snapshot: any, stats: BodyRenderStats) {
  if (!gantt.dependency.linkCreatable) return
  const renderTasks = snapshot ? snapshot.renderTasks : gantt.renderTasks
  const layoutByKey = snapshot ? snapshot.taskLayoutByKey : gantt.taskLayoutByKey
  renderTasks.forEach((task: any) => {
    const key = gantt.taskKey(task)
    const layout = layoutByKey[key]
    if (key === undefined || key === null || !layout) return
    ;['start', 'finish'].forEach(side => {
      if (!gantt.isConnectorAllowed(task, side)) return
      const point = gantt.linkConnectorPoint(layout, side)
      parent.appendChild(trackNode(gantt.renderLinkConnector(task, side, point), stats, 'connectorNodeCount'))
    })
  })
}

export function renderBodySvgContent(gantt: any, svg = gantt.bodySvg) {
  if (!svg) return
  const totalStart = gantt.now()
  gantt.cleanupVirtualContent()
  gantt.applyBodySvgViewport(svg)
  const snapshotStart = gantt.now()
  gantt.currentRenderSnapshot = gantt.buildRenderSnapshot()
  const snapshotEnd = gantt.now()
  const domStart = snapshotEnd
  const renderStats = createBodyRenderStats()
  resetTaskLayerPatch(gantt)
  svg.innerHTML = ''
  svg.append(trackNode(renderDefs(), renderStats))
  if (gantt.shouldSliceBodyRender()) {
    appendGridSliced(gantt, svg, gantt.currentRenderSnapshot, {
      totalStart,
      snapshotStart,
      snapshotEnd,
      domStart,
      renderStats
    })
    return
  }
  appendGrid(gantt, svg, renderStats)
  gantt.bindDelegatedTaskInteractions(svg)
  gantt.bindDelegatedLinkInteractions(svg)
  gantt.bindDelegatedLinkConnectorInteractions(svg)
  const totalEnd = gantt.now()
  gantt.emitBodyRenderPerformance(svg, gantt.currentRenderSnapshot, {
    totalStart,
    snapshotStart,
    snapshotEnd,
    domStart,
    totalEnd,
    sliced: false,
    renderStats
  })
  pruneTaskLayerPatchCache(gantt)
}

export function renderDefs() {
  const defs = svgEl('defs')
  const pattern = svgEl('pattern')
  attrs(pattern, {
    id: 'vg-diagonal-stripe',
    patternUnits: 'userSpaceOnUse',
    width: 8,
    height: 8
  })
  const path = svgEl('path')
  attrs(path, {
    d: 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4',
    stroke: '#86ddd4',
    'stroke-width': 1
  })
  pattern.append(path)
  defs.append(pattern)
  return defs
}

export function appendGrid(gantt: any, svg: SVGElement, renderStats = createBodyRenderStats()) {
  const snapshot = gantt.currentRenderSnapshot || gantt.buildRenderSnapshot()
  const xWindow = gantt.activeVirtualWindow || gantt.virtualWindow
  const yWindow = gantt.activeVirtualRowWindow || gantt.virtualRowWindow
  const viewportWidth = Math.max(1, xWindow.xEnd - xWindow.xStart)
  const viewportHeight = Math.max(1, yWindow.yEnd - yWindow.yStart)
  const fragment = document.createDocumentFragment()

  if (gantt.grid.backgroundColor) {
    fragment.append(trackNode(gantt.rect(xWindow.xStart, yWindow.yStart, viewportWidth, viewportHeight, gantt.grid.backgroundColor), renderStats))
  }

  snapshot.backgroundShades.forEach((shade: any) => {
    fragment.append(trackNode(gantt.rect(shade.x, yWindow.yStart, shade.width, viewportHeight, shade.fill), renderStats))
  })

  snapshot.visibleBackgroundRanges.forEach((range: any) => {
    const rect = gantt.rect(
      gantt.timeToX(range.startDate),
      yWindow.yStart,
      gantt.durationWidth(range.startDate, range.endDate),
      viewportHeight,
      range.color || range.fill || '#edf1f1'
    )
    rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
    fragment.append(trackNode(rect, renderStats))
  })

  snapshot.verticalLines.forEach((item: any, index: number) => {
    const style = gantt.resolveStyle(gantt.grid.verticalLine, { index, dateIndex: index, date: item.startDate, ganttInstance: gantt })
    const line = gantt.line(item.x, yWindow.yStart, item.x, yWindow.yEnd, style.lineColor || '#e8eeee')
    gantt.applyLineStyle(line, style)
    fragment.append(trackNode(line, renderStats))
  })

  snapshot.rowLines.forEach((item: any, index: number) => {
    const style = gantt.resolveStyle(gantt.grid.horizontalLine, { index, ganttInstance: gantt })
    const line = gantt.line(xWindow.xStart, item.y, xWindow.xEnd, item.y, style.lineColor || '#edf1f2')
    gantt.applyLineStyle(line, style)
    fragment.append(trackNode(line, renderStats))
  })

  snapshot.markLines.forEach((markLine: any) => {
    gantt.appendMarkLine(fragment, markLine)
    renderStats.nodeCount += markLine.content ? 2 : 1
  })

  snapshot.visibleRowBackgroundRanges.forEach((range: any) => {
    const rect = gantt.rect(
      gantt.timeToX(range.startDate),
      gantt.rowTop(range.recordKey) + (range.offsetY || 0),
      gantt.durationWidth(range.startDate, range.endDate),
      range.height || gantt.rowHeight(gantt.rowById[range.recordKey] || {}),
      range.color || range.fill || '#dcf8c9'
    )
    rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
    fragment.append(trackNode(rect, renderStats))
  })

  snapshot.stripedTasks.forEach((task: any) => {
    const layout = gantt.getTaskLayout(task, snapshot)
    const rect = gantt.rect(
      layout.x,
      layout.y,
      layout.width,
      layout.height,
      'url(#vg-diagonal-stripe)'
    )
    fragment.append(trackNode(rect, renderStats))
  })

  snapshot.renderTasks.forEach((task: any) => {
    const result = renderTaskWithPatch(gantt, task, snapshot)
    fragment.append(trackNode(result.node, renderStats, 'taskNodeCount'))
  })

  snapshot.visibleMilestones.forEach((item: any) => {
    fragment.append(trackNode(gantt.renderMilestone(item), renderStats, 'milestoneNodeCount'))
  })

  snapshot.visibleLinks.forEach((link: any) => {
    if (canRenderLink(gantt, link, snapshot)) renderStats.nodeCount += 3
    if (canRenderLink(gantt, link, snapshot)) renderStats.linkNodeCount += 3
    gantt.appendLink(fragment, link, snapshot)
  })

  appendLinkConnectors(gantt, fragment, snapshot, renderStats)
  svg.append(fragment)
  pruneTaskLayerPatchCache(gantt)
  return renderStats
}

export function appendGridSliced(gantt: any, svg: SVGElement, snapshot: any, metrics: any) {
  const token = gantt.bodyRenderToken
  const renderStats = metrics.renderStats || createBodyRenderStats()
  const xWindow = snapshot.xWindow
  const yWindow = snapshot.yWindow
  const viewportWidth = Math.max(1, xWindow.xEnd - xWindow.xStart)
  const viewportHeight = Math.max(1, yWindow.yEnd - yWindow.yStart)
  const runners: Array<(deadline: number) => boolean> = []

  const addRunner = (items: any[], appendItem: (item: any, index: number) => void) => {
    let index = 0
    runners.push((deadline: number) => {
      while (index < items.length) {
        appendItem(items[index], index)
        index += 1
        if (gantt.now() >= deadline) return false
      }
      return true
    })
  }

  if (gantt.grid.backgroundColor) {
    runners.push(() => {
      svg.append(trackNode(gantt.rect(xWindow.xStart, yWindow.yStart, viewportWidth, viewportHeight, gantt.grid.backgroundColor), renderStats))
      return true
    })
  }

  addRunner(snapshot.backgroundShades, (shade: any) => {
    svg.append(trackNode(gantt.rect(shade.x, yWindow.yStart, shade.width, viewportHeight, shade.fill), renderStats))
  })

  addRunner(snapshot.visibleBackgroundRanges, (range: any) => {
    const rect = gantt.rect(
      gantt.timeToX(range.startDate),
      yWindow.yStart,
      gantt.durationWidth(range.startDate, range.endDate),
      viewportHeight,
      range.color || range.fill || '#edf1f1'
    )
    rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
    svg.append(trackNode(rect, renderStats))
  })

  addRunner(snapshot.verticalLines, (item: any, index: number) => {
    const style = gantt.resolveStyle(gantt.grid.verticalLine, { index, dateIndex: index, date: item.startDate, ganttInstance: gantt })
    const line = gantt.line(item.x, yWindow.yStart, item.x, yWindow.yEnd, style.lineColor || '#e8eeee')
    gantt.applyLineStyle(line, style)
    svg.append(trackNode(line, renderStats))
  })

  addRunner(snapshot.rowLines, (item: any, index: number) => {
    const style = gantt.resolveStyle(gantt.grid.horizontalLine, { index, ganttInstance: gantt })
    const line = gantt.line(xWindow.xStart, item.y, xWindow.xEnd, item.y, style.lineColor || '#edf1f2')
    gantt.applyLineStyle(line, style)
    svg.append(trackNode(line, renderStats))
  })

  addRunner(snapshot.markLines, (markLine: any) => {
    gantt.appendMarkLine(svg, markLine)
    renderStats.nodeCount += markLine.content ? 2 : 1
  })

  addRunner(snapshot.visibleRowBackgroundRanges, (range: any) => {
    const rect = gantt.rect(
      gantt.timeToX(range.startDate),
      gantt.rowTop(range.recordKey) + (range.offsetY || 0),
      gantt.durationWidth(range.startDate, range.endDate),
      range.height || gantt.rowHeight(gantt.rowById[range.recordKey] || {}),
      range.color || range.fill || '#dcf8c9'
    )
    rect.setAttribute('opacity', range.opacity === undefined ? 1 : range.opacity)
    svg.append(trackNode(rect, renderStats))
  })

  addRunner(snapshot.stripedTasks, (task: any) => {
    const layout = gantt.getTaskLayout(task, snapshot)
    svg.append(trackNode(gantt.rect(layout.x, layout.y, layout.width, layout.height, 'url(#vg-diagonal-stripe)'), renderStats))
  })

  addRunner(snapshot.renderTasks, (task: any) => {
    const result = renderTaskWithPatch(gantt, task, snapshot)
    svg.append(trackNode(result.node, renderStats, 'taskNodeCount'))
  })

  addRunner(snapshot.visibleMilestones, (item: any) => {
    svg.append(trackNode(gantt.renderMilestone(item), renderStats, 'milestoneNodeCount'))
  })

  addRunner(snapshot.visibleLinks, (link: any) => {
    if (canRenderLink(gantt, link, snapshot)) renderStats.nodeCount += 3
    if (canRenderLink(gantt, link, snapshot)) renderStats.linkNodeCount += 3
    gantt.appendLink(svg, link, snapshot)
  })

  runners.push(() => {
    appendLinkConnectors(gantt, svg, snapshot, renderStats)
    return true
  })

  let runnerIndex = 0
  const run = () => {
    if (token !== gantt.bodyRenderToken) return
    const deadline = gantt.now() + gantt.bodyRenderSliceBudget
    while (runnerIndex < runners.length) {
      const done = runners[runnerIndex](deadline)
      if (!done || gantt.now() >= deadline) break
      runnerIndex += 1
    }
    if (runnerIndex < runners.length) {
      gantt.bodyRenderFrame = requestAnimationFrame(run)
      return
    }

    gantt.bodyRenderFrame = null
    gantt.bindDelegatedTaskInteractions(svg)
    gantt.bindDelegatedLinkInteractions(svg)
    gantt.bindDelegatedLinkConnectorInteractions(svg)
    gantt.emitBodyRenderPerformance(svg, snapshot, {
      ...metrics,
      totalEnd: gantt.now(),
      sliced: true,
      renderStats
    })
    if (gantt.pendingHideLoadingAfterBodyRender) {
      gantt.pendingHideLoadingAfterBodyRender = false
      gantt.hideLoadingFrame = requestAnimationFrame(() => {
        gantt.hideLoadingFrame = null
        gantt.hideLoading()
      })
    }
    if (gantt.customScrollbarUpdater) gantt.customScrollbarUpdater()
    pruneTaskLayerPatchCache(gantt)
  }

  gantt.bodyRenderFrame = requestAnimationFrame(run)
  return renderStats
}
