import * as XLSX from "xlsx"
import { NPTRecord } from "@/store/useAppStore"
import { format } from "date-fns"
import { normalizeCategory as legacyNormalizeCategory } from "./normalize"

export interface ParseResult {
  records: NPTRecord[];
  originalCategoriesCount: number;
  normalizedCategoriesCount: number;
  recordsMerged: number;
  debugLog?: any;
  TotalActivityRows?: number;
}

const OFFSHORE_RIG_COSTS: Record<string, number> = {
  "GD Chitra": 40025.53,
  "Ron Tappmeyer": 37650.03,
  "FGM": 40766.65,
  "Aban-III": 44716.90,
  "Compact Driller": 76870.73,
  "CET": 44462.52,
  "Discovery-1": 48324.34,
  "Jindal Star": 44000.00,
  "Key Singapore": 76737.86,
  "Virtue-1": 80633.07,
  "Admarine-10": 45786.00,
  "DS Fossil (F&GL)": 30590.00,
  "Vivekanand 1": 82204.78,
  "DS Fortune (F&GL)": 30179.00,
  "GD Chaaru": 82081.56,
  "Divine Driller": 96218.00,
  "Vivekanand 2": 82144.95,
  "FD-IX": 101213.27,
  "Jindal Supreme (Slot)": 88858.55,
  "Sea Challenger": 26801.00,
  "J T Angel": 35565.59,
  "Jindal Explorer": 35605.80,
  "Admarine-IX": 69716.31,
  "Aban-IV": 66242.30,
  "Trident-II": 67889.00,
  "Admarine-11": 70000.00,
  "DDKG1 (DP Drillship)": 347500.00,
  "J.T Angel": 37627.94,
  "GD Chetna (HPHT)": 42161.75,
  "Aban-II": 39772.00,
  "Trident XII": 37022.89,
};

const ONSHORE_PREFIXES = [
  "NG", "E", "IPS", "SS", "HP", "EV", "BI", "ARMCUE", "QUIPPO", "JOHN", "M"
];

function getRigCost(rigName: string): number {
  if (!rigName) return 0;
  
  // Check Offshore
  if (OFFSHORE_RIG_COSTS[rigName]) {
    return OFFSHORE_RIG_COSTS[rigName];
  }
  
  // Check Onshore Prefixes
  const upperRig = rigName.toUpperCase();
  for (const prefix of ONSHORE_PREFIXES) {
    if (upperRig.startsWith(prefix)) {
      return 1500000; // INR
    }
  }
  
  return 0; // Default if not found
}

function normalizeCategoryByCode(code: string): string {
  if (!code) return "Unknown";
  const c = String(code).toUpperCase().trim();
  
  if (c.startsWith("22A") || c === "INFLUX") return "Influx";
  if (c.startsWith("22B") || c === "LOSS CONTROL" || c === "MUD LOSS") return "Mud Loss";
  if (c.startsWith("22C") || c === "TIGHT PULL" || c === "HELD UPS") return "Tight Pull";
  if (c.startsWith("22E") || c === "STRING STUCK") return "String Stuck";
  if (c.startsWith("22F") || c === "STRING FAILURE") return "String Failure";
  if (c.startsWith("22G") || c === "DOWNHOLE FAILURE") return "Downhole Failure";
  if (c.startsWith("8") || c === "EQUIPMENT FAILURE") return "Equipment Failure";
  
  return "Unknown";
}

function normalizeKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    newObj[cleanKey] = obj[key];
  }
  newObj.__raw_original_row = obj;
  return newObj;
}

function normalizeRigName(rig: string): string {
  if (!rig) return '';
  return rig.toLowerCase().replace(/\(.*?\)/g, '').replace(/[\s\-]/g, '');
}

function getValue(row: any, ...possibleKeys: string[]): any {
  for (const k of possibleKeys) {
    if (row[k] !== undefined) return row[k];
  }
  return undefined;
}

