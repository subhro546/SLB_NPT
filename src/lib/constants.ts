export const ACTIONABLE_CATEGORIES = [
  'Hole Problems',
  'Fishing',
  'Side Tracking',
  'Out of Cycle'
]

export const isActionableCategory = (category: string) => {
  return ACTIONABLE_CATEGORIES.includes(category)
}

export const formatActionableCategory = (category: string) => {
  return isActionableCategory(category) ? `${category} 🟢` : category
}
