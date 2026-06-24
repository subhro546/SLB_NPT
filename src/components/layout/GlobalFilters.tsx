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
import { Input } from "@/components/ui/input"
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

  // Hierarchical Filter Logic:
  // 0: Onshore/offshore -> 1: Asset -> 2: Well Category -> 3: Rig Name -> 4: Categories
  const getHierarchyRecords = (level: number) => {
    return records.filter(r => {
      if (!isActionableCategory(r.Category)) return false;
      if (level > 0 && (globalFilters.onshoreOffshores || []).length > 0 && !(globalFilters.onshoreOffshores || []).includes(r.OnshoreOffshore)) return false;
      if (level > 1 && (globalFilters.companyCodes || []).length > 0 && !(globalFilters.companyCodes || []).includes(r.CompanyCode)) return false;
      if (level > 2 && (globalFilters.wellCategories || []).length > 0 && !(globalFilters.wellCategories || []).includes(r.WellCategory)) return false;
      if (level > 3 && (globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(r.RigName)) return false;
      return true;
    });
  }

  const uniqueOnshoreOffshores = Array.from(new Set(getHierarchyRecords(0).map(r => r.OnshoreOffshore).filter(Boolean))).sort()
  const uniqueCompanyCodes = Array.from(new Set(getHierarchyRecords(1).map(r => r.CompanyCode).filter(Boolean))).sort()
  const uniqueWellCategories = Array.from(new Set(getHierarchyRecords(2).map(r => r.WellCategory).filter(Boolean))).sort().filter(val => val === 'D' || val === 'E')
  const uniqueRigNames = Array.from(new Set(getHierarchyRecords(3).map(r => r.RigName).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(getHierarchyRecords(4).map(r => r.Category).filter(Boolean))).sort()

  const activeFilterCount = Object.values(globalFilters).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length
    if (val instanceof Date) return acc + 1
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
          value={globalFilters.onshoreOffshores?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ onshoreOffshores: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Onshore/Offshore:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueOnshoreOffshores.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.companyCodes?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ companyCodes: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Asset:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueCompanyCodes.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.wellCategories?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ wellCategories: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Well Category:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueWellCategories.map(r => (
              <SelectItem key={r} value={r}>
                {r === 'D' ? 'Development' : r === 'E' ? 'Exploratory' : r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.rigNames?.[0] || "all"} 
          onValueChange={(val) => setGlobalFilters({ rigNames: !val || val === 'all' ? [] : [val] })}
        >
          <SelectTrigger className="h-8 text-xs whitespace-nowrap min-w-[140px]">
            <span className="text-muted-foreground mr-1">Rig Name:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueRigNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select 
          value={globalFilters.categories?.[0] || "all"} 
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

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-muted-foreground text-xs mr-1 whitespace-nowrap">Intervention Date:</span>
          <Input 
            type="date" 
            className="h-8 text-xs px-2 w-[115px]"
            value={globalFilters.interventionDate ? new Date(globalFilters.interventionDate.getTime() - (globalFilters.interventionDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : ''}
            onChange={(e) => setGlobalFilters({ 
              interventionDate: e.target.value ? new Date(e.target.value) : null
            })}
          />
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
