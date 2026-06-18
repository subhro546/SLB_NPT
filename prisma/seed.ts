import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { normalizeCategory } from '../src/lib/normalize'

const prisma = new PrismaClient()

// Note: The previous hardcoded rig rates have been replaced by the ODR_USD column from the dataset.

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
  console.log('Clearing existing records...');
  await prisma.nPTRecord.deleteMany({});
  
  console.log('Seeding database from Excel file...');
  
  const filePath = path.resolve('/Users/subhro/RTDMMA/NPT_asset_mapping_all_rigs_4420_rows.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet) as any[]
  
  // The Excel file seems to have 1M formatted rows. Filter out the empty ones.
  const validData = rawData.filter(row => row['Borehole'] && row['Start Date'] && row['Code'])

  console.log(`Found ${rawData.length} raw records. Filtered down to ${validData.length} valid records.`)

  const recordsToInsert = [];

  for (const row of validData) {
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
    let timeSavedHours = Number(row['Time Saved (hours)']) || 0;
    if (timeSavedHours === 0 && hours > 0) {
      // Random value between 20% and 50% of NPT hours
      const randomMultiplier = 0.2 + (Math.random() * 0.3);
      timeSavedHours = hours * randomMultiplier;
    }

    const odrUsd = Number(row['ODR_USD']) || 0;
    
    // Derived Metrics using ODR_USD (Daily Rate)
    // To get hourly rate, we divide ODR_USD by 24
    const hourlyRate = odrUsd / 24;
    const costImpact = hours * hourlyRate;
    const costSaved = timeSavedHours * hourlyRate;

    recordsToInsert.push({
      borehole: String(row['Borehole'] || ''),
      motherBorehole: row['Mother Borehole Name'] ? String(row['Mother Borehole Name']) : null,
      fieldName: String(row['Field Name'] || ''),
      spudDate: spudDate && !isNaN(spudDate.getTime()) ? spudDate : null,
      section: row['Section'] ? String(row['Section']) : null,
      startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
      endDate: isNaN(endDate.getTime()) ? new Date() : endDate,
      hours: hours,
      days: Number(row['Days']) || 0,
      code: normalizeCategory(String(row['Code'] || '')), // Using code for Category
      subCode: row['Sub Code'] ? normalizeCategory(String(row['Sub Code'])) : null, // Using subCode for SubCategory
      responsible: normalizeCategory(String(row['Responsible'] || '')),
      description: row['Description'] ? String(row['Description']) : null,
      asset: row['Asset'] ? String(row['Asset']) : null,
      rigName: (row['Rig'] || row['Rig Name']) ? String(row['Rig'] || row['Rig Name']) : null,
      wellType: row['Well_Type'] ? String(row['Well_Type']) : null,
      odrUsd: odrUsd,
      timeSavedDays: Number(row['Time Saved (Days)']) || 0,
      timeSavedHours: timeSavedHours,
      costImpact: costImpact,
      costSaved: costSaved
    });
  }

  // Bulk insert to prevent database connection throttling/timeouts on cloud providers
  await prisma.nPTRecord.createMany({
    data: recordsToInsert,
    skipDuplicates: true,
  });

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
