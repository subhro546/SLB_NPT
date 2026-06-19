import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { normalizeCategory } from '../src/lib/normalize'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing existing records...');
  await prisma.nPTRecord.deleteMany({});
  
  console.log('Seeding database from Excel file...');
  
  const filePath = path.resolve('/Users/subhro/RTDMMA/Intervention_Event_Dataset_Final_With_CompanyCode.xlsx')
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
    const timeSaved = Number(row['Time Saved']) || 0;
    const costUSDPerDay = Number(row['Cost USD/Day']) || 0;

    const rawCategory = String(row['Category'] || 'Unknown');
    const normalizedCat = normalizeCategory(rawCategory);

    const costImpact = hours * (costUSDPerDay / 24);
    const costSaved = timeSaved * (costUSDPerDay / 24);

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
      timeSaved: timeSaved,
      costUsdPerDay: costUSDPerDay,
      costImpact: costImpact,
      costSaved: costSaved
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
