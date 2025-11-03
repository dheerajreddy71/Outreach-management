const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log('\nCurrent users:');
    users.forEach(u => console.log(`  - ${u.email}: ${u.role}`));

    // Update all users to ADMIN
    const result = await prisma.user.updateMany({
      data: {
        role: 'ADMIN',
      },
    });

    console.log(`\n✅ Updated ${result.count} user(s) to ADMIN role`);

    // Verify
    const updated = await prisma.user.findMany();
    console.log('\nAfter update:');
    updated.forEach(u => console.log(`  - ${u.email}: ${u.role}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
