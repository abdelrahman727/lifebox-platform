const { execSync } = require('child_process');
const path = require('path');

console.log('Running postinstall script...');

// Skip in production environment
if (process.env.NODE_ENV === 'production') {
  console.log('Skipping postinstall in production environment');
  process.exit(0);
}

// Generate Prisma Client
const databasePath = path.join(__dirname, '../../../libs/database');
console.log('Generating Prisma Client in:', databasePath);

try {
  execSync('npx prisma generate', { 
    cwd: databasePath,
    stdio: 'inherit' 
  });
  console.log('Prisma Client generated successfully');
} catch (error) {
  console.error('Failed to generate Prisma Client:', error.message);
  // Don't exit with error in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}
