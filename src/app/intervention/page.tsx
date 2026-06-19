"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line
} from 'recharts'
import { FileSpreadsheet, Trophy, Target, TrendingUp, Lightbulb } from "lucide-react"
import { formatActionableCategory } from "@/lib/constants"

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

  // 1. Top Categories by Time Saved
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

  // 2. Top Rigs by Time Saved
  const rigAgg = data.reduce((acc, curr) => {
    if (!acc[curr.RigName]) acc[curr.RigName] = { name: curr.RigName, TimeSaved: 0 };
    acc[curr.RigName].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const topRigs = Object.values(rigAgg).sort((a, b) => b.TimeSaved - a.TimeSaved).slice(0, 10);
  const highestRig = topRigs[0];

  // 3. Top Company Codes by Time Saved
  const compAgg = data.reduce((acc, curr) => {
    if (!acc[curr.CompanyCode]) acc[curr.CompanyCode] = { name: curr.CompanyCode, TimeSaved: 0 };
    acc[curr.CompanyCode].TimeSaved += curr.TimeSaved;
    return acc;
  }, {} as Record<string, any>);
  const topCompanies = Object.values(compAgg).sort((a, b) => b.TimeSaved - a.TimeSaved).slice(0, 10);

  // 4. Cost Impact vs Time Saved Scatter Plot
  const scatterData = catArr.map(c => ({
    name: c.name,
    x: c.TimeSaved,
    y: c.CostImpact,
    z: c.Events
  }));

  // Largest Savings Opportunity
  const largestOpportunity = [...catArr].sort((a, b) => (b.CostImpact - b.CostSaved) - (a.CostImpact - a.CostSaved))[0];

  // 5. Event Distribution by Category (just use topCategories with Events mapped)
  const eventDistribution = [...catArr].sort((a, b) => b.Events - a.Events).slice(0, 10);

  // 6. Savings Contribution Waterfall
  // Since Recharts doesn't have a native waterfall, we do a composed chart with a running total
  let runningTotal = 0;
  const waterfallData = topCategories.map((c, i) => {
    const start = runningTotal;
    const end = runningTotal + c.TimeSaved;
    runningTotal = end;
    return {
      name: c.name,
      start,
      end,
      value: c.TimeSaved,
      range: [start, end]
    };
  });

  // 7. Event Trend Analysis (Event No)
  const trendData = [...data].sort((a, b) => a.EventNo - b.EventNo).map(d => ({
    EventNo: d.EventNo,
    TimeSaved: d.TimeSaved,
    Hours: d.Hours
  }));

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
              <p className="text-sm text-muted-foreground font-medium">Highest Performing Category</p>
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
        {/* Top Categories by Time Saved */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories by Time Saved</CardTitle>
            <CardDescription>Most effective mitigation areas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
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

        {/* Top Rigs by Time Saved */}
        <Card>
          <CardHeader>
            <CardTitle>Top Rigs by Time Saved</CardTitle>
            <CardDescription>Top performing rigs.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRigs} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
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

        {/* Top Company Codes by Time Saved */}
        <Card>
          <CardHeader>
            <CardTitle>Top Companies by Time Saved</CardTitle>
            <CardDescription>Most efficient operators.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCompanies} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
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

        {/* Event Distribution by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Number of events by category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventDistribution} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} tickFormatter={formatActionableCategory} />
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

        {/* Scatter Plot */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Cost Impact vs Time Saved Scatter Plot</CardTitle>
            <CardDescription>Visualizing efficiency correlation by Category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" dataKey="x" name="Time Saved" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <YAxis type="number" dataKey="y" name="Cost Impact" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, true)} />
                <ZAxis type="number" dataKey="z" range={[60, 400]} name="Events" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Time Saved') return `${Number(value).toFixed(1)} hrs`;
                    if (name === 'Cost Impact') return formatCurrency(Number(value));
                    return value;
                  }}
                  labelFormatter={() => ''}
                />
                <Scatter data={scatterData} fill="var(--color-primary)" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Savings Waterfall */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Savings Contribution Waterfall</CardTitle>
            <CardDescription>Cumulative accumulation of time saved across top categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waterfallData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} tickFormatter={formatActionableCategory} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'range') return [`${value[0].toFixed(1)}h to ${value[1].toFixed(1)}h`, 'Cumulative Range'];
                    return [`${Number(value).toFixed(1)}h`, name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="range" fill="var(--color-emerald-500)" opacity={0.8} barSize={40} radius={4} name="Contribution" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Trend Analysis */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Event Trend Analysis</CardTitle>
            <CardDescription>Tracking hours lost vs time saved over consecutive events.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="EventNo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)} hrs`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="Hours" stroke="var(--color-destructive)" strokeWidth={2} dot={false} name="Hours Lost" />
                <Line type="monotone" dataKey="TimeSaved" stroke="var(--color-emerald-500)" strokeWidth={2} dot={false} name="Time Saved" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
