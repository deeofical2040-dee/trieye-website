const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo_audit_raw.json'), 'utf-8'));

console.log('=== TECHNICAL SEO AUDIT RESULTS SUMMARY ===\n');

Object.keys(data).forEach(file => {
  const p = data[file];
  console.log(`--------------------------------------------------`);
  console.log(`PAGE: /${file.replace('.html', '')}`);
  console.log(`TITLE: [${p.title ? 'PRESENT' : 'MISSING'}] "${p.title || ''}" (Len: ${p.title ? p.title.length : 0})`);
  console.log(`META DESC: [${p.metaDesc ? 'PRESENT' : 'MISSING'}] "${p.metaDesc || ''}" (Len: ${p.metaDesc ? p.metaDesc.length : 0})`);
  console.log(`H1 COUNT: ${p.h1s.length} | TEXT: ${JSON.stringify(p.h1s)}`);
  console.log(`CANONICAL: [${p.canonical ? 'PRESENT' : 'MISSING'}] "${p.canonical || ''}"`);
  console.log(`ROBOTS: [${p.metaRobots ? 'PRESENT' : 'MISSING'}] "${p.metaRobots || ''}"`);
  console.log(`SCHEMAS: ${p.schemas.length} found -> Types: ${p.schemas.map(s => s['@type'] || s.error).join(', ')}`);
  console.log(`OG TAGS: title=${!!p.og.title}, desc=${!!p.og.desc}, img=${!!p.og.img}, url=${!!p.og.url}`);
  console.log(`IMAGES: Total: ${p.imgStats.total} | Alt: ${p.imgStats.withAlt} | Empty: ${p.imgStats.emptyAlt} | Missing: ${p.imgStats.missingAlt}`);
  console.log(`--------------------------------------------------\n`);
});
