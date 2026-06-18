export type GanttTimeValue = string | number | Date

export type GanttTimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export type GanttRowHeight = number | 'auto'

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
  draggable?: boolean
  logistics?: boolean
  completed?: boolean
  predecessorIncomplete?: boolean
  replan?: 'before' | 'after' | string
  workStatus?: string
  parentAggregate?: boolean
  milestones?: GanttMilestoneRecord[]
  [key: string]: unknown
}

export interface GanttMilestoneRecord {
  id?: string | number
  title?: string
  date?: GanttTimeValue
  width?: number
  height?: number
  type?: string
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

export interface GanttTableHeaderStyle {
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
  format?: (dateInfo: GanttTimelineDateInfo) => string
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
  height?: number
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
  headerStyle?: GanttTableHeaderStyle
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
  rowDraggable?: boolean | ((context: GanttRowDragContext) => boolean)
  onRowDragEnd?: (context: GanttRowDragEndContext) => void
  headerStyle?: GanttTableHeaderStyle
  columns?: GanttTableColumn[]
  renderHeader?: GanttRenderer<GanttRenderContext>
  renderCell?: GanttRenderer<GanttCellRenderContext>
}

export interface GanttTimelineHeaderOptions {
  backgroundColor?: string
  colWidth?: number
  style?: GanttTimelineHeaderStyle
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
  milestoneField?: string
  milestoneDateField?: string
  labelText?: string | ((taskRecord: GanttTaskRecord) => string)
  subLabelText?: string | ((taskRecord: GanttTaskRecord) => string)
  barStyle?: GanttTaskBarStyle | ((args: GanttTaskBarInteractionContext) => GanttTaskBarStyle)
  projectStyle?: GanttTaskBarStyle | ((args: GanttTaskBarInteractionContext) => GanttTaskBarStyle)
  customLayout?: GanttRenderer<GanttTaskBarCustomLayoutContext>
  milestoneStyle?: GanttMilestoneStyle | ((args: GanttMilestoneCustomLayoutContext) => GanttMilestoneStyle)
  milestoneCustomLayout?: GanttRenderer<GanttMilestoneCustomLayoutContext>
  milestoneTooltip?: boolean | GanttMilestoneTooltipOptions
  clip?: boolean
  draggable?: boolean | ((context: GanttTaskBarCustomLayoutContext) => boolean)
  dragStep?: number
  tooltip?: boolean | GanttTaskBarTooltipOptions
  onClick?: (context: GanttTaskBarEventContext) => void
  onContextMenu?: (context: GanttTaskBarEventContext) => void
  onMouseEnter?: (context: GanttTaskBarEventContext) => void
  onMouseLeave?: (context: GanttTaskBarEventContext) => void
  onDragStart?: (context: GanttTaskBarDragContext) => false | void
  onDrag?: (context: GanttTaskBarDragContext) => void
  onDragEnd?: (context: GanttTaskBarDragContext) => void
  lanes?: GanttLane[]
}

export interface GanttMilestoneStyle {
  width?: number
  height?: number
}

export interface GanttTaskBarTooltipOptions {
  visible?: boolean
  customLayout?: GanttRenderer<GanttTaskBarEventContext>
  className?: string
  offsetX?: number
  offsetY?: number
}

export interface GanttMilestoneTooltipOptions {
  visible?: boolean
  customLayout?: GanttRenderer<GanttMilestoneCustomLayoutContext>
  className?: string
  offsetX?: number
  offsetY?: number
}

export type GanttDependencyType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish'

export interface GanttTaskLink {
  id?: string | number
  type?: GanttDependencyType
  from: string | number | Array<string | number>
  to: string | number | Array<string | number>
  linkLineStyle?: GanttLineStyle
  color?: string
  dashed?: boolean
  [key: string]: unknown
}

export interface GanttDependencyOptions {
  links?: GanttTaskLink[]
  linkLineStyle?: GanttLineStyle
  showLinks?: boolean
  highlightConnected?: boolean
  dimOpacity?: number
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

export interface GanttRowDragContext extends GanttRenderContext {
  record: GanttRecord & { level: number }
  row: GanttRecord & { level: number }
}

export interface GanttRowDragEndContext extends GanttRenderContext {
  record: GanttRecord
  sourceIndex: number
  targetIndex: number
  records: GanttRecord[]
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
  sourceTask?: GanttTaskRecord
  rowRecord?: GanttRecord & { level: number }
  row?: GanttRecord & { level: number }
  taskKey?: string | number
  rowKey?: string | number
  x: number
  y: number
  width: number
  height: number
  startDate: Date
  endDate: Date
  originalStartDate?: Date
  originalEndDate?: Date
  progress?: number
  event?: Event
  ganttInstance: VanillaGantt
}

export interface GanttTaskBarEventContext extends GanttTaskBarCustomLayoutContext {
  event: MouseEvent | PointerEvent
}

export interface GanttTaskBarDragContext extends GanttTaskBarCustomLayoutContext {
  event: PointerEvent
  sourceTask: GanttTaskRecord
  originalStartDate: Date
  originalEndDate: Date
}

export interface GanttMilestoneCustomLayoutContext extends GanttRenderContext {
  milestone: GanttMilestoneRecord
  milestoneRecord: GanttMilestoneRecord
  task: GanttTaskRecord
  taskRecord: GanttTaskRecord
  rowRecord?: GanttRecord & { level: number }
  row?: GanttRecord & { level: number }
  taskKey?: string | number
  rowKey?: string | number
  index: number
  date: Date
  x: number
  y: number
  width: number
  height: number
  event?: Event
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
  rowHeight?: GanttRowHeight
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
