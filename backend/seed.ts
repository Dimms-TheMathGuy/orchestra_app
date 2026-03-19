import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.project.create({
    data: {
      name: "Test Project",

      owner: {
        create: {
          email: "test@example.com",
          name: "Test User",
          password: "password123"
        }
      }
    }
  })
}

main()