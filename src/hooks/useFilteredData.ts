import { useAppStore, NPTRecord } from "@/store/useAppStore"
import { useMemo } from "react"

export function useFilteredData(): NPTRecord[] {
  const { datasets, activeDatasetId, globalFilters } = useAppStore()

  const activeDataset = useMemo(() => 
    datasets.find(d => d.id === activeDatasetId), 
  [datasets, activeDatasetId])

  return useMemo(() => {
    if (!activeDataset) return []

    return activeDataset.records.filter(record => {
      // Borehole Filter
      if (globalFilters.boreholes.length > 0 && !globalFilters.boreholes.includes(record.Borehole)) {
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
    })
  }, [activeDataset, globalFilters])
}
