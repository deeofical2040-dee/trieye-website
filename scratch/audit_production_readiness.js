const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.json') || f.endsWith('.sql'));

console.log('=== PRODUCTION READINESS AUDIT ===\n');

const localhostMatches = [];
const missingAssets = [];
const exposedSecrets = [];

// 1. Search for localhost in frontend files
files.forEach(file => {
  if (file.startsWith('scratch') || file.startsWith('test_')) return;
  const filePath = path.join(rootDir, file);
  if (!fs.statSync(filePath).isFile()) return;

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check localhost
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('localhost') || line.includes('127.0.0.1')) {
      // Ignore comments or server start logs if in server.js
      if (file === 'server.js' && (line.includes('console.log') || line.includes('//'))) return;
      localhostMatches.push({ file, line: idx + 1, content: line.trim() });
    }

    // Check potential hardcoded passwords/secrets
    if (line.includes('supabase_secret') || line.includes('service_role_key') || line.includes('SECRET_KEY')) {
      exposedSecrets.push({ file, line: idx + 1, content: line.trim() });
    }
  });

  // Check asset references if HTML
  if (file.endsWith('.html')) {
    const assetMatches = [...content.matchAll(/(src|href)=["'](assets\/[\s\S]*?)["']/gi)];
    assetMatches.forEach(m => {
      const relPath = m[2].split('?')[0].split('#')[0];
      const assetPath = path.join(rootDir, relPath);
      if (!fs.existsSync(assetPath)) {
        missingAssets.push({ file, asset: relPath });
      }
    });
  }
});

console.log('1. LOCALHOST REFERENCES FOUND IN FRONTEND/CONFIG:');
if (localhostMatches.length === 0) {
  console.log('   ✅ NONE FOUND (0 localhost occurrences in production frontend code)');
} else {
  localhostMatches.forEach(m => console.log(`   ⚠️ [${m.file}:${m.line}] ${m.content}`));
}

console.log('\n2. MISSING ASSETS AUDIT:');
if (missingAssets.length === 0) {
  console.log('   ✅ ALL ASSETS EXIST (0 missing image/CSS/JS assets)');
} else {
  missingAssets.forEach(m => console.log(`   ❌ [${m.file}] ${m.asset}`));
}

console.log('\n3. EXPOSED SENSITIVE KEYS AUDIT:');
if (exposedSecrets.length === 0) {
  console.log('   ✅ NO SENSITIVE SECRETS EXPOSED');
} else {
  exposedSecrets.forEach(m => console.log(`   ⚠️ [${m.file}:${m.line}] ${m.content}`));
}
