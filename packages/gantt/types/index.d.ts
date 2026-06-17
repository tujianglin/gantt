export type GanttTimeValue = string | number | Date

export type GanttTimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export interface GanttTimeScale {
  unit?: GanttTimeUnit
  step?: number
  pxPerUnit?: number
  topUnit?: GanttTimeUnit
}

export interface GanttRow {
  id: string
  name?: string
  type?: string
  height?: number
  load?: number
  expanded?: boolean
  children?: GanttRow[]
  [key: string]: unknown
}

export interface GanttTask {
  id: string
  rowId: string
  title?: string
  subtitle?: string
  start: GanttTimeValue
  end: GanttTimeValue
  lane?: string
  status?: string
  height?: number
  offsetY?: number
  progress?: number
  locked?: boolean
  striped?: boolean
  logistics?: boolean
  completed?: boolean
  predecessorIncomplete?: boolean
  replan?: 'before' | 'after' | string
  workStatus?: string
  summary?: boolean
  parentAggregate?: boolean
  [key: string]: unknown
}

export interface GanttBlock {
  id: string
  rowId: string
  start: GanttTimeValue
  end: GanttTimeValue
  fill?: string
  opacity?: number
  height?: number
  offsetY?: number
  [key: string]: unknown
}

export interface GanttLink {
  id: string
  fromRowId: string
  toRowId: string
  fromTime: GanttTimeValue
  toTime: GanttTimeValue
  fromY: number
  toY: number
  color?: string
  dashed?: boolean
  [key: string]: unknown
}

export interface GanttRestRange {
  id: string
  start: GanttTimeValue
  end: GanttTimeValue
  fill?: string
  opacity?: number
  [key: string]: unknown
}

export interface GanttLane {
  key: string
  offset: number
  height: number
  [key: string]: unknown
}

export interface GanttTimelineUnit {
  type: GanttTimeUnit
  key: string
  label: string
  x: number
  width: number
}

export interface GanttScrollPayload {
  scrollLeft: number
  scrollTop: number
}

export interface GanttRenderContext {
  gantt: VanillaGantt
}

export interface GanttRowRenderContext extends GanttRenderContext {
  row: GanttRow & { level: number }
  expanded: boolean
  toggle: () => void
}

export interface GanttTaskRenderContext extends GanttRenderContext {
  task: GanttTask
  row?: GanttRow & { level: number }
}

export interface GanttTimelineRenderContext extends GanttRenderContext {
  unit: GanttTimelineUnit
  major: boolean
}

export type GanttRenderer<T> = (context: T) => Node | string | null | undefined

export interface VanillaGanttOptions {
  rows?: GanttRow[]
  tasks?: GanttTask[]
  blocks?: GanttBlock[]
  links?: GanttLink[]
  restRanges?: GanttRestRange[]
  start?: GanttTimeValue
  end?: GanttTimeValue
  now?: GanttTimeValue
  rowHeight?: number
  taskHeight?: number
  leftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  dayHeaderHeight?: number
  hourHeaderHeight?: number
  timeScale?: GanttTimeScale
  lanes?: GanttLane[]
  renderTableHeader?: GanttRenderer<GanttRenderContext>
  renderRow?: GanttRenderer<GanttRowRenderContext>
  renderTask?: GanttRenderer<GanttTaskRenderContext>
  renderTimeline?: GanttRenderer<GanttTimelineRenderContext>
  onScroll?: (payload: GanttScrollPayload) => void
}

declare class VanillaGantt {
  constructor(container: string | HTMLElement, options?: VanillaGanttOptions)
  setOptions(options?: VanillaGanttOptions): void
  destroy(): void
}

export { VanillaGantt }
export default VanillaGantt
