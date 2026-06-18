import { toKeyList } from '../utils/list'
import type { DependencySnapshot, GanttKey } from '../types/internal'

export function buildDependencySnapshot(gantt: any): DependencySnapshot {
  const normalizedLinks = []
  const linkKeySet = new Set<string>()
  const linkAdjacencyByTaskKey = Object.create(null)
  const firstLinkGroupByTaskKey = Object.create(null)

  const addAdjacency = (from: GanttKey, to: GanttKey) => {
    if (!linkAdjacencyByTaskKey[from]) linkAdjacencyByTaskKey[from] = []
    if (!linkAdjacencyByTaskKey[to]) linkAdjacencyByTaskKey[to] = []
    linkAdjacencyByTaskKey[from].push(to)
    linkAdjacencyByTaskKey[to].push(from)
  }

  ;(gantt.dependency.links || []).forEach((link: Record<string, any>, linkIndex: number) => {
    const fromKeys = toKeyList(link.from)
    const toKeys = toKeyList(link.to)
    const groupKey = link.id === undefined || link.id === null
      ? `link-${linkIndex}`
      : String(link.id)
    fromKeys.forEach(from => {
      toKeys.forEach(to => {
        if (from === undefined || from === null || to === undefined || to === null) return
        const uniqueKey = `${String(from)}->${String(to)}`
        if (linkKeySet.has(uniqueKey)) return
        linkKeySet.add(uniqueKey)
        const normalized = {
          ...link,
          from,
          to,
          __groupKey: groupKey
        }
        normalizedLinks.push(normalized)
        addAdjacency(from, to)
        if (firstLinkGroupByTaskKey[from] === undefined) firstLinkGroupByTaskKey[from] = groupKey
        if (firstLinkGroupByTaskKey[to] === undefined) firstLinkGroupByTaskKey[to] = groupKey
      })
    })
  })

  return {
    normalizedLinks,
    linkKeySet,
    linkAdjacencyByTaskKey,
    firstLinkGroupByTaskKey
  }
}

export function linkNetworkByTask(gantt: any, taskKey: GanttKey) {
  if (taskKey === undefined || taskKey === null) return null
  const adjacency = gantt.linkAdjacencyByTaskKey
  if (!adjacency[taskKey] || !adjacency[taskKey].length) return null

  const taskKeys = Object.create(null)
  const queue = [taskKey]
  taskKeys[taskKey] = true

  while (queue.length) {
    const current = queue.shift()
    ;(adjacency[current] || []).forEach((nextKey: GanttKey) => {
      if (taskKeys[nextKey]) return
      taskKeys[nextKey] = true
      queue.push(nextKey)
    })
  }

  return {
    key: Object.keys(taskKeys).sort().join('|'),
    taskKeys
  }
}
