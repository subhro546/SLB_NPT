"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ExecutiveCommandCenter from "@/app/page"
import NPTAnalytics from "@/app/npt-analytics/page"
import InterventionIntelligence from "@/app/intervention/page"

const componentMap: Record<string, any> = {
  '/': ExecutiveCommandCenter,
  '/npt-analytics': NPTAnalytics,
  '/intervention': InterventionIntelligence,
}

function PrintContent() {
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)
  const tabsParam = searchParams.get('tabs')
  
  const tabs = tabsParam ? tabsParam.split(',') : []

  useEffect(() => {
    // Wait a short moment for Recharts to fully render and animations to finish
    // before triggering print.
    const timer = setTimeout(() => {
      setIsReady(true)
      window.print()
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="print-container w-full h-full">
      {!isReady && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50 print:hidden">
          <div className="text-xl font-light">Generating PDF Report...</div>
        </div>
      )}
      
      {tabs.map((tabHref, index) => {
        const Component = componentMap[tabHref]
        if (!Component) return null

        return (
          <div key={tabHref} className="print-page w-[800px] min-h-[1050px] p-8 mx-auto bg-white text-black">
            <div className="mb-8 text-xl font-light tracking-tight border-b-2 border-primary pb-4 flex justify-between items-end">
              <span>SLB NPT Intelligence Report</span>
              <span className="text-sm font-semibold text-muted-foreground uppercase">{tabHref.replace('/', '') || 'Executive Summary'}</span>
            </div>
            <div className="h-full w-full">
              <Component />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading PDF Engine...</div>}>
      <PrintContent />
    </Suspense>
  )
}
