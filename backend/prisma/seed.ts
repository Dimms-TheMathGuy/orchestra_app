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

// async function main() {
//   const project = await prisma.project.create({
//     data: {
//       name: 'Orchestra PM',

//       owner: {
//         create: {
//           email: "orchestarateamleader@gmail.com",
//           name: "Team Leader 1",
//           password: "password123"
//         }
//       }
//     }
//   })

//   const owner = 'Dimms-TheMathGuy'
//   const repo = 'orchestra_app'

//   await prisma.projectRepository.create({
//     data: {
//       projectId: project.id,
//       githubOwner: owner,
//       githubRepo: repo,
//       githubUrl: `https://github.com/${owner}/${repo}`
//     }
//   })
// }

// main()
//   .then(() => prisma.$disconnect())
//   .catch(async (e) => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })

async function main() {

  // USERS
  const alice = await prisma.user.create({
    data: {
      email: 'alice@test.com',
      password: 'hashedpassword',
      name: 'Alice',
    },
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@test.com',
      password: 'hashedpassword',
      name: 'Bob',
    },
  })

  // PROJECT
  const project = await prisma.project.create({
    data: {
      name: 'Group chat test',
      description: 'Realtime collaboration platform',
      ownerId: alice.id,
    },
  })

  // MEMBERS
  await prisma.projectMember.createMany({
    data: [
      {
        userId: alice.id,
        projectId: project.id,
        role: 'OWNER',
      },
      {
        userId: bob.id,
        projectId: project.id,
        role: 'MEMBER',
      },
    ],
  })

  // SAMPLE MESSAGE
  await prisma.projectMessage.create({
    data: {
      projectId: project.id,
      senderId: alice.id,
      content: 'Welcome to Orchestra PM',
      iv: 'temporary',
    },
  })

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })