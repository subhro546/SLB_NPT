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
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(worksheet)
        
        const originalCats = new Set<string>();
        const normalizedCats = new Set<string>();
        let recordsMerged = 0;

        // Validation and Transformation
        const records: NPTRecord[] = rawJson.map((row: any, index) => {
          const nptHours = Number(row['NPT Hours'] || row['NPTHours']) || 0
          const timeSavedHours = Number(row['Time Saved Hours'] || row['TimeSavedHours']) || 0
          
          const rawCategory = String(row['NPT Category'] || row['NPTCategory'] || 'Unknown')
          const normalizedCat = normalizeCategory(rawCategory)
          
          const rawSubCategory = String(row['NPT Sub Category'] || row['NPTSubCategory'] || 'Unknown')
          const normalizedSubCat = normalizeCategory(rawSubCategory)

          originalCats.add(rawCategory)
          normalizedCats.add(normalizedCat)
          if (rawCategory !== normalizedCat || rawSubCategory !== normalizedSubCat) {
            recordsMerged++;
          }

          return {
            Borehole: String(row['Borehole'] || 'Unknown'),
            Well: String(row['Well'] || 'Unknown'),
            FieldName: String(row['Field Name'] || row['FieldName'] || 'Unknown'),
            NPTCategory: normalizedCat,
            NPTSubCategory: normalizedSubCat,
            ResponsibleParty: normalizeCategory(String(row['Responsible Party'] || row['ResponsibleParty'] || 'Unknown')),
            NPTHours: nptHours,
            TimeSavedHours: timeSavedHours,
            StartDate: String(row['Start Date'] || row['StartDate'] || ''),
            EndDate: String(row['End Date'] || row['EndDate'] || ''),
            // Derived Metrics
            CostImpact: nptHours * 3125,
            CostSaved: timeSavedHours * 3125,
            InterventionEfficiency: nptHours > 0 ? timeSavedHours / nptHours : 0
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
                  const uniqueWells = new Set(records.map(r => r.Well)).size;
                  const sortedDates = records.map(r => new Date(r.StartDate)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
                  const dateRange = sortedDates.length > 0 ? `${format(sortedDates[0], 'MMM dd, yyyy')} - ${format(sortedDates[sortedDates.length - 1], 'MMM dd, yyyy')}` : 'Unknown';
                  const missingValues = records.reduce((acc, r) => {
                    let missing = 0;
                    if (r.Well === 'Unknown') missing++;
                    if (r.NPTCategory === 'Unknown') missing++;
                    if (r.StartDate === '') missing++;
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
                        <span className="text-muted-foreground">Date Range</span>
                        <p className="font-medium">{dateRange}</p>
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
