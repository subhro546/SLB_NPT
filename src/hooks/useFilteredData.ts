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

    return activeDataset.records.filter(record => {
      // Section Filter
      if ((globalFilters.sections || []).length > 0 && !(globalFilters.sections || []).includes(record.Section)) {
        return false
      }
      // Well Filter
      if (globalFilters.wells.length > 0 && !globalFilters.wells.includes(record.Well)) {
        return false
      }
      // Field Filter
      if (globalFilters.fields.length > 0 && !globalFilters.fields.includes(record.FieldName)) {
        return false
      }
      // Category Filter
      if (globalFilters.categories.length > 0 && !globalFilters.categories.includes(record.NPTCategory)) {
        return false
      }
      // Sub Category Filter
      if (globalFilters.subCategories.length > 0 && !globalFilters.subCategories.includes(record.NPTSubCategory)) {
        return false
      }
      // Responsible Party Filter
      if (globalFilters.responsibleParties.length > 0 && !globalFilters.responsibleParties.includes(record.ResponsibleParty)) {
        return false
      }
      // Date Filter
      if (globalFilters.dateRange.start || globalFilters.dateRange.end) {
        const recordDate = new Date(record.StartDate).getTime()
        if (!isNaN(recordDate)) {
          if (globalFilters.dateRange.start && recordDate < new Date(globalFilters.dateRange.start).getTime()) {
            return false
          }
          if (globalFilters.dateRange.end && recordDate > new Date(globalFilters.dateRange.end).getTime()) {
            return false
          }
        }
      }

      return true
    }).map(record => {
      if (!isActionableCategory(record.NPTCategory)) {
        return {
          ...record,
          TimeSavedHours: 0,
          TimeSavedDays: 0,
          CostSaved: 0
        }
      }

      // Fix inflated DB values by enforcing $3125/hr across all methods
      const adjustedRecord = {
        ...record,
        CostImpact: record.NPTHours * 3125,
        CostSaved: record.TimeSavedHours * 3125
      }

      if (savingsMethod === 'method2') {
        return {
          ...adjustedRecord,
          TimeSavedHours: 7.2, // 0.3 days
          CostSaved: 22500
        }
      }

      return adjustedRecord
    })
  }, [activeDataset, globalFilters, savingsMethod])
}
