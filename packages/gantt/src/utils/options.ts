export function mergeOptions(base, patch) {
  const baseTaskBar = base.taskBar || {}
  const patchTaskBar = patch.taskBar || {}
  return {
    ...base,
    ...patch,
    taskListTable: {
      ...(base.taskListTable || {}),
      ...(patch.taskListTable || {})
    },
    timelineHeader: {
      ...(base.timelineHeader || {}),
      ...(patch.timelineHeader || {}),
      scales: patch.timelineHeader && patch.timelineHeader.scales
        ? patch.timelineHeader.scales
        : (base.timelineHeader && base.timelineHeader.scales) || []
    },
    taskBar: {
      ...baseTaskBar,
      ...patchTaskBar,
      tooltip: mergeNestedOption(baseTaskBar.tooltip, patchTaskBar.tooltip),
      lanes: patchTaskBar.lanes
        ? patchTaskBar.lanes
        : baseTaskBar.lanes || []
    },
    dependency: {
      ...(base.dependency || {}),
      ...(patch.dependency || {}),
      links: patch.dependency && patch.dependency.links
        ? patch.dependency.links
        : (base.dependency && base.dependency.links) || []
    },
    grid: {
      ...(base.grid || {}),
      ...(patch.grid || {}),
      backgroundRanges: patch.grid && patch.grid.backgroundRanges
        ? patch.grid.backgroundRanges
        : (base.grid && base.grid.backgroundRanges) || [],
      rowBackgroundRanges: patch.grid && patch.grid.rowBackgroundRanges
        ? patch.grid.rowBackgroundRanges
        : (base.grid && base.grid.rowBackgroundRanges) || []
    },
    records: patch.records || base.records || []
  }
}

function mergeNestedOption(base, patch) {
  if (patch === undefined) return base
  if (patch === false || patch === true || patch === null) return patch
  if (typeof patch === 'object' && !Array.isArray(patch)) {
    return {
      ...(typeof base === 'object' && base ? base : {}),
      ...patch
    }
  }
  return patch
}
