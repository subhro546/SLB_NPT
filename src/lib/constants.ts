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
  return ACTIONABLE_CATEGORIES.includes(category)
}

export const formatActionableCategory = (category: string) => {
  return isActionableCategory(category) ? `${category} 🟢` : category
}
