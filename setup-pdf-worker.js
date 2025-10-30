// Setup script to copy PDF.js worker to public directory
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, 'public');
const workerSrc = join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const workerDest = join(publicDir, 'pdf.worker.min.mjs');

// Create public directory if it doesn't exist
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
  console.log('✓ Created public directory');
}

// Copy worker file
try {
  copyFileSync(workerSrc, workerDest);
  console.log('✓ PDF.js worker copied to public directory');
  console.log('✓ Setup complete!');
} catch (error) {
  console.error('✗ Error copying PDF.js worker:', error.message);
  process.exit(1);
}
