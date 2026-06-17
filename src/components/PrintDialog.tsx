"use client"

import { useState } from "react"
import { Printer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { navigation } from "./layout/Sidebar"

export function PrintDialog() {
  const [selectedTabs, setSelectedTabs] = useState<string[]>([])

  const handleToggle = (href: string) => {
    setSelectedTabs(prev => 
      prev.includes(href) ? prev.filter(t => t !== href) : [...prev, href]
    )
  }

  const handlePrint = () => {
    if (selectedTabs.length === 0) return
    const encodedTabs = encodeURIComponent(selectedTabs.join(','))
    window.open(`/print?tabs=${encodedTabs}`, '_blank')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <Printer className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Select the dashboard views you want to include in your printed report. Each view will be printed on a new page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {navigation.map((item) => (
            <div key={item.name} className="flex items-center space-x-2">
              <Checkbox 
                id={`print-${item.name}`} 
                checked={selectedTabs.includes(item.href)}
                onCheckedChange={() => handleToggle(item.href)}
              />
              <Label htmlFor={`print-${item.name}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {item.name}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handlePrint} disabled={selectedTabs.length === 0}>
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
