"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line, Legend, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import { FileSpreadsheet, Trophy, Target, TrendingUp, Lightbulb } from "lucide-react"
import { formatActionableCategory } from "@/lib/constants"

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

export default function InterventionIntelligence() {
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

  // Aggregate Data for Narrative Cards
  const catAgg = data.reduce((acc, curr) => {
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, TimeSaved: 0, Events: 0, CostImpact: 0, CostSaved: 0 };
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    acc[curr.Category].Events += 1;
    acc[curr.Category].CostImpact += curr.CostImpact;
    acc[curr.Category].CostSaved += curr.CostSaved;
    return acc;
  }, {} as Record<string, any>);

  const catArr = Object.values(catAgg);
  const topCategories = [...catArr].sort((a, b) => b.TimeSaved - a.TimeSaved).slice(0, 10);
  const highestCategory = topCategories[0];

  const rigAgg = data.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, TimeSaved: 0 };
    acc[curr.RigName].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const topRigs = Object.values(rigAgg).sort((a, b) => b.TimeSaved - a.TimeSaved).slice(0, 10);
  const highestRig = topRigs[0];

  const largestOpportunity = [...catArr]
    .filter(cat => cat.name !== 'Tool Failure' && cat.name !== 'Equipment/Tool Failure')
    .sort((a, b) => (b.CostImpact - b.CostSaved) - (a.CostImpact - a.CostSaved))[0];

  // --- NEW DEEP-DIVE CHARTS ---

  // 1. Intervention Efficiency Ratio (Hours vs Time Saved)
  const effAgg = data.reduce((acc, curr) => {
    if (curr.Category === 'Tool Failure' || curr.Category === 'Equipment/Tool Failure') return acc;
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, Hours: 0, TimeSaved: 0 };
    acc[curr.Category].Hours += curr.Hours;
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  
  const efficiencyData = Object.values(effAgg)
    .sort((a, b) => b.Hours - a.Hours) // Sort by most hours lost to see the biggest impact areas
    .slice(0, 10);

  // 2. Category Matrix by Well Type
  const matrixAgg = data.reduce((acc, curr) => {
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, Development: 0, Exploratory: 0, Unknown: 0 };
    if (curr.WellCategory === 'D') acc[curr.Category].Development += curr.TimeSaved;
    else if (curr.WellCategory === 'E') acc[curr.Category].Exploratory += curr.TimeSaved;
    else acc[curr.Category].Unknown += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const matrixData = Object.values(matrixAgg).sort((a, b) => (b.Development + b.Exploratory) - (a.Development + a.Exploratory)).slice(0, 10);

  // 3. Onshore vs Offshore Time Saved
  const onshoreOffshoreAgg = data.reduce((acc, curr) => {
    const type = curr.OnshoreOffshore || 'Unknown';
    if (!acc[type]) acc[type] = { name: type, TimeSaved: 0 };
    acc[type].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const onshoreOffshoreData = Object.values(onshoreOffshoreAgg).filter(d => d.TimeSaved > 0).sort((a, b) => b.TimeSaved - a.TimeSaved);

  // 4. Cost Saving Rig Wise (Total & Average)
  const rigCostAgg = data.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, CostSaved: 0, Events: 0 };
    acc[curr.RigName].CostSaved += curr.CostSaved;
    acc[curr.RigName].Events += 1;
    return acc;
  }, {} as Record<string, any>);
  const rigCostData = Object.values(rigCostAgg)
    .filter(d => d.CostSaved > 0)
    .map(d => ({
      name: d.name,
      CostSaved: d.CostSaved,
      AvgCostSaved: d.Events > 0 ? d.CostSaved / d.Events : 0
    }))
    .sort((a, b) => b.CostSaved - a.CostSaved)
    .slice(0, 10);

  // 5. Event Distribution Rig Wise
  const rigEventAgg = data.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, Events: 0 };
    acc[curr.RigName].Events += 1;
    return acc;
  }, {} as Record<string, any>);
  const rigEventData = Object.values(rigEventAgg).sort((a, b) => b.Events - a.Events).slice(0, 10);

  // 7. Actionable Analysis: Top Recovery Rates (Category and Rig)
  const actionableAgg = data.reduce((acc, curr) => {
    if (curr.Category === 'Tool Failure' || curr.Category === 'Equipment/Tool Failure') return acc;
    if (!acc[curr.Category]) acc[curr.Category] = { name: curr.Category, Hours: 0, TimeSaved: 0 };
    acc[curr.Category].Hours += curr.Hours;
    acc[curr.Category].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const categoryRecoveryRateData = Object.values(actionableAgg)
    .filter(d => d.Hours > 0)
    .map(d => ({
      name: formatActionableCategory(d.name),
      RecoveryRate: Number(((d.TimeSaved / d.Hours) * 100).toFixed(1))
    }))
    .sort((a, b) => b.RecoveryRate - a.RecoveryRate) // Sort by HIGHEST recovery rate
    .slice(0, 10);

  const rigActionableAgg = data.reduce((acc, curr) => {
    if (curr.Category === 'Tool Failure' || curr.Category === 'Equipment/Tool Failure') return acc;
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, Hours: 0, TimeSaved: 0 };
    acc[curr.RigName].Hours += curr.Hours;
    acc[curr.RigName].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);

  const rigRecoveryRateData = Object.values(rigActionableAgg)
    .filter(d => d.Hours > 0)
    .map(d => ({
      name: d.name,
      RecoveryRate: Number(((d.TimeSaved / d.Hours) * 100).toFixed(1))
    }))
    .sort((a, b) => b.RecoveryRate - a.RecoveryRate) // Sort by HIGHEST recovery rate
    .slice(0, 10);

  // 8. Nested Pie Data (Category -> Onshore/Offshore -> Well Type)
  const catAggPie = data.reduce((acc, curr) => {
    const cat = formatActionableCategory(curr.Category);
    if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
    acc[cat].value += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const pieInnerData = Object.values(catAggPie).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 cats for inner

  const envAggPie = data.reduce((acc, curr) => {
    const cat = formatActionableCategory(curr.Category);
    if (!pieInnerData.find(d => d.name === cat)) return acc;
    
    const env = curr.OnshoreOffshore || 'Unknown';
    const key = `${cat}-${env}`;
    if (!acc[key]) acc[key] = { name: env, cat, value: 0 };
    acc[key].value += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const pieMiddleData = Object.values(envAggPie).filter(d => d.value > 0).sort((a, b) => {
    if (a.cat === b.cat) return b.value - a.value;
    const catA = pieInnerData.findIndex(c => c.name === a.cat);
    const catB = pieInnerData.findIndex(c => c.name === b.cat);
    return catA - catB;
  });

  const wellCatAggPie = data.reduce((acc, curr) => {
    const cat = formatActionableCategory(curr.Category);
    // Only include top 5 categories
    if (!pieInnerData.find(d => d.name === cat)) return acc;

    const env = curr.OnshoreOffshore || 'Unknown';
    const wt = curr.WellCategory === 'D' ? 'Development' : curr.WellCategory === 'E' ? 'Exploratory' : 'Unknown';
    const key = `${cat}-${env}-${wt}`;
    if (!acc[key]) acc[key] = { name: wt, cat, env, value: 0 };
    acc[key].value += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const pieOuterData = Object.values(wellCatAggPie).filter(d => d.value > 0).sort((a, b) => {
    if (a.cat === b.cat) {
      if (a.env === b.env) return b.value - a.value;
      const envA = pieMiddleData.findIndex(c => c.name === a.env && c.cat === a.cat);
      const envB = pieMiddleData.findIndex(c => c.name === b.env && c.cat === b.cat);
      return envA - envB;
    }
    const catA = pieInnerData.findIndex(c => c.name === a.cat);
    const catB = pieInnerData.findIndex(c => c.name === b.cat);
    return catA - catB;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intervention Intelligence</h1>
        <p className="text-muted-foreground mt-1">Deep analysis into time saved, savings opportunities, and operational effectiveness.</p>
      </div>

      {/* Narrative Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-full">
              <Trophy className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Highest Performance</p>
              <h3 className="text-lg font-bold truncate max-w-[150px]" title={highestCategory?.name}>
                {highestCategory ? formatActionableCategory(highestCategory.name) : 'N/A'}
              </h3>
              <p className="text-sm font-semibold text-emerald-600">{(highestCategory?.TimeSaved || 0).toFixed(1)}h saved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Highest Performing Rig</p>
              <h3 className="text-lg font-bold truncate max-w-[150px]" title={highestRig?.name}>
                {highestRig ? highestRig.name : 'N/A'}
              </h3>
              <p className="text-sm font-semibold text-blue-600">{(highestRig?.TimeSaved || 0).toFixed(1)}h saved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Largest Savings Opportunity</p>
              <h3 className="text-lg font-bold truncate max-w-[150px]" title={largestOpportunity?.name}>
                {largestOpportunity ? formatActionableCategory(largestOpportunity.name) : 'N/A'}
              </h3>
              <p className="text-sm font-semibold text-orange-600">
                {largestOpportunity ? formatCurrency(largestOpportunity.CostImpact - largestOpportunity.CostSaved, true) : '$0'} recoverable
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Recommended Focus Area</p>
              <h3 className="text-lg font-bold truncate max-w-[150px]" title={largestOpportunity?.name}>
                {largestOpportunity ? formatActionableCategory(largestOpportunity.name) : 'N/A'}
              </h3>
              <p className="text-sm font-semibold text-primary">Prioritize intervention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        {/* NEW: Intervention Efficiency Ratio */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Intervention Efficiency</CardTitle>
            <CardDescription>Visualizing Hours Lost vs Time Successfully Recovered by Category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={efficiencyData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} tickFormatter={formatActionableCategory} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar isAnimationActive={false} dataKey="Hours" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} name="Total Hours Lost" opacity={0.5} />
                <Bar isAnimationActive={false} dataKey="TimeSaved" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} name="Time Saved (Recovered)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* NEW: Category Matrix by Well Type */}
        <Card>
          <CardHeader>
            <CardTitle>Savings Matrix by Well Type</CardTitle>
            <CardDescription>Time saved stacked by Development vs Exploratory operations.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matrixData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} tickFormatter={formatActionableCategory} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar isAnimationActive={false} dataKey="Development" stackId="a" fill="var(--color-chart-1)" name="Development" />
                <Bar isAnimationActive={false} dataKey="Exploratory" stackId="a" fill="var(--color-chart-2)" name="Exploratory" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: Onshore vs Offshore Time Saved */}
        <Card>
          <CardHeader>
            <CardTitle>Onshore vs Offshore Time Saved</CardTitle>
            <CardDescription>Breakdown of total time saved by environment.</CardDescription>
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
                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} hrs`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: Cost Saving Rig Wise (with Average Line) */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Savings Impact Rig Wise</CardTitle>
            <CardDescription>Total cost saved vs Average cost saved per event.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rigCostData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, true)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, true)} />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" isAnimationActive={false} dataKey="CostSaved" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} name="Total Cost Saved" />
                <Line yAxisId="right" isAnimationActive={false} type="monotone" dataKey="AvgCostSaved" stroke="var(--color-primary)" strokeWidth={3} name="Average Cost Saved" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: Event Distribution Rig Wise */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution Rig Wise</CardTitle>
            <CardDescription>Number of NPT events encountered by rig.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rigEventData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} Events`, 'Frequency']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="Events" fill="var(--color-blue-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Savings Composition Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Savings Composition</CardTitle>
            <CardDescription>Share of total time saved across top categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="TimeSaved"
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} hrs`, formatActionableCategory(name)]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} formatter={(value) => formatActionableCategory(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: 3-Ring Bubble Chart with Nested Pie Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Hierarchical Savings (Nested Pie)</CardTitle>
            <CardDescription>Time saved by Categories (Inner), Onshore/Offshore (Middle), and Well Type (Outer).</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} hrs`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                <Pie data={pieInnerData} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                  {pieInnerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Pie data={pieMiddleData} dataKey="value" cx="50%" cy="50%" innerRadius={80} outerRadius={110}>
                  {pieMiddleData.map((entry, index) => {
                    const catIndex = pieInnerData.findIndex(c => c.name === entry.cat);
                    return <Cell key={`cell-${index}`} fill={COLORS[catIndex % COLORS.length]} fillOpacity={0.8} />
                  })}
                </Pie>
                <Pie data={pieOuterData} dataKey="value" cx="50%" cy="50%" innerRadius={120} outerRadius={150}>
                  {pieOuterData.map((entry, index) => {
                    const catIndex = pieInnerData.findIndex(c => c.name === entry.cat);
                    return <Cell key={`cell-${index}`} fill={COLORS[catIndex % COLORS.length]} fillOpacity={0.6} />
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: Top Rig Recovery Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Rigs (Recovery Rate)</CardTitle>
            <CardDescription>Rigs ranked by the highest percentage of NPT time successfully recovered.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rigRecoveryRateData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Recovery Rate']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="RecoveryRate" fill="var(--color-primary)" opacity={0.9} radius={[4, 4, 0, 0]} name="Recovery Rate" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REPLACED: Top Category Recovery Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Most Successful Interventions by Category</CardTitle>
            <CardDescription>Categories with the highest intervention success rate (Time Saved vs NPT Hours).</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRecoveryRateData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Recovery Rate']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="RecoveryRate" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} name="Recovery Rate" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
