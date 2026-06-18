export function toTime(value) {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

export function formatDateTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day} ${hour}:${minute}`
}

export function formatLocalDateTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  const second = String(value.getSeconds()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}T${hour}:${minute}:${second}`
}
