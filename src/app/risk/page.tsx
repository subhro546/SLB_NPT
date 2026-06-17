"use client"

import { useState } from "react"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Target, FileSpreadsheet, ArrowUpDown, TrendingUp, AlertTriangle, DollarSign, Activity } from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

type SortField = 'rank' | 'category' | 'hours' | 'frequency' | 'avgCost' | 'riskScore';
type SortDirection = 'asc' | 'desc';

export default function RiskAnalysis() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const { formatCurrency } = useCurrencyFormatter()

  const [sortField, setSortField] = useState<SortField>('riskScore')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

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
  const categoryStats = data.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) acc[curr.NPTCategory] = { count: 0, totalCost: 0, totalHours: 0 };
    acc[curr.NPTCategory].count += 1;
    acc[curr.NPTCategory].totalCost += curr.CostImpact;
    acc[curr.NPTCategory].totalHours += curr.NPTHours;
    return acc;
  }, {} as Record<string, { count: number, totalCost: number, totalHours: number }>);

  const rawRiskDataIntermediate = Object.entries(categoryStats).map(([cat, stats]) => {
    const avgCost = stats.count > 0 ? stats.totalCost / stats.count : 0;
    return {
      category: cat,
      frequency: stats.count,
      avgCost: avgCost,
      totalHours: stats.totalHours,
    };
  });

  const maxFreq = Math.max(...rawRiskDataIntermediate.map(d => d.frequency), 1);
  const minFreq = Math.min(...rawRiskDataIntermediate.map(d => d.frequency), 0);
  const maxAvgCost = Math.max(...rawRiskDataIntermediate.map(d => d.avgCost), 1);
  const minAvgCost = Math.min(...rawRiskDataIntermediate.map(d => d.avgCost), 0);
  const maxHours = Math.max(...rawRiskDataIntermediate.map(d => d.totalHours), 1);
  const minHours = Math.min(...rawRiskDataIntermediate.map(d => d.totalHours), 0);

  const rawRiskData = rawRiskDataIntermediate.map(item => {
    const normFreq = maxFreq > minFreq ? (item.frequency - minFreq) / (maxFreq - minFreq) : 0;
    const normAvgCost = maxAvgCost > minAvgCost ? (item.avgCost - minAvgCost) / (maxAvgCost - minAvgCost) : 0;
    const normHours = maxHours > minHours ? (item.totalHours - minHours) / (maxHours - minHours) : 0;

    // 0-100 scale index
    const riskScore = (normAvgCost * 40) + (normFreq * 40) + (normHours * 20);

    return {
      ...item,
      riskScore: Number(riskScore.toFixed(1))
    };
  });

  const rankedRiskData = [...rawRiskData].sort((a, b) => b.riskScore - a.riskScore).map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  // --- Visual Summaries Data ---
  const highestRisk = rankedRiskData[0];
  const mostFrequent = [...rankedRiskData].sort((a, b) => b.frequency - a.frequency)[0];
  const highestAvgCost = [...rankedRiskData].sort((a, b) => b.avgCost - a.avgCost)[0];

  const riskDistributionData = [...rankedRiskData].slice(0, 10);

  // Responsible Party Contribution Share (Donut)
  const respPartyCosts = data.reduce((acc, curr) => {
    const party = curr.ResponsibleParty || 'Unknown';
    acc[party] = (acc[party] || 0) + curr.CostImpact;
    return acc;
  }, {} as Record<string, number>);

  const sortedRespParties = Object.entries(respPartyCosts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  
  const top5RespParties = sortedRespParties.slice(0, 5);
  const otherRespCost = sortedRespParties.slice(5).reduce((a, b) => a + b.value, 0);
  if (otherRespCost > 0) top5RespParties.push({ name: 'Other', value: otherRespCost });

  // Monthly Risk Trend
  const monthlyDataMap = data.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[month]) acc[month] = { month, count: 0, totalCost: 0, totalHours: 0 };
    acc[month].count += 1;
    acc[month].totalCost += curr.CostImpact;
    acc[month].totalHours += curr.NPTHours || 0;
    return acc;
  }, {} as Record<string, { month: string, count: number, totalCost: number, totalHours: number }>);

  const monthlyStatsIntermediate = Object.values(monthlyDataMap)
    .sort((a: any, b: any) => a.month.localeCompare(b.month))
    .map(m => {
      const avgCost = m.count > 0 ? m.totalCost / m.count : 0;
      return {
        month: m.month,
        frequency: m.count,
        avgCost: avgCost,
        totalHours: m.totalHours,
      };
    });

  const maxMonthFreq = Math.max(...monthlyStatsIntermediate.map(m => m.frequency), 1);
  const minMonthFreq = Math.min(...monthlyStatsIntermediate.map(m => m.frequency), 0);
  const maxMonthAvgCost = Math.max(...monthlyStatsIntermediate.map(m => m.avgCost), 1);
  const minMonthAvgCost = Math.min(...monthlyStatsIntermediate.map(m => m.avgCost), 0);
  const maxMonthHours = Math.max(...monthlyStatsIntermediate.map(m => m.totalHours), 1);
  const minMonthHours = Math.min(...monthlyStatsIntermediate.map(m => m.totalHours), 0);

  const riskTrendData = monthlyStatsIntermediate.map(m => {
    const normFreq = maxMonthFreq > minMonthFreq ? (m.frequency - minMonthFreq) / (maxMonthFreq - minMonthFreq) : 0;
    const normAvgCost = maxMonthAvgCost > minMonthAvgCost ? (m.avgCost - minMonthAvgCost) / (maxMonthAvgCost - minMonthAvgCost) : 0;
    const normHours = maxMonthHours > minMonthHours ? (m.totalHours - minMonthHours) / (maxMonthHours - minMonthHours) : 0;
    
    const riskScore = (normAvgCost * 40) + (normFreq * 40) + (normHours * 20);

    return {
      month: m.month,
      RiskScore: Number(riskScore.toFixed(1))
    };
  });

  // Fastest Growing Risk (Compare last month to previous month)
  let fastestGrowingRisk = 'Insufficient Data';
  if (riskTrendData.length >= 2) {
    const lastMonthStr = riskTrendData[riskTrendData.length - 1].month;
    const recentEvents = data.filter(d => d.StartDate && d.StartDate.includes(lastMonthStr));
    if (recentEvents.length > 0) {
      const recentCatCounts = recentEvents.reduce((acc, curr) => {
        acc[curr.NPTCategory] = (acc[curr.NPTCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      fastestGrowingRisk = Object.entries(recentCatCounts).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // --- Sorting Logic ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedData = [...rankedRiskData].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'rank') comparison = a.rank - b.rank;
    else if (sortField === 'category') comparison = a.category.localeCompare(b.category);
    else if (sortField === 'hours') comparison = a.totalHours - b.totalHours;
    else if (sortField === 'frequency') comparison = a.frequency - b.frequency;
    else if (sortField === 'avgCost') comparison = a.avgCost - b.avgCost;
    else if (sortField === 'riskScore') comparison = a.riskScore - b.riskScore;

    return sortDir === 'asc' ? comparison : -comparison;
  });

  const SortIcon = () => <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Analysis</h1>
          <p className="text-muted-foreground mt-1">Identify and prioritize categories driving maximum financial risk.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-destructive/10 p-2 rounded-md">
                <Target className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Highest Risk Category</p>
            </div>
            <h3 className="text-lg font-bold truncate" title={highestRisk?.category}>{formatActionableCategory(highestRisk?.category || '') || 'N/A'}</h3>
            <p className="text-xs font-semibold text-destructive mt-1">Score: {(highestRisk?.riskScore || 0).toFixed(1)} / 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-500/10 p-2 rounded-md">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Fastest Growing Risk</p>
            </div>
            <h3 className="text-lg font-bold truncate" title={fastestGrowingRisk}>{formatActionableCategory(fastestGrowingRisk) || 'N/A'}</h3>
            <p className="text-xs font-semibold text-orange-600 mt-1">Based on recent month volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-500/10 p-2 rounded-md">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Highest Cost Event Category</p>
            </div>
            <h3 className="text-lg font-bold truncate" title={highestAvgCost?.category}>{formatActionableCategory(highestAvgCost?.category || '') || 'N/A'}</h3>
            <p className="text-xs font-semibold text-blue-600 mt-1">{formatCurrency(highestAvgCost?.avgCost || 0, true)} avg cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-500/10 p-2 rounded-md">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Most Frequent Category</p>
            </div>
            <h3 className="text-lg font-bold truncate" title={mostFrequent?.category}>{formatActionableCategory(mostFrequent?.category || '') || 'N/A'}</h3>
            <p className="text-xs font-semibold text-emerald-600 mt-1">{mostFrequent?.frequency || 0} occurrences</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Top 10 Categories by Risk Score</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistributionData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => v.toFixed(0)} tick={{ fontSize: 11 }} domain={[0, 100]} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <RechartsTooltip 
                  formatter={(value: any) => Number(value).toFixed(1)}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <Bar isAnimationActive={false} dataKey="riskScore" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} name="Risk Score" />
              </BarChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        {/* Responsible Party Contribution Share (Donut) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Responsible Party Contribution Share</CardTitle>
            <CardDescription>Proportional cost impact by responsible party.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top5RespParties}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {top5RespParties.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        {/* Risk Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Aggregate Risk Trend</CardTitle>
            <CardDescription>Overall monthly Risk Score trajectory.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => v.toFixed(0)} tick={{ fontSize: 10 }} width={40} domain={[0, 100]} />
                <RechartsTooltip 
                  formatter={(value: any) => Number(value).toFixed(1)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="RiskScore" stroke="var(--color-destructive)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Risk Score" />
              </LineChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col border-primary/20 shadow-sm mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-destructive" />
            Top 10 Risk Priority List
          </CardTitle>
          <CardDescription>
            Risk Score is a <strong className="text-foreground">0-100 normalized index</strong> combining Average Cost, Frequency, and NPT Hours. Higher scores indicate categories requiring immediate operational intervention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('rank')}>
                    Rank {sortField === 'rank' && <SortIcon />}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                    Category {sortField === 'category' && <SortIcon />}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort('hours')}>
                    Total NPT Hours {sortField === 'hours' && <SortIcon />}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort('frequency')}>
                    Event Count {sortField === 'frequency' && <SortIcon />}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort('avgCost')}>
                    Avg Cost Impact {sortField === 'avgCost' && <SortIcon />}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer text-destructive transition-colors text-right" onClick={() => handleSort('riskScore')}>
                    Risk Score {sortField === 'riskScore' && <SortIcon />}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedData.slice(0, 10).map((row) => (
                  <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-muted-foreground">{row.rank}</td>
                    <td className="px-4 py-3 font-medium">
                      {row.category}
                      {isActionableCategory(row.category) && <span className="ml-2 text-emerald-500" title="Savable Category">🟢</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{row.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right">{row.frequency}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.avgCost)}</td>
                    <td className="px-4 py-3 text-right font-bold text-destructive bg-destructive/5">{row.riskScore.toFixed(1)}</td>
                  </tr>
                ))}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No records found.</td>
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
