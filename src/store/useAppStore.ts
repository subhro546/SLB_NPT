import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED' | 'SAR';

export interface NPTRecord {
  Borehole: string;
  Well: string;
  FieldName: string;
  NPTCategory: string;
  NPTSubCategory: string;
  ResponsibleParty: string;
  NPTHours: number;
  TimeSavedHours: number;
  StartDate: string;
  EndDate: string;
  // Derived
  CostImpact: number;
  CostSaved: number;
  InterventionEfficiency: number;
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
  boreholes: string[];
  wells: string[];
  fields: string[];
  categories: string[];
  subCategories: string[];
  responsibleParties: string[];
  dateRange: { start: string | null; end: string | null };
}

interface AppState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  
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
  boreholes: [],
  wells: [],
  fields: [],
  categories: [],
  subCategories: [],
  responsibleParties: [],
  dateRange: { start: null, end: null },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currency: 'USD',
      setCurrency: (c) => set({ currency: c }),
      
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
