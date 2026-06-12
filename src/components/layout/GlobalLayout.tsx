"use client"

import { useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { GlobalFilters } from "./GlobalFilters"
import { useAppStore } from "@/store/useAppStore"

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { fetchDatabaseRecords, isLoadingDatabase } = useAppStore()

  useEffect(() => {
    fetchDatabaseRecords()
  }, [fetchDatabaseRecords])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <GlobalFilters />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6 relative">
          {isLoadingDatabase && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground font-medium">Loading Database Records...</p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
