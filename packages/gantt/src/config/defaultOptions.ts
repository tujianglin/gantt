export const DEFAULT_TASK_TOOLTIP = {
  visible: true,
  customLayout: null,
  className: '',
  offsetX: 12,
  offsetY: 12
}

export const DEFAULT_MILESTONE_TOOLTIP = {
  visible: true,
  customLayout: null,
  className: '',
  offsetX: 12,
  offsetY: 12
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
    milestoneStyle: null,
    milestoneCustomLayout: null,
    milestoneTooltip: false,
    clip: true,
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
    onLinkCreate: null
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
    bufferPx: 1200
  },
  markLine: null,
  onScroll: null
}
