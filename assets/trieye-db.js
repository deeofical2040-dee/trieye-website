// Trieye Studio - Supabase Adapter & Data Access Layer
// =======================================================
// Configured to match the exact live Supabase relational schema:
// - customers: id (uuid/int), name, phone, email, notes, created_at
// - vehicles: id, customer_id, vehicle_type, reg_number, created_at
// - services: id, name, description, duration_minutes, base_price, active, created_at
// - bays: id, name, bay_type, status, created_at
// - slots: id, slot_time, status, created_at
// - bookings: id, customer_id, vehicle_id, service_id, bay_id, slot_id, booking_date, status, total_amount, source, created_at
// - payments: id, booking_id, amount, method, status, created_at
// - profiles: id, role, created_at

const TrieyeDB = {
  // Check if Supabase client is ready
  isSupabaseReady: function() {
    return typeof window.getTrieyeSupabase === 'function' && window.getTrieyeSupabase() !== null;
  },

  // Helper for verbose diagnostic logging
  logError(table, operation, error) {
    if (!error) return;
    console.error(
      `🚨 [Supabase Error] Table: "${table}" | Operation: "${operation}"\n` +
      `   Code: ${error.code || 'N/A'}\n` +
      `   Message: ${error.message || JSON.stringify(error)}\n` +
      `   Hint: ${error.hint || 'Check table RLS / role privileges'}\n` +
      `   Details: ${error.details || 'None'}`
    );
  },

  // Helper to check for an active Supabase authenticated session
  async getSession() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn('⚠️ [Supabase Auth] Error getting session:', error.message);
        return null;
      }
      return data ? data.session : null;
    } catch (err) {
      console.warn('⚠️ [Supabase Auth] Exception checking session:', err);
      return null;
    }
  },

  // Authenticate Admin User via Supabase Auth
  async signInAdmin(email, password) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb) {
      return { success: false, error: 'Supabase client is not configured or unavailable.' };
    }

    try {
      console.log(`⚡ [Supabase Auth] Attempting signInWithPassword for: ${email}`);
      const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('🚨 [Supabase Auth Failure]:', error.message, `(Code: ${error.status || error.code || 'N/A'})`);
        return { success: false, error: error.message || 'Invalid email or password.' };
      }

      if (!data || !data.user) {
        console.error('🚨 [Supabase Auth Failure]: No user returned from authentication.');
        return { success: false, error: 'Authentication failed. Please try again.' };
      }

      console.log('⚡ [Supabase Auth Success] Authenticated user ID:', data.user.id);

      // Verify public.profiles role === 'admin'
      const roleCheck = await TrieyeDB.verifyAdminRole(data.user.id);
      if (!roleCheck.isAdmin) {
        console.warn('⚠️ [Supabase Auth] User authenticated but lacks admin role. Signing out...');
        await sb.auth.signOut();
        return { success: false, error: 'Unauthorized admin account.' };
      }

      console.log('✅ [Supabase Auth & Role Verified] Admin access granted for user:', data.user.email);
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      console.error('🚨 [Supabase Auth Exception]:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during sign-in.' };
    }
  },

  // Verify that the user has an admin profile in public.profiles
  async verifyAdminRole(userId) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb || !userId) return { isAdmin: false, role: null };

    try {
      console.log(`⚡ [Supabase Profile Check] Verifying role in public.profiles for user: ${userId}`);
      const { data, error } = await sb
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (error) {
        TrieyeDB.logError('profiles', 'SELECT', error);
        return { isAdmin: false, role: null, error: error.message };
      }

      const role = data ? (data.role || '').toLowerCase() : null;
      console.log(`⚡ [Supabase Profile Check Result] User role is: "${role}"`);

      if (role === 'admin') {
        return { isAdmin: true, role: 'admin' };
      } else {
        return { isAdmin: false, role: role };
      }
    } catch (err) {
      console.error('🚨 [Supabase Profile Exception]:', err);
      return { isAdmin: false, role: null, error: err.message };
    }
  },

  // Sign out user and clear any local caches
  async signOutAdmin() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        console.log('⚡ [Supabase Auth] Signing out current user...');
        await sb.auth.signOut();
      } catch (err) {
        console.warn('⚠️ [Supabase Auth SignOut Exception]:', err);
      }
    }
    localStorage.removeItem('trieye_bookings');
    localStorage.removeItem('trieye_customers');
    localStorage.removeItem('trieye_payments');
  },

  // 1. BOOKINGS & JOBS
  async getBookings() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      // Diagnostic check: check whether an authenticated session exists before querying
      try {
        const session = await TrieyeDB.getSession();
        if (session) {
          console.log('⚡ [TrieyeDB getBookings] Authenticated Supabase session found for user:', session.user ? session.user.id : 'Active User');
        } else {
          console.warn('⚠️ [TrieyeDB getBookings] No authenticated Supabase session found (running as anon role).');
        }
      } catch (e) {}

      try {
        const { data, error } = await sb
          .from('bookings')
          .select(`
            id,
            share_token,
            customer_id,
            vehicle_id,
            service_id,
            bay_id,
            slot_id,
            booking_date,
            booking_time,
            status,
            total_amount,
            source,
            created_at,
            customers (id, name, phone, email, notes),
            vehicles (id, vehicle_type, reg_number),
            services (id, name, description, base_price),
            bays (id, name, bay_type, status),
            slots (id, slot_time, status),
            payments (id, amount, method, status)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          TrieyeDB.logError('bookings', 'SELECT', error);
          // When Supabase is connected and returns an error, do not silently replace with demo data
          return [];
        }

        if (Array.isArray(data)) {
          const formatted = data.map(b => {
            const cust = b.customers || {};
            const veh = b.vehicles || {};
            const svc = b.services || {};
            const bay = b.bays || {};
            const slot = b.slots || {};
            const paymentsArr = Array.isArray(b.payments) ? b.payments : (b.payments ? [b.payments] : []);
            let pay = {};
            if (paymentsArr.length > 0) {
              const sorted = paymentsArr.slice().sort((p1, p2) => new Date(p2.created_at || 0) - new Date(p1.created_at || 0));
              pay = sorted[0] || {};
            }

            const shortRef = b.id && b.id.length > 8 ? `TRI-${b.id.substring(0, 8).toUpperCase()}` : (b.id || 'TRI-INVOICE');
            const totalAmt = Number(b.total_amount !== null && b.total_amount !== undefined ? b.total_amount : (svc.base_price || 0));
            const payStatus = (pay.status || 'UNPAID').toUpperCase();
            const payMethod = pay.method ? (pay.method.toUpperCase() === 'PENDING' ? 'Pending' : pay.method) : 'Pending';

            let normStatus = (b.status || 'CONFIRMED').toUpperCase().trim();
            if (normStatus === 'CANCELED' || normStatus === 'CANCEL') normStatus = 'CANCELLED';
            if (normStatus === 'PENDING_CONFIRMATION') normStatus = 'PENDING';
            if (normStatus === 'DONE' || normStatus === 'FINISHED') normStatus = 'COMPLETED';

            return {
              id: b.id,
              share_token: b.share_token,
              invoice_ref: shortRef,
              booking_date: b.booking_date || '',
              total_amount: totalAmt,
              status: normStatus,
              source: (b.source || 'ONLINE').toUpperCase(),
              customer_id: b.customer_id,
              vehicle_id: b.vehicle_id,
              service_id: b.service_id,
              bay_id: b.bay_id,
              slot_id: b.slot_id,
              name: cust.name || 'Valued Customer',
              phone: cust.phone || '',
              vehicleType: veh.vehicle_type || 'Car',
              vehicleModel: veh.vehicle_type || 'Car',
              reg: veh.reg_number || '',
              service: svc.name || 'Foam Wash',
              date: b.booking_date || '',
              bookingTime: b.booking_time || null,
              slot: slot.slot_time || null,
              price: totalAmt,
              bay: bay.name || null,
              bayId: b.bay_id || null,
              slotId: b.slot_id || null,
              payStatus: payStatus,
              payMethod: payMethod,
              checkInTime: '',
              created: b.created_at || new Date().toISOString(),
              customers: cust,
              vehicles: veh,
              services: svc,
              payments: pay
            };
          });
          localStorage.setItem('trieye_bookings', JSON.stringify(formatted));
          return formatted;
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on bookings SELECT]:', err);
        return [];
      }
    }
    // Fallback to LocalStorage only if Supabase client is not configured
    try {
      return JSON.parse(localStorage.getItem('trieye_bookings')) || [];
    } catch (e) {
      return [];
    }
  },

  // Authoritative Database Share Token Query by UUID
  async getBookingShareToken(bookingId) {
    if (!bookingId) return null;
    const cleanId = String(bookingId).trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(cleanId)) {
      console.error('BUG: display invoice_ref or invalid identifier used as booking UUID for getBookingShareToken:', cleanId);
      throw new Error('Invalid booking UUID');
    }

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb) {
      console.error('Booking share-token query failed: Supabase client is not available');
      return null;
    }
    
    // Direct query using valid UUID
    try {
      const { data, error } = await sb
        .from('bookings')
        .select('id, share_token')
        .eq('id', cleanId)
        .maybeSingle();

      if (error) {
        console.error('Booking share-token query failed:', error);
        return null;
      }

      if (data && data.share_token) {
        return data.share_token;
      }
    } catch (err) {
      console.error('Booking share-token query exception:', err);
    }

    console.warn('Booking share-token query returned no record for UUID:', cleanId);
    return null;
  },

  // Public Secure Invoice Retrieval via Token RPC ONLY
  async getPublicInvoiceByToken(token) {
    if (!token || typeof token !== 'string' || token.trim().length < 16) {
      return { success: false, error: 'Invalid or missing invoice token.' };
    }
    const cleanToken = token.trim();
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;

    if (!sb) {
      return { success: false, error: 'Database service is unavailable.' };
    }

    try {
      console.log('⚡ [TrieyeDB] Calling RPC get_public_invoice_by_token...');
      const { data, error } = await sb.rpc('get_public_invoice_by_token', { p_token: cleanToken });
      if (error) {
        TrieyeDB.logError('rpc:get_public_invoice_by_token', 'EXECUTE', error);
        return { success: false, error: error.message || 'Invoice unavailable.' };
      }
      if (data && typeof data === 'object') {
        return data;
      }
      return { success: false, error: 'This invoice link is invalid or no longer available.' };
    } catch (err) {
      console.error('🚨 [TrieyeDB RPC network exception]:', err);
      return { success: false, error: 'Network error while retrieving invoice.' };
    }
  },

  // 1. SECURE PUBLIC ONLINE BOOKING RPC
  async createOnlineBooking(params) {
    // Strict Vehicle Registration Validation & Normalization
    const normalizedReg = this.formatVehicleNumber(params.reg);
    if (!this.validateVehicleNumber(normalizedReg)) {
      return {
        success: false,
        error: "Enter vehicle number in TN 01 AB 1234 format"
      };
    }
    params.reg = normalizedReg;

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    
    if (sb) {
      try {
        console.log('⚡ [Supabase RPC] Invoking public.create_online_booking with 6 params:', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'TN 01 AB 1234',
          p_service_name: params.service || 'Foam Wash',
          p_booking_date: params.date || new Date().toISOString().split('T')[0]
        });
        
        const { data, error } = await sb.rpc('create_online_booking', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'TN 01 AB 1234',
          p_service_name: params.service || 'Foam Wash',
          p_booking_date: params.date || new Date().toISOString().split('T')[0]
        });

        if (error) {
          TrieyeDB.logError('rpc:create_online_booking', 'EXECUTE', error);
          return {
            success: false,
            error: error.message || 'Booking submission failed. Please try again.'
          };
        }

        if (data && data.success === false) {
          console.warn('⚠️ [Supabase RPC Validation]', data.error);
          return data;
        }

        console.log('⚡ [Supabase RPC Success] Online booking created:', data);
        
        // Optimistically record in local cache with returned reference
        if (data && (data.booking_id || data.booking_ref)) {
          const realId = data.booking_id || data.id;
          const refCode = data.booking_ref || (realId && String(realId).length > 8 ? `TRI-${realId.substring(0, 8).toUpperCase()}` : (realId || 'TRI-ONLINE'));
          const localBooking = {
            id: realId || refCode,
            share_token: data.share_token || null,
            invoice_ref: refCode,
            supabaseId: realId || null,
            name: params.name,
            phone: params.phone,
            vehicleType: params.vehicleType,
            vehicleModel: `${params.vehicleType} (${params.reg || 'Standard'})`,
            reg: params.reg,
            service: params.service,
            date: params.date,
            slot: null,
            price: Number(params.price || 0),
            status: 'CONFIRMED',
            bay: null,
            source: 'ONLINE',
            payStatus: 'UNPAID',
            payMethod: 'Pending (Counter/UPI)',
            created: new Date().toISOString()
          };
          try {
            const local = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
            local.unshift(localBooking);
            localStorage.setItem('trieye_bookings', JSON.stringify(local));
          } catch (e) {}
        }

        return data || { success: true };
      } catch (err) {
        console.error('🚨 [Supabase RPC Network Error on createOnlineBooking]:', err);
        return {
          success: false,
          error: 'Network connection issue. Please check your internet connection.'
        };
      }
    }

    // Fallback if Supabase client not ready
    console.warn('⚠️ [TrieyeDB] Supabase not ready, recording locally only');
    const fallbackId = 'TRI-' + Math.floor(1000 + Math.random() * 9000);
    const localBooking = {
      id: fallbackId,
      name: params.name,
      phone: params.phone,
      vehicleType: params.vehicleType,
      vehicleModel: `${params.vehicleType} (${params.reg || 'Standard'})`,
      reg: params.reg,
      service: params.service,
      date: params.date,
      slot: null,
      price: Number(params.price || 0),
      status: 'CONFIRMED',
      bay: null,
      source: 'ONLINE',
      payStatus: 'UNPAID',
      payMethod: 'Pending (Counter/UPI)',
      created: new Date().toISOString()
    };
    try {
      const local = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      local.unshift(localBooking);
      localStorage.setItem('trieye_bookings', JSON.stringify(local));
    } catch (e) {}

    return {
      success: true,
      booking_ref: fallbackId,
      message: 'Booking confirmed locally (Offline mode)'
    };
  },

  async saveBooking(booking) {
    // Admin dashboard direct save helper (syncs to LocalStorage and Supabase)
    try {
      const local = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      const idx = local.findIndex(b => b.id === booking.id);
      if (idx >= 0) local[idx] = booking;
      else local.unshift(booking);
      localStorage.setItem('trieye_bookings', JSON.stringify(local));
    } catch (e) {}

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb && booking.id && !String(booking.id).startsWith('TR-')) {
      try {
        const updatePayload = {
          status: booking.status
        };
        if (booking.bayId) updatePayload.bay_id = booking.bayId;
        if (booking.slotId) updatePayload.slot_id = booking.slotId;
        if (booking.price) updatePayload.total_amount = Number(booking.price);

        const { error } = await sb.from('bookings').update(updatePayload).eq('id', booking.id);
        if (error) TrieyeDB.logError('bookings', 'UPDATE', error);
      } catch (err) {
        console.warn('⚠️ [Supabase saveBooking warning]:', err);
      }
    }
  },

  async deleteBooking(bookingId) {
    try {
      const local = (JSON.parse(localStorage.getItem('trieye_bookings')) || []).filter(b => b.id !== bookingId);
      localStorage.setItem('trieye_bookings', JSON.stringify(local));
    } catch (e) {}

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { error } = await sb.from('bookings').delete().eq('id', bookingId);
        if (error) TrieyeDB.logError('bookings', 'DELETE', error);
        else console.log('⚡ [Supabase] Booking deleted:', bookingId);
      } catch (err) {
        console.error('🚨 [Supabase Network Error on deleteBooking]:', err);
      }
    }
  },

  // 2. CUSTOMERS & VEHICLES
  async getCustomers() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('customers')
          .select(`
            id, name, phone, email, notes, created_at,
            vehicles (id, vehicle_type, reg_number)
          `)
          .gte('created_at', '2026-09-25T00:00:00Z');

        if (error) {
          TrieyeDB.logError('customers', 'SELECT', error);
          return {};
        }

        if (Array.isArray(data)) {
          const map = {};
          data.forEach(c => {
            const clean = (c.phone || '').replace(/\D/g, '').slice(-10);
            if (clean) {
              const vehList = Array.isArray(c.vehicles) ? c.vehicles : (c.vehicles ? [c.vehicles] : []);
              const primaryVeh = vehList[0] || {};
              map[clean] = {
                id: c.id,
                name: c.name || 'Valued Customer',
                phone: c.phone,
                email: c.email || '',
                vehicleType: primaryVeh.vehicle_type || 'Car',
                model: primaryVeh.reg_number ? `${primaryVeh.vehicle_type || 'Car'} (${primaryVeh.reg_number})` : (primaryVeh.vehicle_type || 'Car'),
                reg: primaryVeh.reg_number || '',
                vehicles: vehList.map(v => ({
                  type: v.vehicle_type || 'Car',
                  reg: v.reg_number || ''
                })),
                visits: 1,
                spent: 0,
                lastVisit: c.created_at ? c.created_at.split('T')[0] : '',
                notes: c.notes || ''
              };
            }
          });
          localStorage.setItem('trieye_customers', JSON.stringify(map));
          return map;
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getCustomers]:', err);
        return {};
      }
    }
    try {
      return JSON.parse(localStorage.getItem('trieye_customers')) || {};
    } catch (e) { return {}; }
  },

  async saveCustomer(cleanPhone, customerObj) {
    try {
      const map = JSON.parse(localStorage.getItem('trieye_customers')) || {};
      map[cleanPhone] = customerObj;
      localStorage.setItem('trieye_customers', JSON.stringify(map));
    } catch (e) {}

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb && cleanPhone) {
      try {
        const { data: custData, error: custErr } = await sb
          .from('customers')
          .upsert({
            name: customerObj.name,
            phone: cleanPhone,
            email: customerObj.email || null,
            notes: customerObj.notes || null
          }, { onConflict: 'phone' })
          .select('id')
          .single();

        if (custErr) {
          TrieyeDB.logError('customers', 'UPSERT', custErr);
        } else if (custData && (customerObj.reg || customerObj.vehicleType)) {
          const normReg = customerObj.reg ? TrieyeDB.formatVehicleNumber(customerObj.reg) : 'TN 01 AB 1234';
          const { error: vehErr } = await sb
            .from('vehicles')
            .upsert({
              customer_id: custData.id,
              vehicle_type: customerObj.vehicleType || 'Car',
              reg_number: normReg
            });
          if (vehErr) TrieyeDB.logError('vehicles', 'UPSERT', vehErr);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveCustomer]:', err);
      }
    }
  },

  // 3. AUTHORITATIVE PRICING ENGINE
  _currentPricing: null,
  _pricingSubscribers: new Set(),

  subscribePricing(callback) {
    if (typeof callback === 'function') {
      this._pricingSubscribers.add(callback);
      if (this._currentPricing) {
        try { callback(this._currentPricing); } catch (e) { console.error(e); }
      }
    }
  },

  getCurrentPricing() {
    return this._currentPricing;
  },

  normalizePricingData(data) {
    if (!data || typeof data !== 'object') return null;
    const servicesList = Array.isArray(data) ? data : Object.values(data);
    if (servicesList.length === 0) return null;

    const normalizedMap = {};
    servicesList.forEach(s => {
      if (!s || !s.name) return;
      const name = String(s.name).trim();
      const p = s.pricing || {};

      const parsePrice = (v1, v2, v3) => {
        const val = (v1 !== null && v1 !== undefined && v1 !== '') ? v1 :
                    (v2 !== null && v2 !== undefined && v2 !== '') ? v2 : v3;
        if (val === null || val === undefined || val === '' || isNaN(Number(val))) return null;
        const num = Number(val);
        return num > 0 ? num : null;
      };

      const hatch = parsePrice(s.hatchback_price, p['Hatchback'], null);
      const sedan = parsePrice(s.sedan_price, p['Sedan'], s.base_price);
      const suv = parsePrice(s.suv_price, p['SUV / 4x4'] || p['SUV'], s.base_price);
      const bike = parsePrice(s.bike_price, p['Superbike'] || p['Bike'] || p['Superbike / Bike'], s.base_price);
      const base = parsePrice(s.base_price, sedan, null);

      normalizedMap[name] = {
        id: s.id || null,
        name: name,
        desc: s.desc || s.description || '',
        duration_minutes: s.duration_minutes || null,
        base_price: base,
        hatchback_price: hatch,
        sedan_price: sedan,
        suv_price: suv,
        bike_price: bike,
        pricing: {
          'Hatchback': hatch,
          'Sedan': sedan,
          'SUV / 4x4': suv,
          'Superbike': bike
        },
        active: s.active !== false
      };
    });

    return Object.keys(normalizedMap).length > 0 ? normalizedMap : null;
  },

  async loadAuthoritativePricing() {
    const timestamp = Date.now();
    let rawData = null;

    // 1. Authoritative Source: Supabase Database (if configured and reachable)
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('services').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          rawData = data;
        } else if (error) {
          console.warn('⚠️ [Supabase Pricing Read Warning]:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ [Supabase Pricing Network Warning]:', err.message);
      }
    }

    // 2. Authoritative Source: REST Backend API (Direct from server disk with strict cache-busting)
    if (!rawData) {
      try {
        const res = await fetch(`/api/services?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData && typeof apiData === 'object' && Object.keys(apiData).length > 0) {
            rawData = apiData;
          }
        }
      } catch (err) {
        console.warn('⚠️ [API Services Network Warning]:', err.message);
      }
    }

    // 3. Static JSON asset fallback with strict cache-busting
    if (!rawData) {
      try {
        const res = await fetch(`/assets/services-data.json?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === 'object' && Object.keys(json).length > 0) {
            rawData = json;
          }
        }
      } catch (err) {}
    }

    const normalized = this.normalizePricingData(rawData);
    if (normalized) {
      this._currentPricing = normalized;
      // Sync in-memory cache
      try {
        localStorage.setItem('trieye_services_matrix', JSON.stringify(normalized));
      } catch (e) {}

      // Notify all connected UI consumers (Desktop Table, Mobile Cards, Booking Form) with the SAME single dataset
      this._pricingSubscribers.forEach(cb => {
        try { cb(normalized); } catch (e) { console.error(e); }
      });
    }

    return this._currentPricing;
  },

  async getServices(fallbackDefaults) {
    const live = await this.loadAuthoritativePricing();
    if (live) return live;
    return this.normalizePricingData(fallbackDefaults) || {};
  },

  async saveServices(servicesMap) {
    const timestamp = Date.now();
    const normalized = this.normalizePricingData(servicesMap);
    if (normalized) {
      this._currentPricing = normalized;
    }

    try {
      localStorage.setItem('trieye_services_matrix', JSON.stringify(servicesMap));
      localStorage.setItem('trieye_services_last_updated', String(timestamp));
    } catch (e) {}

    // Broadcast across tabs instantly (< 5ms)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('trieye_pricing_sync');
        channel.postMessage({ type: 'PRICING_UPDATED', matrix: normalized || servicesMap, timestamp: timestamp });
      }
    } catch (e) {}

    // 1. Persist to REST Backend API if running
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized || servicesMap)
      });
    } catch (e) {}

    // 2. Persist to Supabase Database (Single Source of Truth)
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        for (const k of Object.keys(servicesMap)) {
          const s = servicesMap[k];
          const hatch = Number(s.hatchback_price !== undefined ? s.hatchback_price : (s.pricing ? s.pricing['Hatchback'] : 0));
          const sedan = Number(s.sedan_price !== undefined ? s.sedan_price : (s.pricing ? s.pricing['Sedan'] : 0));
          const suv = Number(s.suv_price !== undefined ? s.suv_price : (s.pricing ? s.pricing['SUV / 4x4'] : 0));
          const bike = Number(s.bike_price !== undefined ? s.bike_price : (s.pricing ? s.pricing['Superbike'] : 0));
          const base = Number(s.base_price !== undefined ? s.base_price : sedan);

          const payload = {
            name: s.name || k,
            description: s.desc || s.description || '',
            duration_minutes: s.duration_minutes || null,
            base_price: base,
            hatchback_price: hatch,
            sedan_price: sedan,
            suv_price: suv,
            bike_price: bike,
            active: s.active !== false
          };

          let updateResult = null;
          // Try update by ID if ID exists
          if (s.id) {
            updateResult = await sb.from('services').update(payload).eq('id', s.id).select();
          }
          // Try update by name if no ID or no rows matched
          if (!updateResult || !updateResult.data || updateResult.data.length === 0) {
            updateResult = await sb.from('services').update(payload).eq('name', s.name || k).select();
          }
          // If still no row found, insert new service record
          if (!updateResult || !updateResult.data || updateResult.data.length === 0) {
            updateResult = await sb.from('services').insert(payload).select();
          }

          if (updateResult && updateResult.error) {
            TrieyeDB.logError('services:saveServices', 'UPDATE/INSERT', updateResult.error);
          } else if (updateResult && updateResult.data && updateResult.data[0]) {
            s.id = updateResult.data[0].id;
            console.log('⚡ [Supabase Services Saved to DB]', k, updateResult.data[0]);
          }
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveServices]:', err);
      }
    }

    // Re-fetch and notify all subscribers with verified fresh state
    await this.loadAuthoritativePricing();

    return { success: true, matrix: this._currentPricing || servicesMap };
  },

  // 4. DETAILING BAYS
  async getBays(fallbackBays) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('bays').select('*').order('name', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map(b => ({
            id: b.id,
            name: b.name,
            type: b.bay_type || 'Detailing & Wash',
            status: b.status || 'Available'
          }));
          localStorage.setItem('trieye_bays_list', JSON.stringify(formatted));
          return formatted;
        } else if (error) {
          TrieyeDB.logError('bays', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getBays]:', err);
      }
    }
    try {
      const local = JSON.parse(localStorage.getItem('trieye_bays_list'));
      if (local && local.length > 0) return local;
    } catch (e) {}
    return fallbackBays || [];
  },

  async saveBays(baysList) {
    localStorage.setItem('trieye_bays_list', JSON.stringify(baysList));

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        for (const b of baysList) {
          const { error } = await sb.from('bays').upsert({
            name: b.name,
            bay_type: b.type || 'Detailing & Wash',
            status: b.status || 'Available'
          }, { onConflict: 'name' });
          if (error) TrieyeDB.logError('bays', 'UPSERT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveBays]:', err);
      }
    }
  },

  // 5. SLOTS & SCHEDULES
  async getSchedules() {
    const defaultStandardSlots = [
      '09:00 AM - 11:00 AM',
      '11:00 AM - 01:00 PM',
      '01:30 PM - 03:30 PM',
      '03:30 PM - 05:30 PM',
      '05:30 PM - 07:30 PM',
      '07:30 PM - 09:30 PM'
    ];
    const todayStr = new Date().toISOString().split('T')[0];

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('slots').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const map = {};
          map[todayStr] = {
            date: todayStr,
            isFullDayBlocked: false,
            slots: data.map(s => ({
              id: s.id,
              time: s.slot_time,
              status: (s.status || 'available').toLowerCase()
            }))
          };
          localStorage.setItem('trieye_custom_schedules', JSON.stringify(map));
          return map;
        } else if (error) {
          TrieyeDB.logError('slots', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getSchedules]:', err);
      }
    }

    try {
      const local = JSON.parse(localStorage.getItem('trieye_custom_schedules'));
      if (local && Object.keys(local).length > 0) return local;
    } catch (e) {}

    // Clean default schedule with all slots available
    const defaultMap = {};
    defaultMap[todayStr] = {
      date: todayStr,
      isFullDayBlocked: false,
      slots: defaultStandardSlots.map(s => ({ time: s, status: 'available' }))
    };
    localStorage.setItem('trieye_custom_schedules', JSON.stringify(defaultMap));
    return defaultMap;
  },

  async saveDaySchedule(dateStr, scheduleObj) {
    try {
      const all = JSON.parse(localStorage.getItem('trieye_custom_schedules')) || {};
      all[dateStr] = scheduleObj;
      localStorage.setItem('trieye_custom_schedules', JSON.stringify(all));
    } catch (e) {}

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb && Array.isArray(scheduleObj.slots)) {
      try {
        for (const slot of scheduleObj.slots) {
          const { error } = await sb.from('slots').upsert({
            slot_time: slot.time,
            status: slot.status || 'available'
          }, { onConflict: 'slot_time' });
          if (error) TrieyeDB.logError('slots', 'UPSERT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveDaySchedule]:', err);
      }
    }
  },

  // 6. PAYMENTS LEDGER
  async getPayments() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('payments').select('*').order('created_at', { ascending: false });
        if (error) {
          TrieyeDB.logError('payments', 'SELECT', error);
          return [];
        }
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getPayments]:', err);
        return [];
      }
    }
    return [];
  },

  async recordPayment(paymentObj) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    const bookingId = paymentObj.bookingId || paymentObj.booking_id;
    const amount = Number(paymentObj.amount || 0);
    const method = (paymentObj.method || 'CASH').toUpperCase();
    const status = (paymentObj.status || 'PAID').toUpperCase();

    if (sb && bookingId) {
      try {
        // Check if an existing payment record exists for this booking
        const { data: existingPayments, error: selErr } = await sb
          .from('payments')
          .select('id, created_at')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (selErr) {
          TrieyeDB.logError('payments', 'SELECT existing', selErr);
        }

        if (Array.isArray(existingPayments) && existingPayments.length > 0) {
          const existingId = existingPayments[0].id;
          const { data, error } = await sb
            .from('payments')
            .update({
              amount: amount,
              method: method,
              status: status
            })
            .eq('id', existingId)
            .select();

          if (error) {
            TrieyeDB.logError('payments', 'UPDATE', error);
            return { success: false, error: error.message };
          }
          return { success: true, payment: data ? data[0] : null };
        } else {
          const { data, error } = await sb
            .from('payments')
            .insert({
              booking_id: bookingId,
              amount: amount,
              method: method,
              status: status
            })
            .select();

          if (error) {
            TrieyeDB.logError('payments', 'INSERT', error);
            return { success: false, error: error.message };
          }
          return { success: true, payment: data ? data[0] : null };
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on recordPayment]:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Database unavailable or missing booking ID' };
  },

  // 7. REAL-TIME SUBSCRIPTION LISTENER
  subscribeToChanges(onUpdate) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb || typeof sb.channel !== 'function') return null;

    try {
      const channel = sb
        .channel('trieye_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onUpdate('bookings'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => onUpdate('slots'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bays' }, () => onUpdate('bays'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => onUpdate('customers'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => onUpdate('services'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => onUpdate('payments'))
        .subscribe();

      console.log('⚡ [Trieye] Supabase real-time channel established.');
      return channel;
    } catch (err) {
      console.warn('⚠️ [Trieye] Realtime subscription error:', err);
      return null;
    }
  },

  // 8. INVOICES & BILLING (OFFLINE)
  async getInvoices() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('invoices')
          .select(`
            *,
            customers (id, name, phone, email, notes),
            vehicles (id, vehicle_type, reg_number),
            invoice_items (*),
            bookings ( payments (id, amount, method, status) )
          `)
          .order('created_at', { ascending: false })
          .gte('created_at', '2026-09-25T00:00:00Z');

        if (error) {
          TrieyeDB.logError('invoices', 'SELECT', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getInvoices]:', err);
        return [];
      }
    }
    return [];
  },

  async createInvoice(payload) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (!sb) return { success: false, error: 'Database service is unavailable.' };

    try {
      // Validate & normalize vehicle reg
      if (payload.vehicle) {
        const normReg = this.formatVehicleNumber(payload.vehicle.reg_number);
        if (!this.validateVehicleNumber(normReg)) {
          return {
            success: false,
            error: "Enter vehicle number in TN 01 AB 1234 format"
          };
        }
        payload.vehicle.reg_number = normReg;
      }

      // 1. Ensure Customer Exists
      let customerId = payload.customer.id;
      if (!customerId) {
        const { data: existCust } = await sb.from('customers').select('id').eq('phone', payload.customer.phone).maybeSingle();
        if (existCust && existCust.id) {
          customerId = existCust.id;
        } else {
          const { data: custData, error: custErr } = await sb
            .from('customers')
            .insert({
              name: payload.customer.name,
              phone: payload.customer.phone,
              email: payload.customer.email || null
            })
            .select('id')
            .single();
          if (custErr) throw custErr;
          customerId = custData.id;
        }
      }

      // 2. Ensure Vehicle Exists
      let vehicleId = payload.vehicle.id;
      if (!vehicleId && customerId) {
        const { data: existVeh } = await sb.from('vehicles').select('id').eq('reg_number', payload.vehicle.reg_number).maybeSingle();
        if (existVeh && existVeh.id) {
          vehicleId = existVeh.id;
        } else {
          const { data: vehData, error: vehErr } = await sb
            .from('vehicles')
            .insert({
              customer_id: customerId,
              vehicle_type: payload.vehicle.vehicle_type || 'Car',
              reg_number: payload.vehicle.reg_number || 'TN 01 AB 1234'
            })
            .select('id')
            .single();
          if (vehErr) throw vehErr;
          vehicleId = vehData.id;
        }
      }

      // 3. Create Booking Record (WALK_IN)
      let primaryServiceId = (payload.services && payload.services.length > 0) ? payload.services[0].id : null;
      if (primaryServiceId === 'undefined' || primaryServiceId === 'null' || !primaryServiceId) primaryServiceId = null;
      
      const { data: bookData, error: bookErr } = await sb
        .from('bookings')
        .insert({
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_id: primaryServiceId, // Primary service
          booking_date: new Date().toISOString().split('T')[0],
          status: 'COMPLETED',
          source: 'WALK_IN',
          total_amount: payload.totals.grand_total
        })
        .select('id')
        .single();
      
      if (bookErr) {
        console.error("Booking insert failed:", bookErr);
        throw bookErr;
      }
      const bookingId = bookData.id;

      // 4. Create Invoice Record
      let newInvSeq = parseInt(localStorage.getItem('trieye_new_inv_seq') || '1');
      const customInv = 'TR-' + new Date().getFullYear() + '-' + String(newInvSeq).padStart(6, '0');
      localStorage.setItem('trieye_new_inv_seq', String(newInvSeq + 1));

      const { data: invData, error: invErr } = await sb
        .from('invoices')
        .insert({
          invoice_number: customInv,
          customer_id: customerId,
          vehicle_id: vehicleId,
          booking_id: bookingId,
          subtotal: payload.totals.subtotal,
          discount: payload.totals.discount,
          grand_total: payload.totals.grand_total,
          status: 'ISSUED'
        })
        .select('id, invoice_number, created_at')
        .single();
      if (invErr) {
        console.error("Invoice insert failed:", invErr);
        throw invErr;
      }
      const invoiceId = invData.id;

      // 4. Create Invoice Items
      const itemsPayload = payload.services.map(s => {
        let sid = s.id || null;
        if (sid === 'undefined' || sid === 'null' || !sid) sid = null;
        return {
          invoice_id: invoiceId,
          service_id: sid,
          service_name: s.name,
          quantity: s.quantity || 1,
          unit_price: s.unit_price,
          total_price: (s.quantity || 1) * s.unit_price
        };
      });
      const { error: itemsErr } = await sb.from('invoice_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // 6. Create Payment Record (Optional)
      if (payload.payment) {
        const { error: payErr } = await sb.from('payments').insert({
          booking_id: bookingId,
          amount: payload.payment.amount,
          method: payload.payment.method,
          status: payload.payment.status,
          paid_at: payload.payment.status === 'PAID' ? new Date().toISOString() : null
        });
        if (payErr) {
          console.error("Payment insert failed:", payErr);
          throw payErr;
        }
      }

      return { success: true, invoice: invData };
    } catch (err) {
      console.error('🚨 [TrieyeDB] createInvoice error:', err);
      return { success: false, error: err.message || 'Failed to create invoice.' };
    }
  },

  async getInvoiceById(invoiceId) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('invoices')
          .select(`
            *,
            customers (id, name, phone, email, notes),
            vehicles (id, vehicle_type, reg_number),
            invoice_items (*),
            bookings ( payments (id, amount, method, status) )
          `)
          .eq('id', invoiceId)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('🚨 [TrieyeDB] getInvoiceById error:', err);
      }
    }
    return null;
  },

  // 9. STRICT INDIAN VEHICLE REGISTRATION FORMATTER & VALIDATOR (AA 00 AA 0000 format)
  formatVehicleNumber(raw) {
    if (!raw) return '';
    const str = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let clean = '';
    for (let i = 0; i < str.length && clean.length < 10; i++) {
      const ch = str[i];
      const pos = clean.length;
      if (pos === 0 || pos === 1) {
        // Positions 1-2: Letters only
        if (/[A-Z]/.test(ch)) clean += ch;
      } else if (pos === 2 || pos === 3) {
        // Positions 3-4: Numbers only
        if (/[0-9]/.test(ch)) clean += ch;
      } else if (pos === 4 || pos === 5) {
        // Positions 5-6: Letters only
        if (/[A-Z]/.test(ch)) clean += ch;
      } else if (pos >= 6 && pos <= 9) {
        // Positions 7-10: Numbers only
        if (/[0-9]/.test(ch)) clean += ch;
      }
    }
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return clean.slice(0, 2) + ' ' + clean.slice(2);
    if (clean.length <= 6) return clean.slice(0, 2) + ' ' + clean.slice(2, 4) + ' ' + clean.slice(4);
    return clean.slice(0, 2) + ' ' + clean.slice(2, 4) + ' ' + clean.slice(4, 6) + ' ' + clean.slice(6, 10);
  },

  validateVehicleNumber(val) {
    if (!val) return false;
    return /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{2}\s[0-9]{4}$/.test(String(val).trim().toUpperCase());
  },

  normalizeVehicleNumber(raw) {
    if (!raw) return '';
    return this.formatVehicleNumber(raw);
  },

  // Backward compatible aliases
  formatVehicleReg(raw) {
    return this.formatVehicleNumber(raw);
  },

  validateVehicleReg(val) {
    return this.validateVehicleNumber(val);
  },

  normalizeVehicleReg(raw) {
    return this.normalizeVehicleNumber(raw);
  },

  attachVehicleInput(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.setAttribute('maxlength', '13');
    inputEl.setAttribute('placeholder', 'TN 01 AB 1234');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.style.textTransform = 'uppercase';

    const formatAndUpdate = () => {
      const start = inputEl.selectionStart;
      const oldVal = inputEl.value;
      const formatted = this.formatVehicleNumber(oldVal);
      if (oldVal !== formatted) {
        inputEl.value = formatted;
        if (start !== null && start < oldVal.length) {
          const diff = formatted.length - oldVal.length;
          const newPos = Math.max(0, Math.min(formatted.length, start + diff));
          inputEl.setSelectionRange(newPos, newPos);
        }
      }
      if (errorEl && (errorEl.classList.contains('visible') || errorEl.style.display === 'inline' || errorEl.style.display === 'block')) {
        if (this.validateVehicleNumber(formatted)) {
          errorEl.classList.remove('visible');
          if (errorEl.style.display === 'inline' || errorEl.style.display === 'block') errorEl.style.display = 'none';
          inputEl.classList.remove('is-invalid');
        }
      }
    };

    inputEl.addEventListener('input', formatAndUpdate);

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && inputEl.selectionStart === inputEl.selectionEnd) {
        const pos = inputEl.selectionStart;
        if (pos > 0 && inputEl.value[pos - 1] === ' ') {
          e.preventDefault();
          const before = inputEl.value.slice(0, pos - 2);
          const after = inputEl.value.slice(pos);
          inputEl.value = this.formatVehicleNumber(before + after);
          const newPos = Math.max(0, pos - 2);
          inputEl.setSelectionRange(newPos, newPos);
        }
      }
    });

    inputEl.addEventListener('blur', () => {
      if (inputEl.value.trim().length > 0) {
        const formatted = this.formatVehicleNumber(inputEl.value);
        inputEl.value = formatted;
        if (!this.validateVehicleNumber(formatted)) {
          if (errorEl) {
            errorEl.innerText = "Enter vehicle number in TN 01 AB 1234 format";
            errorEl.classList.add('visible');
            if (errorEl.style.display === 'none') errorEl.style.display = 'inline';
          }
          inputEl.classList.add('is-invalid');
        } else {
          if (errorEl) {
            errorEl.classList.remove('visible');
            if (errorEl.style.display === 'inline' || errorEl.style.display === 'block') errorEl.style.display = 'none';
          }
          inputEl.classList.remove('is-invalid');
        }
      }
    });
  },

  // 10. PUBLIC SECURE TRACK BOOKING LOOKUP
  async trackBooking(bookingRefOrVeh, phone) {
    if (!bookingRefOrVeh || !phone) {
      return {
        success: false,
        error: "Please enter both your Vehicle Number and registered Phone Number."
      };
    }

    const rawInput = String(bookingRefOrVeh).trim().toUpperCase();
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Please enter a valid 10-digit registered phone number."
      };
    }

    const isTriRef = rawInput.startsWith('TRI-') || /^[0-9A-F]{8}$/i.test(rawInput);
    let cleanRef = isTriRef ? rawInput.replace(/^#/, '').replace(/^TRI-/, '') : '';
    let cleanReg = '';
    
    if (isTriRef) {
      cleanRef = rawInput.replace(/^#/, '').replace(/^TRI-/, '');
    } else {
      const formattedVeh = this.formatVehicleNumber(rawInput);
      cleanReg = formattedVeh.replace(/[^A-Z0-9]/g, '');
      if (!cleanReg) {
        return {
          success: false,
          error: "Enter vehicle number in TN 01 AB 1234 format"
        };
      }
    }

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;

    if (sb) {
      try {
        const { data, error } = await sb
          .from('bookings')
          .select(`
            id,
            booking_date,
            booking_time,
            status,
            total_amount,
            source,
            created_at,
            customers!inner (id, name, phone),
            vehicles (id, vehicle_type, reg_number),
            services (id, name, base_price),
            bays (id, name),
            slots (id, slot_time)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          TrieyeDB.logError('bookings:trackBooking', 'SELECT', error);
        } else if (Array.isArray(data) && data.length > 0) {
          const match = data.find(b => {
            const custPhone = b.customers && b.customers.phone ? String(b.customers.phone).replace(/\D/g, '').slice(-10) : '';
            const phoneMatches = custPhone === cleanPhone;
            if (!phoneMatches) return false;

            const bRef = b.id ? `TRI-${String(b.id).substring(0, 8).toUpperCase()}` : '';
            const rawId = String(b.id || '').toUpperCase();
            const refMatches = cleanRef && (cleanRef === bRef.replace('TRI-', '') || rawId.startsWith(cleanRef));

            const vReg = b.vehicles && b.vehicles.reg_number ? String(b.vehicles.reg_number).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
            const regMatches = cleanReg && vReg && (vReg === cleanReg || vReg.includes(cleanReg) || cleanReg.includes(vReg));

            return refMatches || regMatches;
          });

          if (match) {
            return {
              success: true,
              booking: this._formatTrackBookingResult(match)
            };
          }
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on trackBooking]:', err);
      }
    }

    // Fallback to local cache (for offline / offline-generated bookings)
    try {
      const local = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      const match = local.find(b => {
        const custPhone = String(b.phone || (b.customers && b.customers.phone) || '').replace(/\D/g, '').slice(-10);
        const phoneMatches = custPhone === cleanPhone;
        if (!phoneMatches) return false;

        const bRef = String(b.invoice_ref || b.id || '').toUpperCase().replace(/^TRI-/, '');
        const refMatches = cleanRef && (bRef.startsWith(cleanRef) || cleanRef.startsWith(bRef) || (b.id && String(b.id).toUpperCase().replace(/^TRI-/, '').startsWith(cleanRef)));

        const vReg = String(b.reg || (b.vehicles && b.vehicles.reg_number) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const regMatches = cleanReg && vReg && (vReg === cleanReg || vReg.includes(cleanReg) || cleanReg.includes(vReg));

        return refMatches || regMatches;
      });

      if (match) {
        let normStatus = (match.status || 'CONFIRMED').toUpperCase().trim();
        if (normStatus === 'CANCELED' || normStatus === 'CANCEL') normStatus = 'CANCELLED';
        if (normStatus === 'DONE' || normStatus === 'FINISHED') normStatus = 'COMPLETED';

        return {
          success: true,
          booking: {
            booking_ref: match.invoice_ref || (match.id ? `TRI-${String(match.id).substring(0, 8).toUpperCase()}` : 'TRI-BOOKING'),
            customer_name: match.name || (match.customers && match.customers.name) || 'Valued Customer',
            phone: match.phone || (match.customers && match.customers.phone) || '',
            service: match.service || (match.services && match.services.name) || 'Car Detailing',
            vehicleType: match.vehicleType || (match.vehicles && match.vehicles.vehicle_type) || 'Car',
            reg: match.reg || (match.vehicles && match.vehicles.reg_number) || 'TN 01 AB 1234',
            booking_date: match.date || match.booking_date || '',
            booking_time: match.bookingTime || match.slot || (match.slots && match.slots.slot_time) || 'Standard Slot',
            price: Number(match.price || match.total_amount || 0),
            status: normStatus,
            created_at: match.created || match.created_at || new Date().toISOString()
          }
        };
      }
    } catch (e) {}

    return {
      success: false,
      error: "We couldn't find a booking matching those details. Please check your vehicle number and phone number."
    };
  },

  _formatTrackBookingResult(b) {
    const cust = b.customers || {};
    const veh = b.vehicles || {};
    const svc = b.services || {};
    const slot = b.slots || {};

    const shortRef = b.id && String(b.id).length > 8 ? `TRI-${String(b.id).substring(0, 8).toUpperCase()}` : (b.id || 'TRI-BOOKING');
    const totalAmt = Number(b.total_amount !== null && b.total_amount !== undefined ? b.total_amount : (svc.base_price || 0));

    let normStatus = (b.status || 'CONFIRMED').toUpperCase().trim();
    if (normStatus === 'CANCELED' || normStatus === 'CANCEL') normStatus = 'CANCELLED';
    if (normStatus === 'DONE' || normStatus === 'FINISHED') normStatus = 'COMPLETED';

    return {
      booking_ref: shortRef,
      customer_name: cust.name || 'Valued Customer',
      phone: cust.phone || '',
      service: svc.name || 'Car Detailing',
      vehicleType: veh.vehicle_type || 'Car',
      reg: veh.reg_number || 'TN 01 AB 1234',
      booking_date: b.booking_date || '',
      booking_time: b.booking_time || slot.slot_time || 'Standard Slot',
      price: totalAmt,
      status: normStatus,
      created_at: b.created_at || new Date().toISOString()
    };
  }
};

window.TrieyeDB = TrieyeDB;

if (typeof window !== 'undefined') {
  window.formatVehicleNumber = TrieyeDB.formatVehicleNumber.bind(TrieyeDB);
  window.validateVehicleNumber = TrieyeDB.validateVehicleNumber.bind(TrieyeDB);
  window.normalizeVehicleNumber = TrieyeDB.normalizeVehicleNumber.bind(TrieyeDB);
  window.formatVehicleReg = TrieyeDB.formatVehicleReg.bind(TrieyeDB);
  window.validateVehicleReg = TrieyeDB.validateVehicleReg.bind(TrieyeDB);
  window.normalizeVehicleReg = TrieyeDB.normalizeVehicleReg.bind(TrieyeDB);
}


