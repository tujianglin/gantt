export function toKeyList(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}
