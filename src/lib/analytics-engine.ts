import { NPTRecord } from "@/store/useAppStore";
import { isActionableCategory } from "./constants";

export function summarizeCurrentView(records: NPTRecord[]) {
  const interventionRecords = records.filter(r => r.TimeSavedHours > 0);
  return {
    total_interventions_applied: interventionRecords.length,
    total_time_saved_hours: records.reduce((sum, r) => sum + r.TimeSavedHours, 0),
    total_cost_saved_usd: records.reduce((sum, r) => sum + r.CostSaved, 0)
  };
}

export function interventionPerformance(records: NPTRecord[]) {
  const categoryStats = records.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) acc[curr.NPTCategory] = { name: curr.NPTCategory, NPTHours: 0, TimeSaved: 0, CostSaved: 0, CostImpact: 0, Apps: 0 };
    acc[curr.NPTCategory].NPTHours += curr.NPTHours;
    acc[curr.NPTCategory].TimeSaved += curr.TimeSavedHours;
    acc[curr.NPTCategory].CostSaved += curr.CostSaved;
    acc[curr.NPTCategory].CostImpact += curr.CostImpact;
    if (curr.TimeSavedHours > 0) acc[curr.NPTCategory].Apps += 1;
    return acc;
  }, {} as Record<string, any>);

  const actionableCats = Object.values(categoryStats).filter(c => isActionableCategory(c.name));
  const topSaved = actionableCats.sort((a, b) => b.CostSaved - a.CostSaved)[0];
  
  return {
    top_intervention: topSaved?.name || "None",
    top_intervention_cost_saved_usd: topSaved?.CostSaved || 0,
    top_intervention_time_saved_hours: topSaved?.TimeSaved || 0,
    top_intervention_success_rate: topSaved && topSaved.NPTHours > 0 ? (topSaved.TimeSaved / topSaved.NPTHours) * 100 : 0
  };
}

export function savingsPotential(records: NPTRecord[]) {
  const categoryStats = records.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) acc[curr.NPTCategory] = { name: curr.NPTCategory, NPTHours: 0, TimeSaved: 0, CostSaved: 0, CostImpact: 0 };
    acc[curr.NPTCategory].NPTHours += curr.NPTHours;
    acc[curr.NPTCategory].TimeSaved += curr.TimeSavedHours;
    acc[curr.NPTCategory].CostSaved += curr.CostSaved;
    acc[curr.NPTCategory].CostImpact += curr.CostImpact;
    return acc;
  }, {} as Record<string, any>);

  const actionableCats = Object.values(categoryStats).filter(c => isActionableCategory(c.name));
  const topOpp = actionableCats.sort((a, b) => (b.CostImpact - b.CostSaved) - (a.CostImpact - a.CostSaved))[0];

  return {
    highest_potential_intervention: topOpp?.name || "None",
    potential_cost_savings_remaining_usd: topOpp ? topOpp.CostImpact - topOpp.CostSaved : 0,
    potential_time_savings_remaining_hours: topOpp ? topOpp.NPTHours - topOpp.TimeSaved : 0
  };
}

export function assetInterventionComparison(records: NPTRecord[]) {
  const assetStats = records.reduce((acc, curr) => {
    if (!acc[curr.Asset]) acc[curr.Asset] = { asset: curr.Asset, TimeSaved: 0, CostSaved: 0, NPTHours: 0 };
    acc[curr.Asset].TimeSaved += curr.TimeSavedHours;
    acc[curr.Asset].CostSaved += curr.CostSaved;
    acc[curr.Asset].NPTHours += curr.NPTHours;
    return acc;
  }, {} as Record<string, any>);

  const sortedAssets = Object.values(assetStats).sort((a, b) => b.CostSaved - a.CostSaved).slice(0, 3);
  
  return sortedAssets.map(a => ({
    asset: a.asset,
    cost_saved_usd: a.CostSaved,
    time_saved_hours: a.TimeSaved,
    efficiency_percentage: a.NPTHours > 0 ? (a.TimeSaved / a.NPTHours) * 100 : 0
  }));
}

export function recommendIntervention(records: NPTRecord[]) {
  return savingsPotential(records); 
}

export function estimateAnnualSavings(records: NPTRecord[]) {
  const monthsSet = new Set(records.map(r => r.StartDate ? r.StartDate.substring(0, 7) : ''));
  // Remove empty string if present
  monthsSet.delete('');
  const months = monthsSet.size;
  
  const totalCostSaved = records.reduce((sum, r) => sum + r.CostSaved, 0);
  const totalTimeSaved = records.reduce((sum, r) => sum + r.TimeSavedHours, 0);

  const monthsDivisor = months > 0 ? months : 1;
  return {
    months_in_dataset: months,
    monthly_average_cost_saved_usd: totalCostSaved / monthsDivisor,
    projected_annual_cost_saved_usd: (totalCostSaved / monthsDivisor) * 12,
    projected_annual_time_saved_hours: (totalTimeSaved / monthsDivisor) * 12
  };
}
