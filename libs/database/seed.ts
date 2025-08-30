import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'super_user',
      description: 'Full platform access',
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Organization admin access',
    },
  });

  const clientRole = await prisma.role.create({
    data: {
      name: 'client',
      description: 'Client organization access',
    },
  });

  const operatorRole = await prisma.role.create({
    data: {
      name: 'operator',
      description: 'Device operation access',
    },
  });

  const viewerRole = await prisma.role.create({
    data: {
      name: 'viewer',
      description: 'Read-only access',
    },
  });

  // Create default super admin user
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'admin@lifebox.com',
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 
      fullName: 'System Administrator',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log('Seed data created successfully');
  console.log('Default super admin user: admin@lifebox.com / secret');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
