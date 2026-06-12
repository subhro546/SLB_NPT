/**
 * Title cases a string (e.g. "MUD LOSS" -> "Mud Loss")
 */
function toTitleCase(str: string): string {
  if (!str) return "Unknown";
  return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

/**
 * Known semantic mapping for Categories and SubCategories.
 * Keys should be in Title Case (the output of Phase 1).
 */
const SEMANTIC_MAP: Record<string, string> = {
  // Logistics
  "Waiting For Logistics": "Waiting on Logistics",
  "Wait On Logistics": "Waiting on Logistics",
  "Waiting On Logistic": "Waiting on Logistics",
  
  // Logging
  "Logging Complication": "Logging Complications",
  
  // Equipment
  "Tool Issue": "Tool Failure",
  "Tool Issues": "Tool Failure",
  "Equipment Failure": "Tool Failure",
  
  // Wellbore
  "Wellbore Stability": "Wellbore Instability",
  
  // Weather
  "Wait On Weather": "Waiting on Weather",
  "Waiting For Weather": "Waiting on Weather",
};

export function normalizeCategory(rawCategory: string | undefined | null): string {
  if (!rawCategory) return "Unknown";
  
  // Phase 1: Case Normalization
  const titleCased = toTitleCase(rawCategory.trim());
  
  // Phase 2: Semantic Normalization
  return SEMANTIC_MAP[titleCased] || titleCased;
}
