# @vue2-gantt/gantt

Framework-agnostic SVG scheduling gantt chart.

## Usage

```js
import { VanillaGantt } from '@vue2-gantt/gantt'
import '@vue2-gantt/gantt/src/vanilla-gantt.css'

const gantt = new VanillaGantt(document.querySelector('#gantt'), {
  records: [
    {
      id: 'unit-1',
      name: '机组单元1',
      tasks: [
        {
          id: 'task-1',
          title: '产品图号001',
          startDate: '2026-03-30T06:00:00',
          endDate: '2026-03-30T12:00:00'
        }
      ]
    }
  ],
  minDate: '2026-03-30T02:00',
  maxDate: '2026-04-01T18:00',
  taskListTable: {
    tableWidth: 'auto',
    columnResizable: true,
    columns: [
      { field: 'name', title: '工位', width: 150, tree: true },
      {
        field: 'load',
        title: '负载',
        width: 90,
        renderHeader: () => '<strong>负载</strong>',
        renderCell: ({ value }) => `${value || 0}%`
      }
    ]
  },
  timelineHeader: {
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 2, colWidth: 64, rowHeight: 24 }
    ]
  },
  taskBar: {
    startDateField: 'startDate',
    endDateField: 'endDate',
    progressField: 'progress',
    labelText: 'title',
    customLayout: ({ task }) => `
      <div class="my-task">
        <strong>${task.title || ''}</strong>
        <span>${task.subtitle || ''}</span>
      </div>
    `
  }
})

gantt.setOptions({
  timelineHeader: {
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 1, colWidth: 48, rowHeight: 24 }
    ]
  }
})

gantt.destroy()
```

Custom renderers can return an HTML template string, a `Node`, or `{ rootContainer }`.
For a custom tree cell, put `data-vg-toggle` on the toggle element and the gantt instance will bind expand/collapse automatically.

## Build

```sh
npm --prefix packages/gantt run build
```
