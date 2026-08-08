export const GOAL_WHEEL_SIZE = 124

export function cellSizeFor(count) {
  if (count <= 3) return 64
  if (count <= 7) return 48
  if (count <= 21) return 36
  return 28
}
