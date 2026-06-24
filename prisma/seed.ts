import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { normalizeCategory } from '../src/lib/normalize'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing existing records...');
  await prisma.nPTRecord.deleteMany({});

  console.log('Seeding database from Excel file...');

  const filePath = path.resolve('/Users/subhro/RTDMMA/Intervention_Dataset_Interventions_Only_Dates.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet) as any[]

  const validData = rawData.filter(row => row['Event No'] || row['WellID'] || row['Rig Name'])

  console.log(`Found ${rawData.length} raw records. Filtered down to ${validData.length} valid records.`)

  const recordsToInsert = [];

  for (let i = 0; i < validData.length; i++) {
    const row = validData[i];
    const hours = Number(row['Hours']) || 0;
    const costUSDPerDay = Number(row['Cost USD/Day']) || 0;

    const rawCategory = String(row['Category'] || 'Unknown');
    const normalizedCat = normalizeCategory(rawCategory);

    const costImpact = hours * (costUSDPerDay / 24);

    let finalTimeSaved = Number(row['Time Saved']) || 0;
    let finalCostSaved = Number(row['Cost Saved']) || 0;

    if (normalizedCat === "Tool Failure" || normalizedCat === "Equipment/Tool Failure" || normalizedCat === "Equipment Failure") {
      finalTimeSaved = 0;
      finalCostSaved = 0;
    } else if (finalCostSaved === 0 && finalTimeSaved > 0) {
      finalCostSaved = finalTimeSaved * (costUSDPerDay / 24);
    }

    recordsToInsert.push({
      eventNo: Number(row['Event No']) || i + 1,
      rigName: String(row['Rig Name'] || 'Unknown'),
      wellId: String(row['WellID'] || 'Unknown'),
      wellCategory: String(row['Well Category'] || 'Unknown'),
      companyCode: String(row['Company Code'] || 'Unknown'),
      cde: String(row['CDE'] || ''),
      depth: Number(row['Depth']) || 0,
      onshoreOffshore: String(row['Onshore/Offshore'] || 'Unknown'),
      category: normalizedCat,
      hours: hours,
      timeSaved: finalTimeSaved,
      costUsdPerDay: costUSDPerDay,
      costImpact: costImpact,
      costSaved: finalCostSaved
    });
  }

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
