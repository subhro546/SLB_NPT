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
import { processDualFiles } from "@/lib/data-processor"

export default function UploadPage() {
  const { addDataset, datasets, activeDatasetId, setActiveDataset } = useAppStore()
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugData, setDebugData] = useState<any>(null)
  
  const [activitiesFile, setActivitiesFile] = useState<File | null>(null);
  const [alertsFile, setAlertsFile] = useState<File | null>(null);

  const handleProcessData = () => {
    if (!activitiesFile || !alertsFile) {
      setError("Please select both files.");
      return;
    }

    setIsParsing(true);
    setError(null);
    setDebugData(null);

    const reader1 = new FileReader();
    const reader2 = new FileReader();

    let actData: any = null;
    let alertData: any = null;

    const finalize = () => {
      if (actData && alertData) {
        try {
          const result = processDualFiles(actData, alertData);
          
          const newDataset: Dataset = {
            id: crypto.randomUUID(),
            name: `${activitiesFile.name} & ${alertsFile.name}`,
            uploadTimestamp: new Date().toISOString(),
            records: result.records,
            dataQuality: {
              originalCategoriesCount: result.originalCategoriesCount,
              normalizedCategoriesCount: result.normalizedCategoriesCount,
              recordsMerged: result.recordsMerged
            }
          };

          if (result.recordsMerged === 0 && result.debugLog) {
            setDebugData(result.debugLog);
          }

          addDataset(newDataset);
          setActivitiesFile(null);
          setAlertsFile(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred while parsing the files');
        } finally {
          setIsParsing(false);
        }
      }
    };

    reader1.onload = (e) => {
      actData = e.target?.result;
      finalize();
    };
    reader2.onload = (e) => {
      alertData = e.target?.result;
      finalize();
    };

    reader1.onerror = () => { setError("Failed to read Activities file"); setIsParsing(false); };
    reader2.onerror = () => { setError("Failed to read Alerts file"); setIsParsing(false); };

    reader1.readAsBinaryString(activitiesFile);
    reader2.readAsBinaryString(alertsFile);
  };

  const { getRootProps: getActProps, getInputProps: getActInputProps, isDragActive: isActActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) setActivitiesFile(acceptedFiles[0]);
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const { getRootProps: getAlertProps, getInputProps: getAlertInputProps, isDragActive: isAlertActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) setAlertsFile(acceptedFiles[0]);
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Activities File Upload */}
                <div
                  {...getActProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isActActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
                >
                  <input {...getActInputProps()} />
                  <div className="flex justify-center mb-2">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Upload Time & Activities</h3>
                  <p className="text-xs text-muted-foreground mb-3">(.xls or .xlsx)</p>
                  {activitiesFile ? (
                    <div className="text-sm text-emerald-600 font-medium break-all">{activitiesFile.name}</div>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={isParsing}>Select File</Button>
                  )}
                </div>

                {/* Alerts File Upload */}
                <div
                  {...getAlertProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isAlertActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
                >
                  <input {...getAlertInputProps()} />
                  <div className="flex justify-center mb-2">
                    <div className="bg-destructive/10 p-3 rounded-full">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Upload Alert Tracker</h3>
                  <p className="text-xs text-muted-foreground mb-3">(.xls or .xlsx)</p>
                  {alertsFile ? (
                    <div className="text-sm text-emerald-600 font-medium break-all">{alertsFile.name}</div>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={isParsing}>Select File</Button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleProcessData} 
                  disabled={isParsing || !activitiesFile || !alertsFile}
                  className="w-full md:w-auto"
                >
                  {isParsing ? 'Processing Data...' : 'Process Files & Generate Merged Dataset'}
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

          {debugData && (
            <div className="mt-8 bg-black/5 rounded-2xl border border-black/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/10 bg-black/[0.02]">
                <h3 className="font-semibold text-gray-800">Merge Diagnostics</h3>
              </div>
              <div className="p-6 overflow-auto max-h-[600px] text-sm text-gray-700">
                <pre>{JSON.stringify(debugData, null, 2)}</pre>
              </div>
            </div>
          )}

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
