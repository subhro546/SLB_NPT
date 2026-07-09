"use client"

import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DebugEventsPage() {
  const { datasets, activeDatasetId } = useAppStore()

  if (!activeDatasetId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Debug Events Dataset</h1>
        <p>No dataset loaded. Please upload a dataset first.</p>
      </div>
    )
  }

  const dataset = datasets.find(d => d.id === activeDatasetId)
  if (!dataset) return null

  const data = dataset.records
  const totalActivityRows = dataset.dataQuality?.TotalActivityRows || 0
  const totalConstructedEvents = data.length
  const avgRowsPerEvent = totalConstructedEvents > 0 ? (totalActivityRows / totalConstructedEvents).toFixed(2) : "0"
  
  const matchedInterventions = data.filter(d => d.HasIntervention).length
  const coverage = totalConstructedEvents > 0 ? ((matchedInterventions / totalConstructedEvents) * 100).toFixed(1) : "0"

  // Show a sample of 20 clustered events
  const sampleEvents = data.slice(0, 20)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Debug: Events Construction</h1>
        <p className="text-muted-foreground mt-1">Verification of the temporal-spatial clustering algorithm.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Activity Rows (Filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivityRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Events (Constructed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConstructedEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Rows / Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRowsPerEvent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Matched Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{matchedInterventions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverage}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sample of Clustered Events (Top 20)</CardTitle>
          <CardDescription>Verify that rows are being grouped correctly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Rig</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Time Interval</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Avg Depth</TableHead>
                <TableHead>Rows Merged</TableHead>
                <TableHead>Matched Alert?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleEvents.map((event: any) => (
                <TableRow key={event.EventNo}>
                  <TableCell className="font-medium">{event.EventNo}</TableCell>
                  <TableCell>{event.RigName}</TableCell>
                  <TableCell>{event.Month}</TableCell>
                  <TableCell>{event.Category}</TableCell>
                  <TableCell>{event.StartTime} - {event.EndTime}</TableCell>
                  <TableCell>{event.Hours.toFixed(1)}h</TableCell>
                  <TableCell>{event.Depth.toFixed(0)}m</TableCell>
                  <TableCell>{event.OriginalRowCount}</TableCell>
                  <TableCell>
                    {event.HasIntervention ? (
                      <span className="text-emerald-600 font-medium">Yes ({event.AlertNumber})</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
