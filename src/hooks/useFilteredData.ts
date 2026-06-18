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

    const filteredRecords = activeDataset.records.filter(record => {
      // Asset Filter
      if ((globalFilters.assets || []).length > 0 && !(globalFilters.assets || []).includes(record.Asset)) {
        return false
      }
      // Well Type Filter
      if ((globalFilters.wellTypes || []).length > 0 && !(globalFilters.wellTypes || []).includes(record.Well_Type)) {
        return false
      }
      // Rig Name Filter
      if ((globalFilters.rigNames || []).length > 0 && !(globalFilters.rigNames || []).includes(record.RigName)) {
        return false
      }
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
    })

    const baseMappedRecords = filteredRecords.map(record => {
      // For non-actionable categories, savings are 0
      if (!isActionableCategory(record.NPTCategory)) {
        return {
          ...record,
          TimeSavedHours: 0,
          TimeSavedDays: 0,
          CostSaved: 0
        }
      }

      // Method 1 (Current Logic)
      // Uses ODR_USD (daily rate) -> Hourly Rate = ODR_USD / 24
      const hourlyRate = (record.ODR_USD || 0) / 24;
      
      return {
        ...record,
        CostImpact: record.NPTHours * hourlyRate,
        CostSaved: record.TimeSavedHours * hourlyRate
      }
    })

    if (savingsMethod === 'method2') {
      // Method 2 (Fixed Savings Scenario)
      // Apply only to the Top 10 Actionable NPT events globally (by NPTHours)
      
      // Filter out non-actionable before sorting to ensure we actually get top 10 actionable events
      const actionableRecords = baseMappedRecords.filter(r => isActionableCategory(r.NPTCategory));
      const sortedRecords = [...actionableRecords].sort((a, b) => b.NPTHours - a.NPTHours)
      const top10Records = new Set(sortedRecords.slice(0, 10).map(r => r.StartDate + r.Well + r.NPTCategory + r.NPTHours))

      return baseMappedRecords.map(record => {
        const recordId = record.StartDate + record.Well + record.NPTCategory + record.NPTHours;
        if (top10Records.has(recordId)) {
          return {
            ...record,
            TimeSavedHours: 72, // 3 days
            TimeSavedDays: 3,
            CostSaved: 3 * (record.ODR_USD || 0)
          }
        }
        return {
          ...record,
          TimeSavedHours: 0,
          TimeSavedDays: 0,
          CostSaved: 0
        }
      })
    }

    return baseMappedRecords
  }, [activeDataset, globalFilters, savingsMethod])
}
