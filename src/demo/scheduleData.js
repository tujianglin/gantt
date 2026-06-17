export function createScheduleData() {
  return {
    rows: createRows(),
    tasks: createTasks(),
    blocks: [
      block('b1', 'unit-1', '2026-03-30T15:00:00', '2026-03-31T04:20:00', '#dcf8c9', 0.7),
      block('b2', 'unit-2', '2026-03-30T19:10:00', '2026-03-31T11:10:00', '#fde9e9', 0.75),
      { ...block('b3', 'unit-3', '2026-04-01T00:20:00', '2026-04-01T06:45:00', '#9ed8f5', 0.75), offsetY: 14, height: 34 },
      block('b4', 'fanuc-004', '2026-03-30T06:00:00', '2026-03-30T18:55:00', '#ffe8e8', 0.55),
      block('b5', 'fanuc-006-a', '2026-03-30T19:00:00', '2026-03-31T04:20:00', '#c7d9f7', 0.75),
      block('b6', 'unit-4', '2026-03-30T15:00:00', '2026-03-31T04:20:00', '#dcf8c9', 0.7),
      block('b7', 'unit-5', '2026-03-30T19:10:00', '2026-03-31T11:10:00', '#fde9e9', 0.75),
      { ...block('b8', 'heat', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#ffe6a8', 0.9), offsetY: 4, height: 32 },
      { ...block('b9', 'outside', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#cfe1ff', 0.9), offsetY: 4, height: 32 }
    ],
    links: [
      { id: 'l1', fromRowId: 'fanuc-006-a', toRowId: 'fanuc-006-a', fromTime: '2026-03-31T09:35:00', toTime: '2026-03-31T08:10:00', fromY: 31, toY: 31, color: '#43c51a', dashed: false },
      { id: 'l2', fromRowId: 'fanuc-006-b', toRowId: 'fanuc-006-b', fromTime: '2026-03-31T17:00:00', toTime: '2026-04-01T04:00:00', fromY: 31, toY: 31, color: '#ff5b62', dashed: true },
      { id: 'l3', fromRowId: 'unit-2', toRowId: 'unit-2', fromTime: '2026-04-01T09:55:00', toTime: '2026-04-01T07:15:00', fromY: 31, toY: 31, color: '#43c51a', dashed: true }
    ],
    restRanges: [
      rest('rest-1', '2026-03-30T09:36:00', '2026-03-30T10:42:00'),
      rest('rest-2', '2026-03-30T12:15:00', '2026-03-30T13:05:00'),
      rest('rest-3', '2026-03-31T20:30:00', '2026-04-01T02:10:00')
    ]
  }
}

function createRows() {
  return [
    {
      id: 'heat-group-a',
      name: '热处理',
      type: 'group',
      expanded: true,
      children: [
        { id: 'unit-1', name: '机组单元1', load: 100 },
        { id: 'unit-2', name: '机组单元2', load: 80 },
        { id: 'unit-3', name: '机组单元3', load: 79 }
      ]
    },
    {
      id: 'machine-group-a',
      name: '热处理炉1',
      type: 'group',
      expanded: true,
      children: [
        { id: 'fanuc-004', name: 'FANUC004', load: 50 },
        { id: 'fanuc-006-a', name: 'FANUC006', load: 49 },
        { id: 'fanuc-006-b', name: 'FANUC006', load: 49 }
      ]
    },
    {
      id: 'heat-group-b',
      name: '热处理炉1',
      type: 'group',
      expanded: true,
      children: [
        { id: 'unit-4', name: '机组单元1', load: 100 },
        { id: 'unit-5', name: '机组单元2', load: 80 },
        { id: 'unit-6', name: '机组单元3', load: 79 }
      ]
    },
    { id: 'heat', name: '热处理', type: 'group', height: 44 },
    { id: 'outside', name: '外协加工', type: 'group', height: 44 }
  ]
}

function createTasks() {
  const tasks = [
    task('t1', 'unit-1', '产品图号001', '144', '2026-03-30T06:15:00', '2026-03-30T10:30:00', { striped: true }),
    task('t2', 'unit-1', '产品图号002', '80', '2026-03-30T11:05:00', '2026-03-30T13:00:00', { status: 'planned', progress: 60, locked: true }),
    task('t3', 'unit-1', '产品图号001', '144', '2026-03-30T17:00:00', '2026-03-30T18:55:00', { status: 'planned' }),
    task('t4', 'unit-1', '产品图号001', '144', '2026-03-31T06:30:00', '2026-03-31T10:45:00'),
    task('t5', 'unit-1', '产品图号002', '144', '2026-04-01T03:30:00', '2026-04-01T07:10:00', { status: 'planned', locked: true }),
    task('t6', 'unit-2', '产品图号001', '144 (50%)', '2026-03-30T09:10:00', '2026-03-30T19:00:00', { progress: 50 }),
    task('t7', 'unit-2', '产品图号002', '144', '2026-04-01T00:45:00', '2026-04-01T07:15:00', { status: 'selected' }),
    task('t8', 'unit-2', '产品图号001', '144', '2026-04-01T08:00:00', '2026-04-01T11:30:00', { status: 'selected' }),
    task('t9', 'unit-3', '产品图号001', '20', '2026-03-30T07:20:00', '2026-03-30T08:55:00', { status: 'planned', striped: true }),
    task('t10', 'unit-3', '产品图号002', '20', '2026-03-30T10:10:00', '2026-03-30T11:50:00', { status: 'planned', striped: true }),
    task('t11', 'unit-3', '产品图号004', '144', '2026-03-31T09:10:00', '2026-03-31T11:00:00', { status: 'blue' }),
    task('t12', 'fanuc-004', '产品图号001', '144', '2026-03-31T02:05:00', '2026-03-31T09:30:00'),
    task('t13', 'fanuc-004', '产品图号002', '144', '2026-04-01T02:10:00', '2026-04-01T05:40:00', { status: 'planned' }),
    task('t14', 'fanuc-006-a', '产品图号001', '144', '2026-03-30T06:20:00', '2026-03-30T10:20:00', { striped: true }),
    task('t15', 'fanuc-006-a', '产品图号002', '80 (50%)', '2026-03-30T10:45:00', '2026-03-30T14:00:00', { status: 'planned', progress: 50 }),
    task('t16', 'fanuc-006-a', '产品图号004', '144', '2026-03-30T15:00:00', '2026-03-30T18:00:00', { status: 'blue', locked: true }),
    task('t17', 'fanuc-006-a', '产品图号001', '100', '2026-03-31T05:30:00', '2026-03-31T09:35:00', { status: 'selected' }),
    task('t18', 'fanuc-006-a', '产品图号002', '144', '2026-04-01T03:30:00', '2026-04-01T06:55:00', { status: 'planned' }),
    task('t19', 'fanuc-006-b', '产品图号005', '120', '2026-03-31T06:30:00', '2026-03-31T10:35:00', { status: 'warning' }),
    task('t20', 'fanuc-006-b', '产品图号003', '144', '2026-04-01T04:00:00', '2026-04-01T08:40:00', { status: 'warning' }),
    task('t21', 'unit-4', '产品图号001', '144', '2026-03-30T06:15:00', '2026-03-30T10:30:00', { striped: true }),
    task('t22', 'unit-4', '产品图号002', '80', '2026-03-30T11:05:00', '2026-03-30T13:00:00', { status: 'planned', progress: 60, locked: true }),
    task('t23', 'unit-4', '产品图号001', '144', '2026-03-31T06:30:00', '2026-03-31T10:45:00'),
    task('t24', 'unit-5', '产品图号001', '144 (50%)', '2026-03-30T09:10:00', '2026-03-30T19:00:00', { progress: 50 }),
    task('t25', 'unit-5', '产品图号002', '144', '2026-04-01T00:45:00', '2026-04-01T07:15:00', { status: 'selected' }),
    task('t26', 'unit-5', '产品图号001', '144', '2026-04-01T08:00:00', '2026-04-01T11:30:00', { status: 'selected' }),
    task('t27', 'unit-6', '产品图号004', '144', '2026-03-31T09:10:00', '2026-03-31T11:00:00', { status: 'blue' })
  ]

  return tasks.concat(createHandlingTasks(tasks))
}

function task(id, rowId, title, subtitle, start, end, extra = {}) {
  return {
    id,
    rowId,
    title,
    subtitle,
    start,
    end,
    height: 36,
    offsetY: 10,
    ...extra
  }
}

function createHandlingTasks(tasks) {
  return tasks.flatMap(item => [
    task(`${item.id}-load`, item.rowId, '上料', item.title, addHours(item.start, -3), addHours(item.start, -0.4), {
      lane: 'load',
      status: 'load',
      progress: undefined
    }),
    task(`${item.id}-unload`, item.rowId, '下料', item.title, addHours(item.end, 0.4), addHours(item.end, 3), {
      lane: 'unload',
      status: 'unload',
      progress: undefined
    })
  ])
}

function addHours(value, hours) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() + Math.round(hours * 60))
  return formatDateTime(date)
}

function formatDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

function block(id, rowId, start, end, fill, opacity) {
  return {
    id,
    rowId,
    start,
    end,
    offsetY: 0,
    height: 62,
    fill,
    opacity
  }
}

function rest(id, start, end) {
  return {
    id,
    start,
    end,
    fill: '#e4eaea',
    opacity: 1
  }
}
