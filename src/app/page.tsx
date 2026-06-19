"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { FileSpreadsheet, TrendingDown, Clock, DollarSign, Activity, Target } from "lucide-react"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

export default function ExecutiveCommandCenter() {
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

  // KPIs
  const totalEvents = data.length
  const totalHoursLost = data.reduce((acc, curr) => acc + curr.Hours, 0)
  const totalTimeSaved = data.reduce((acc, curr) => acc + curr.TimeSaved, 0)
  const totalCostImpact = data.reduce((acc, curr) => acc + curr.CostImpact, 0)
  const totalEstimatedSavings = data.reduce((acc, curr) => acc + curr.CostSaved, 0)
  const avgTimeSaved = totalEvents > 0 ? totalTimeSaved / totalEvents : 0

  // 1 & 2. Time Saved and Cost Impact by Category
  const categoryAgg = data.reduce((acc, curr) => {
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, TimeSaved: 0, CostImpact: 0 };
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    acc[curr.Category].CostImpact += curr.CostImpact;
    return acc;
  }, {} as Record<string, any>);

  const timeSavedByCategory = Object.values(categoryAgg)
    .sort((a, b) => b.TimeSaved - a.TimeSaved)
    .slice(0, 10);
  
  const costImpactByCategory = Object.values(categoryAgg)
    .sort((a, b) => b.CostImpact - a.CostImpact)
    .slice(0, 10);

  // 3. Time Saved by Rig
  const rigAgg = data.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, TimeSaved: 0 };
    acc[curr.RigName].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const timeSavedByRig = Object.values(rigAgg)
    .sort((a, b) => b.TimeSaved - a.TimeSaved)
    .slice(0, 10);

  // 4. Time Saved by Company Code
  const companyAgg = data.reduce((acc, curr) => {
    if (!acc[curr.CompanyCode]) acc[curr.CompanyCode] = { name: curr.CompanyCode, TimeSaved: 0 };
    acc[curr.CompanyCode].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const timeSavedByCompanyCode = Object.values(companyAgg)
    .sort((a, b) => b.TimeSaved - a.TimeSaved)
    .slice(0, 10);

  // 5. Offshore vs Onshore
  const onshoreOffshoreAgg = data.reduce((acc, curr) => {
    const key = curr.OnshoreOffshore || 'Unknown';
    if (!acc[key]) acc[key] = { name: key, TimeSaved: 0 };
    acc[key].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const onshoreOffshoreData = Object.values(onshoreOffshoreAgg);

  // 6. Development vs Exploratory Comparison
  const wellCatAgg = data.reduce((acc, curr) => {
    const key = curr.WellCategory === 'D' ? 'Development' : curr.WellCategory === 'E' ? 'Exploratory' : curr.WellCategory || 'Unknown';
    if (!acc[key]) acc[key] = { name: key, TimeSaved: 0 };
    acc[key].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const wellCategoryData = Object.values(wellCatAgg);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Intervention impact, operational savings, and value realization.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Hours Lost</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{totalHoursLost.toLocaleString(undefined, { maximumFractionDigits: 0 })}h</div>
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
            <CardTitle className="text-xs font-medium">Total Estimated Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalEstimatedSavings, true)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Avg Time Saved / Event</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-500">{avgTimeSaved.toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Saved by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Time Saved by Category</CardTitle>
            <CardDescription>Highest performing intervention categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSavedByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `${v}h`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="TimeSaved" fill="var(--color-emerald-500)" radius={[0, 4, 4, 0]} name="Time Saved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Impact by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Impact by Category</CardTitle>
            <CardDescription>Categories causing the highest financial loss.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costImpactByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="CostImpact" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} name="Cost Impact" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Saved by Rig */}
        <Card>
          <CardHeader>
            <CardTitle>Time Saved by Rig</CardTitle>
            <CardDescription>Rigs generating the most operational efficiency.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSavedByRig} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `${v}h`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="TimeSaved" fill="var(--color-primary)" radius={[0, 4, 4, 0]} name="Time Saved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Saved by Company Code */}
        <Card>
          <CardHeader>
            <CardTitle>Time Saved by Company Code</CardTitle>
            <CardDescription>Operators successfully applying interventions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSavedByCompanyCode} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `${v}h`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" interval={0} width={100} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="TimeSaved" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} name="Time Saved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Offshore vs Onshore Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Offshore vs Onshore Savings</CardTitle>
            <CardDescription>Time saved distribution across operational environments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={onshoreOffshoreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="TimeSaved"
                >
                  {onshoreOffshoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} hrs`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Development vs Exploratory Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Development vs Exploratory Savings</CardTitle>
            <CardDescription>Time saved by well category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wellCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="TimeSaved"
                >
                  {wellCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} hrs`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
