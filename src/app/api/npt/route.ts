import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const records = await prisma.nPTRecord.findMany({
      orderBy: {
        eventNo: 'asc'
      }
    })

    const mappedRecords = records.map(r => ({
      EventNo: r.eventNo,
      RigName: r.rigName,
      WellID: r.wellId,
      WellCategory: r.wellCategory,
      CompanyCode: r.companyCode,
      CDE: r.cde || "",
      Depth: r.depth,
      OnshoreOffshore: r.onshoreOffshore,
      Category: r.category,
      Hours: r.hours,
      TimeSaved: r.timeSaved,
      CostUSDPerDay: r.costUsdPerDay,
      CostImpact: r.costImpact,
      CostSaved: r.costSaved
    }))

    return NextResponse.json({
      success: true,
      data: mappedRecords,
    })
  } catch (error) {
    console.error("Failed to fetch NPT records:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch database records." }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
