import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED' | 'SAR';

export interface NPTRecord {
  EventNo: number;
  RigName: string;
  WellID: string;
  WellCategory: string;
  CompanyCode: string;
  CDE: string;
  Depth: number;
  OnshoreOffshore: string;
  Category: string;
  Hours: number;
  TimeSaved: number;
  CostUSDPerDay: number;
  // Derived
  CostImpact: number;
  CostSaved: number;
}

export interface DataQualityMetrics {
  originalCategoriesCount: number;
  normalizedCategoriesCount: number;
  recordsMerged: number;
}

export interface Dataset {
  id: string;
  name: string;
  uploadTimestamp: string;
  records: NPTRecord[];
  dataQuality?: DataQualityMetrics;
}

export interface GlobalFilters {
  rigNames: string[];
  companyCodes: string[];
  wellCategories: string[];
  onshoreOffshores: string[];
  categories: string[];
}

interface AppState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  savingsMethod: 'method1' | 'method2';
  setSavingsMethod: (m: 'method1' | 'method2') => void;


  datasets: Dataset[];
  activeDatasetId: string | null;
  addDataset: (dataset: Dataset) => void;
  setActiveDataset: (id: string) => void;
  removeDataset: (id: string) => void;

  globalFilters: GlobalFilters;
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;

  fetchDatabaseRecords: () => Promise<void>;
  isLoadingDatabase: boolean;
}

const initialFilters: GlobalFilters = {
  rigNames: [],
  companyCodes: [],
  wellCategories: [],
  onshoreOffshores: [],
  categories: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currency: 'USD',
      setCurrency: (c) => set({ currency: c }),
      savingsMethod: 'method1',
      setSavingsMethod: (m) => set({ savingsMethod: m }),

      datasets: [],
      activeDatasetId: null,
      addDataset: (dataset) => set((state) => ({
        datasets: [...state.datasets, dataset],
        activeDatasetId: dataset.id
      })),
      setActiveDataset: (id) => set({ activeDatasetId: id }),
      removeDataset: (id) => set((state) => ({
        datasets: state.datasets.filter(d => d.id !== id),
        activeDatasetId: state.activeDatasetId === id
          ? (state.datasets.find(d => d.id !== id)?.id || null)
          : state.activeDatasetId
      })),

      globalFilters: initialFilters,
      setGlobalFilters: (filters) => set((state) => ({
        globalFilters: { ...state.globalFilters, ...filters }
      })),
      resetFilters: () => set({ globalFilters: initialFilters }),

      isLoadingDatabase: false,
      fetchDatabaseRecords: async () => {
        set({ isLoadingDatabase: true });
        try {
          const res = await fetch('/api/npt');
          const json = await res.json();
          if (json.success && json.data.length > 0) {
            const dbDataset: Dataset = {
              id: 'database-source',
              name: 'ONGC DB Records',
              uploadTimestamp: new Date().toISOString(),
              records: json.data,
            };

            set((state) => {
              // Replace if it exists
              const existingIdx = state.datasets.findIndex(d => d.id === 'database-source');
              let newDatasets = [...state.datasets];
              if (existingIdx >= 0) {
                newDatasets[existingIdx] = dbDataset;
              } else {
                newDatasets.push(dbDataset);
              }

              return {
                datasets: newDatasets,
                activeDatasetId: 'database-source'
              };
            });
          }
        } catch (e) {
          console.error("Failed to fetch database records", e);
        } finally {
          set({ isLoadingDatabase: false });
        }
      }
    }),
    {
      name: 'slb-npt-storage',
    }
  )
);
