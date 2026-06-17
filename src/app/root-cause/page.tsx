"use client"

import { useState, useMemo } from "react"
import { useFilteredData } from "@/hooks/useFilteredData"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useAppStore } from "@/store/useAppStore"
import { isActionableCategory, formatActionableCategory } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  useReactTable, 
  getCoreRowModel, 
  getExpandedRowModel, 
  flexRender, 
  ExpandedState,
  getFilteredRowModel,
  ColumnDef
} from "@tanstack/react-table"
import { Search, ChevronRight, ChevronDown, FileSpreadsheet, Crosshair, AlertTriangle, Clock, DollarSign, Activity } from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts'

type TreeNode = {
  id: string;
  name: string;
  level: 'Category' | 'Subcategory' | 'Responsible' | 'Well' | 'Event';
  totalCost: number;
  totalHours: number;
  eventCount: number;
  date?: string;
  description?: string;
  subRows?: TreeNode[];
}

export default function RootCauseAnalysis() {
  const data = useFilteredData()
  const { activeDatasetId } = useAppStore()
  const { formatCurrency } = useCurrencyFormatter()

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [topCauseMetric, setTopCauseMetric] = useState<'cost' | 'hours' | 'count'>('cost')

  // --- Visual Summaries Data Preparation ---
  const subCatStats = data.reduce((acc, curr) => {
    const sub = curr.NPTSubCategory || 'Unknown'
    if (!acc[sub]) acc[sub] = { cost: 0, hours: 0, count: 0 }
    acc[sub].cost += curr.CostImpact
    acc[sub].hours += curr.NPTHours
    acc[sub].count += 1
    return acc;
  }, {} as Record<string, { cost: number, hours: number, count: number }>)

  const subCatArray = Object.entries(subCatStats).map(([sub, stats]) => ({
    name: sub,
    ...stats,
    avgDuration: stats.count > 0 ? stats.hours / stats.count : 0
  }))

  const mostFrequent = [...subCatArray].sort((a, b) => b.count - a.count)[0]
  const mostExpensive = [...subCatArray].sort((a, b) => b.cost - a.cost)[0]
  const highestAvgDuration = [...subCatArray].sort((a, b) => b.avgDuration - a.avgDuration)[0]

  const wellStats = data.reduce((acc, curr) => {
    const well = curr.Well || 'Unknown'
    if (!acc[well]) acc[well] = { cost: 0, hours: 0 }
    acc[well].cost += curr.CostImpact
    acc[well].hours += curr.NPTHours
    return acc;
  }, {} as Record<string, { cost: number, hours: number }>)

  const topWells = Object.entries(wellStats)
    .map(([well, stats]) => ({ name: well, cost: stats.cost, hours: stats.hours }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  // Stacked Bar for Responsible Party
  const respCategoryStats = data.reduce((acc, curr) => {
    const cat = curr.NPTCategory || 'Unknown'
    const resp = curr.ResponsibleParty || 'Unknown'
    if (!acc[cat]) acc[cat] = { category: cat, totalCost: 0 } as any;
    acc[cat][resp] = (acc[cat][resp] || 0) + curr.CostImpact
    acc[cat].totalCost += curr.CostImpact
    return acc;
  }, {} as Record<string, any>)

  const stackedData = Object.values(respCategoryStats).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10)
  
  // Extract all unique responsible parties for Stacked Bar chart keys
  const allRespParties = Array.from(new Set(data.map(d => d.ResponsibleParty || 'Unknown')))
  const STACK_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)']

  const topCausesChartData = [...subCatArray]
    .sort((a, b) => b[topCauseMetric] - a[topCauseMetric])
    .slice(0, 10)

  // --- Drill-down Table Data Preparation ---
  const hierarchicalData = useMemo(() => {
    if (!data.length) return []
    const root: Record<string, any> = {}
    data.forEach(row => {
      const cat = row.NPTCategory || 'Unknown'
      const sub = row.NPTSubCategory || 'Unknown'
      const resp = row.ResponsibleParty || 'Unknown'
      const well = row.Well || 'Unknown'

      if (!root[cat]) root[cat] = { cost: 0, hours: 0, count: 0, children: {} }
      root[cat].cost += row.CostImpact
      root[cat].hours += row.NPTHours
      root[cat].count += 1

      if (!root[cat].children[sub]) root[cat].children[sub] = { cost: 0, hours: 0, count: 0, children: {} }
      root[cat].children[sub].cost += row.CostImpact
      root[cat].children[sub].hours += row.NPTHours
      root[cat].children[sub].count += 1

      if (!root[cat].children[sub].children[resp]) root[cat].children[sub].children[resp] = { cost: 0, hours: 0, count: 0, children: {} }
      root[cat].children[sub].children[resp].cost += row.CostImpact
      root[cat].children[sub].children[resp].hours += row.NPTHours
      root[cat].children[sub].children[resp].count += 1

      if (!root[cat].children[sub].children[resp].children[well]) root[cat].children[sub].children[resp].children[well] = { cost: 0, hours: 0, count: 0, children: [] }
      root[cat].children[sub].children[resp].children[well].cost += row.CostImpact
      root[cat].children[sub].children[resp].children[well].hours += row.NPTHours
      root[cat].children[sub].children[resp].children[well].count += 1

      root[cat].children[sub].children[resp].children[well].children.push({
        id: Math.random().toString(),
        name: 'Event ' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        level: 'Event',
        totalCost: row.CostImpact,
        totalHours: row.NPTHours,
        eventCount: 1,
        date: new Date(row.StartDate).toLocaleDateString(),
        description: 'Raw recorded event data'
      })
    })

    const buildTree = (nodeMap: any, levelType: 'Category'|'Subcategory'|'Responsible'|'Well', nextLevelType: 'Subcategory'|'Responsible'|'Well'|'Event'): TreeNode[] => {
      return Object.entries(nodeMap).map(([name, metrics]: [string, any]) => {
        return {
          id: name,
          name,
          level: levelType,
          totalCost: metrics.cost,
          totalHours: metrics.hours,
          eventCount: metrics.count,
          subRows: nextLevelType === 'Event' ? metrics.children : buildTree(metrics.children, nextLevelType, getNextLevel(nextLevelType))
        }
      }).sort((a, b) => b.totalCost - a.totalCost)
    }

    const getNextLevel = (current: string) => {
      if (current === 'Subcategory') return 'Responsible'
      if (current === 'Responsible') return 'Well'
      return 'Event'
    }

    return buildTree(root, 'Category', 'Subcategory')
  }, [data])

  const columns = useMemo<ColumnDef<TreeNode>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Hierarchy Name',
      cell: ({ row, getValue }) => {
        const level = row.original.level;
        return (
          <div
            className="flex items-center gap-2 cursor-pointer font-medium"
            style={{ paddingLeft: `${row.depth * 1.5}rem` }}
            onClick={row.getToggleExpandedHandler()}
          >
            {row.getCanExpand() ? (
              row.getIsExpanded() ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <span className="w-4" /> 
            )}
            <span className={level === 'Event' ? 'text-muted-foreground text-sm font-normal' : ''}>
              {getValue<string>()}
              {level === 'Category' && isActionableCategory(getValue<string>()) && (
                <span className="ml-2 text-emerald-500 text-xs" title="Savable Category">🟢</span>
              )}
            </span>
          </div>
        )
      },
      filterFn: 'includesString'
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded-md">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'eventCount',
      header: () => <div className="text-right">Events</div>,
      cell: ({ getValue }) => <div className="text-right">{getValue<number>()}</div>,
    },
    {
      accessorKey: 'totalHours',
      header: () => <div className="text-right">NPT Hours</div>,
      cell: ({ getValue }) => <div className="text-right">{getValue<number>().toFixed(1)}h</div>,
    },
    {
      accessorKey: 'totalCost',
      header: () => <div className="text-right">Cost Impact</div>,
      cell: ({ getValue }) => <div className="text-right text-destructive font-bold">{formatCurrency(getValue<number>(), true)}</div>,
    },
    {
      accessorKey: 'date',
      header: 'Date / Desc',
      cell: ({ row }) => {
        if (row.original.level === 'Event') {
          return (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={row.original.description}>
              {row.original.date} - {row.original.description}
            </div>
          )
        }
        return null;
      }
    }
  ], [formatCurrency])

  const table = useReactTable({
    data: hierarchicalData,
    columns,
    state: { expanded, globalFilter },
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getSubRows: row => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Root Cause Analysis</h1>
          <p className="text-muted-foreground mt-1">Identify specific drivers of NPT across categories, responsible parties, and locations.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Most Expensive Root Cause</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={mostExpensive?.name}>{mostExpensive?.name || 'N/A'}</h3>
              <p className="text-sm font-semibold text-destructive">{formatCurrency(mostExpensive?.cost || 0, true)} impact</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Most Frequent Root Cause</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={mostFrequent?.name}>{mostFrequent?.name || 'N/A'}</h3>
              <p className="text-sm font-semibold text-orange-600">{mostFrequent?.count || 0} events triggered</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Highest Avg Event Duration</p>
              <h3 className="text-lg font-bold truncate max-w-[200px]" title={highestAvgDuration?.name}>{highestAvgDuration?.name || 'N/A'}</h3>
              <p className="text-sm font-semibold text-blue-600">{(highestAvgDuration?.avgDuration || 0).toFixed(1)}h per event</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Root Causes */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Top Subcategories (Root Causes)</CardTitle>
              <CardDescription>Highest impact specific root causes</CardDescription>
            </div>
            <select 
              className="text-xs border rounded px-2 py-1 bg-background"
              value={topCauseMetric}
              onChange={(e: any) => setTopCauseMetric(e.target.value)}
            >
              <option value="cost">By Cost Impact</option>
              <option value="hours">By NPT Hours</option>
              <option value="count">By Event Count</option>
            </select>
          </CardHeader>
          <CardContent className="h-[300px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="99%" height={250}>
              <BarChart data={topCausesChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis 
                  type="number" 
                  tickFormatter={topCauseMetric === 'cost' ? (v) => formatCurrency(v, true) : undefined} 
                  tick={{ fontSize: 11 }} 
                />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => topCauseMetric === 'cost' ? formatCurrency(Number(value)) : Number(value).toFixed(1)}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <Bar isAnimationActive={false} dataKey={topCauseMetric} fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        {/* Responsible Party Stacked Bar */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Responsible Party by Category</CardTitle>
            <CardDescription>Cost impact attribution across main categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="99%" height={250}>
              <BarChart data={stackedData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} tickFormatter={formatActionableCategory} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {allRespParties.map((party, index) => (
                  <Bar isAnimationActive={false} key={party} dataKey={party} stackId="a" fill={STACK_COLORS[index % STACK_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        {/* Well Impact Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Impacted Wells</CardTitle>
            <CardDescription>Locations suffering the highest financial penalty</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <div className="w-full overflow-x-auto print:overflow-visible"><div className="min-w-[600px] md:min-w-full h-[300px] sm:h-full print:h-full"><ResponsiveContainer width="99%" height={250}>
              <BarChart data={topWells} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{fill: 'var(--color-muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
                <Bar isAnimationActive={false} dataKey="cost" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer></div></div>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Table */}
      <Card className="flex flex-col border-primary/20 shadow-sm mt-8">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />
              Drill-down Hierarchy Explorer
            </CardTitle>
            <CardDescription>
              Expand rows to navigate: Category → Subcategory → Responsible Party → Well → Individual Event.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across hierarchy..."
              className="pl-9 h-9"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`transition-colors ${row.original.level === 'Category' ? 'bg-muted/10 font-semibold' : 'hover:bg-muted/30'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                      No matching records found in the hierarchy.
                    </td>
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
