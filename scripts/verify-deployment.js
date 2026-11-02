// scripts/verify-deployment.js
// Verifies live Vercel production deployment for trieye-website.vercel.app

const https = require('https');

const VERCEL_URL = process.env.VERCEL_URL || 'https://trieye-website.vercel.app';
const EXPECTED_STATUS = 200;
const TIMEOUT_MS = 60000;
const RETRY_INTERVAL_MS = 4000;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Trieye-Deployment-Verifier/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', err => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

async function verifyEndpoint(pathname, expectedPattern = null) {
  const fullUrl = `${VERCEL_URL}${pathname}`;
  const res = await fetchUrl(fullUrl);
  if (res.statusCode !== EXPECTED_STATUS) {
    throw new Error(`Endpoint ${pathname} returned status ${res.statusCode}, expected ${EXPECTED_STATUS}`);
  }
  if (expectedPattern && !res.body.includes(expectedPattern)) {
    throw new Error(`Endpoint ${pathname} did not match expected pattern: "${expectedPattern}"`);
  }
  return res;
}

async function run() {
  const targetPattern = process.argv[2] || null;
  console.log(`🔍 Verifying live Vercel deployment at: ${VERCEL_URL}`);
  if (targetPattern) {
    console.log(`🎯 Verifying presence of: "${targetPattern}"`);
  }

  const startTime = Date.now();
  let attempt = 1;

  while (Date.now() - startTime < TIMEOUT_MS) {
    try {
      console.log(`[Attempt ${attempt}] Polling ${VERCEL_URL}...`);
      
      // 1. Verify Home Page
      const homeRes = await verifyEndpoint('/');
      const isVercelServer = (homeRes.headers['server'] || '').toLowerCase().includes('vercel');
      const vercelId = homeRes.headers['x-vercel-id'] || 'N/A';

      // 2. Verify Services API
      await verifyEndpoint('/api/services');

      // 3. Verify Static Data
      await verifyEndpoint('/assets/services-data.json');

      // 4. Verify Target Pattern if specified
      if (targetPattern) {
        const dashRes = await verifyEndpoint('/dashboard');
        if (!dashRes.body.includes(targetPattern) && !homeRes.body.includes(targetPattern)) {
          throw new Error(`Target content "${targetPattern}" not yet visible on live site`);
        }
      }

      console.log(`\n✅ VERCEL DEPLOYMENT VERIFIED LIVE!`);
      console.log(`• URL: ${VERCEL_URL}`);
      console.log(`• HTTP Status: ${homeRes.statusCode} OK`);
      console.log(`• Server: ${isVercelServer ? 'Vercel Edge Network' : homeRes.headers['server']}`);
      console.log(`• Vercel Edge ID: ${vercelId}`);
      console.log(`• Verification Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);
      process.exit(0);
    } catch (err) {
      console.log(`⏳ Deployment not yet verified: ${err.message}. Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
      attempt++;
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }

  console.error(`❌ Verification timed out after ${TIMEOUT_MS / 1000}s.`);
  process.exit(1);
}

run();
