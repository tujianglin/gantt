export const scaleOptions = [
  {
    key: '1h',
    label: '1小时',
    value: {
      unit: 'hour',
      step: 1,
      pxPerUnit: 40,
      topUnit: 'day'
    }
  },
  {
    key: '2h',
    label: '2小时',
    value: {
      unit: 'hour',
      step: 2,
      pxPerUnit: 64,
      topUnit: 'day'
    }
  },
  {
    key: '4h',
    label: '4小时',
    value: {
      unit: 'hour',
      step: 4,
      pxPerUnit: 72,
      topUnit: 'day'
    }
  },
  {
    key: 'day',
    label: '天',
    value: {
      unit: 'day',
      step: 1,
      pxPerUnit: 120,
      topUnit: 'day'
    }
  },
  {
    key: 'week',
    label: '周',
    value: {
      unit: 'week',
      step: 1,
      pxPerUnit: 180,
      topUnit: 'month'
    }
  },
  {
    key: 'month',
    label: '月',
    value: {
      unit: 'month',
      step: 1,
      pxPerUnit: 220,
      topUnit: 'year'
    }
  },
  {
    key: 'year',
    label: '年',
    value: {
      unit: 'year',
      step: 1,
      pxPerUnit: 260,
      topUnit: 'year'
    }
  }
]
