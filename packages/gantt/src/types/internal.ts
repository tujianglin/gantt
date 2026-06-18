export type GanttKey = string | number

export interface VirtualWindow {
  xStart: number
  xEnd: number
  timeStart: number
  timeEnd: number
  renderedForLeft: number
}

export interface VirtualRowWindow {
  yStart: number
  yEnd: number
  renderedForTop: number
}

export interface RowEntry {
  row: Record<string, any>
  top: number
  bottom: number
  height: number
}

export interface NormalizedLink {
  from: GanttKey
  to: GanttKey
  __groupKey: string
  [key: string]: any
}

export interface DependencySnapshot {
  normalizedLinks: NormalizedLink[]
  linkKeySet: Set<string>
  linkAdjacencyByTaskKey: Record<string, GanttKey[]>
  firstLinkGroupByTaskKey: Record<string, string>
}

export interface TaskLayout {
  task: Record<string, any>
  start: any
  end: any
  startTime: number
  endTime: number
  x: number
  y: number
  width: number
  height: number
  centerY: number
}

export interface RenderSnapshot {
  xWindow: VirtualWindow
  yWindow: VirtualRowWindow
  renderedRowEntries: RowEntry[]
  renderedRows: Record<string, any>[]
  visibleRowIds: Record<string, boolean>
  rowLines: Array<{ key: any, y: number }>
  verticalLines: Array<{ key: string, x: number, startDate: Date }>
  backgroundShades: Array<{ key: string, x: number, width: number, fill: string }>
  visibleBackgroundRanges: Record<string, any>[]
  visibleRowBackgroundRanges: Record<string, any>[]
  visibleTasks: Record<string, any>[]
  parentTimelineTasks: Record<string, any>[]
  renderTasks: Record<string, any>[]
  stripedTasks: Record<string, any>[]
  visibleMilestones: Record<string, any>[]
  taskLayoutByKey: Record<string, TaskLayout>
  dependencySnapshot: DependencySnapshot
  normalizedLinks: NormalizedLink[]
  linkKeySet: Set<string>
  linkAdjacencyByTaskKey: Record<string, GanttKey[]>
  firstLinkGroupByTaskKey: Record<string, string>
  activeNormalizedLinks: NormalizedLink[]
  visibleLinks: NormalizedLink[]
  connectedTaskKeys: Record<string, boolean>
  markLines: Record<string, any>[]
}
