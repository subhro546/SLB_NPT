import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const prisma = new PrismaClient()

const normalizeCategory = (cat: string) => {
  if (!cat) return 'Other'
  const c = cat.toLowerCase().trim()
  if (c.includes('stuck') || c.includes('pack')) return 'String Stuck'
  if (c.includes('loss') || c.includes('mud loss')) return 'Mud Loss'
  if (c.includes('influx') || c.includes('kick')) return 'Influx'
  if (c.includes('equipment') || c.includes('tool') || c.includes('failure')) return 'Equipment/Tool Failure'
  if (c.includes('wellbore') || c.includes('stability')) return 'Wellbore Instability'
  if (c.includes('weather')) return 'Weather'
  return cat.trim()
}

async function main() {
  const filePath = '/Users/subhro/RTDMMA/Intervention_Dataset_Interventions_Only_Dates.xlsx'
  const workbook = XLSX.readFile(filePath, { type: 'binary', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rawJson = XLSX.utils.sheet_to_json(worksheet)

  const validJson = rawJson.filter((row: any) => row['Event No'] || row['WellID'] || row['Rig Name'])

  console.log(`Found ${validJson.length} valid rows. Clearing existing DB and inserting...`)

  await prisma.nPTRecord.deleteMany({})

  const records = validJson.map((row: any, index) => {
    const hours = Number(row['Hours']) || 0
    const costUSDPerDay = Number(row['Cost USD/Day']) || 0

    const rawCategory = String(row['Category'] || 'Unknown')
    const normalizedCat = normalizeCategory(rawCategory)

    let finalTimeSaved = Number(row['Time Saved']) || 0
    let finalCostSaved = Number(row['Cost Saved']) || 0

    if (normalizedCat === "Tool Failure" || normalizedCat === "Equipment/Tool Failure" || normalizedCat === "Equipment Failure") {
      finalTimeSaved = 0
      finalCostSaved = 0
    } else if (finalCostSaved === 0 && finalTimeSaved > 0) {
      finalCostSaved = finalTimeSaved * (costUSDPerDay / 24)
    }

    let monthStr = 'Unknown'
    if (row['Date']) {
      const dateObj = new Date(row['Date'])
      if (!isNaN(dateObj.getTime())) {
        monthStr = format(dateObj, 'yyyy-MM-dd')
      } else if (typeof row['Date'] === 'string') {
        monthStr = row['Date'].substring(0, 7)
      }
    }

    return {
      eventNo: Number(row['Event No']) || index + 1,
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
      costImpact: hours * (costUSDPerDay / 24),
      costSaved: finalCostSaved,
      inchargeName: String(row['Incharge Name'] || 'Unknown'),
      monitoringEngineer: String(row['Monitoring Engineer'] || 'Unknown'),
      month: monthStr
    }
  })

  // Insert in chunks
  const chunkSize = 100
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize)
    await prisma.nPTRecord.createMany({ data: chunk })
    console.log(`Inserted ${i + chunk.length} records...`)
  }

  console.log('Done seeding.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
