import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default admin user if no users exist
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    const defaultUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    
    console.log('✅ Created default admin user:', defaultUser.email);
  } else {
    console.log(`ℹ️  Database already has ${userCount} user(s)`);
  }

  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
