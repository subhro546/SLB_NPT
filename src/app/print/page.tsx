"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ExecutiveCommandCenter from "@/app/page"
import AdvancedAnalytics from "@/app/advanced-analytics/page"
import WellAnalytics from "@/app/well-analytics/page"
import RootCauseAnalysis from "@/app/root-cause/page"
import RiskAnalysis from "@/app/risk/page"

const componentMap: Record<string, any> = {
  '/': ExecutiveCommandCenter,
  '/advanced-analytics': AdvancedAnalytics,
  '/well-analytics': WellAnalytics,
  '/root-cause': RootCauseAnalysis,
  '/risk': RiskAnalysis,
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
          <div key={tabHref} className="print-page w-[1200px] min-h-[850px] p-8 mx-auto bg-white text-black">
            <div className="mb-4 text-sm text-gray-500 font-bold uppercase tracking-widest border-b pb-2">
              SLB NPT Intelligence Report
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
