"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Activity, 
  Database,
  TrendingDown,
  Target,
  FileSpreadsheet,
  Settings,
  LineChart,
  Crosshair,
  Upload,
  BrainCircuit,
  Bug
} from "lucide-react"

export const navigation = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Intervention Intelligence', href: '/intervention', icon: TrendingDown },
  { name: 'NPT Analytics', href: '/npt-analytics', icon: LineChart },
  { name: 'Rig Analytics', href: '/well-analytics', icon: Target },
  { name: 'AI Decision Intelligence', href: '/ai-decision-intelligence', icon: BrainCircuit },
  { name: 'Data Explorer', href: '/data-explorer', icon: Database },
  { name: 'Data Ingestion', href: '/upload', icon: Upload },
  { name: 'Debug: Events', href: '/debug-events', icon: Bug },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex h-full w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-primary-foreground/10 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-foreground/10">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-light text-xl tracking-tight">SLB NPT Intel</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 py-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-6">
            Analytics
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <button className="flex w-full items-center gap-3 px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </div>
  )
}
