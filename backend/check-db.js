const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function checkDirectories() {
  try {
    console.log('Checking directories in database...');
    const directories = await prisma.directories.findMany();
    console.log('Directories found:', directories.length);
    console.log('Directories:', JSON.stringify(directories, null, 2));
    
    // Also check projects
    const projects = await prisma.projects.findMany();
    console.log('\nProjects found:', projects.length);
    console.log('Projects:', JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirectories();
