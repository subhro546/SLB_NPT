import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.nPTRecord.count()
  console.log(`Total rows in database: ${count}\n`)

  const records = await prisma.nPTRecord.findMany({
    take: 3,
    orderBy: {
      eventNo: 'asc'
    }
  })
  
  console.log('Here are the first 3 records:\n')
  console.log(JSON.stringify(records, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
