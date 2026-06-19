import * as XLSX from 'xlsx'
import * as path from 'path'

const filePath = path.resolve('/Users/subhro/RTDMMA/Intervention_Event_Dataset_Final_With_CompanyCode.xlsx')
const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
const rawData = XLSX.utils.sheet_to_json(sheet) as any[]

console.log("Total raw rows:", rawData.length);
if (rawData.length > 0) {
  console.log("First row keys:", Object.keys(rawData[0]));
  console.log("First row data:", rawData[0]);
}
