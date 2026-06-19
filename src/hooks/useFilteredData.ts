import { useAppStore, NPTRecord } from "@/store/useAppStore"
import { useMemo } from "react"
import { isActionableCategory } from "@/lib/constants"

export function useFilteredData(): NPTRecord[] {
  const { datasets, activeDatasetId, globalFilters, savingsMethod } = useAppStore()

  const activeDataset = useMemo(() => 
    datasets.find(d => d.id === activeDatasetId), 
  [datasets, activeDatasetId])

  return useMemo(() => {
    if (!activeDataset) return []

    const filtered = activeDataset.records.filter(record => {
      // Legacy check, but ensure we use Category now instead of NPTCategory
      if (!isActionableCategory(record.Category)) return false

      if ((globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(record.RigName)) return false
      if ((globalFilters.companyCodes || []).length > 0 && !(globalFilters.companyCodes || []).includes(record.CompanyCode)) return false
      if ((globalFilters.wellCategories || []).length > 0 && !(globalFilters.wellCategories || []).includes(record.WellCategory)) return false
      if ((globalFilters.onshoreOffshores || []).length > 0 && !(globalFilters.onshoreOffshores || []).includes(record.OnshoreOffshore)) return false
      if ((globalFilters.categories || []).length > 0 && !(globalFilters.categories || []).includes(record.Category)) return false
      
      return true
    })

    // Apply the Savings Method overrides
    if (savingsMethod === 'method2') {
      const categoryCounts: Record<string, number> = {};
      filtered.forEach(r => {
        categoryCounts[r.Category] = (categoryCounts[r.Category] || 0) + 1;
      });

      return filtered.map(record => {
        const N = categoryCounts[record.Category];
        // 72 hours per every 10 events (rounded up)
        const totalCategoryHours = Math.ceil(N / 10) * 72;
        // Distribute equally across the N events
        const timeSaved = totalCategoryHours / N;
        const costSaved = (timeSaved / 24) * record.CostUSDPerDay;
        
        return {
          ...record,
          TimeSaved: timeSaved,
          CostSaved: costSaved
        };
      });
    }

    return filtered;
  }, [activeDataset, globalFilters, savingsMethod])
}
