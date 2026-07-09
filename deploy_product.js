import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const reactAppDir = path.join(rootDir, 'product-page');
const publicDir = path.join(rootDir, 'public');
const publicAssetsDir = path.join(publicDir, 'assets');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

try {
  console.log('Installing dependencies in product-page/...');
  execSync('npm install', { cwd: reactAppDir, stdio: 'inherit' });
  console.log('Building React product page in product-page/...');
  execSync('npm run build', { cwd: reactAppDir, stdio: 'inherit' });
  console.log('Build completed successfully.');

  const distDir = path.join(reactAppDir, 'dist');
  const distHtml = path.join(distDir, 'index.html');
  const distAssets = path.join(distDir, 'assets');

  if (!fs.existsSync(distHtml)) {
    throw new Error('Vite build did not generate index.html');
  }

  console.log('Deploying built files to public/...');
  
  // Copy index.html
  fs.copyFileSync(distHtml, path.join(publicDir, 'index.html'));
  console.log('Deployed public/index.html');

  // Copy assets folder if it exists
  if (fs.existsSync(distAssets)) {
    // Clear old public/assets if exists to avoid build accumulation
    if (fs.existsSync(publicAssetsDir)) {
      fs.rmSync(publicAssetsDir, { recursive: true, force: true });
    }
    copyFolderSync(distAssets, publicAssetsDir);
    console.log('Deployed public/assets/');
  }

  console.log('Product page deployment complete!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
