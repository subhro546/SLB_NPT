"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, LineChart, PieChart, Pie, Cell, Legend, Scatter
} from 'recharts'
import { FileSpreadsheet, AlertCircle, Activity, Gauge, Focus } from "lucide-react"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

export default function AdvancedAnalytics() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const { formatCurrency } = useCurrencyFormatter()

  if (!activeDatasetId || data.length === 0) {
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

  // --- Data Calculations ---
  
  // 1. Pareto Analysis (Cost Impact 80/20)
  const categoryCosts = data.reduce((acc, curr) => {
    const cat = curr.NPTCategory || 'Unknown'
    acc[cat] = (acc[cat] || 0) + curr.CostImpact;
    return acc;
  }, {} as Record<string, number>);

  const totalCost = Object.values(categoryCosts).reduce((a, b) => a + b, 0);

  const sortedCats = Object.entries(categoryCosts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, cost]) => ({ cat, cost }));

  let cumulative = 0;
  const paretoData = sortedCats.slice(0, 15).map(item => {
    cumulative += item.cost;
    return {
      category: item.cat,
      cost: item.cost,
      cumulativePct: (cumulative / totalCost) * 100
    };
  });

  // 2. Composition Analysis (Donut Chart - Cost Only)
  const top5CatCosts = sortedCats.slice(0, 5).map(c => ({ name: c.cat, value: c.cost }));
  const otherCatCost = sortedCats.slice(5).reduce((a, b) => a + b.cost, 0);
  if (otherCatCost > 0) top5CatCosts.push({ name: 'Other', value: otherCatCost });

  // 3. Rankings (Top Categories & Top Wells)
  const topCategoriesBarData = sortedCats.slice(0, 10).map(item => ({
    name: item.cat,
    cost: item.cost
  }));

  const wellCosts = data.reduce((acc, curr) => {
    const well = curr.Well || 'Unknown'
    acc[well] = (acc[well] || 0) + curr.CostImpact;
    return acc;
  }, {} as Record<string, number>);

  const topWellsBarData = Object.entries(wellCosts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([well, cost]) => ({ name: well, cost }));

  // 4. Monthly Cost Impact Trend
  const monthlyDataMap = data.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) acc[month] = { month, cost: 0 };
    acc[month].cost += curr.CostImpact;
    return acc;
  }, {} as Record<string, { month: string, cost: number }>);
  
  const trendData = Object.values(monthlyDataMap).sort((a: any, b: any) => a.month.localeCompare(b.month));

  // 5. Percentile & Uncertainty Analysis (P10/P50/P90)
  const top10CatsNames = sortedCats.slice(0, 10).map(c => c.cat);
  const catDurations = top10CatsNames.reduce((acc, cat) => {
    acc[cat] = data.filter(d => (d.NPTCategory || 'Unknown') === cat).map(d => d.NPTHours).sort((a, b) => a - b);
    return acc;
  }, {} as Record<string, number[]>);

  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  };

  const getMean = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const percentileTableData = top10CatsNames.map(cat => {
    const P10 = getPercentile(catDurations[cat], 10);
    const P50 = getPercentile(catDurations[cat], 50);
    const P90 = getPercentile(catDurations[cat], 90);
    return {
      category: cat,
      mean: getMean(catDurations[cat]),
      P10,
      P50,
      P90,
      spread: P90 - P10,
      riskGap: P90 - P50,
      // For floating bar chart [min, max]
      range: [P10, P90]
    };
  });

  // Uncertainty Summaries
  const mostUnpredictable = [...percentileTableData].sort((a, b) => b.spread - a.spread)[0];
  const mostConsistent = [...percentileTableData].filter(d => catDurations[d.category].length > 5).sort((a, b) => a.spread - b.spread)[0];
  const highestRiskGap = [...percentileTableData].sort((a, b) => b.riskGap - a.riskGap)[0];

  // Box plot data (top 5 to not clutter)
  const boxPlotData = percentileTableData.slice(0, 5);

  // Risk Gap Bar Data
  const riskGapData = percentileTableData.slice(0, 5).sort((a, b) => b.riskGap - a.riskGap);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep operational metrics, risk variance, and uncertainty analysis.</p>
        </div>
      </div>

      {/* Executive Insights regarding Uncertainty */}
      <Card className="border-l-4 border-l-destructive shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Executive Insights: Operational Uncertainty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Highest Variance:</strong> 
              {" "}<span className="text-destructive font-semibold">{mostUnpredictable?.category || 'N/A'}</span> exhibits the most operational unpredictability. 
              The spread between best-case (P10) and worst-case (P90) scenarios is a staggering <span className="text-foreground font-semibold">{(mostUnpredictable?.spread || 0).toFixed(1)} hours</span>.
            </li>
            <li>
              <strong className="text-foreground">Largest Risk Gap:</strong> 
              {" "}When operations involving <span className="text-orange-600 font-semibold">{highestRiskGap?.category || 'N/A'}</span> slip past their median duration, they consume an additional <span className="text-foreground font-semibold">{(highestRiskGap?.riskGap || 0).toFixed(1)} hours</span> of unplanned downtime before resolving.
            </li>
            <li>
              <strong className="text-foreground">Most Predictable:</strong> 
              {" "}<span className="text-emerald-600 font-semibold">{mostConsistent?.category || 'N/A'}</span> has the tightest execution variance ({(mostConsistent?.spread || 0).toFixed(1)} hour spread), making it highly predictable for planning purposes.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Uncertainty Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Most Unpredictable Category</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={mostUnpredictable?.category}>{mostUnpredictable?.category || 'N/A'}</h3>
              <p className="text-sm font-semibold text-destructive">{(mostUnpredictable?.spread || 0).toFixed(1)}h (P10-P90 Spread)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-full">
              <Gauge className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Highest P90 Risk Gap</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={highestRiskGap?.category}>{highestRiskGap?.category || 'N/A'}</h3>
              <p className="text-sm font-semibold text-orange-600">+{(highestRiskGap?.riskGap || 0).toFixed(1)}h beyond Median</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-full">
              <Focus className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Most Consistent Category</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={mostConsistent?.category}>{mostConsistent?.category || 'N/A'}</h3>
              <p className="text-sm font-semibold text-emerald-600">{(mostConsistent?.spread || 0).toFixed(1)}h (P10-P90 Spread)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Box Plot by Category */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Operational Variance (Box Plot Equivalent)</CardTitle>
            <CardDescription>Visualizing the P10 to P90 duration spread. The dot represents the P50 median.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={boxPlotData} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" name="Hours" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'range') return [`${value[0].toFixed(1)}h to ${value[1].toFixed(1)}h`, 'P10-P90 Spread'];
                    if (name === 'P50') return [`${Number(value).toFixed(1)}h`, 'Median (P50)'];
                    return [value, name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                {/* Floating bar for P10 to P90 */}
                <Bar dataKey="range" fill="var(--color-primary)" opacity={0.3} barSize={20} radius={4} name="Spread" />
                {/* Scatter dot for P50 Median */}
                <Scatter dataKey="P50" fill="var(--color-primary)" name="P50" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* P90-P50 Risk Gap Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>P90-P50 Risk Gap Analysis</CardTitle>
            <CardDescription>Extra hours consumed when operations slip to worst-case.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskGapData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={80} tickFormatter={formatActionableCategory} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(value: any) => [`+${Number(value).toFixed(1)} hrs`, 'Risk Gap']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="riskGap" fill="var(--color-orange-500)" radius={[4, 4, 0, 0]} name="Risk Gap" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Composition: Cost Impact Share */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Impact Share by Category</CardTitle>
            <CardDescription>Top contributors to total financial loss.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top5CatCosts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {top5CatCosts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), formatActionableCategory(name)]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} formatter={(value: any) => formatActionableCategory(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Percentile Data Table */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle>Variability & Uncertainty Ranking</CardTitle>
            <CardDescription>
              Detailed breakdown of P10, P50, and P90 values. Categories with high Spreads and Risk Gaps represent severe operational risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right text-emerald-600">P10 (Best 10%)</th>
                    <th className="px-4 py-3 font-medium text-right text-primary">P50 (Median)</th>
                    <th className="px-4 py-3 font-medium text-right text-destructive">P90 (Worst 10%)</th>
                    <th className="px-4 py-3 font-medium text-right">Spread (P90-P10)</th>
                    <th className="px-4 py-3 font-medium text-right text-orange-600">Risk Gap (P90-P50)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {percentileTableData.map((row) => (
                    <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {row.category}
                        {isActionableCategory(row.category) && <span className="ml-2 text-emerald-500" title="Savable Category">🟢</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">{row.P10.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-primary font-medium">{row.P50.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-destructive font-bold">{row.P90.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right">{row.spread.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium">+{row.riskGap.toFixed(1)}h</td>
                    </tr>
                  ))}
                  {percentileTableData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No percentile data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pareto Analysis */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Pareto Analysis (Cost Impact 80/20)</CardTitle>
            <CardDescription>Identifying the vital few categories driving the majority of cost.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} tickFormatter={formatActionableCategory} />
                <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                <RechartsTooltip 
                  formatter={(value: any, name: any) => [
                    name === 'cost' ? formatCurrency(Number(value)) : `${Number(value).toFixed(1)}%`,
                    name === 'cost' ? 'Cost Impact' : 'Cumulative %'
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="cost" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rankings: Top Cost Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Categories by Cost Impact</CardTitle>
            <CardDescription>Ranked breakdown of highest priority issues.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategoriesBarData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="cost" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} name="Cost Impact" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rankings: Top Cost Wells */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Wells by Cost Impact</CardTitle>
            <CardDescription>Locations requiring immediate operational focus.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topWellsBarData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="cost" fill="var(--color-primary)" radius={[0, 4, 4, 0]} name="Cost Impact" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend: Monthly Cost Impact */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Cost Impact Trend</CardTitle>
            <CardDescription>Tracking total financial loss across time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="cost" stroke="var(--color-destructive)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Cost Impact" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
