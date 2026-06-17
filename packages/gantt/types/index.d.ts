export type GanttTimeValue = string | number | Date

export type GanttTimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export interface GanttRecord {
  id?: string | number
  name?: string
  type?: string
  height?: number
  load?: number
  expanded?: boolean
  children?: GanttRecord[]
  tasks?: GanttTaskRecord[]
  [key: string]: unknown
}

export interface GanttTaskRecord {
  id?: string | number
  title?: string
  subtitle?: string
  startDate?: GanttTimeValue
  endDate?: GanttTimeValue
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
  parentAggregate?: boolean
  [key: string]: unknown
}

export interface GanttLane {
  key: string
  offset: number
  height: number
  [key: string]: unknown
}

export interface GanttTimelineDateInfo {
  type: GanttTimeUnit
  unit: GanttTimeUnit
  step: number
  scaleIndex: number
  dateIndex: number
  key: string
  title: string
  label: string
  startDate: Date
  endDate: Date
  days: number
  x: number
  width: number
}

export interface GanttTimelineHeaderStyle {
  backgroundColor?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  textAlign?: 'center' | 'end' | 'left' | 'right' | 'start'
}

export interface GanttTimelineScale {
  rowHeight?: number
  unit: GanttTimeUnit
  step: number
  colWidth?: number
  startOfWeek?: 'sunday' | 'monday'
  visible?: boolean
  style?: GanttTimelineHeaderStyle
  format?: (date: {
    dateIndex: number
    startDate: Date
    endDate: Date
  }) => string
  customLayout?: GanttRenderer<GanttTimelineRenderContext>
}

export interface GanttLineStyle {
  lineColor?: string
  lineWidth?: number
  lineDash?: number[]
}

export interface GanttTaskBarStyle {
  barColor?: string
  completedBarColor?: string
  width?: number
  cornerRadius?: number
  borderWidth?: number
  borderLineWidth?: number
  borderColor?: string
  minSize?: number
}

export interface GanttTableColumn {
  field?: string
  title?: string
  width?: number
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
  align?: 'center' | 'end' | 'left' | 'right' | 'start'
  headerAlign?: 'center' | 'end' | 'left' | 'right' | 'start'
  tree?: boolean
  className?: string
  valueGetter?: (context: GanttCellRenderContext) => unknown
  renderHeader?: GanttRenderer<GanttHeaderCellRenderContext>
  renderCell?: GanttRenderer<GanttCellRenderContext>
  [key: string]: unknown
}

export interface GanttTaskListTableOptions {
  tableWidth?: 'auto' | number
  minTableWidth?: number
  maxTableWidth?: number
  columnResizable?: boolean
  columns?: GanttTableColumn[]
  renderHeader?: GanttRenderer<GanttRenderContext>
  renderCell?: GanttRenderer<GanttCellRenderContext>
}

export interface GanttTimelineHeaderOptions {
  backgroundColor?: string
  colWidth?: number
  scales: GanttTimelineScale[]
  customLayout?: GanttRenderer<GanttTimelineRenderContext>
}

export interface GanttTaskBarOptions {
  tasksField?: string
  startDateField?: string
  endDateField?: string
  progressField?: string
  laneField?: string
  statusField?: string
  labelText?: string | ((taskRecord: GanttTaskRecord) => string)
  subLabelText?: string | ((taskRecord: GanttTaskRecord) => string)
  barStyle?: GanttTaskBarStyle | ((args: GanttTaskBarInteractionContext) => GanttTaskBarStyle)
  projectStyle?: GanttTaskBarStyle | ((args: GanttTaskBarInteractionContext) => GanttTaskBarStyle)
  customLayout?: GanttRenderer<GanttTaskBarCustomLayoutContext>
  clip?: boolean
  lanes?: GanttLane[]
}

export type GanttDependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish'

export interface GanttTaskLink {
  id?: string | number
  type?: GanttDependencyType
  linkedFromTaskKey: string | number | Array<string | number>
  linkedToTaskKey: string | number | Array<string | number>
  linkLineStyle?: GanttLineStyle
  color?: string
  dashed?: boolean
  [key: string]: unknown
}

