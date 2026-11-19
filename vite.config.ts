import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function copyDirRecursive(srcDir: string, destDir: string) {
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

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-salee-runtime',
      closeBundle() {
        const rootDir = process.cwd();
        copyDirRecursive(
          path.join(rootDir, 'src', 'runtime'),
          path.join(rootDir, 'dist', 'src', 'runtime')
        );
        copyDirRecursive(
          path.join(rootDir, 'assets'),
          path.join(rootDir, 'dist', 'assets')
        );
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
});
