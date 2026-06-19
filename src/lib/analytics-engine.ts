import { NPTRecord } from "@/store/useAppStore";
import { isActionableCategory } from "./constants";

export function summarizeCurrentView(records: NPTRecord[]) {
  const interventionRecords = records.filter(r => r.TimeSaved > 0);
  return {
    total_interventions_applied: interventionRecords.length,
    total_time_saved_hours: records.reduce((sum, r) => sum + r.TimeSaved, 0),
    total_cost_saved_usd: records.reduce((sum, r) => sum + r.CostSaved, 0)
  };
}

export function interventionPerformance(records: NPTRecord[]) {
  const categoryStats = records.reduce((acc, curr) => {
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, NPTHours: 0, TimeSaved: 0, CostSaved: 0, CostImpact: 0, Apps: 0 };
    acc[curr.Category].NPTHours += curr.Hours;
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    acc[curr.Category].CostSaved += curr.CostSaved;
    acc[curr.Category].CostImpact += curr.CostImpact;
    if (curr.TimeSaved > 0) acc[curr.Category].Apps += 1;
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
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, NPTHours: 0, TimeSaved: 0, CostSaved: 0, CostImpact: 0 };
    acc[curr.Category].NPTHours += curr.Hours;
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    acc[curr.Category].CostSaved += curr.CostSaved;
    acc[curr.Category].CostImpact += curr.CostImpact;
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
  const rigStats = records.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { asset: curr.RigName, TimeSaved: 0, CostSaved: 0, NPTHours: 0 };
    acc[curr.RigName].TimeSaved += curr.TimeSaved;
    acc[curr.RigName].CostSaved += curr.CostSaved;
    acc[curr.RigName].NPTHours += curr.Hours;
    return acc;
  }, {} as Record<string, any>);

  const sortedRigs = Object.values(rigStats).sort((a, b) => b.CostSaved - a.CostSaved).slice(0, 3);
  
  return sortedRigs.map(a => ({
    rig_name: a.asset,
    cost_saved_usd: a.CostSaved,
    time_saved_hours: a.TimeSaved,
    efficiency_percentage: a.NPTHours > 0 ? (a.TimeSaved / a.NPTHours) * 100 : 0
  }));
}

export function recommendIntervention(records: NPTRecord[]) {
  return savingsPotential(records); 
}

export function estimateAnnualSavings(records: NPTRecord[]) {
  const totalCostSaved = records.reduce((sum, r) => sum + r.CostSaved, 0);
  const totalTimeSaved = records.reduce((sum, r) => sum + r.TimeSaved, 0);

  return {
    dataset_total_cost_saved_usd: totalCostSaved,
    projected_annual_cost_saved_usd: totalCostSaved * 1.2, 
    projected_annual_time_saved_hours: totalTimeSaved * 1.2
  };
}
