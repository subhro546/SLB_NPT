import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'

const prisma = new PrismaClient()

// Constants used for derived metrics (matching our previous logic)
const HOURLY_RIG_RATE = 20833; // ~$500k per day
const AVG_SPREAD_COST_RATE = 8333; // ~$200k per day

function excelDateToJSDate(serial: number): Date {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function main() {
  console.log('Seeding database from Excel file...');
  
  const filePath = path.resolve('/Users/subhro/RTDMMA/NPT dummy data - RTDMMA ONGC (2).xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet) as any[]

  console.log(`Found ${rawData.length} records to process.`)

  for (const row of rawData) {
    // Parse Dates (handling Excel serial numbers)
    let startDate: Date;
    let endDate: Date;
    let spudDate: Date | null = null;

    if (typeof row['Start Date'] === 'number') {
      startDate = excelDateToJSDate(row['Start Date']);
    } else {
      startDate = new Date(row['Start Date']);
    }

    if (typeof row['End Date'] === 'number') {
      endDate = excelDateToJSDate(row['End Date']);
    } else {
      endDate = new Date(row['End Date']);
    }

    if (row['Spud Date']) {
      if (typeof row['Spud Date'] === 'number') {
        spudDate = excelDateToJSDate(row['Spud Date']);
      } else {
        spudDate = new Date(row['Spud Date']);
      }
    }

    const hours = Number(row['Hours']) || 0;
    const timeSavedHours = Number(row['Time Saved (hours)']) || 0;
    
    // Derived Metrics
    const costImpact = hours * (HOURLY_RIG_RATE + AVG_SPREAD_COST_RATE);
    const costSaved = timeSavedHours * (HOURLY_RIG_RATE + AVG_SPREAD_COST_RATE);

    await prisma.nPTRecord.create({
      data: {
        borehole: String(row['Borehole'] || ''),
        motherBorehole: row['Mother Borehole Name'] ? String(row['Mother Borehole Name']) : null,
        fieldName: String(row['Field Name'] || ''),
        spudDate: spudDate && !isNaN(spudDate.getTime()) ? spudDate : null,
        section: row['Section'] ? String(row['Section']) : null,
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: isNaN(endDate.getTime()) ? new Date() : endDate,
        hours: hours,
        days: Number(row['Days']) || 0,
        code: String(row['Code'] || ''),
        subCode: row['Sub Code'] ? String(row['Sub Code']) : null,
        responsible: String(row['Responsible'] || ''),
        description: row['Description'] ? String(row['Description']) : null,
        timeSavedDays: Number(row['Time Saved (Days)']) || 0,
        timeSavedHours: timeSavedHours,
        costImpact: costImpact,
        costSaved: costSaved
      }
    })
  }

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
