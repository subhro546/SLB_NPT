import { NPTRecord } from "@/store/useAppStore";
import { formatActionableCategory } from "./constants";

export interface AIResponse {
  title: string;
  content: string;
}

function formatCurrencyVal(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export function generateExecutiveSummary(records: NPTRecord[]): AIResponse {
  if (!records.length) return { title: "Executive Summary", content: "No data available in the current filter context." };

  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const totalHours = records.reduce((sum, r) => sum + r.NPTHours, 0);
  const totalMethod2Savings = records.reduce((sum, r) => sum + r.CostSaved, 0); // Assuming Method 2 is active if calculated, or we just sum CostSaved. Wait, CostSaved is whatever the current savingsMethod is. Let's just call it "Savings Opportunity".

  const assetCosts = records.reduce((acc, r) => { acc[r.Asset] = (acc[r.Asset] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topAsset = Object.entries(assetCosts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  const topAssetPct = totalCost > 0 ? ((topAsset[1] / totalCost) * 100).toFixed(1) : "0";

  const catHours = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
  const topCat = Object.entries(catHours).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

  const offshoreCost = records.filter(r => r.Well_Type === 'Offshore').reduce((sum, r) => sum + r.CostImpact, 0);
  const offshorePct = totalCost > 0 ? ((offshoreCost / totalCost) * 100).toFixed(1) : "0";

  const content = `Based on the current dashboard filters, the total operational cost impact stands at **${formatCurrencyVal(totalCost)}** over **${totalHours.toFixed(0)} NPT hours**. \n\n**Asset ${topAsset[0]}** was the primary cost driver, contributing **${topAssetPct}%** of the total cost impact. **${formatActionableCategory(topCat[0])}** generated the highest downtime across all operations.\n\nOffshore rigs contributed to **${offshorePct}%** of the total financial impact. Implementing targeted interventions on actionable events presents an estimated savings opportunity of **${formatCurrencyVal(totalMethod2Savings)}**.`;

  return { title: "Executive Summary", content };
}

export function generateCostImpactAnalysis(records: NPTRecord[]): AIResponse {
  if (!records.length) return { title: "Cost Impact Analysis", content: "No data available." };

  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const offshoreCost = records.filter(r => r.Well_Type === 'Offshore').reduce((sum, r) => sum + r.CostImpact, 0);
  const onshoreCost = totalCost - offshoreCost;

  const rigCosts = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topRigs = Object.entries(rigCosts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const catCosts = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
  const topCats = Object.entries(catCosts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  let content = `### Financial Overview\nTotal Cost Impact: **${formatCurrencyVal(totalCost)}**\n- Offshore: **${formatCurrencyVal(offshoreCost)}**\n- Onshore: **${formatCurrencyVal(onshoreCost)}**\n\n`;
  content += `### Top Cost-Driving Rigs\n`;
  topRigs.forEach((r, i) => { content += `${i + 1}. **${r[0] || 'Unknown'}**: ${formatCurrencyVal(r[1])}\n`; });
  content += `\n### Top Cost-Driving Categories\n`;
  topCats.forEach((c, i) => { content += `${i + 1}. **${formatActionableCategory(c[0])}**: ${formatCurrencyVal(c[1])}\n`; });

  return { title: "Cost Impact Analysis", content };
}

export function generateRiskReliabilityAnalysis(records: NPTRecord[]): AIResponse {
  if (!records.length) return { title: "Risk & Reliability Analysis", content: "No data available." };

  const assetHours = records.reduce((acc, r) => { acc[r.Asset] = (acc[r.Asset] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
  const topAsset = Object.entries(assetHours).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

  const rigEvents = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topRigEvent = Object.entries(rigEvents).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

  const catHours = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
  const topCats = Object.entries(catHours).sort((a, b) => b[1] - a[1]).slice(0, 3);

  let content = `### Operational Risk Profile\n`;
  content += `**Asset ${topAsset[0]}** is currently carrying the highest downtime burden with **${topAsset[1].toFixed(0)} hours** of NPT.\n\n`;
  content += `**Rig ${topRigEvent[0] || 'Unknown'}** has the highest frequency of issues, recording **${topRigEvent[1]} distinct NPT events**.\n\n`;
  content += `### Most Problematic Categories (By Duration)\n`;
  topCats.forEach((c, i) => { content += `${i + 1}. **${formatActionableCategory(c[0])}**: ${c[1].toFixed(0)} hours\n`; });

  return { title: "Risk & Reliability Analysis", content };
}

export function generateSavingsAnalysis(records: NPTRecord[]): AIResponse {
  if (!records.length) return { title: "Savings Opportunity Analysis", content: "No data available." };

  const totalCost = records.reduce((sum, r) => sum + r.CostImpact, 0);
  const currentSavings = records.reduce((sum, r) => sum + r.CostSaved, 0);
  const potentialPct = totalCost > 0 ? ((currentSavings / totalCost) * 100).toFixed(1) : "0";

  let content = `### Cost Reduction Potential\n`;
  content += `Based on the active savings method calculation, the current achievable savings opportunity is **${formatCurrencyVal(currentSavings)}**.\n\n`;
  content += `This represents a **${potentialPct}%** reduction in total NPT cost impact.\n\n`;
  content += `### Recommendations for Action\n`;
  content += `1. **Investigate Top Assets**: Focus intervention strategies on the top 10% of actionable events to realize maximum financial recovery.\n`;
  content += `2. **Standardize Offshore Practices**: High ODR in offshore environments means time-saved interventions yield exponentially higher cost recovery.\n`;
  content += `3. **Targeted Prevention**: Analyze root causes for the highest frequency categories to permanently eliminate recurring downtime.\n`;

  return { title: "Savings Opportunity Analysis", content };
}

export function processNaturalLanguageQuery(query: string, records: NPTRecord[]): AIResponse {
  const q = query.toLowerCase();

  if (q.includes('summarize') || q.includes('summary')) return generateExecutiveSummary(records);
  if (q.includes('cost') && q.includes('driver')) return generateCostImpactAnalysis(records);
  if (q.includes('risk') || q.includes('highest downtime rig')) return generateRiskReliabilityAnalysis(records);
  if (q.includes('saving') || q.includes('method 2') || q.includes('method 1')) return generateSavingsAnalysis(records);

  if (q.includes('highest downtime') && q.includes('asset')) {
    const assetHours = records.reduce((acc, r) => { acc[r.Asset] = (acc[r.Asset] || 0) + r.NPTHours; return acc; }, {} as Record<string, number>);
    const topAsset = Object.entries(assetHours).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    return { title: "Query Result", content: `**Asset ${topAsset[0]}** has the highest downtime with **${topAsset[1].toFixed(0)} hours**.` };
  }

  if (q.includes('highest cost impact') || q.includes('highest cost')) {
    const rigCosts = records.reduce((acc, r) => { acc[r.RigName] = (acc[r.RigName] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
    const topRig = Object.entries(rigCosts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    return { title: "Query Result", content: `**Rig ${topRig[0] || 'Unknown'}** generated the highest cost impact at **${formatCurrencyVal(topRig[1])}**.` };
  }

  if (q.includes('top npt categories') || q.includes('top category')) {
    const catCosts = records.reduce((acc, r) => { acc[r.NPTCategory] = (acc[r.NPTCategory] || 0) + r.CostImpact; return acc; }, {} as Record<string, number>);
    const topCats = Object.entries(catCosts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let content = `The top NPT categories by cost impact are:\n`;
    topCats.forEach((c, i) => { content += `${i + 1}. **${formatActionableCategory(c[0])}**: ${formatCurrencyVal(c[1])}\n`; });
    return { title: "Query Result", content };
  }

  if (q.includes('offshore') && q.includes('onshore') && q.includes('compare')) {
    const offshoreCost = records.filter(r => r.Well_Type === 'Offshore').reduce((sum, r) => sum + r.CostImpact, 0);
    const onshoreCost = records.filter(r => r.Well_Type === 'Onshore' || r.Well_Type === 'Land').reduce((sum, r) => sum + r.CostImpact, 0);
    return { title: "Query Result", content: `**Offshore Cost Impact:** ${formatCurrencyVal(offshoreCost)}\n**Onshore Cost Impact:** ${formatCurrencyVal(onshoreCost)}` };
  }

  if (q.includes('compare asset')) {
    // Basic comparison of first two assets found in data
    const assets = Array.from(new Set(records.map(r => r.Asset).filter(Boolean)));
    if (assets.length < 2) return { title: "Query Result", content: "Not enough distinct assets in the current filter to compare." };
    const a1 = assets[0];
    const a2 = assets[1];
    const c1 = records.filter(r => r.Asset === a1).reduce((s, r) => s + r.CostImpact, 0);
    const c2 = records.filter(r => r.Asset === a2).reduce((s, r) => s + r.CostImpact, 0);
    return { title: "Query Result", content: `**Asset ${a1}** has a cost impact of ${formatCurrencyVal(c1)}, whereas **Asset ${a2}** has a cost impact of ${formatCurrencyVal(c2)}.` };
  }

  return { title: "Query Not Understood", content: "I am a deterministic local AI engine. Try asking about 'highest downtime asset', 'highest cost rig', 'compare offshore and onshore', or 'savings opportunity'." };
}
