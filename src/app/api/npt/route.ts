import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const records = await prisma.nPTRecord.findMany({
      orderBy: {
        startDate: 'desc'
      }
    })

    // Map Prisma records back to the interface expected by the frontend's NPTRecord
    const mappedRecords = records.map(r => ({
      Section: r.section || "",
      Well: r.borehole, // In original logic Well and Borehole were mapped the same, adjust if needed
      MotherBoreholeName: r.motherBorehole || "",
      FieldName: r.fieldName,
      SpudDate: r.spudDate ? r.spudDate.toISOString() : "",
      StartDate: r.startDate.toISOString(),
      EndDate: r.endDate.toISOString(),
      NPTHours: r.hours,
      Days: r.days,
      NPTCategory: r.code,
      NPTSubCategory: r.subCode || "",
      ResponsibleParty: r.responsible,
      Description: r.description || "",
      TimeSavedDays: r.timeSavedDays,
      TimeSavedHours: r.timeSavedHours,
      CostImpact: r.costImpact,
      CostSaved: r.costSaved
    }))

    return NextResponse.json({
      success: true,
      data: mappedRecords,
      summary: {
        totalRecords: mappedRecords.length,
        uniqueWells: new Set(mappedRecords.map(r => r.Well)).size,
      }
    })
  } catch (error) {
    console.error("Failed to fetch NPT records:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch database records." }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
