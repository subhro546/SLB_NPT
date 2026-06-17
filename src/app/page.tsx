"use client"

import { useState } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, AreaChart, Area
} from 'recharts'
import { FileSpreadsheet, AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"

export default function ExecutiveCommandCenter() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const { formatCurrency } = useCurrencyFormatter()
  const [showAllCategories, setShowAllCategories] = useState(false)

  if (!activeDatasetId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <FileSpreadsheet className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please wait for the database to load or upload a dataset.
        </p>
      </div>
    )
  }

  // KPIs
  const totalWells = new Set(data.map(d => d.Well)).size
  const totalNPT = data.reduce((acc, curr) => acc + curr.NPTHours, 0)
  const totalCostImpact = data.reduce((acc, curr) => acc + curr.CostImpact, 0)
  const totalTimeSaved = data.reduce((acc, curr) => acc + curr.TimeSavedHours, 0)
  const totalCostSaved = data.reduce((acc, curr) => acc + curr.CostSaved, 0)

  // Executive Insights Logic
  const categoryCosts = data.reduce((acc, curr) => {
    acc[curr.NPTCategory] = (acc[curr.NPTCategory] || 0) + curr.CostImpact;
    return acc;
  }, {} as Record<string, number>);
  const topCostDriver = Object.entries(categoryCosts).sort((a, b) => b[1] - a[1])[0];

  const wellEfficiency = data.reduce((acc, curr) => {
    if (!acc[curr.Well]) acc[curr.Well] = { NPTHours: 0, TimeSaved: 0 };
    acc[curr.Well].NPTHours += curr.NPTHours;
    acc[curr.Well].TimeSaved += curr.TimeSavedHours;
    return acc;
  }, {} as Record<string, { NPTHours: number, TimeSaved: number }>);
  
  const wellEfficiencyRanks = Object.entries(wellEfficiency)
    .filter(([_, metrics]) => metrics.NPTHours > 0)
    .map(([well, metrics]) => ({ well, efficiency: (metrics.TimeSaved / metrics.NPTHours) * 100 }))
    .sort((a, b) => b.efficiency - a.efficiency);

  const mostEfficientWell = wellEfficiencyRanks[0];
  const leastEfficientWell = wellEfficiencyRanks[wellEfficiencyRanks.length - 1];

  const largestSavingOpp = Object.entries(wellEfficiency)
    .map(([well, metrics]) => ({ well, potential: metrics.NPTHours - metrics.TimeSaved }))
    .sort((a, b) => b.potential - a.potential)[0];


  // Monthly trends base map
  const monthlyDataMap = data.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) {
      acc[month] = { 
        month, NPTHours: 0, CostImpact: 0, CostSaved: 0, TimeSaved: 0, eventCount: 0,
        cats: {} as Record<string, number>,
        parties: {} as Record<string, number>
      };
    }
    acc[month].NPTHours += curr.NPTHours;
    acc[month].CostImpact += curr.CostImpact;
    acc[month].CostSaved += curr.CostSaved;
    acc[month].TimeSaved += curr.TimeSavedHours;
    acc[month].eventCount += 1;
    acc[month].cats[curr.NPTCategory] = (acc[month].cats[curr.NPTCategory] || 0) + curr.CostImpact;
    const party = curr.ResponsibleParty || 'Unknown';
    acc[month].parties[party] = (acc[month].parties[party] || 0) + curr.CostImpact;

    return acc;
  }, {} as Record<string, any>);

  const overallCats = data.reduce((acc, c) => { acc[c.NPTCategory] = (acc[c.NPTCategory] || 0) + c.CostImpact; return acc; }, {} as Record<string, number>);
  const top5Cats = Object.entries(overallCats).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
  const topCostDriverName = top5Cats[0] || 'Unknown';

  const overallParties = data.reduce((acc, c) => { 
    const p = c.ResponsibleParty || 'Unknown';
    acc[p] = (acc[p] || 0) + c.CostImpact; return acc; 
  }, {} as Record<string, number>);
  const top5Parties = Object.entries(overallParties).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
  
  const monthlyData = Object.values(monthlyDataMap).sort((a: any, b: any) => a.month.localeCompare(b.month)).map(m => {
    const res: any = {
      month: m.month,
      CostImpact: m.CostImpact,
      eventCount: m.eventCount,
      Efficiency: m.NPTHours > 0 ? (m.TimeSaved / m.NPTHours) * 100 : 0,
      TopDriverCost: m.cats[topCostDriverName] || 0
    };

    let otherCatCost = 0;
    top5Cats.forEach(c => res[`cat_${c}`] = 0);
    Object.keys(m.cats).forEach(c => {
      if (top5Cats.includes(c)) res[`cat_${c}`] = m.cats[c];
      else otherCatCost += m.cats[c];
    });
    res['cat_Other'] = otherCatCost;

    let otherPartyCost = 0;
    top5Parties.forEach(p => res[`party_${p}`] = 0);
    Object.keys(m.parties).forEach(p => {
      if (top5Parties.includes(p)) res[`party_${p}`] = m.parties[p];
      else otherPartyCost += m.parties[p];
    });
    res['party_Other'] = otherPartyCost;

    return res;
  });

  const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

  // Category Contribution List Data
  const sortedCategories = Object.entries(categoryCosts)
    .map(([cat, cost]) => {
      const hours = data.filter(d => d.NPTCategory === cat).reduce((sum, curr) => sum + curr.NPTHours, 0);
      const costPct = totalCostImpact > 0 ? (cost / totalCostImpact) * 100 : 0;
      const hoursPct = totalNPT > 0 ? (hours / totalNPT) * 100 : 0;
      return { cat, cost, hours, costPct, hoursPct };
    })
    .sort((a, b) => b.cost - a.cost);

  const displayedCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Command Center</h1>
          <p className="text-muted-foreground mt-1">High-level operations intelligence and financial impact.</p>
        </div>
      </div>

      {/* Dynamic Executive Insights */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <AlertTriangle className="h-5 w-5" />
            Executive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-destructive/10 p-2 rounded-md">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Top Cost Driver</p>
                <p className="font-bold text-foreground">
                  {topCostDriver ? topCostDriver[0] : 'N/A'} 
                </p>
                <p className="text-xs text-destructive font-semibold">
                  {topCostDriver ? formatCurrency(topCostDriver[1], true) : '$0'} impact
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-emerald-500/10 p-2 rounded-md">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Most Efficient Well</p>
                <p className="font-bold text-foreground">
                  {mostEfficientWell ? mostEfficientWell.well : 'N/A'}
                </p>
                <p className="text-xs text-emerald-600 font-semibold">
                  {mostEfficientWell ? `${mostEfficientWell.efficiency.toFixed(1)}% recovery` : '0% recovery'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-500/10 p-2 rounded-md">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Least Efficient Well</p>
                <p className="font-bold text-foreground">
                  {leastEfficientWell ? leastEfficientWell.well : 'N/A'}
                </p>
                <p className="text-xs text-orange-600 font-semibold">
                  {leastEfficientWell ? `${leastEfficientWell.efficiency.toFixed(1)}% recovery` : '0% recovery'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 p-2 rounded-md">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Largest Saving Opportunity</p>
                <p className="font-bold text-foreground">
                  {largestSavingOpp ? largestSavingOpp.well : 'N/A'}
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  {largestSavingOpp ? `${largestSavingOpp.potential.toFixed(1)}h recoverable` : '0h recoverable'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wells</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWells.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total NPT Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNPT.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalCostImpact, true)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totalTimeSaved.toLocaleString(undefined, { maximumFractionDigits: 1 })}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Saved</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCostSaved, true)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Ranked Category Contribution Analysis */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Ranked breakdown of NPT & Cost impact</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {displayedCategories.map((item, index) => (
                <div key={item.cat} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold truncate pr-2" title={item.cat}>
                      {index + 1}. {item.cat}
                      {isActionableCategory(item.cat) && <span className="ml-2 text-emerald-500 text-xs" title="Savable Category">🟢</span>}
                    </span>
                    <span className="font-medium text-destructive whitespace-nowrap">{formatCurrency(item.cost, true)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cost</span>
                        <span>{item.costPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-destructive" style={{ width: `${item.costPct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>NPT</span>
                        <span>{item.hoursPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.hoursPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {sortedCategories.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-xs" 
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? (
                  <><ChevronUp className="h-4 w-4 mr-2" /> Show Less</>
                ) : (
                  <><ChevronDown className="h-4 w-4 mr-2" /> Show All {sortedCategories.length} Categories</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Trends Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cost Impact</CardTitle>
            <CardDescription>Primary financial baseline tracking overall NPT losses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="CostImpact" stroke="var(--color-destructive)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Cost Impact" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Event Count</CardTitle>
            <CardDescription>Tracking raw volume of NPT occurrences decoupled from cost.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip 
                  formatter={(value: any) => `${value} events`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="eventCount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Event Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Category Mix Trend</CardTitle>
            <CardDescription>Cost proportions grouped by the Top 5 Categories over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), formatActionableCategory(name.replace('cat_', ''))]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                {top5Cats.map((cat, i) => (
                  <Area isAnimationActive={false} key={cat} type="monotone" dataKey={`cat_${cat}`} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} name={cat} />
                ))}
                <Area isAnimationActive={false} type="monotone" dataKey="cat_Other" stackId="1" stroke="var(--color-muted)" fill="var(--color-muted)" name="Other" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Responsible Party Contribution Trend</CardTitle>
            <CardDescription>Cost proportions attributed to Top 5 Responsible Parties over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name.replace('party_', '')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                {top5Parties.map((party, i) => (
                  <Area isAnimationActive={false} key={party} type="monotone" dataKey={`party_${party}`} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} name={party} />
                ))}
                <Area isAnimationActive={false} type="monotone" dataKey="party_Other" stackId="1" stroke="var(--color-muted)" fill="var(--color-muted)" name="Other" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Driver Target Tracking</CardTitle>
            <CardDescription>Historical trend for the #1 overall cost driver: <strong className="text-foreground">{topCostDriverName}</strong>.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="TopDriverCost" stroke="var(--color-orange-500)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={topCostDriverName} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intervention Efficiency Trend</CardTitle>
            <CardDescription>% of NPT hours successfully recovered via intervention.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="99%" height="100%" minHeight={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} width={40} domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="Efficiency" stroke="var(--color-blue-500)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Efficiency" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
