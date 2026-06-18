"use client"

import { useState } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { FileSpreadsheet, Plus, X } from "lucide-react"
import Link from "next/link"

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)']

function WellDashboard({ title, wellData, isAggregate = false }: { title: string, wellData: any[], isAggregate?: boolean }) {
  const { formatCurrency } = useCurrencyFormatter()
  if (wellData.length === 0) return null

  const uniqueWellsCount = isAggregate ? new Set(wellData.map(d => d.Well)).size || 1 : 1;

  const totalNPT = wellData.reduce((acc, curr) => acc + curr.NPTHours, 0) / uniqueWellsCount
  const totalCostImpact = wellData.reduce((acc, curr) => acc + curr.CostImpact, 0) / uniqueWellsCount
  const totalTimeSaved = wellData.reduce((acc, curr) => acc + curr.TimeSavedHours, 0) / uniqueWellsCount
  const totalCostSaved = wellData.reduce((acc, curr) => acc + curr.CostSaved, 0) / uniqueWellsCount
  const avgEfficiency = totalNPT > 0 ? (totalTimeSaved / totalNPT) * 100 : 0

  const categoryCosts = wellData.reduce((acc, curr) => {
    acc[curr.NPTCategory] = (acc[curr.NPTCategory] || 0) + (curr.CostImpact / uniqueWellsCount);
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCosts)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5)

  // Timeline (by month)
  const timelineMap = wellData.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) acc[month] = { month, NPTHours: 0, CostImpact: 0 };
    acc[month].NPTHours += (curr.NPTHours / uniqueWellsCount);
    acc[month].CostImpact += (curr.CostImpact / uniqueWellsCount);
    return acc;
  }, {} as Record<string, { month: string, NPTHours: number, CostImpact: number }>);
  
  const timelineData = Object.values(timelineMap).sort((a: any, b: any) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{isAggregate ? 'Avg NPT/Well' : 'Total NPT'}</p>
          <p className="text-xl font-bold">{totalNPT.toLocaleString(undefined, { maximumFractionDigits: 1 })}h</p>
        </div>
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{isAggregate ? 'Avg Cost/Well' : 'Cost Impact'}</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalCostImpact, true)}</p>
        </div>
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Time Saved</p>
          <p className="text-xl font-bold text-emerald-600">{totalTimeSaved.toLocaleString(undefined, { maximumFractionDigits: 1 })}h</p>
        </div>
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost Saved</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCostSaved, true)}</p>
        </div>
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Efficiency</p>
          <p className="text-xl font-bold">{avgEfficiency.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Cost Impact by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">NPT Timeline (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <Bar isAnimationActive={false} dataKey="NPTHours" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function WellAnalyticsPage() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  
  const uniqueWells = Array.from(new Set(data.map(d => d.Well).filter(w => w && w !== 'Unknown'))).sort()
  
  const [well1, setWell1] = useState<string>(uniqueWells[0] || "")

  if (!activeDatasetId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <FileSpreadsheet className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please upload a dataset to view Well Analytics.
        </p>
        <Link href="/upload" className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          Go to Data Ingestion
        </Link>
      </div>
    )
  }

  // Handle case where filters remove the currently selected well
  if (well1 && !uniqueWells.includes(well1)) {
    setWell1(uniqueWells[0] || "")
  }

  const well1Data = data.filter(d => d.Well === well1)
  const well1Type = well1Data[0]?.Well_Type || 'Unknown'
  const isOffshore = well1Type.toLowerCase().includes('offshore')
  
  const groupLabel = isOffshore ? 'Offshore Average' : 'Onshore Average'
  const groupData = data.filter(d => {
    const type = d.Well_Type?.toLowerCase() || ''
    if (isOffshore) return type.includes('offshore')
    return type.includes('onshore') || type.includes('land')
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Well Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into specific well performance and drilldowns.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Select Well:</span>
          <Select value={well1} onValueChange={(val) => setWell1(val || "")}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select Well" />
            </SelectTrigger>
            <SelectContent>
              {uniqueWells.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {well1 && (
          <Card className="border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-3">
              <CardTitle className="text-xl text-primary">{well1}</CardTitle>
              <CardDescription>Well Type: {well1Type}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <WellDashboard title={well1} wellData={well1Data} />
            </CardContent>
          </Card>
        )}

        {well1 && groupData.length > 0 && (
          <Card className="border-border">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-xl">{groupLabel}</CardTitle>
              <CardDescription>Benchmarked against all {isOffshore ? 'Offshore' : 'Onshore'} wells</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <WellDashboard title={groupLabel} wellData={groupData} isAggregate={true} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
