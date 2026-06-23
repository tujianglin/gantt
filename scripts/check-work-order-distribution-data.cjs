const assert = require('assert')
const sourceData = require('../src/views/data.json')
const {
  createWorkOrderDistributionRecords,
  createWorkOrderDistributionRange,
  normalizeDateTime
} = require('../src/views/workOrderDistributionData.cjs')

const records = createWorkOrderDistributionRecords(sourceData)

assert.strictEqual(records.length, sourceData.length, 'creates one gantt row per workstation group')
assert.strictEqual(records[0].id, sourceData[0].workstationGroupId)
assert.strictEqual(records[0].name, sourceData[0].workstationGroupName)
assert.strictEqual(records[0].orderCount, sourceData[0].orders.length)

const firstOrder = sourceData[0].orders[0]
const secondOrder = sourceData[0].orders[1]
const firstPlanTask = records[0].tasks.find(task => task.id === firstOrder.id)
const secondPlanTask = records[0].tasks.find(task => task.id === secondOrder.id)
const firstLoadTask = records[0].tasks.find(task => task.distributionId === firstOrder.distributionOrderVOList[0].id)
const firstUnloadTask = records[0].tasks.find(task => task.distributionId === firstOrder.distributionOrderVOList[1].id)

assert.ok(firstPlanTask, 'creates a plan task for each order')
assert.strictEqual(firstPlanTask.type, 'plan')
assert.strictEqual(firstPlanTask.title, firstOrder.processName)
assert.strictEqual(firstPlanTask.startDate, '2026-06-23T10:08:12')
assert.strictEqual(firstPlanTask.endDate, '2026-06-23T10:38:12')
assert.strictEqual(secondPlanTask.offsetY, firstPlanTask.offsetY, 'multiple work orders share one plan lane in the same row')

assert.ok(firstLoadTask, 'creates a distribution task for luType=1')
assert.strictEqual(firstLoadTask.type, 'load')
assert.strictEqual(firstLoadTask.title, '上料')
assert.strictEqual(firstLoadTask.luType, 1)
assert.strictEqual(firstLoadTask.startDate, '2026-06-23T10:08:12')
assert.strictEqual(firstLoadTask.endDate, '2026-06-23T11:08:12')

assert.ok(firstUnloadTask, 'creates a distribution task for luType=2')
assert.strictEqual(firstUnloadTask.type, 'unload')
assert.strictEqual(firstUnloadTask.title, '下料')
assert.strictEqual(firstUnloadTask.luType, 2)
assert.strictEqual(firstUnloadTask.startDate, '2026-06-23T10:38:12')
assert.strictEqual(firstUnloadTask.endDate, '2026-06-23T11:38:12')
assert.ok(firstUnloadTask.offsetY > firstLoadTask.offsetY, 'renders unload below load within the same order block')
assert.ok(records.every(row => row.height <= 96), 'does not create one visual sub-row per work order')

const range = createWorkOrderDistributionRange(sourceData)
assert.deepStrictEqual(range, {
  minDate: '2026-06-22T20:00',
  maxDate: '2026-06-30T03:00'
})

assert.strictEqual(normalizeDateTime('2026-06-23 10:08:12'), '2026-06-23T10:08:12')
assert.strictEqual(normalizeDateTime('2026-06-23 10:08'), '2026-06-23T10:08:00')

console.log(`Checked ${records.length} workstation groups and ${records.reduce((sum, row) => sum + row.tasks.length, 0)} gantt tasks.`)
