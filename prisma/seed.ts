import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

export async function main() {}

main()
  .then(() => {
    console.log("Seeding completed successfully.")
  })
  .catch((e) => {
    console.error("Error during seeding:", e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
