export const DEFAULT_TASK_TOOLTIP = {
  visible: true,
  customLayout: null,
  className: '',
  offsetX: 12,
  offsetY: 12,
  showDelay: 0
}

export const DEFAULT_MILESTONE_TOOLTIP = {
  visible: true,
  customLayout: null,
  className: '',
  offsetX: 12,
  offsetY: 12,
  showDelay: 0
}

// Keep defaults data-only. Runtime logic belongs in VanillaGantt methods.
export const DEFAULT_OPTIONS = {
  records: [],
  recordKeyField: 'id',
  taskKeyField: 'id',
  minDate: '',
  maxDate: '',
  rowHeight: 78,
  taskHeight: 36,
  headerRowHeight: 24,
  taskListTable: {
    tableWidth: 'auto',
    minTableWidth: 120,
    maxTableWidth: 640,
    columnResizable: true,
    rowDraggable: false,
    onRowDragEnd: null,
    headerStyle: null,
    columns: [
      { field: 'name', title: '工位', width: 170, tree: true }
    ],
    renderHeader: null,
    renderCell: null
  },
  timelineHeader: {
    backgroundColor: '#fff',
    colWidth: 56,
    minLabelWidth: 0,
    style: null,
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 2, rowHeight: 24, colWidth: 56 }
    ]
  },
  taskBar: {
    tasksField: 'tasks',
    startDateField: 'startDate',
    endDateField: 'endDate',
    progressField: 'progress',
    laneField: 'lane',
    statusField: 'status',
    milestoneField: 'milestones',
    milestoneDateField: 'date',
    labelText: 'title',
    subLabelText: 'subtitle',
    barStyle: null,
    projectStyle: null,
    customLayout: null,
    offsetY: 10,
    denseRender: false,
    milestoneStyle: null,
    milestoneCustomLayout: null,
    milestoneTooltip: false,
    clip: true,
    hoverBringToFront: false,
    draggable: false,
    dragStep: 60 * 1000,
    tooltip: false,
    onClick: null,
    onContextMenu: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onDragStart: null,
    onDrag: null,
    onDragEnd: null,
    lanes: [
      { key: 'plan', offset: 8, height: 36 },
      { key: 'load', offset: 52, height: 6 },
      { key: 'unload', offset: 66, height: 6 }
    ]
  },
  dependency: {
    links: [],
    linkLineStyle: null,
    showLinks: false,
    highlightConnected: false,
    dimOpacity: 0.18,
    lineMode: {
      pattern: 'solid',
      path: 'polyline'
    },
    linkCreatable: false,
    linkCreateRules: {
      allowDuplicate: false
    },
    linkConnector: {
      width: 14,
      height: 14,
      customLayout: null,
      startLayout: null,
      finishLayout: null
    },
    linkCreateDisabledTaskKeys: [],
    onLinkCreate: null,
    linkSelectable: false,
    linkDeletable: false,
    onLinkDelete: null
  },
  grid: {
    backgroundColor: '#f7fbfb',
    alternatingBackgroundColor: '#f8fbfb',
    verticalLine: { lineColor: '#e8eeee' },
    horizontalLine: { lineColor: '#edf1f2' },
    backgroundRanges: [],
    rowBackgroundRanges: []
  },
  virtualScroll: {
    enabled: false,
    bufferPx: 1200,
    rowEnabled: true,
    rowBufferPx: 4800,
    patchRender: false
  },
  loading: {
    enabled: false,
    text: '加载中...',
    className: '',
    customLayout: null,
    bodyRenderSlice: true,
    bodyRenderSliceBudget: 8
  },
  scrollbar: {
    alwaysVisible: false,
    width: 10,
    height: 10,
    dragRenderDelay: 80,
    dragRenderMaxWait: 260
  },
  performance: {
    enabled: false,
    console: false,
    onRender: null
  },
  filter: null,
  highlight: null,
  markLine: null,
  onScroll: null
}
