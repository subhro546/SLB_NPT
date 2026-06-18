"use client"

import { useAppStore } from "@/store/useAppStore"
import { usePathname } from "next/navigation"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMemo } from "react"
import { formatActionableCategory } from "@/lib/constants"

export function GlobalFilters() {
  const pathname = usePathname()
  const { datasets, activeDatasetId, globalFilters, setGlobalFilters, resetFilters } = useAppStore()

  // Do not show filters on the upload page or if no dataset is active
  if (pathname === '/upload' || !activeDatasetId) {
    return null
  }

  const activeDataset = datasets.find(d => d.id === activeDatasetId)
  if (!activeDataset) return null

  const records = activeDataset.records

  // Extract unique values for filters
  const uniqueSections = Array.from(new Set(records.map(r => r.Section).filter(Boolean))).sort()
  const uniqueWells = Array.from(new Set(records.map(r => r.Well).filter(Boolean))).sort()
  const uniqueFields = Array.from(new Set(records.map(r => r.FieldName).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(records.map(r => r.NPTCategory).filter(Boolean))).sort()
  const uniqueAssets = Array.from(new Set(records.map(r => r.Asset).filter(Boolean))).sort()
  const uniqueWellTypes = Array.from(new Set(records.map(r => r.Well_Type).filter(Boolean))).sort()
  const uniqueRigNames = Array.from(new Set(records.map(r => r.RigName).filter(Boolean))).sort()

  const activeFilterCount = Object.values(globalFilters).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length
    if (val && typeof val === 'object' && ('start' in val || 'end' in val)) {
      return acc + (val.start ? 1 : 0) + (val.end ? 1 : 0)
    }
    return acc
  }, 0)

  return (
    <div className="bg-card border-b px-6 py-3 shrink-0 flex items-center gap-4 flex-wrap z-10">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <Filter className="h-4 w-4" />
        Global Filters
      </div>

      <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
        <Select 
          value={globalFilters.assets?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ assets: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="All Assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            {uniqueAssets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.wellTypes?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ wellTypes: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Well Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Well Types</SelectItem>
            {uniqueWellTypes.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.rigNames?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ rigNames: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Rigs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rigs</SelectItem>
            {uniqueRigNames.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.sections?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ sections: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {uniqueSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.wells[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ wells: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Wells" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wells</SelectItem>
            {uniqueWells.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.fields[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ fields: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Fields" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            {uniqueFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.categories[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ categories: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{formatActionableCategory(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
