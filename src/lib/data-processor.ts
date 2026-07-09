import * as XLSX from "xlsx"
import { NPTRecord } from "@/store/useAppStore"
import { format } from "date-fns"
import { normalizeCategory as legacyNormalizeCategory } from "./normalize"

export interface ParseResult {
  records: NPTRecord[];
  originalCategoriesCount: number;
  normalizedCategoriesCount: number;
  recordsMerged: number;
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

function normalizeAlertCategory(cde: string): string {
  if (!cde) return "Unknown";
  const c = cde.toUpperCase().trim();
  if (c.startsWith("22A")) return "Influx";
  if (c.startsWith("22B")) return "Mud Loss";
  if (c.startsWith("22C")) return "Tight Pull";
  if (c.startsWith("22E")) return "String Stuck";
  if (c.startsWith("22F")) return "String Failure";
  if (c.startsWith("22G")) return "Downhole Failure";
  if (c.startsWith("8")) return "Equipment Failure";
  return "Unknown";
}

function normalizeActivityCategory(rawCat: string): string {
  const cat = legacyNormalizeCategory(rawCat);
  if (cat === "Mud Loss" || cat === "Loss Control") return "Mud Loss";
  if (cat === "Tight Pull" || cat === "Held Ups") return "Tight Pull";
  if (cat === "String Stuck" || cat === "Stuck Pipe" || cat === "Pack Off") return "String Stuck";
  if (cat === "String Failure") return "String Failure";
  if (cat === "Downhole Failure") return "Downhole Failure";
  if (cat.includes("Equipment") || cat.includes("Tool Failure")) return "Equipment Failure";
  if (cat.includes("Influx") || cat.includes("Kick")) return "Influx";
  
  return cat; // fallback
}

function parseExcel(data: string | ArrayBuffer): any[] {
  const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
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

export function processDualFiles(activitiesData: string | ArrayBuffer, alertsData: string | ArrayBuffer): ParseResult {
  const rawActivities = parseExcel(activitiesData);
  const rawAlerts = parseExcel(alertsData);

  // Filter Activities: Date >= 2026-03-01
  const cutoffDate = new Date("2026-03-01T00:00:00Z");
  
  const validActivities = rawActivities.filter((row: any) => {
    if (!row['Event No'] && !row['WellID'] && !row['Rig Name']) return false;
    
    let rowDate = null;
    if (row['Date']) {
      rowDate = new Date(row['Date']);
    }
    if (!rowDate || isNaN(rowDate.getTime())) return false;
    
    return rowDate >= cutoffDate;
  });

  const parsedAlerts = rawAlerts.map((row: any) => {
    let rowDate = null;
    if (row['Date']) {
      rowDate = new Date(row['Date']);
    }
    
    return {
      rig: String(row['Rig'] || row['Rig Name'] || ''),
      cde: String(row['CDE'] || ''),
      date: rowDate,
      alertTimeHour: parseTime(row['Time'] || row['Alert Time']),
      alertNumber: String(row['Alert No'] || row['Alert Number'] || ''),
      observation: String(row['Observation'] || ''),
      recommendation: String(row['Recommendation'] || ''),
      normalizedCategory: normalizeAlertCategory(String(row['CDE'] || ''))
    };
  });

  const originalCats = new Set<string>();
  const normalizedCats = new Set<string>();
  let recordsMerged = 0;

  const records: NPTRecord[] = validActivities.map((row: any, index) => {
    const rawCategory = String(row['Category'] || 'Unknown');
    const normalizedCat = normalizeActivityCategory(rawCategory);

    originalCats.add(rawCategory);
    normalizedCats.add(normalizedCat);
    if (rawCategory !== normalizedCat) {
      recordsMerged++;
    }

    let dateObj = new Date(row['Date']);
    let monthStr = format(dateObj, 'yyyy-MM-dd');
    
    let startTimeHour = parseTime(row['Start Time'] || row['From']);
    let endTimeHour = parseTime(row['End Time'] || row['To']);
    let duration = Number(row['Hours']) || Number(row['Duration']) || 0;
    
    if (duration === 0 && endTimeHour > startTimeHour) {
       duration = endTimeHour - startTimeHour;
    }

    const rigName = String(row['Rig Name'] || 'Unknown');

    // Matching logic
    let bestMatch = null;
    let minDiff = Infinity;
    
    for (const alert of parsedAlerts) {
      if (alert.rig === rigName && 
          alert.normalizedCategory === normalizedCat &&
          alert.date && alert.date.getTime() === dateObj.getTime()) {
            
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
    let rigCost = getRigCost(rigName);

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
      EventNo: Number(row['Event No']) || index + 1,
      RigName: rigName,
      WellID: String(row['WellID'] || 'Unknown'),
      WellCategory: String(row['Well Category'] || 'Unknown'),
      CompanyCode: String(row['Company Code'] || 'Unknown'),
      CDE: bestMatch ? bestMatch.cde : String(row['CDE'] || ''),
      Depth: Number(row['Depth']) || 0,
      OnshoreOffshore: String(row['Onshore/Offshore'] || 'Unknown'),
      Category: normalizedCat,
      Hours: duration,
      CostUSDPerDay: rigCost, // using Rig Cost calculated for all logic
      CostImpact: duration * (rigCost / 24),
      TimeSaved: timeSaved,
      CostSaved: costSaved,
      InchargeName: String(row['Incharge Name'] || 'Unknown'),
      MonitoringEngineer: String(row['Monitoring Engineer'] || 'Unknown'),
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
    throw new Error("No valid data found after filtering (Ensure records are >= 2026-03-01).")
  }

  return {
    records,
    originalCategoriesCount: originalCats.size,
    normalizedCategoriesCount: normalizedCats.size,
    recordsMerged
  };
}