function parseExcel(data: string | ArrayBuffer, isActivities: boolean = false): any[] {
  const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (isActivities) {
    console.log(`Worksheet name being parsed: ${sheetName}`);
    console.log(`Worksheet !ref (used range): ${worksheet['!ref']}`);
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      console.log(`Last row in worksheet: ${range.e.r + 1}`);
    }
  }
  
  // Get raw array of arrays to find the actual header row
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i] || [];
    const rowStr = row.map(cell => String(cell).toLowerCase()).join(' ');
    
    // Check if this row looks like the header row
    if (
      rowStr.includes('event no') || 
      rowStr.includes('rig name') || 
      rowStr.includes('wellid') || 
      rowStr.includes('alert no') || 
      rowStr.includes('cde') ||
      rowStr.includes('observation')
    ) {
      headerRowIndex = i;
      break;
    }
  }
  
  const parsedData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
  
  if (isActivities) {
    console.log(`Last row actually iterated by the parser: ${parsedData.length + headerRowIndex + 1}`);
    parsedData.forEach((row: any, idx) => {
      row['_rawRowIndex'] = headerRowIndex + 2 + idx;
    });
  }
  
  return parsedData.map(normalizeKeys);
}

// Function to convert time string (e.g. "14:30:00" or Excel fraction) to hours decimal
function parseTime(timeVal: any): number {
  if (typeof timeVal === 'number') {
    return timeVal * 24; // Excel time fraction
  }
  if (typeof timeVal === 'string') {
    // "14:30:00" or "14:30"
    const parts = timeVal.split(':');
    if (parts.length >= 2) {
      return parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60) + (parts[2] ? parseInt(parts[2], 10) / 3600 : 0);
    }
  }
  if (timeVal instanceof Date) {
    return timeVal.getHours() + (timeVal.getMinutes() / 60) + (timeVal.getSeconds() / 3600);
  }
  return 0;
}

function parseDateValue(dateVal: any, rowIndex: number): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'number') {
     // Excel serial date handling
     const excelEpoch = new Date(Date.UTC(1899, 11, 30)); 
     return new Date(excelEpoch.getTime() + dateVal * 86400000);
  }
  if (typeof dateVal === 'string') {
    const parts = dateVal.trim().split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].trim();
      let yearStr = parts[2].trim();
      // Handle potential times attached to the year e.g. "2026 14:30"
      if (yearStr.includes(' ')) {
        yearStr = yearStr.split(' ')[0];
      }
      let year = parseInt(yearStr, 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += 2000;
      }
      
      const monthMap: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      
      const monthKey = monthStr.length >= 3 ? monthStr.substring(0, 3).charAt(0).toUpperCase() + monthStr.substring(0, 3).slice(1).toLowerCase() : "";
      const month = monthMap[monthKey];
      
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        // Create date (using local timezone to match other dates if needed, or UTC)
        return new Date(year, month, day); 
      }
    }
    
    // Fallback standard parse
    const fallback = new Date(dateVal);
    if (!isNaN(fallback.getTime())) {
       return fallback;
    }
  }
  
  console.warn(`Row ${rowIndex}: Failed to parse date value: ${dateVal}`);
  return null;
}

