"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"
import { FileSpreadsheet, Trophy, Target, Award, ArrowRight, Lightbulb, TrendingUp } from "lucide-react"

export default function InterventionIntelligence() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const { formatCurrency } = useCurrencyFormatter()

  if (!activeDatasetId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <FileSpreadsheet className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
      </div>
    )
  }

  // 1. Intervention Performance Dashboard Metrics
  const categoryStats = data.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) {
      acc[curr.NPTCategory] = { name: curr.NPTCategory, NPTHours: 0, TimeSaved: 0, CostSaved: 0, CostImpact: 0, Apps: 0 };
    }
    acc[curr.NPTCategory].NPTHours += curr.NPTHours;
    acc[curr.NPTCategory].TimeSaved += curr.TimeSavedHours;
    acc[curr.NPTCategory].CostSaved += curr.CostSaved;
    acc[curr.NPTCategory].CostImpact += curr.CostImpact;
    if (curr.TimeSavedHours > 0) acc[curr.NPTCategory].Apps += 1;
    return acc;
  }, {} as Record<string, any>);

  const interventions = Object.values(categoryStats)
    .filter(cat => isActionableCategory(cat.name) && cat.TimeSaved > 0)
    .map(cat => ({
      ...cat,
      SuccessRate: cat.NPTHours > 0 ? (cat.TimeSaved / cat.NPTHours) * 100 : 0,
      ROI: cat.CostImpact > 0 ? (cat.CostSaved / cat.CostImpact) * 100 : 0
    }))
    .sort((a, b) => b.CostSaved - a.CostSaved);

  // 4. Savings Waterfall Data
  let currentWaterfall = 0;
  const waterfallData = interventions.map(inv => {
    const start = currentWaterfall;
    currentWaterfall += inv.CostSaved;
    return {
      name: formatActionableCategory(inv.name),
      start,
      end: currentWaterfall,
      value: inv.CostSaved,
      range: [start, currentWaterfall]
    }
  });

  // 6. Intervention Heatmap Data (Rows: Interventions, Columns: Assets)
  const uniqueAssets = Array.from(new Set(data.map(d => d.Asset).filter(Boolean))).sort();
  const heatmapData = interventions.map(inv => {
    const assetSavings = uniqueAssets.reduce((acc, asset) => {
      acc[asset] = data
        .filter(d => d.NPTCategory === inv.name && d.Asset === asset)
        .reduce((sum, d) => sum + d.TimeSavedHours, 0);
      return acc;
    }, {} as Record<string, number>);
    return { name: inv.name, ...assetSavings };
  });
  const maxHeatmapValue = Math.max(...heatmapData.flatMap(h => uniqueAssets.map(a => (h as any)[a] || 0)), 1);

  // 8. Recommended Next Intervention
  const highestUnrecoveredCost = Object.values(categoryStats)
    .filter(cat => isActionableCategory(cat.name))
    .sort((a, b) => (b.CostImpact - b.CostSaved) - (a.CostImpact - a.CostSaved))[0];
  
  const recommendationText = highestUnrecoveredCost 
    ? `"${highestUnrecoveredCost.name}" remains the highest contributor to unmitigated financial loss (${formatCurrency(highestUnrecoveredCost.CostImpact - highestUnrecoveredCost.CostSaved, true)}). Interventions targeting this category have historically achieved a ${((highestUnrecoveredCost.TimeSaved / highestUnrecoveredCost.NPTHours) * 100 || 0).toFixed(1)}% recovery rate. Recommend prioritizing dedicated mitigation strategies for this category across all underperforming assets.`
    : "No outstanding intervention recommendations at this time.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intervention Intelligence</h1>
          <p className="text-muted-foreground mt-1">Primary module for tracking and comparing intervention performance.</p>
        </div>
      </div>

      <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-600">
            <Lightbulb className="h-5 w-5" />
            Recommended Next Intervention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm md:text-base font-medium leading-relaxed">
            {recommendationText}
          </p>
        </CardContent>
      </Card>

      {/* 1. Performance Dashboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Intervention Performance Dashboard</CardTitle>
          <CardDescription>Comprehensive metrics for all successful interventions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Intervention / Category</th>
                  <th className="px-4 py-3 font-medium text-right"># Apps</th>
                  <th className="px-4 py-3 font-medium text-right">Time Saved</th>
                  <th className="px-4 py-3 font-medium text-right">Cost Saved</th>
                  <th className="px-4 py-3 font-medium text-right">Success Rate</th>
                  <th className="px-4 py-3 font-medium text-right">ROI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {interventions.map((inv) => (
                  <tr key={inv.name} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{formatActionableCategory(inv.name)}</td>
                    <td className="px-4 py-3 text-right">{inv.Apps}</td>
                    <td className="px-4 py-3 text-right">{inv.TimeSaved.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(inv.CostSaved, true)}</td>
                    <td className="px-4 py-3 text-right">{inv.SuccessRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">{inv.ROI.toFixed(1)}%</td>
                  </tr>
                ))}
                {interventions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No successful interventions recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. Top Intervention Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Leaderboard: Top Interventions
            </CardTitle>
            <CardDescription>Ranked by absolute financial value recovered.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interventions.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 10 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="CostSaved" fill="var(--color-emerald-500)" radius={[0, 4, 4, 0]} name="Value Saved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Savings Waterfall Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Cumulative Savings Waterfall
            </CardTitle>
            <CardDescription>Cumulative financial contribution of each intervention.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData.slice(0, 8)} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value[1] - value[0]))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="range" fill="var(--color-blue-500)" radius={[4, 4, 0, 0]} name="Cumulative Savings">
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === waterfallData.length - 1 ? 'var(--color-emerald-500)' : 'var(--color-blue-500)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 6. Intervention Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Asset vs Intervention Heatmap</CardTitle>
          <CardDescription>Time Saved (Hours) across all assets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium w-48 sticky left-0 bg-card z-10 border-r border-b">Intervention</th>
                  {uniqueAssets.map(asset => (
                    <th key={asset} className="px-4 py-2 font-medium text-center border-b min-w-[100px]">{asset}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((inv) => (
                  <tr key={inv.name} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium sticky left-0 bg-card z-10 border-r truncate" title={formatActionableCategory(inv.name)}>
                      {formatActionableCategory(inv.name)}
                    </td>
                    {uniqueAssets.map(asset => {
                      const val = (inv as any)[asset] || 0;
                      const intensity = val > 0 ? 0.1 + (val / maxHeatmapValue) * 0.9 : 0;
                      return (
                        <td key={asset} className="p-1 text-center border-r last:border-0">
                          <div 
                            className="w-full h-8 flex items-center justify-center rounded text-xs font-semibold"
                            style={{ 
                              backgroundColor: val > 0 ? `rgba(16, 185, 129, ${intensity})` : 'transparent',
                              color: intensity > 0.5 ? 'white' : 'inherit'
                            }}
                          >
                            {val > 0 ? val.toFixed(1) : '-'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {heatmapData.length === 0 && (
                  <tr>
                    <td colSpan={uniqueAssets.length + 1} className="px-4 py-8 text-center text-muted-foreground">No intervention data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
