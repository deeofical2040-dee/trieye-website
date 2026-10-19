// Vercel Serverless Function: /api/services
// Authoritative Supabase Pricing Persistence & Fetch Endpoint
const { createClient } = require('@supabase/supabase-js');

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || 'https://dqvhuxrezcreporxmghi.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'sb_publishable_nBix8MKCg2HpWlWGXeDLJg_uqhmpsGz'
  };
}
const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB limit

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizePricingFromRows(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const map = {};
  data.forEach(s => {
    const key = s.name;
    const hatch = Number(s.hatchback_price !== undefined ? s.hatchback_price : s.base_price || 0);
    const sedan = Number(s.sedan_price !== undefined ? s.sedan_price : s.base_price || 0);
    const suv = Number(s.suv_price !== undefined ? s.suv_price : s.base_price || 0);
    const bike = Number(s.bike_price !== undefined ? s.bike_price : s.base_price || 0);
    map[key] = {
      id: s.id,
      name: s.name,
      desc: s.description || '',
      base_price: sedan,
      hatchback_price: hatch,
      sedan_price: sedan,
      suv_price: suv,
      bike_price: bike,
      duration_minutes: s.duration_minutes || null,
      pricing: {
        'Hatchback': hatch,
        'Sedan': sedan,
        'SUV / 4x4': suv,
        'Superbike': bike
      },
      active: s.active !== false
    };
  });
  return Object.keys(map).length > 0 ? map : null;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return { body: req.body };
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf-8') > MAX_PAYLOAD_BYTES) {
      return { error: 'PAYLOAD_TOO_LARGE' };
    }
    try {
      return { body: JSON.parse(req.body) };
    } catch (e) {
      return { error: 'INVALID_JSON' };
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_PAYLOAD_BYTES) {
        req.destroy();
        resolve({ error: 'PAYLOAD_TOO_LARGE' });
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve({ body: JSON.parse(raw) });
      } catch (e) {
        resolve({ error: 'INVALID_JSON' });
      }
    });
    req.on('error', () => resolve({ error: 'STREAM_ERROR' }));
  });
}

function validateServicesPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Pricing matrix payload must be a JSON object mapping service names to package data.';
  }
  const keys = Object.keys(body);
  if (keys.length === 0) {
    return 'Pricing matrix payload cannot be empty.';
  }
  if (keys.length > 50) {
    return 'Pricing matrix contains too many services (maximum 50).';
  }
  for (const k of keys) {
    const s = body[k];
    if (!s || typeof s !== 'object') {
      return `Invalid service entry for "${k}". Must be an object.`;
    }
    const name = s.name || k;
    if (typeof name !== 'string' || name.trim().length === 0) {
      return `Invalid or missing service name for key "${k}".`;
    }
    const prices = [
      s.hatchback_price !== undefined ? s.hatchback_price : (s.pricing ? s.pricing['Hatchback'] : 0),
      s.sedan_price !== undefined ? s.sedan_price : (s.pricing ? s.pricing['Sedan'] : 0),
      s.suv_price !== undefined ? s.suv_price : (s.pricing ? s.pricing['SUV / 4x4'] : 0),
      s.bike_price !== undefined ? s.bike_price : (s.pricing ? s.pricing['Superbike'] : 0)
    ];
    for (const p of prices) {
      if (isNaN(Number(p)) || Number(p) < 0) {
        return `Invalid price value in service "${k}". Prices must be non-negative numbers.`;
      }
    }
  }
  return null;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. GET / HEAD: Read authoritative pricing directly from Supabase
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

    try {
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await sb.from('services').select('*').order('created_at', { ascending: true });

      if (error || !Array.isArray(data) || data.length === 0) {
        // SAFETY REQUIREMENT: NEVER present static fallback JSON as current authoritative prices.
        res.statusCode = 503;
        res.end(JSON.stringify({
          success: false,
          status: 'UNAVAILABLE',
          error: 'Authoritative Supabase pricing database is currently unreachable or empty.',
          details: error ? error.message : 'No services found in database'
        }));
        return;
      }

      const normalized = normalizePricingFromRows(data);
      if (!normalized) {
        res.statusCode = 503;
        res.end(JSON.stringify({
          success: false,
          status: 'UNAVAILABLE',
          error: 'Unable to parse authoritative pricing records from Supabase.'
        }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify(normalized));
      return;
    } catch (err) {
      res.statusCode = 503;
      res.end(JSON.stringify({
        success: false,
        status: 'UNAVAILABLE',
        error: 'Network or server error while connecting to authoritative Supabase database.',
        details: err.message
      }));
      return;
    }
  }

  // 2. POST / PUT: Update authoritative pricing (Admin authenticated only)
  if (req.method === 'POST' || req.method === 'PUT') {
    res.setHeader('Content-Type', 'application/json');

    // 2.0 Check Content-Length immediately to protect against oversized payload DoS
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      res.statusCode = 413;
      res.end(JSON.stringify({ success: false, error: 'Payload Too Large: Pricing payload exceeds 512 KB.' }));
      return;
    }

    // 2.1 Parse request body (stream size also guarded by MAX_PAYLOAD_BYTES)
    const parseResult = await parseBody(req);
    if (parseResult.error === 'PAYLOAD_TOO_LARGE') {
      res.statusCode = 413;
      res.end(JSON.stringify({ success: false, error: 'Payload Too Large: Pricing payload exceeds 512 KB.' }));
      return;
    }
    if (parseResult.error || !parseResult.body) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Bad Request: Malformed or unparseable JSON payload.' }));
      return;
    }

    const body = parseResult.body;
    const validationError = validateServicesPayload(body);
    if (validationError) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: `Validation Failed: ${validationError}` }));
      return;
    }

    // 2.2 Authenticate via Bearer Token
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      res.statusCode = 401;
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing or invalid Bearer authentication token. CORS headers do not grant authorization.'
      }));
      return;
    }

    // Verify token with Supabase Auth (Invoker context, zero service-role key exposure)
    const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
    const sbUserClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authErr } = await sbUserClient.auth.getUser(token);
    if (authErr || !user) {
      res.statusCode = 401;
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid, expired, or revoked admin authentication session.',
        details: authErr ? authErr.message : null
      }));
      return;
    }

    // Check admin authorization (Admin email domain or app_metadata role)
    const isAdmin = (user.email && user.email.toLowerCase().includes('admin')) ||
                    (user.app_metadata && user.app_metadata.role === 'admin') ||
                    (user.user_metadata && user.user_metadata.role === 'admin') ||
                    user.email === 'admin@trieyestudio.com';

    if (!isAdmin) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'Forbidden: User is authenticated but does not have administrator privileges.'
      }));
      return;
    }

    // 2.3 Atomic Transactional Persistence
    // SAFETY REQUIREMENT: Must not silently partially succeed.
    // Try atomic RPC function 'save_services_matrix' first.
    try {
      const { data: rpcData, error: rpcError } = await sbUserClient.rpc('save_services_matrix', { p_services: body });

      if (!rpcError && rpcData && rpcData.success) {
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          mode: 'ATOMIC_TRANSACTION',
          message: 'Pricing matrix transactionally committed to authoritative Supabase database.',
          count: rpcData.count || Object.keys(body).length
        }));
        return;
      }

      // If the RPC is not installed (PostgreSQL error code 42883: function does not exist)
      if (rpcError && (rpcError.code === '42883' || rpcError.message.includes('function') && rpcError.message.includes('does not exist'))) {
        res.statusCode = 501;
        res.end(JSON.stringify({
          success: false,
          error: 'Atomic database RPC "save_services_matrix" is not installed on this Supabase project.',
          details: 'To prevent partial updates, multi-service writes require the atomic transactional migration.',
          required_migration: 'supabase_services_migration.sql'
        }));
        return;
      }

      if (rpcError) {
        res.statusCode = 502;
        res.end(JSON.stringify({
          success: false,
          error: 'Atomic database RPC failed. Transaction automatically rolled back.',
          details: rpcError.message
        }));
        return;
      }
    } catch (e) {
      res.statusCode = 502;
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to execute atomic pricing update on Supabase.',
        details: e.message
      }));
      return;
    }

    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: 'Unexpected pricing persistence state.' }));
    return;
  }

  // Unsupported HTTP Method
  res.statusCode = 405;
  res.setHeader('Allow', 'GET, HEAD, POST, PUT, OPTIONS');
  res.end(JSON.stringify({ success: false, error: `Method ${req.method} Not Allowed` }));
};
