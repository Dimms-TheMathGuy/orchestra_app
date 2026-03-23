import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function main() {
//   await prisma.project.create({
//     data: {
//       name: "Test Project",

//       owner: {
//         create: {
//           email: "test@example.com",
//           name: "Test User",
//           password: "password123"
//         }
//       }
//     }
//   })
// }
// main()

const prisma = new PrismaClient()

async function main() {
  const project = await prisma.project.create({
    data: {
      name: 'Orchestra PM',

      owner: {
        create: {
          email: "orchestarateamleader@gmail.com",
          name: "Team Leader 1",
          password: "password123"
        }
      }
    }
  })

  const owner = 'Dimms-TheMathGuy'
  const repo = 'orchestra_app'

  await prisma.projectRepository.create({
    data: {
      projectId: project.id,
      githubOwner: owner,
      githubRepo: repo,
      githubUrl: `https://github.com/${owner}/${repo}`
    }
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })