"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend
} from 'recharts'
import { FileSpreadsheet, TrendingUp, TrendingDown, Clock, DollarSign, Activity, Target } from "lucide-react"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"

export default function ExecutiveCommandCenter() {
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
        <p className="text-muted-foreground mb-6 max-w-md">
          Please wait for the database to load or upload a dataset.
        </p>
      </div>
    )
  }

  // KPIs
  const totalEvents = data.length
  const totalNPT = data.reduce((acc, curr) => acc + curr.NPTHours, 0)
  const totalCostImpact = data.reduce((acc, curr) => acc + curr.CostImpact, 0)
  const totalTimeSaved = data.reduce((acc, curr) => acc + curr.TimeSavedHours, 0)
  const totalCostSaved = data.reduce((acc, curr) => acc + curr.CostSaved, 0)

  const interventionRecords = data.filter(d => d.TimeSavedHours > 0)
  const numberOfInterventions = interventionRecords.length
  const avgTimeSaved = numberOfInterventions > 0 ? totalTimeSaved / numberOfInterventions : 0

  // Executive Insights Logic
  const categoryInterventions = data.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) acc[curr.NPTCategory] = { name: curr.NPTCategory, NPTHours: 0, TimeSaved: 0, CostSaved: 0, applications: 0, CostImpact: 0 };
    acc[curr.NPTCategory].NPTHours += curr.NPTHours;
    acc[curr.NPTCategory].TimeSaved += curr.TimeSavedHours;
    acc[curr.NPTCategory].CostSaved += curr.CostSaved;
    acc[curr.NPTCategory].CostImpact += curr.CostImpact;
    if (curr.TimeSavedHours > 0) acc[curr.NPTCategory].applications += 1;
    return acc;
  }, {} as Record<string, any>);

  const actionableCats = Object.values(categoryInterventions).filter(c => isActionableCategory(c.name));
  
  const mostEffectiveIntervention = [...actionableCats].sort((a, b) => b.CostSaved - a.CostSaved)[0];
  const highestSavingsOpp = [...actionableCats].sort((a, b) => (b.CostImpact - b.CostSaved) - (a.CostImpact - a.CostSaved))[0];

  // Monthly trends
  let cumulativeTimeSaved = 0;
  let cumulativeCostSaved = 0;

  const monthlyDataMap = data.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) {
      acc[month] = { month, NPTHours: 0, CostImpact: 0, CostSaved: 0, TimeSaved: 0, interventions: 0 };
    }
    acc[month].NPTHours += curr.NPTHours;
    acc[month].CostImpact += curr.CostImpact;
    acc[month].CostSaved += curr.CostSaved;
    acc[month].TimeSaved += curr.TimeSavedHours;
    if (curr.TimeSavedHours > 0) acc[month].interventions += 1;

    return acc;
  }, {} as Record<string, any>);

  const monthlyData = Object.values(monthlyDataMap).sort((a: any, b: any) => a.month.localeCompare(b.month)).map(m => {
    cumulativeTimeSaved += m.TimeSaved;
    cumulativeCostSaved += m.CostSaved;
    return {
      ...m,
      cumulativeTimeSaved,
      cumulativeCostSaved,
      efficiency: m.NPTHours > 0 ? (m.TimeSaved / m.NPTHours) * 100 : 0
    };
  });

  const topPerformingInterventions = [...actionableCats].sort((a, b) => b.CostSaved - a.CostSaved).slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Command Center</h1>
          <p className="text-muted-foreground mt-1">Intervention impact, operational savings, and value realization.</p>
        </div>
      </div>

      {/* Dynamic Executive Insights */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Target className="h-5 w-5" />
            Intervention Impact Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500/10 p-2 rounded-md">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Most Effective Intervention</p>
                <p className="font-bold text-foreground">
                  {mostEffectiveIntervention ? formatActionableCategory(mostEffectiveIntervention.name) : 'N/A'} 
                </p>
                <p className="text-xs text-emerald-600 font-semibold">
                  {mostEffectiveIntervention ? formatCurrency(mostEffectiveIntervention.CostSaved, true) : '$0'} saved
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 p-2 rounded-md">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Avg Time Saved Per Intervention</p>
                <p className="font-bold text-foreground">
                  {avgTimeSaved.toFixed(1)} hours
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  Across {numberOfInterventions.toLocaleString()} applications
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-500/10 p-2 rounded-md">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Highest Savings Opportunity</p>
                <p className="font-bold text-foreground truncate max-w-[200px]" title={highestSavingsOpp?.name}>
                  {highestSavingsOpp ? formatActionableCategory(highestSavingsOpp.name) : 'N/A'}
                </p>
                <p className="text-xs text-orange-600 font-semibold">
                  {highestSavingsOpp ? formatCurrency(highestSavingsOpp.CostImpact - highestSavingsOpp.CostSaved, true) : '$0'} recoverable
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-md">
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Overall Recovery Rate</p>
                <p className="font-bold text-foreground">
                  {totalNPT > 0 ? ((totalTimeSaved / totalNPT) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-primary font-semibold">
                  Of all NPT time mitigated
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total NPT Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Downtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalNPT.toLocaleString(undefined, { maximumFractionDigits: 0 })}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Cost Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{formatCurrency(totalCostImpact, true)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Time Saved</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{totalTimeSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Cost Saved</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalCostSaved, true)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Interventions</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-500">{numberOfInterventions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time Saved vs Time Lost</CardTitle>
            <CardDescription>Monthly comparison of NPT mitigation efficiency.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hours`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="NPTHours" name="Time Lost" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TimeSaved" name="Time Saved" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Saved vs Cost Impact</CardTitle>
            <CardDescription>Monthly financial recovery performance.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="CostImpact" name="Cost Impact" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CostSaved" name="Cost Saved" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Cumulative Savings Achieved</CardTitle>
            <CardDescription>Total financial value generated through interventions over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cumulativeCostSaved" stroke="var(--color-emerald-500)" fill="var(--color-emerald-500)" fillOpacity={0.2} name="Total Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intervention Adoption Trend</CardTitle>
            <CardDescription>Volume of successful interventions deployed per month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip 
                  formatter={(value: any) => `${value} interventions`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="interventions" stroke="var(--color-blue-500)" strokeWidth={3} dot={{ r: 4 }} name="Interventions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Interventions</CardTitle>
            <CardDescription>Ranked by total cost saved.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformingInterventions} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 10 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar dataKey="CostSaved" fill="var(--color-emerald-500)" radius={[0, 4, 4, 0]} name="Cost Saved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
