// Trieye Studio - Production Build & Asset Synchronization Script
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

console.log('🚀 [Build] Starting TRIEYE production build and asset synchronization...');

// Helper: recursive copy
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

// 1. Ensure directories exist
fs.mkdirSync(path.join(publicDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(publicDir, 'images'), { recursive: true });

// 2. Synchronize assets/ to public/assets/
console.log('📦 [Build] Synchronizing assets directory to public/assets/ ...');
copyRecursiveSync(path.join(rootDir, 'assets'), path.join(publicDir, 'assets'));

// 3. Synchronize images/ to public/images/
console.log('🖼️  [Build] Synchronizing images directory to public/images/ ...');
if (fs.existsSync(path.join(rootDir, 'images'))) {
  copyRecursiveSync(path.join(rootDir, 'images'), path.join(publicDir, 'images'));
}

// 4. Copy all HTML pages to public/
console.log('📄 [Build] Synchronizing HTML pages to public/ ...');
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
  fs.copyFileSync(path.join(rootDir, file), path.join(publicDir, file));
});

// 5. Copy robots.txt and sitemap.xml
['robots.txt', 'sitemap.xml'].forEach(file => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(publicDir, file));
  }
});

// 6. Verify required production assets
const requiredImages = [
  'trieye-logo.png',
  'trieye-logo-dark.png',
  'trieye-logo-light.png',
  'car-wash.webp',
  'ceramic-coating.webp',
  'graphene-coating.webp',
  'paint-correction.webp',
  'interior-detailing.webp',
  'ppf.webp'
];

let allPassed = true;
requiredImages.forEach(img => {
  const inRootImages = fs.existsSync(path.join(rootDir, 'images', img));
  const inPublicImages = fs.existsSync(path.join(publicDir, 'images', img));
  if (!inRootImages || !inPublicImages) {
    console.error(`❌ [Build Error] Missing required asset: ${img} (root: ${inRootImages}, public: ${inPublicImages})`);
    allPassed = false;
  }
});

if (!allPassed) {
  console.error('❌ [Build] Asset verification failed.');
  process.exit(1);
}

console.log(`✅ [Build] Successfully synchronized ${htmlFiles.length} HTML files and all required images!`);
console.log('✨ [Build] Production assets are 100% verified and ready for Vercel deployment.');
