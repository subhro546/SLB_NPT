import { useAppStore, NPTRecord } from "@/store/useAppStore"
import { useMemo } from "react"
import { isActionableCategory } from "@/lib/constants"

export function useFilteredData(): NPTRecord[] {
  const { datasets, activeDatasetId, globalFilters } = useAppStore()

  const activeDataset = useMemo(() => 
    datasets.find(d => d.id === activeDatasetId), 
  [datasets, activeDatasetId])

  return useMemo(() => {
    if (!activeDataset) return []

    return activeDataset.records.filter(record => {
      // Legacy check, but ensure we use Category now instead of NPTCategory
      if (!isActionableCategory(record.Category)) return false

      if ((globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(record.RigName)) return false
      if ((globalFilters.companyCodes || []).length > 0 && !(globalFilters.companyCodes || []).includes(record.CompanyCode)) return false
      if ((globalFilters.wellCategories || []).length > 0 && !(globalFilters.wellCategories || []).includes(record.WellCategory)) return false
      if ((globalFilters.onshoreOffshores || []).length > 0 && !(globalFilters.onshoreOffshores || []).includes(record.OnshoreOffshore)) return false
      if ((globalFilters.categories || []).length > 0 && !(globalFilters.categories || []).includes(record.Category)) return false
      
      return true
    })
  }, [activeDataset, globalFilters])
}
