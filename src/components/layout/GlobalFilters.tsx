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
import { Checkbox } from "@/components/ui/checkbox"
import { useMemo } from "react"
import { formatActionableCategory, isActionableCategory } from "@/lib/constants"

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

  // Hierarchical Filter Logic
  const getHierarchyRecords = (level: number) => {
    return records.filter(r => {
      if (globalFilters.actionableOnly && !isActionableCategory(r.NPTCategory)) return false;
      if (level > 0 && (globalFilters.assets || []).length > 0 && !(globalFilters.assets || []).includes(r.Asset)) return false;
      if (level > 1 && (globalFilters.wellTypes || []).length > 0 && !(globalFilters.wellTypes || []).includes(r.Well_Type)) return false;
      if (level > 2 && (globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(r.RigName)) return false;
      if (level > 3 && (globalFilters.wells || []).length > 0 && !(globalFilters.wells || []).includes(r.Well)) return false;
      if (level > 4 && (globalFilters.sections || []).length > 0 && !(globalFilters.sections || []).includes(r.Section)) return false;
      return true;
    });
  }

  const uniqueAssets = Array.from(new Set(getHierarchyRecords(0).map(r => r.Asset).filter(Boolean))).sort()
  const uniqueWellTypes = Array.from(new Set(getHierarchyRecords(1).map(r => r.Well_Type).filter(Boolean))).sort()
  const uniqueRigNames = Array.from(new Set(getHierarchyRecords(2).map(r => r.RigName).filter(Boolean))).sort()
  const uniqueWells = Array.from(new Set(getHierarchyRecords(3).map(r => r.Well).filter(Boolean))).sort()
  const uniqueSections = Array.from(new Set(getHierarchyRecords(4).map(r => r.Section).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(getHierarchyRecords(5).map(r => r.NPTCategory).filter(Boolean))).sort()

  const activeFilterCount = Object.values(globalFilters).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length
    if (val && typeof val === 'object' && ('start' in val || 'end' in val)) {
      return acc + (val.start ? 1 : 0) + (val.end ? 1 : 0)
    }
    if (typeof val === 'boolean' && val === true) return acc + 1
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
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[120px]">
            <span className="text-muted-foreground mr-1">Asset:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueAssets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.wellTypes?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ wellTypes: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Well Type:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueWellTypes.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.rigNames?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ rigNames: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Rig:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueRigNames.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.wells?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ wells: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Well:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueWells.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.sections?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ sections: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Section:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.categories[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ categories: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[160px]">
            <span className="text-muted-foreground mr-1">Category:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{formatActionableCategory(c)}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-md border text-xs whitespace-nowrap">
          <Checkbox 
            id="actionable" 
            checked={globalFilters.actionableOnly}
            onCheckedChange={(checked) => setGlobalFilters({ actionableOnly: checked as boolean })}
          />
          <label
            htmlFor="actionable"
            className="text-muted-foreground font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Recoverable Categories Only (🟢)
          </label>
        </div>
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
