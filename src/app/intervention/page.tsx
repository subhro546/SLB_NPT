"use client"

import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/useAppStore"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { FileSpreadsheet, Trophy, Target, Award } from "lucide-react"
import Link from "next/link"

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
        <p className="text-muted-foreground mb-6 max-w-md">
          Please upload a dataset to view Intervention Intelligence.
        </p>
        <Link href="/upload" className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          Go to Data Ingestion
        </Link>
      </div>
    )
  }

  // Data Aggregations
  const categorySavings = data.reduce((acc, curr) => {
    if (!acc[curr.NPTCategory]) acc[curr.NPTCategory] = { name: curr.NPTCategory, TimeSaved: 0, CostSaved: 0 }
    acc[curr.NPTCategory].TimeSaved += curr.TimeSavedHours
    acc[curr.NPTCategory].CostSaved += curr.CostSaved
    return acc
  }, {} as Record<string, { name: string, TimeSaved: number, CostSaved: number }>)

  const categorySavingsData = Object.values(categorySavings)
    .sort((a, b) => b.CostSaved - a.CostSaved)
    .slice(0, 10)

  const wellSavings = data.reduce((acc, curr) => {
    if (!acc[curr.Well]) acc[curr.Well] = { name: curr.Well, CostSaved: 0 }
    acc[curr.Well].CostSaved += curr.CostSaved
    return acc
  }, {} as Record<string, { name: string, CostSaved: number }>)

  const topSavingWellsData = Object.values(wellSavings)
    .sort((a, b) => b.CostSaved - a.CostSaved)
    .slice(0, 10)

  const responsibleSavings = data.reduce((acc, curr) => {
    if (!acc[curr.ResponsibleParty]) acc[curr.ResponsibleParty] = { name: curr.ResponsibleParty, CostSaved: 0 }
    acc[curr.ResponsibleParty].CostSaved += curr.CostSaved
    return acc
  }, {} as Record<string, { name: string, CostSaved: number }>)

  const topInterventionsData = Object.values(responsibleSavings)
    .sort((a, b) => b.CostSaved - a.CostSaved)
    .slice(0, 10)

  // Monthly Savings Trend
  const monthlyDataMap = data.reduce((acc, curr) => {
    if (!curr.StartDate) return acc;
    const date = new Date(curr.StartDate);
    if (isNaN(date.getTime())) return acc;
    
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) acc[month] = { month, CostSaved: 0, TimeSaved: 0 };
    acc[month].CostSaved += curr.CostSaved;
    acc[month].TimeSaved += curr.TimeSavedHours;
    return acc;
  }, {} as Record<string, { month: string, CostSaved: number, TimeSaved: number }>);
  
  const monthlyTrendData = Object.values(monthlyDataMap).sort((a: any, b: any) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intervention Intelligence</h1>
          <p className="text-muted-foreground mt-1">Measure and analyze the financial impact of successful interventions.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Saving Wells Leaderboard */}
        <Card className="col-span-1 border-emerald-600/20 shadow-sm">
          <CardHeader className="bg-emerald-600/5 pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <Trophy className="h-5 w-5" />
              Top Saving Wells
            </CardTitle>
            <CardDescription>Highest financial recovery through intervention</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {topSavingWellsData.map((well, index) => (
                <div key={well.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{well.name}</span>
                  </div>
                  <span className="font-semibold text-emerald-600 text-sm">
                    {formatCurrency(well.CostSaved, true)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Interventions Leaderboard */}
        <Card className="col-span-1 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Award className="h-5 w-5" />
              Top Intervening Parties
            </CardTitle>
            <CardDescription>Highest financial recovery by responsible party</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {topInterventionsData.map((party, index) => (
                <div key={party.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm truncate max-w-[120px]" title={party.name}>
                      {party.name}
                    </span>
                  </div>
                  <span className="font-semibold text-primary text-sm">
                    {formatCurrency(party.CostSaved, true)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target vs Actual (Placeholder for Intervention Goals) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Savings by Category
            </CardTitle>
            <CardDescription>Financial impact recovered per category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySavingsData} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <Bar dataKey="CostSaved" fill="var(--color-emerald-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Savings Trend</CardTitle>
          <CardDescription>Financial impact recovered over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
              <Line type="monotone" dataKey="CostSaved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