export function processDualFiles(activitiesData: string | ArrayBuffer, alertsData: string | ArrayBuffer): ParseResult {
  const rawActivities = parseExcel(activitiesData, true);
  const rawAlerts = parseExcel(alertsData, false);

  // Filter Activities: Date >= 2026-03-01
  const cutoffDate = new Date(2026, 2, 1); // March 1, 2026
  
  let maxDateFound: Date | null = null;
  let totalRowsChecked = 0;
  let datesSuccessfullyParsed = 0;
  
  const validActivities = rawActivities.filter((row: any, index: number) => {
    if (!getValue(row, 'eventno') && !getValue(row, 'wellid', 'well') && !getValue(row, 'rigname', 'rig', 'facility', 'platform')) return false;
    
    totalRowsChecked++;
    const rowDate = parseDateValue(getValue(row, 'date'), index + 2); // Excel rows are 1-indexed, header is row 1
    
    if (!rowDate) {
      return false; // Skip without throwing, already logged warning
    }
    
    datesSuccessfullyParsed++;
    if (!maxDateFound || rowDate > maxDateFound) {
       maxDateFound = rowDate;
    }
    
    // Store parsed date back so we don't parse again
    row['_parsedDate'] = rowDate;
    
    return rowDate >= cutoffDate;
  });

  const parsedAlerts = rawAlerts.map((row: any, index: number) => {
    const rawDate = getValue(row, 'date');
    const rowDate = parseDateValue(rawDate, index + 2);
    const rawRig = String(getValue(row, 'rig', 'rigname', 'facility', 'platform') || '');
    const rawCde = String(getValue(row, 'cde', 'category', 'description', 'type', 'npttype') || '');
    
    return {
      rawRig,
      normalizedRig: normalizeRigName(rawRig),
      rig: rawRig,
      rawCde,
      cde: rawCde,
      rawDate,
      date: rowDate,
      alertTimeHour: parseTime(getValue(row, 'time', 'alerttime')),
      alertNumber: String(getValue(row, 'alertno', 'alertnumber') || ''),
      observation: String(getValue(row, 'observation') || ''),
      recommendation: String(getValue(row, 'recommendation') || ''),
      normalizedCategory: normalizeCategoryByCode(rawCde)
    };
  });

  // --- DEBUGGING LOGIC ---
  const debugLog: any = {
    totalActivitiesLoaded: rawActivities.length,
    totalAlertsLoaded: rawAlerts.length,
    activitiesAfterFilter: validActivities.length,
    uniqueRigsActivities: Array.from(new Set(validActivities.map((r: any) => normalizeRigName(String(getValue(r, 'rigname', 'rig', 'facility', 'platform') || 'Unknown'))))),
    uniqueRigsAlerts: Array.from(new Set(parsedAlerts.map((a: any) => a.normalizedRig))),
    uniqueCategoriesActivities: Array.from(new Set(validActivities.map((r: any) => normalizeCategoryByCode(String(getValue(r, 'minor', 'minorcode') || 'Unknown'))))),
    uniqueCategoriesAlerts: Array.from(new Set(parsedAlerts.map((a: any) => a.normalizedCategory))),
    first20Activities: validActivities.slice(0, 20).map((r: any) => ({
      Minor: getValue(r, 'minor', 'minorcode'),
      NormalizedCategory: normalizeCategoryByCode(String(getValue(r, 'minor', 'minorcode') || 'Unknown'))
    })),
    first20Alerts: parsedAlerts.slice(0, 20).map((a: any) => ({
      originalCategory: a.rawCde,
      normalizedCategory: a.normalizedCategory,
      originalRigValue: a.rawRig,
      normalizedRig: a.normalizedRig,
      originalDateValue: a.rawDate,
      parsedDate: a.date ? format(a.date, 'yyyy-MM-dd') : 'Invalid'
    })),
    alertAnalysis: []
  };

  const originalCats = new Set<string>();
  const normalizedCats = new Set<string>();
  let recordsMerged = 0;

  // STEP 1: Filter valid activities (March 2026 onwards, Intervention Minor Codes)
  const marchFirst = new Date('2026-03-01T00:00:00Z');
  
  console.log(`--- LAST 40 ROWS DEBUG ---`);
  const startIndex = Math.max(0, validActivities.length - 40);
  
  const filteredActivities = validActivities.filter((row, index) => {
    let dateObj = row['_parsedDate'];
    const datePasses = !!dateObj && dateObj >= marchFirst;
    
    const rawCategory = String(getValue(row, 'minor', 'minorcode') || '');
    const upperCat = rawCategory.toUpperCase();
    const catPasses = upperCat.startsWith('22') || upperCat.startsWith('8');
    
    const accepted = datePasses && catPasses;
    
    if (index >= startIndex) {
       const originalRow = row.__raw_original_row || {};
       const origMinor = originalRow['Minor'] !== undefined ? originalRow['Minor'] : (originalRow['minor'] !== undefined ? originalRow['minor'] : originalRow['minorcode']);
       console.log(`Excel row number: ${originalRow._rawRowIndex || 'Unknown'}`);
       console.log(`Minor column value: ${origMinor}`);
       console.log(`typeof Minor: ${typeof origMinor}`);
       console.log(`getValue(row, "minor"): ${getValue(row, 'minor')}`);
       console.log(`getValue(row, "minorcode"): ${getValue(row, 'minorcode')}`);
       console.log(`Raw category extracted: ${rawCategory}`);
       console.log(`upperCat: ${upperCat}`);
       console.log(`Passes startsWith("22")?: ${upperCat.startsWith('22')}`);
       console.log(`Passes startsWith("8")?: ${upperCat.startsWith('8')}`);
       console.log(`Accepted or Rejected: ${accepted ? 'Accepted' : 'Rejected'}`);
       
       if (!getValue(row, 'minor') && origMinor !== undefined && origMinor !== null && origMinor !== '') {
           console.log(`IDENTIFIED: getValue returned undefined/empty but excel contains a value! This happens if the column header had invisible characters or was processed differently.`);
       }
       
       console.log(`----------------------------------------`);
    }
    
    if (!datePasses) return false;
    return catPasses;
  });

  const totalActivityRows = filteredActivities.length;

  // STEP 2: Sort by Rig, Date, StartTime
  filteredActivities.sort((a, b) => {
    const rigA = normalizeRigName(String(getValue(a, 'rigname', 'rig', 'facility', 'platform') || ''));
    const rigB = normalizeRigName(String(getValue(b, 'rigname', 'rig', 'facility', 'platform') || ''));
    if (rigA !== rigB) return rigA.localeCompare(rigB);
    
    const dateA = a['_parsedDate'] ? a['_parsedDate'].getTime() : 0;
    const dateB = b['_parsedDate'] ? b['_parsedDate'].getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;

    const startA = parseTime(getValue(a, 'starttime', 'from', 'time'));
    const startB = parseTime(getValue(b, 'starttime', 'from', 'time'));
    return startA - startB;
  });

  // STEP 3: Cluster sequential events
  const records: NPTRecord[] = [];
  let activeEvent: NPTRecord | null = null;
  let activeDepthSum = 0;

  const formatTimeStr = (decimalHour: number) => {
    const h = Math.floor(decimalHour);
    const m = Math.round((decimalHour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  let synthProcessed = 0;
  let synthNew = 0;
  let synthMerged = 0;
  let synthSkipped = 0;

  for (let i = 0; i < filteredActivities.length; i++) {
    const row = filteredActivities[i];
    
    const originalRow = row.__raw_original_row || {};
    const excelRowNumber = originalRow._rawRowIndex || 0;
    const isSynthetic = excelRowNumber >= 11260 && excelRowNumber <= 11290;
    
    const rawRigName = String(getValue(row, 'rigname', 'rig', 'facility', 'platform') || 'Unknown');
    const normalizedRig = normalizeRigName(rawRigName);
    const rawCategory = String(getValue(row, 'minor', 'minorcode') || 'Unknown');
    const normalizedCat = normalizeCategoryByCode(rawCategory);
    const depth = Number(getValue(row, 'depth')) || 0;
    const dateObjStr = row['_parsedDate'] ? format(row['_parsedDate'], 'yyyy-MM-dd') : 'Unknown';
    let startTimeHour = parseTime(getValue(row, 'starttime', 'from', 'time'));
    let endTimeHour = parseTime(getValue(row, 'endtime', 'to'));
    let duration = Number(getValue(row, 'hours', 'duration')) || 0;
    if (duration === 0 && endTimeHour > startTimeHour) duration = endTimeHour - startTimeHour;
    
    originalCats.add(rawCategory);
    normalizedCats.add(normalizedCat);

    if (isSynthetic) {
      synthProcessed++;
      console.log(`\n--- Event Grouping Debug for Row ${excelRowNumber} ---`);
      console.log(`Parsed Date: ${dateObjStr}`);
      console.log(`Parsed Rig: ${normalizedRig}`);
      console.log(`Parsed Category: ${normalizedCat}`);
      console.log(`Event grouping criteria being checked vs ActiveEvent...`);
    }

    if (!activeEvent) {
      if (isSynthetic) {
        console.log(`NEW event created (No active event exists yet)`);
        synthNew++;
      }
      let rigCost = getRigCost(rawRigName);
      activeEvent = {
        EventNo: records.length + 1,
        RigName: rawRigName,
        WellID: String(getValue(row, 'wellid', 'well') || 'Unknown'),
        WellCategory: String(getValue(row, 'wellcategory') || 'Unknown'),
        CompanyCode: String(getValue(row, 'companycode', 'company') || 'Unknown'),
        CDE: String(getValue(row, 'cde') || ''),
        Depth: depth,
        OnshoreOffshore: String(getValue(row, 'onshoreoffshore', 'location') || 'Unknown'),
        Category: normalizedCat,
        Hours: duration,
        CostUSDPerDay: rigCost,
        CostImpact: duration * (rigCost / 24),
        TimeSaved: 0,
        CostSaved: 0,
        InchargeName: String(getValue(row, 'inchargename', 'incharge') || 'Unknown'),
        MonitoringEngineer: String(getValue(row, 'monitoringengineer', 'engineer') || 'Unknown'),
        Month: dateObjStr,
        NormalizedCategory: normalizedCat,
        Duration: duration,
        StartTime: formatTimeStr(startTimeHour),
        EndTime: formatTimeStr(endTimeHour),
        HasIntervention: false,
        GroupedEventCount: 1,
        OriginalRowCount: 1,
      };
      activeDepthSum = depth;
    } else {
      const activeEndHour = parseTime(activeEvent.EndTime || '00:00');
      const timeGap = startTimeHour - activeEndHour;
      const avgDepth = activeEvent.OriginalRowCount ? (activeDepthSum / activeEvent.OriginalRowCount) : depth;
      const depthDiff = Math.abs(depth - avgDepth);
      
      const rigMatch = normalizeRigName(activeEvent.RigName) === normalizedRig;
      const catMatch = activeEvent.Category === normalizedCat;
      const dateMatch = activeEvent.Month === dateObjStr;
      const timeMatch = timeGap <= 1 && timeGap >= -12;
      const depthMatch = depthDiff <= 50;

      if (rigMatch && catMatch && dateMatch && timeMatch && depthMatch) {
        if (isSynthetic) {
          console.log(`MERGED into existing event (Existing Event Index: ${records.length})`);
          console.log(`Existing Event: (${activeEvent.Month}, ${normalizeRigName(activeEvent.RigName)}, ${activeEvent.Category})`);
          console.log(`Incoming Synthetic Row: (${dateObjStr}, ${normalizedRig}, ${normalizedCat})`);
          synthMerged++;
        }
        // Merge
        activeEvent.Hours += duration;
        activeEvent.Duration = activeEvent.Hours;
        activeEvent.CostImpact = activeEvent.Hours * (activeEvent.CostUSDPerDay / 24);
        activeEvent.OriginalRowCount = (activeEvent.OriginalRowCount || 1) + 1;
        activeEvent.GroupedEventCount = activeEvent.OriginalRowCount;
        activeDepthSum += depth;
        activeEvent.Depth = activeDepthSum / activeEvent.OriginalRowCount; // updating average depth
        
        if (endTimeHour > activeEndHour) {
          activeEvent.EndTime = formatTimeStr(endTimeHour);
        }
      } else {
        if (isSynthetic) {
          console.log(`NEW event created (Did not merge into active event)`);
          console.log(`Reason not merged:`);
          if (!rigMatch) console.log(`- Rig mismatch (${normalizeRigName(activeEvent.RigName)} vs ${normalizedRig})`);
          if (!catMatch) console.log(`- Category mismatch (${activeEvent.Category} vs ${normalizedCat})`);
          if (!dateMatch) console.log(`- Date mismatch (${activeEvent.Month} vs ${dateObjStr})`);
          if (!timeMatch) console.log(`- Time gap exceeded limit (timeGap: ${timeGap})`);
          if (!depthMatch) console.log(`- Depth gap exceeded 50 (depthDiff: ${depthDiff})`);
          synthNew++;
        }
        // Push and start new
        records.push(activeEvent);
        
        let rigCost = getRigCost(rawRigName);
        activeEvent = {
          EventNo: records.length + 1,
          RigName: rawRigName,
          WellID: String(getValue(row, 'wellid', 'well') || 'Unknown'),
          WellCategory: String(getValue(row, 'wellcategory') || 'Unknown'),
          CompanyCode: String(getValue(row, 'companycode', 'company') || 'Unknown'),
          CDE: String(getValue(row, 'cde') || ''),
          Depth: depth,
          OnshoreOffshore: String(getValue(row, 'onshoreoffshore', 'location') || 'Unknown'),
          Category: normalizedCat,
          Hours: duration,
          CostUSDPerDay: rigCost,
          CostImpact: duration * (rigCost / 24),
          TimeSaved: 0,
          CostSaved: 0,
          InchargeName: String(getValue(row, 'inchargename', 'incharge') || 'Unknown'),
          MonitoringEngineer: String(getValue(row, 'monitoringengineer', 'engineer') || 'Unknown'),
          Month: dateObjStr,
          NormalizedCategory: normalizedCat,
          Duration: duration,
          StartTime: formatTimeStr(startTimeHour),
          EndTime: formatTimeStr(endTimeHour),
          HasIntervention: false,
          GroupedEventCount: 1,
          OriginalRowCount: 1,
        };
        activeDepthSum = depth;
      }
    }
  }
  
  if (activeEvent) {
    records.push(activeEvent);
  }

  console.log(`\n--- SYNTHETIC GROUPING SUMMARY ---`);
  console.log(`Number of synthetic rows processed: ${synthProcessed}`);
  console.log(`Number of synthetic events created: ${synthNew}`);
  console.log(`Number merged into existing events: ${synthMerged}`);
  console.log(`Number skipped: ${synthSkipped}`);

  // STEP 2: Secondary Matching with Alert Tracker
  const matchDiagnostics: any[] = [];
  
  for (const alert of parsedAlerts) {
    const alertDateStr = alert.date ? format(alert.date, 'yyyy-MM-dd') : null;
    if (!alertDateStr) continue;

    let bestMatch: NPTRecord | null = null;
    let minDiff = Infinity;
    
    for (const record of records) {
      if (alert.normalizedRig === normalizeRigName(record.RigName) && 
          alert.normalizedCategory === record.Category && 
          alertDateStr === record.Month) {
          
          let startTimeHour = parseTime(record.StartTime || '00:00');
          let endTimeHour = parseTime(record.EndTime || '00:00');
          
          let adjustedEndTime = endTimeHour;
          if (endTimeHour < startTimeHour) adjustedEndTime += 24;
          
          let adjustedAlertTime = alert.alertTimeHour;
          if (alert.alertTimeHour < startTimeHour && endTimeHour < startTimeHour) adjustedAlertTime += 24;

          let inInterval = (adjustedAlertTime >= startTimeHour && adjustedAlertTime <= adjustedEndTime);
          let diff = inInterval ? 0 : Math.min(Math.abs(alert.alertTimeHour - startTimeHour), Math.abs(alert.alertTimeHour - endTimeHour));
          
          if (diff <= 12 && diff < minDiff) {
            minDiff = diff;
            bestMatch = record;
          }
      }
    }

    if (bestMatch) {
      recordsMerged++;
      bestMatch.HasIntervention = true;
      bestMatch.AlertNumber = alert.alertNumber;
      bestMatch.AlertTime = `${Math.floor(alert.alertTimeHour).toString().padStart(2, '0')}:${Math.round((alert.alertTimeHour % 1) * 60).toString().padStart(2, '0')}`;
      bestMatch.Observation = alert.observation;
      bestMatch.Recommendation = alert.recommendation;
      bestMatch.TimeDifference = minDiff;
      bestMatch.CDE = alert.cde;
      
      let matchConfidence = "No Match";
      if (minDiff <= 1) matchConfidence = "100%";
      else if (minDiff <= 2) matchConfidence = "95%";
      else if (minDiff <= 3) matchConfidence = "90%";
      else if (minDiff <= 4) matchConfidence = "85%";
      bestMatch.MatchConfidence = matchConfidence;
      
      let improvementFactor = 0.20 + (Math.random() * 0.30);
      bestMatch.ImprovementFactor = improvementFactor;
      
      bestMatch.TimeSaved = bestMatch.Hours * improvementFactor;
      bestMatch.CostSaved = (bestMatch.TimeSaved / 24) * bestMatch.CostUSDPerDay;
    }
  }

  console.log(`Total Unique Events Grouped: ${records.length}`);
  console.log(`Total Alerts Matched: ${recordsMerged} / ${parsedAlerts.length}`);

  if (records.length === 0) {
    if (totalRowsChecked === 0) {
      if (rawActivities.length === 0) {
        throw new Error("No valid data found. The Time & Activities file appears to be empty or could not be parsed as Excel.");
      } else {
        const sampleKeys = Object.keys(rawActivities[0]).join(', ');
        throw new Error(`No valid data found. Checked 0 rows because no rows matched the expected columns (Event No, WellID, Rig Name). Found columns: ${sampleKeys}`);
      }
    }
    const maxDateStr = maxDateFound ? format(maxDateFound, 'yyyy-MM-dd') : 'None';
    throw new Error(`No valid data found. Checked ${totalRowsChecked} rows. Max date found was ${maxDateStr}.`);
  }

  return {
    records,
    originalCategoriesCount: originalCats.size,
    normalizedCategoriesCount: normalizedCats.size,
    recordsMerged,
    debugLog,
    TotalActivityRows: totalActivityRows
  };
}
