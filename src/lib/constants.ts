export const ACTIONABLE_CATEGORIES = [
  'Hole Problems',
  'Fishing',
  'Side Tracking',
  'Out of Cycle',
  'Losses',
  'Tight pull/ held-ups',
  'Casing/Liner Complications',
  'Activity/Kick',
  'Stuck Pipe',
  'Logging Complications',
  'Poor ROP',
  'Pressure Shootup',
  'Operational Issues',
  'Mud Cut'
]

export const isActionableCategory = (category: string) => {
  return true
}

export const formatActionableCategory = (category: string) => {
  return category
}
