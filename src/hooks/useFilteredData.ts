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

    const filtered = activeDataset.records.map(r => {
      if (r.Category === "Tool Failure") {
        return { ...r, TimeSaved: 0, CostSaved: 0 };
      }
      return r;
    }).filter(record => {
      // Legacy check, but ensure we use Category now instead of NPTCategory
      if (!isActionableCategory(record.Category)) return false

      if ((globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(record.RigName)) return false
      if ((globalFilters.companyCodes || []).length > 0 && !(globalFilters.companyCodes || []).includes(record.CompanyCode)) return false
      if ((globalFilters.wellCategories || []).length > 0 && !(globalFilters.wellCategories || []).includes(record.WellCategory)) return false
      if ((globalFilters.onshoreOffshores || []).length > 0 && !(globalFilters.onshoreOffshores || []).includes(record.OnshoreOffshore)) return false
      if ((globalFilters.categories || []).length > 0 && !(globalFilters.categories || []).includes(record.Category)) return false
      if (globalFilters.interventionStartDate) {
        if (!record.Month) return false;
        const rowDate = new Date(record.Month);
        const startDate = new Date(globalFilters.interventionStartDate);
        startDate.setHours(0, 0, 0, 0);
        if (rowDate < startDate) {
          return false;
        }
      }
      if (globalFilters.interventionEndDate) {
        if (!record.Month) return false;
        const rowDate = new Date(record.Month);
        const endDate = new Date(globalFilters.interventionEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (rowDate > endDate) {
          return false;
        }
      }

      return true
    })

    // Apply the Savings Method overrides
    if (savingsMethod === 'method2') {
      const categoryCounts: Record<string, number> = {};
      const categoryHasRawSavings: Record<string, boolean> = {};

      filtered.forEach(r => {
        categoryCounts[r.Category] = (categoryCounts[r.Category] || 0) + 1;
        if (r.TimeSaved > 0) {
          categoryHasRawSavings[r.Category] = true;
        }
      });

      return filtered.map(record => {
        if (!categoryHasRawSavings[record.Category] || record.Category === "Tool Failure") {
          return record;
        }

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