export interface GanttDependencyOptions {
  links?: GanttTaskLink[]
  linkLineStyle?: GanttLineStyle
  linkCreatable?: boolean
  linkSelectable?: boolean
  linkDeletable?: boolean
}

export interface GanttBackgroundRange {
  id?: string | number
  startDate: GanttTimeValue
  endDate: GanttTimeValue
  color?: string
  fill?: string
  opacity?: number
  [key: string]: unknown
}

export interface GanttRowBackgroundRange extends GanttBackgroundRange {
  recordKey: string | number
  height?: number
  offsetY?: number
}

export interface GanttGridOptions {
  backgroundColor?: string
  alternatingBackgroundColor?: string
  verticalLine?: GanttLineStyle | ((args: GridVerticalLineStyleContext) => GanttLineStyle)
  horizontalLine?: GanttLineStyle | ((args: GridHorizontalLineStyleContext) => GanttLineStyle)
  backgroundRanges?: GanttBackgroundRange[]
  rowBackgroundRanges?: GanttRowBackgroundRange[]
}

export interface GanttMarkLine {
  date: GanttTimeValue
  content?: string
  contentStyle?: {
    color?: string
    fontSize?: number
    fontWeight?: string
  }
  style?: GanttLineStyle
  position?: 'left' | 'right' | 'middle' | 'date'
  scrollToMarkLine?: boolean
}

export interface GanttScrollPayload {
  scrollLeft: number
  scrollTop: number
}

export interface GanttRenderContext {
  gantt: VanillaGantt
}

export interface GanttHeaderCellRenderContext extends GanttRenderContext {
  column: GanttTableColumn
  columnIndex: number
}

export interface GanttCellRenderContext extends GanttRenderContext {
  value: unknown
  record: GanttRecord & { level: number }
  row: GanttRecord & { level: number }
  column: GanttTableColumn
  columnIndex: number
  expanded: boolean
  toggle: () => void
}

export interface GanttTaskBarInteractionContext {
  taskRecord: GanttTaskRecord
  index: number
  startDate: Date
  endDate: Date
  ganttInstance: VanillaGantt
}

export interface GanttTaskBarCustomLayoutContext extends GanttRenderContext {
  taskRecord: GanttTaskRecord
  task: GanttTaskRecord
  rowRecord?: GanttRecord & { level: number }
  row?: GanttRecord & { level: number }
  width: number
  height: number
  startDate: Date
  endDate: Date
  progress?: number
  ganttInstance: VanillaGantt
}

export interface GanttTimelineRenderContext extends GanttRenderContext {
  dateInfo: GanttTimelineDateInfo
  unit: GanttTimelineDateInfo
  scale: GanttTimelineScale
  scaleIndex: number
  major: boolean
}

export interface GridVerticalLineStyleContext {
  index: number
  dateIndex: number
  date?: Date
  ganttInstance: VanillaGantt
}

export interface GridHorizontalLineStyleContext {
  index: number
  ganttInstance: VanillaGantt
}

export type GanttRenderer<T> = (context: T) => Node | string | { rootContainer?: Node } | null | undefined

export interface VanillaGanttOptions {
  records?: GanttRecord[]
  recordKeyField?: string
  taskKeyField?: string
  minDate?: GanttTimeValue
  maxDate?: GanttTimeValue
  rowHeight?: number
  taskHeight?: number
  headerRowHeight?: number
  taskListTable?: GanttTaskListTableOptions
  timelineHeader?: GanttTimelineHeaderOptions
  taskBar?: GanttTaskBarOptions
  dependency?: GanttDependencyOptions
  grid?: GanttGridOptions
  markLine?: GanttMarkLine | GanttMarkLine[] | null
  onScroll?: (payload: GanttScrollPayload) => void
}

declare class VanillaGantt {
  constructor(container: string | HTMLElement, options?: VanillaGanttOptions)
  setOptions(options?: VanillaGanttOptions): void
  destroy(): void
}

export { VanillaGantt }
export default VanillaGantt
