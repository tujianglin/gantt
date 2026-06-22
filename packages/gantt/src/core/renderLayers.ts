export interface PatchedTaskRenderResult {
  node: SVGElement
  reused: boolean
}

export function shouldPatchTaskRender(gantt: any): boolean {
  return gantt.virtualScroll && gantt.virtualScroll.patchRender === true
}

export function resetTaskLayerPatch(gantt: any) {
  gantt.taskLayerPatchKeys = new Set<string>()
}

export function clearTaskLayerPatchCache(gantt: any) {
  gantt.taskLayerNodeCache = new Map<string, SVGElement>()
  gantt.taskLayerSignatureCache = new Map<string, string>()
  gantt.taskLayerPatchKeys = new Set<string>()
}

export function pruneTaskLayerPatchCache(gantt: any) {
  const activeKeys: Set<string> = gantt.taskLayerPatchKeys || new Set()
  const nodeCache: Map<string, SVGElement> = gantt.taskLayerNodeCache
  const signatureCache: Map<string, string> = gantt.taskLayerSignatureCache
  if (!nodeCache || !signatureCache) return
  Array.from(nodeCache.keys()).forEach(key => {
    if (activeKeys.has(key)) return
    nodeCache.delete(key)
    signatureCache.delete(key)
  })
}

export function renderTaskWithPatch(gantt: any, task: any, snapshot: any): PatchedTaskRenderResult {
  if (!shouldPatchTaskRender(gantt)) {
    return { node: gantt.renderTask(task), reused: false }
  }

  if (!gantt.taskLayerNodeCache || !gantt.taskLayerSignatureCache) {
    clearTaskLayerPatchCache(gantt)
  }

  const key = taskPatchKey(gantt, task)
  const signature = taskPatchSignature(gantt, task, snapshot)
  if (!key || !signature) {
    return { node: gantt.renderTask(task), reused: false }
  }

  gantt.taskLayerPatchKeys.add(key)
  const cachedNode = gantt.taskLayerNodeCache.get(key)
  const cachedSignature = gantt.taskLayerSignatureCache.get(key)
  if (cachedNode && cachedSignature === signature) {
    return { node: cachedNode, reused: true }
  }

  const node = gantt.renderTask(task)
  gantt.taskLayerNodeCache.set(key, node)
  gantt.taskLayerSignatureCache.set(key, signature)
  return { node, reused: false }
}

function taskPatchKey(gantt: any, task: any): string | null {
  const key = gantt.taskKey(task)
  if (key === undefined || key === null) return null
  return String(key)
}

function taskPatchSignature(gantt: any, task: any, snapshot: any): string | null {
  const hasCustomLayout = typeof gantt.taskBar.customLayout === 'function'
  if (hasCustomLayout && task.version === undefined && task.__denseGroup === undefined) return null

  const layout = gantt.getTaskLayout(task, snapshot)
  const state = [
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    task.version === undefined ? '' : task.version,
    task.__filterMatched ? 1 : 0,
    gantt.isTaskHighlighted(task) ? 1 : 0,
    gantt.isTaskDimmed(task) ? 1 : 0,
    gantt.isTaskDraggable(task) ? 1 : 0
  ]

  if (task.__denseGroup) {
    const group = task.__denseGroup
    state.push(
      group.count || 0,
      group.fill || '',
      group.opacity === undefined ? '' : group.opacity,
      group.className || '',
      group.shape || 'rect'
    )
    const first = group.entries && group.entries[0]
    const last = group.entries && group.entries[group.entries.length - 1]
    if (first) state.push(first.x, first.y, first.width, first.height)
    if (last && last !== first) state.push(last.x, last.y, last.width, last.height)
  }

  return state.join('|')
}
