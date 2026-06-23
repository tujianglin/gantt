const PLAN_HEIGHT = 30
const LOGISTICS_HEIGHT = 12
const PLAN_OFFSET_Y = 10
const LOAD_OFFSET_Y = 48
const UNLOAD_OFFSET_Y = 66
const ROW_HEIGHT = 88

const planColors = ['#42b8ad', '#6f8fe8', '#e99b3f', '#9b78d7', '#4f9fd8', '#d96f86']

function pad(value) {
  return String(value).padStart(2, '0')
}

function normalizeDateTime(value) {
  const text = String(value == null ? '' : value).trim()
  if (!text) return ''

  const normalized = text.replace(/\s+/, 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }
  return normalized
}

function parseDateTime(value) {
  const normalized = normalizeDateTime(value)
  if (!normalized) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTimeLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function floorToHour(date) {
  const value = new Date(date)
  value.setMinutes(0, 0, 0)
  return value
}

function ceilToHour(date) {
  const value = new Date(date)
  if (value.getMinutes() || value.getSeconds() || value.getMilliseconds()) {
    value.setHours(value.getHours() + 1)
  }
  value.setMinutes(0, 0, 0)
  return value
}

function addHours(date, hours) {
  const value = new Date(date)
  value.setHours(value.getHours() + hours)
  return value
}

function collectTimeValues(groups) {
  const values = []

  ;(groups || []).forEach(group => {
    ;(group.orders || []).forEach(order => {
      values.push(order.schedulingStartTime, order.schedulingEndTime)
      ;(order.distributionOrderVOList || []).forEach(distribution => {
        values.push(distribution.planDistributeTime, distribution.planDistributeEndTime)
      })
    })
  })

  return values
    .map(parseDateTime)
    .filter(Boolean)
    .map(date => date.getTime())
}

function createWorkOrderDistributionRange(groups, padHours = 1) {
  const timeValues = collectTimeValues(groups)
  if (!timeValues.length) {
    return {
      minDate: '2026-06-23T00:00',
      maxDate: '2026-06-24T00:00'
    }
  }

  const min = Math.min(...timeValues)
  const max = Math.max(...timeValues)

  return {
    minDate: formatDateTimeLocal(floorToHour(addHours(new Date(min), -padHours))),
    maxDate: formatDateTimeLocal(ceilToHour(addHours(new Date(max), padHours)))
  }
}

function logisticsLabel(luType) {
  if (Number(luType) === 1) return '上料'
  if (Number(luType) === 2) return '下料'
  return '配送'
}

function logisticsType(luType) {
  if (Number(luType) === 1) return 'load'
  if (Number(luType) === 2) return 'unload'
  return 'logistics'
}

function distributionSortValue(distribution) {
  const luType = Number(distribution.luType)
  if (luType === 1) return 0
  if (luType === 2) return 1
  return 2
}

function compareDistributions(a, b) {
  const typeDiff = distributionSortValue(a) - distributionSortValue(b)
  if (typeDiff) return typeDiff

  const aTime = parseDateTime(a.planDistributeTime)
  const bTime = parseDateTime(b.planDistributeTime)
  return (aTime ? aTime.getTime() : 0) - (bTime ? bTime.getTime() : 0)
}

function createPlanTask(order, orderIndex) {
  return {
    id: order.id,
    type: 'plan',
    title: order.processName || order.planCode || order.id,
    subtitle: order.productName || order.planCode || '',
    planCode: order.planCode,
    productName: order.productName,
    processCode: order.processCode,
    dispatchQuantity: order.dispatchQuantity,
    currentQuantity: order.currentQuantity,
    totalQuantity: order.totalQuantity,
    progress: order.progress,
    startDate: normalizeDateTime(order.schedulingStartTime),
    endDate: normalizeDateTime(order.schedulingEndTime),
    offsetY: PLAN_OFFSET_Y,
    height: PLAN_HEIGHT,
    color: order.color || planColors[orderIndex % planColors.length],
    raw: order
  }
}

function createDistributionTask(order, distribution) {
  const startDate = normalizeDateTime(distribution.planDistributeTime)
  const endDate = normalizeDateTime(distribution.planDistributeEndTime)
  if (!startDate || !endDate) return null

  const type = logisticsType(distribution.luType)
  const offsetY = type === 'unload' ? UNLOAD_OFFSET_Y : LOAD_OFFSET_Y

  return {
    id: `${order.id}-${type}-${distribution.id}`,
    type,
    title: logisticsLabel(distribution.luType),
    code: distribution.code,
    orderId: order.id,
    distributionId: distribution.id,
    distributionStatus: distribution.distributionStatus,
    distributionType: distribution.distributionType,
    luType: Number(distribution.luType),
    startDate,
    endDate,
    offsetY,
    height: LOGISTICS_HEIGHT,
    raw: distribution
  }
}

function createOrderTasks(order, orderIndex) {
  const distributions = (order.distributionOrderVOList || [])
    .slice()
    .sort(compareDistributions)
    .map(distribution => createDistributionTask(order, distribution))
    .filter(Boolean)

  return {
    tasks: [createPlanTask(order, orderIndex), ...distributions]
  }
}

function createWorkOrderDistributionRecords(groups) {
  return (groups || []).map(group => {
    const orders = group.orders || []
    const tasks = []
    let loadCount = 0
    let unloadCount = 0

    orders.forEach((order, orderIndex) => {
      const orderTasks = createOrderTasks(order, orderIndex)
      orderTasks.tasks.forEach(task => {
        if (task.type === 'load') loadCount += 1
        if (task.type === 'unload') unloadCount += 1
        tasks.push(task)
      })
    })

    return {
      id: group.workstationGroupId,
      name: group.workstationGroupName,
      code: group.workstationGroupCode,
      workloadRate: group.workloadRate,
      orderCount: orders.length,
      loadCount,
      unloadCount,
      height: ROW_HEIGHT,
      tasks,
      raw: group
    }
  })
}

module.exports = {
  createWorkOrderDistributionRecords,
  createWorkOrderDistributionRange,
  normalizeDateTime
}
