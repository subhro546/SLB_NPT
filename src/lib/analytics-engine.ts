import { NPTRecord } from "@/store/useAppStore";
import { isActionableCategory } from "./constants";

export function summarizeCurrentView(records: NPTRecord[]) {
  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const totalHours = records.reduce((sum, r) => sum + r.NPTHours, 0);
  const totalEvents = records.length;
  const savingsOpportunity = records.reduce((sum, r) => sum + r.CostSaved, 0);
  
  return {
    total_cost_impact_usd: totalCost,
    total_downtime_hours: totalHours,
    total_npt_events: totalEvents,
    savings_opportunity_usd: savingsOpportunity
  };
}

export function overallBusinessHealth(records: NPTRecord[]) {
  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const totalHours = records.reduce((sum, r) => sum + r.NPTHours, 0);
  const totalEvents = records.length;
  const savingsOpportunity = records.reduce((sum, r) => sum + r.CostSaved, 0);
  
  const catCosts = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topCat = Object.entries(catCosts).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  const rigHours = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
  const topRig = Object.entries(rigHours).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  return {
    total_cost_impact_usd: totalCost,
    total_npt_events: totalEvents,
    total_downtime_hours: totalHours,
    potential_savings_usd: savingsOpportunity,
    top_cost_category: topCat[0],
    biggest_risk_rig: topRig[0]
  };
}

export function executiveSummary(records: NPTRecord[]) {
  return overallBusinessHealth(records); // same metrics, LLM prompt will vary the text
}

export function compareAssets(records: NPTRecord[], asset1: string, asset2: string) {
  const a1Records = records.filter(r => r.Asset.toLowerCase() === asset1.toLowerCase());
  const a2Records = records.filter(r => r.Asset.toLowerCase() === asset2.toLowerCase());
  
  return {
    [asset1]: {
      cost_impact_usd: a1Records.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: a1Records.reduce((sum, r) => sum + r.NPTHours, 0),
      events: a1Records.length
    },
    [asset2]: {
      cost_impact_usd: a2Records.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: a2Records.reduce((sum, r) => sum + r.NPTHours, 0),
      events: a2Records.length
    }
  };
}

export function compareRigs(records: NPTRecord[], rig1: string, rig2: string) {
  const r1Records = records.filter(r => r.RigName.toLowerCase() === rig1.toLowerCase());
  const r2Records = records.filter(r => r.RigName.toLowerCase() === rig2.toLowerCase());
  
  return {
    [rig1]: {
      cost_impact_usd: r1Records.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: r1Records.reduce((sum, r) => sum + r.NPTHours, 0),
      events: r1Records.length
    },
    [rig2]: {
      cost_impact_usd: r2Records.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: r2Records.reduce((sum, r) => sum + r.NPTHours, 0),
      events: r2Records.length
    }
  };
}

export function compareOnshoreOffshore(records: NPTRecord[]) {
  const offshore = records.filter(r => r.Well_Type === 'Offshore');
  const onshore = records.filter(r => r.Well_Type === 'Onshore' || r.Well_Type === 'Land');
  
  return {
    offshore: {
      cost_impact_usd: offshore.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: offshore.reduce((sum, r) => sum + r.NPTHours, 0)
    },
    onshore: {
      cost_impact_usd: onshore.reduce((sum, r) => sum + r.CostImpact, 0),
      downtime_hours: onshore.reduce((sum, r) => sum + r.NPTHours, 0)
    }
  };
}

export function identifyCostDrivers(records: NPTRecord[]) {
  const rigCosts = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topRig = Object.entries(rigCosts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  
  const catCosts = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topCat = Object.entries(catCosts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  
  return {
    highest_cost_rig: topRig[0],
    highest_cost_rig_usd: topRig[1],
    highest_cost_category: topCat[0],
    highest_cost_category_usd: topCat[1]
  };
}

export function identifySavingsOpportunities(records: NPTRecord[]) {
  const avoidableCost = records.reduce((sum, r) => sum + r.CostSaved, 0);
  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  
  const actionableRecords = records.filter(r => isActionableCategory(r.NPTCategory));
  const catSavings = actionableRecords.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostSaved; return acc; }, {} as Record<string, number>);
  const topSavingsCat = Object.entries(catSavings).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  
  return {
    total_savings_opportunity_usd: avoidableCost,
    percent_of_total_cost: totalCost > 0 ? (avoidableCost / totalCost) * 100 : 0,
    top_savings_category: topSavingsCat[0],
    top_savings_category_usd: topSavingsCat[1]
  };
}

export function identifyHighRiskRigs(records: NPTRecord[]) {
  const rigEvents = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topRigEvent = Object.entries(rigEvents).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  
  const rigHours = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
  const topRigHour = Object.entries(rigHours).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  
  return {
    most_frequent_failure_rig: topRigEvent[0],
    failure_events: topRigEvent[1],
    highest_downtime_rig: topRigHour[0],
    downtime_hours: topRigHour[1]
  };
}

export function rankAssets(records: NPTRecord[]) {
  const assetCosts = records.reduce((acc, r) => { acc[r.Asset] = (acc[r.Asset] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const sorted = Object.entries(assetCosts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  return sorted.map((s, i) => ({ rank: i + 1, asset: s[0], cost_impact_usd: s[1] }));
}

export function rankRigs(records: NPTRecord[]) {
  const rigCosts = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const sorted = Object.entries(rigCosts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  return sorted.map((s, i) => ({ rank: i + 1, rig: s[0], cost_impact_usd: s[1] }));
}

export function analyzeNPTCategories(records: NPTRecord[]) {
  const catCosts = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const sorted = Object.entries(catCosts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  return sorted.map((s, i) => ({ 
    rank: i + 1, 
    category: s[0], 
    cost_impact_usd: s[1],
    contribution_percent: totalCost > 0 ? (s[1] / totalCost) * 100 : 0
  }));
}
