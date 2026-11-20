import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Building Keripik Pisang Salee production bundle...');

// 1. Prepare dist directory
fs.mkdirSync(distDir, { recursive: true });

// 2. Copy index.html to dist/index.html
const indexSrc = path.join(rootDir, 'index.html');
const indexDest = path.join(distDir, 'index.html');
fs.copyFileSync(indexSrc, indexDest);
console.log('✓ Copied index.html -> dist/index.html');

// 3. Copy src/runtime/* and src/config/* to dist/src/*
const runtimeSrc = path.join(rootDir, 'src', 'runtime');
const runtimeDest = path.join(distDir, 'src', 'runtime');
copyDirRecursive(runtimeSrc, runtimeDest);
console.log('✓ Copied src/runtime/* -> dist/src/runtime/*');

const configSrc = path.join(rootDir, 'src', 'config');
const configDest = path.join(distDir, 'src', 'config');
copyDirRecursive(configSrc, configDest);
console.log('✓ Copied src/config/* -> dist/src/config/*');

// 4. Copy assets/images/* to dist/assets/images/* and dist/images/*
const assetsSrc = path.join(rootDir, 'assets');
const assetsDest = path.join(distDir, 'assets');
copyDirRecursive(assetsSrc, assetsDest);
console.log('✓ Copied assets/* -> dist/assets/*');

const publicSrc = path.join(rootDir, 'public');
copyDirRecursive(publicSrc, distDir);
console.log('✓ Copied public/* -> dist/*');

// 5. Copy supabase/schema.sql to dist/supabase/schema.sql
const supabaseSrc = path.join(rootDir, 'supabase');
const supabaseDest = path.join(distDir, 'supabase');
copyDirRecursive(supabaseSrc, supabaseDest);
console.log('✓ Copied supabase/* -> dist/supabase/*');

console.log('Build completed successfully! Output directory: dist/');
