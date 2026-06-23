"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2, History } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAppStore, NPTRecord, Dataset } from "@/store/useAppStore"
import { format } from "date-fns"

import { normalizeCategory } from "@/lib/normalize"

export default function UploadPage() {
  const { addDataset, datasets, activeDatasetId, setActiveDataset } = useAppStore()
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const processExcel = (file: File) => {
    setIsParsing(true)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(worksheet)
        
        // Filter out empty rows that Excel sometimes pads out to 1,048,576
        const validJson = rawJson.filter((row: any) => {
          return row['Event No'] || row['WellID'] || row['Rig Name'];
        });
        
        const originalCats = new Set<string>();
        const normalizedCats = new Set<string>();
        let recordsMerged = 0;

        // Validation and Transformation
        const records: NPTRecord[] = validJson.map((row: any, index) => {
          const hours = Number(row['Hours']) || 0;
          const costUSDPerDay = Number(row['Cost USD/Day']) || 0;
          const costImpact = hours * (costUSDPerDay / 24);

          const rawCategory = String(row['Category'] || 'Unknown');
          const normalizedCat = normalizeCategory(rawCategory);
          
          let finalTimeSaved = Number(row['Time Saved']) || 0;
          let finalCostSaved = Number(row['Cost Saved']) || 0;

          if (normalizedCat === "Tool Failure" || normalizedCat === "Equipment/Tool Failure" || normalizedCat === "Equipment Failure") {
            finalTimeSaved = 0;
            finalCostSaved = 0;
          } else if (finalCostSaved === 0 && finalTimeSaved > 0) {
            finalCostSaved = finalTimeSaved * (costUSDPerDay / 24);
          }
          
          originalCats.add(rawCategory);
          normalizedCats.add(normalizedCat);
          if (rawCategory !== normalizedCat) {
            recordsMerged++;
          }

          let dateVal = undefined;
          if (row['Date']) {
            dateVal = new Date(row['Date']).toISOString();
          }

          return {
            EventNo: Number(row['Event No']) || index + 1,
            RigName: String(row['Rig Name'] || 'Unknown'),
            WellID: String(row['WellID'] || 'Unknown'),
            WellCategory: String(row['Well Category'] || 'Unknown'),
            CompanyCode: String(row['Company Code'] || 'Unknown'),
            CDE: String(row['CDE'] || ''),
            Depth: Number(row['Depth']) || 0,
            OnshoreOffshore: String(row['Onshore/Offshore'] || 'Unknown'),
            Category: normalizedCat,
            Hours: hours,
            TimeSaved: finalTimeSaved,
            CostUSDPerDay: costUSDPerDay,
            CostImpact: costImpact,
            CostSaved: finalCostSaved,
            Date: dateVal,
            MonitoringEngineer: row['Monitoring Engineer'] ? String(row['Monitoring Engineer']) : undefined,
            InchargeName: row['Incharge Name'] ? String(row['Incharge Name']) : undefined,
            InterventionMapped: row['Intervention_Mapped'] ? String(row['Intervention_Mapped']) : undefined
          }
        })

        if (records.length === 0) {
          throw new Error("No valid data found in the uploaded file.")
        }

        const newDataset: Dataset = {
          id: crypto.randomUUID(),
          name: file.name,
          uploadTimestamp: new Date().toISOString(),
          records,
          dataQuality: {
            originalCategoriesCount: originalCats.size,
            normalizedCategoriesCount: normalizedCats.size,
            recordsMerged
          }
        }

        addDataset(newDataset)
        setIsParsing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while parsing the file')
        setIsParsing(false)
      }
    }
    
    reader.onerror = () => {
      setError("Failed to read the file")
      setIsParsing(false)
    }
    
    reader.readAsBinaryString(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processExcel(acceptedFiles[0])
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Ingestion</h1>
        <p className="text-muted-foreground mt-2">
          Upload NPT data files to generate enterprise analytics and insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Dataset</CardTitle>
              <CardDescription>
                Drag and drop your standard NPT Excel file (.xlsx) here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
              >
                <input {...getInputProps()} />
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <UploadIcon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Click or drag file to this area to upload</h3>
                <p className="text-sm text-muted-foreground mb-4">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.</p>
                <Button variant="secondary" disabled={isParsing}>
                  {isParsing ? 'Parsing Data...' : 'Select File'}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-3 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {activeDatasetId && datasets.find(d => d.id === activeDatasetId) && (
            <Card>
              <CardHeader>
                <CardTitle>Data Quality & Dataset Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ds = datasets.find(d => d.id === activeDatasetId)!;
                  const records = ds.records;
                  const uniqueWells = new Set(records.map(r => r.WellID)).size;
                  const missingValues = records.reduce((acc, r) => {
                    let missing = 0;
                    if (r.WellID === 'Unknown') missing++;
                    if (r.Category === 'Unknown') missing++;
                    return acc + missing;
                  }, 0);

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Dataset Name</span>
                        <p className="font-medium truncate" title={ds.name}>{ds.name}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Upload Timestamp</span>
                        <p className="font-medium">{format(new Date(ds.uploadTimestamp), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Records Loaded</span>
                        <p className="font-medium">{records.length.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Wells Covered</span>
                        <p className="font-medium">{uniqueWells.toLocaleString()}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground">Missing/Unknown Values</span>
                        <p className="font-medium">{missingValues.toLocaleString()}</p>
                      </div>
                      
                      {/* Data Quality Metrics */}
                      <div className="space-y-1 pt-4 border-t col-span-2 md:col-span-3">
                        <h4 className="text-sm font-semibold mb-2">Normalization Results</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Raw Categories</span>
                            <p className="font-medium text-destructive">{ds.dataQuality?.originalCategoriesCount || 0}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Clean Categories</span>
                            <p className="font-medium text-emerald-600">{ds.dataQuality?.normalizedCategoriesCount || 0}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Records Merged</span>
                            <p className="font-medium text-blue-600">{ds.dataQuality?.recordsMerged?.toLocaleString() || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Upload History
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {datasets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No datasets uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {datasets.map((ds) => (
                    <div 
                      key={ds.id} 
                      className={`p-3 rounded-md border text-sm transition-colors cursor-pointer flex flex-col gap-1
                        ${activeDatasetId === ds.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                      onClick={() => setActiveDataset(ds.id)}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="truncate pr-2">{ds.name}</span>
                        {activeDatasetId === ds.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(ds.uploadTimestamp), 'MMM dd, yyyy HH:mm')}</span>
                        <span>{ds.records.length.toLocaleString()} rows</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
