import type { DependencySnapshot } from '../types/internal'

export function invalidateDependencySnapshot(gantt: any) {
  gantt.dependencyVersion = (gantt.dependencyVersion || 0) + 1
  gantt.cachedDependencySnapshot = null
  gantt.cachedDependencySnapshotVersion = -1
}

export function getCachedDependencySnapshot(gantt: any, buildSnapshot: () => DependencySnapshot): DependencySnapshot {
  if (
    gantt.cachedDependencySnapshot &&
    gantt.cachedDependencySnapshotVersion === gantt.dependencyVersion &&
    gantt.cachedDependencyLinksRef === gantt.dependency.links
  ) {
    return gantt.cachedDependencySnapshot
  }

  const snapshot = buildSnapshot()
  gantt.cachedDependencySnapshot = snapshot
  gantt.cachedDependencySnapshotVersion = gantt.dependencyVersion
  gantt.cachedDependencyLinksRef = gantt.dependency.links
  return snapshot
}
