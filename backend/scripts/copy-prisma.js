const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'generated', 'prisma');
const dest = path.join(__dirname, '..', 'dist', 'generated', 'prisma');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        // Skip files that are busy/locked (like query-engine executable)
        if (err.code === 'EBUSY') {
          console.log(`Skipping locked file: ${entry.name}`);
        } else {
          throw err;
        }
      }
    }
  }
}

try {
  copyRecursive(src, dest);
  console.log('Prisma client copied successfully to dist/generated/prisma');
} catch (error) {
  console.error('Error copying Prisma client:', error.message);
  process.exit(1);
}
