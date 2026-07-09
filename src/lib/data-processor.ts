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
  if (c.startsWith("22A")) return "Influx";
  if (c.startsWith("22B")) return "Mud Loss";
  if (c.startsWith("22C")) return "Tight Pull";
  if (c.startsWith("22E")) return "String Stuck";
  if (c.startsWith("22F")) return "String Failure";
  if (c.startsWith("22G")) return "Downhole Failure";
  if (c.startsWith("8")) return "Equipment Failure";
  return "Unknown";
}

function normalizeKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    newObj[cleanKey] = obj[key];
  }
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

function parseExcel(data: string | ArrayBuffer): any[] {
  const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
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
  
  return XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }).map(normalizeKeys);
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
  const rawActivities = parseExcel(activitiesData);
  const rawAlerts = parseExcel(alertsData);

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
    uniqueCategoriesActivities: Array.from(new Set(validActivities.map((r: any) => normalizeCategoryByCode(String(getValue(r, 'minorcode') || 'Unknown'))))),
    uniqueCategoriesAlerts: Array.from(new Set(parsedAlerts.map((a: any) => a.normalizedCategory))),
    first10Activities: validActivities.slice(0, 10).map((r: any) => ({
      originalCategoryValue: getValue(r, 'minorcode'),
      normalizedCategory: normalizeCategoryByCode(String(getValue(r, 'minorcode') || 'Unknown')),
      originalRigValue: getValue(r, 'rigname', 'rig', 'facility', 'platform'),
      normalizedRig: normalizeRigName(String(getValue(r, 'rigname', 'rig', 'facility', 'platform') || 'Unknown')),
      originalDateValue: getValue(r, 'date'),
      parsedDate: r['_parsedDate'] ? format(r['_parsedDate'], 'yyyy-MM-dd') : 'Invalid'
    })),
    first10Alerts: parsedAlerts.slice(0, 10).map((a: any) => ({
      originalRigValue: a.rawRig,
      normalizedRig: a.normalizedRig,
      originalCategoryValue: a.rawCde,
      normalizedCategory: a.normalizedCategory,
      originalDateValue: a.rawDate,
      parsedDate: a.date ? format(a.date, 'yyyy-MM-dd') : 'Invalid'
    })),
    alertAnalysis: []
  };

  let alertCount = 0;
  for (const alert of parsedAlerts) {
    if (alertCount < 20) {
      let candidatesBeforeTime = 0;
      let reasons = { rigMismatch: 0, catMismatch: 0, dateMismatch: 0 };
      
      for (const act of validActivities) {
        const actRig = String(getValue(act, 'rigname', 'rig', 'facility', 'platform') || 'Unknown');
        const actCat = normalizeCategoryByCode(String(getValue(act, 'minorcode') || 'Unknown'));
        const actDate = act['_parsedDate'];
        
        let matchRig = alert.normalizedRig === normalizeRigName(actRig);
        let matchCat = alert.normalizedCategory === actCat;
        
        const alertDateStr = alert.date ? format(alert.date, 'yyyy-MM-dd') : null;
        const actDateStr = actDate ? format(actDate, 'yyyy-MM-dd') : null;
        let matchDate = alertDateStr && actDateStr && alertDateStr === actDateStr;
        
        if (!matchRig) reasons.rigMismatch++;
        if (!matchCat) reasons.catMismatch++;
        if (!matchDate) reasons.dateMismatch++;
        
        if (matchRig && matchCat && matchDate) {
          candidatesBeforeTime++;
        }
      }
      
      debugLog.alertAnalysis.push({
        rig: alert.normalizedRig,
        category: alert.normalizedCategory,
        date: alert.date ? format(alert.date, 'yyyy-MM-dd') : 'Invalid',
        candidatesFound: candidatesBeforeTime,
        reasonsIfNone: candidatesBeforeTime === 0 ? reasons : null
      });
    }
    alertCount++;
  }
  console.log("DEBUG LOG:", debugLog);
  // --- END DEBUGGING LOGIC ---

  const originalCats = new Set<string>();
  const normalizedCats = new Set<string>();
  let recordsMerged = 0;

  const records: NPTRecord[] = validActivities.map((row: any, index) => {
    const rawCategory = String(getValue(row, 'minorcode') || 'Unknown');
    const normalizedCat = normalizeCategoryByCode(rawCategory);

    originalCats.add(rawCategory);
    normalizedCats.add(normalizedCat);
    if (rawCategory !== normalizedCat) {
      recordsMerged++;
    }

    let dateObj = row['_parsedDate'];
    let monthStr = dateObj ? format(dateObj, 'yyyy-MM-dd') : 'Unknown';
    const dateObjStr = dateObj ? format(dateObj, 'yyyy-MM-dd') : null;
    
    let startTimeHour = parseTime(getValue(row, 'starttime', 'from', 'time'));
    let endTimeHour = parseTime(getValue(row, 'endtime', 'to'));
    let duration = Number(getValue(row, 'hours', 'duration')) || 0;
    
    if (duration === 0 && endTimeHour > startTimeHour) {
       duration = endTimeHour - startTimeHour;
    }

    const rawRigName = String(getValue(row, 'rigname', 'rig', 'facility', 'platform') || 'Unknown');
    const normalizedRig = normalizeRigName(rawRigName);

    // Matching logic
    let bestMatch = null;
    let minDiff = Infinity;
    
    for (const alert of parsedAlerts) {
      const alertDateStr = alert.date ? format(alert.date, 'yyyy-MM-dd') : null;
      if (alert.normalizedRig === normalizedRig && 
          alert.normalizedCategory === normalizedCat &&
          alertDateStr && alertDateStr === dateObjStr) {
            
            // Need timestamp difference logic
            // Use start time or end time or midpoint? We can check difference to startTimeHour
            const diff = Math.abs(alert.alertTimeHour - startTimeHour);
            if (diff <= 4 && diff < minDiff) {
              minDiff = diff;
              bestMatch = alert;
            }
      }
    }

    let matchConfidence = "No Match";
    if (minDiff <= 1) matchConfidence = "100%";
    else if (minDiff <= 2) matchConfidence = "95%";
    else if (minDiff <= 3) matchConfidence = "90%";
    else if (minDiff <= 4) matchConfidence = "85%";

    let improvementFactor = 0;
    let timeSaved = 0;
    let costSaved = 0;
    let rigCost = getRigCost(rawRigName);

    if (bestMatch) {
      // 20% to 50%
      improvementFactor = 0.20 + (Math.random() * 0.30);
      timeSaved = duration * improvementFactor;
      costSaved = (timeSaved / 24) * rigCost;
    }
    
    // Just format string times for display
    const formatTimeStr = (decimalHour: number) => {
      const h = Math.floor(decimalHour);
      const m = Math.round((decimalHour - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      EventNo: Number(getValue(row, 'eventno', 'eventnumber')) || index + 1,
      RigName: rawRigName,
      WellID: String(getValue(row, 'wellid', 'well') || 'Unknown'),
      WellCategory: String(getValue(row, 'wellcategory') || 'Unknown'),
      CompanyCode: String(getValue(row, 'companycode', 'company') || 'Unknown'),
      CDE: bestMatch ? bestMatch.cde : String(getValue(row, 'cde') || ''),
      Depth: Number(getValue(row, 'depth')) || 0,
      OnshoreOffshore: String(getValue(row, 'onshoreoffshore', 'location') || 'Unknown'),
      Category: normalizedCat,
      Hours: duration,
      CostUSDPerDay: rigCost, // using Rig Cost calculated for all logic
      CostImpact: duration * (rigCost / 24),
      TimeSaved: timeSaved,
      CostSaved: costSaved,
      InchargeName: String(getValue(row, 'inchargename', 'incharge') || 'Unknown'),
      MonitoringEngineer: String(getValue(row, 'monitoringengineer', 'engineer') || 'Unknown'),
      Month: monthStr,
      
      AlertNumber: bestMatch ? bestMatch.alertNumber : '',
      AlertTime: bestMatch ? formatTimeStr(bestMatch.alertTimeHour) : '',
      Observation: bestMatch ? bestMatch.observation : '',
      Recommendation: bestMatch ? bestMatch.recommendation : '',
      TimeDifference: bestMatch ? minDiff : undefined,
      MatchConfidence: matchConfidence,
      ImprovementFactor: bestMatch ? improvementFactor : undefined,
      RigCost: rigCost,
      NormalizedCategory: normalizedCat,
      Duration: duration,
      StartTime: formatTimeStr(startTimeHour),
      EndTime: formatTimeStr(endTimeHour)
    };
  });

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
    throw new Error(`No valid data found. Checked ${totalRowsChecked} rows, successfully parsed ${datesSuccessfullyParsed} dates. Max date found was ${maxDateStr}. (Ensure records are >= 2026-03-01)`);
  }

  if (recordsMerged === 0) {
    console.warn("0 records merged. Returning debugLog to UI.");
  }

  return {
    records,
    originalCategoriesCount: originalCats.size,
    normalizedCategoriesCount: normalizedCats.size,
    recordsMerged,
    debugLog
  };
}
