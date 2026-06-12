"use client"

import { useAppStore, Currency } from "@/store/useAppStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Moon, Sun, DollarSign, Menu, Activity } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { navigation } from "./Sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Topbar() {
  const pathname = usePathname()
  const { currency, setCurrency } = useAppStore()
  const { theme, setTheme } = useTheme()

  const currencies: { value: Currency; label: string }[] = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'INR', label: 'INR (₹)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'AED', label: 'AED (د.إ)' },
    { value: 'SAR', label: 'SAR (﷼)' },
  ]

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex h-16 shrink-0 items-center px-6 border-b">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">SLB NPT Intel</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <nav className="flex-1 space-y-1 px-3 py-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Analytics
                </div>
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-primary/10 text-primary' 
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
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md p-2 hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
      </div>
    </header>
  )
}
