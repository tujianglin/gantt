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
    headerStyle: {
      backgroundColor: '#eaf3f8',
      color: '#314047'
    },
    columns: [
      { field: 'name', title: '工位', width: 150, tree: true },
      {
        field: 'load',
        title: '负载',
        width: 90,
        headerStyle: { backgroundColor: '#dcecf4' },
        renderHeader: () => '<strong>负载</strong>',
        renderCell: ({ value }) => `${value || 0}%`
      }
    ]
  },
  timelineHeader: {
    backgroundColor: '#fff',
    style: {
      backgroundColor: '#f6fafc',
      color: '#50616b'
    },
    scales: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8' } },
      {
        unit: 'minute',
        step: 15,
        colWidth: 48,
        rowHeight: 24,
        format: ({ startDate }) => {
          const hour = String(startDate.getHours()).padStart(2, '0')
          const minute = String(startDate.getMinutes()).padStart(2, '0')
          return `${hour}:${minute}`
        }
      }
    ]
  },
  taskBar: {
    startDateField: 'startDate',
    endDateField: 'endDate',
    progressField: 'progress',
    labelText: 'title',
    draggable: true,
    dragStep: 5 * 60 * 1000,
    customLayout: ({ task }) => `
      <div class="my-task">
        <strong>${task.title || ''}</strong>
        <span>${task.subtitle || ''}</span>
      </div>
    `,
    tooltip: {
      visible: true,
      customLayout: ({ task, startDate, endDate }) => `
        <div class="my-tooltip">
          <strong>${task.title || ''}</strong>
          <span>${startDate.toLocaleString()} - ${endDate.toLocaleString()}</span>
        </div>
      `
    },
    onClick: ({ task }) => {
      console.log('task click', task)
    },
    onContextMenu: ({ task, event }) => {
      console.log('task contextmenu', task, event)
    },
    onDragEnd: ({ sourceTask, startDate, endDate }) => {
      console.log('task dragged', sourceTask, startDate, endDate)
    }
  },
  dependency: {
    showLinks: false,
    highlightConnected: true,
    links: [
      { id: 'flow-1', from: 'task-1', to: ['task-2', 'task-3'], color: '#168dff' }
    ]
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
For controls inside a custom task template, put `data-vg-no-drag` on the element to prevent it from starting task dragging.
Dependency lines use `from` and `to`; `to` can be an array. `dependency.showLinks` defaults to `false`, so links are hidden until a task is clicked, and only one link group is shown at a time.
Task tooltip is disabled by default. Set `taskBar.tooltip: true` for the default tooltip, or pass `taskBar.tooltip.visible: true` with a custom template.

## Build

```sh
npm --prefix packages/gantt run build
```
