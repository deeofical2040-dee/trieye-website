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
            const pay = (Array.isArray(b.payments) && b.payments[0]) || b.payments || {};

            return {
              id: b.id,
              share_token: b.share_token,
              name: cust.name || 'Valued Customer',
              phone: cust.phone || '',
              vehicleType: veh.vehicle_type || 'Car',
              vehicleModel: veh.vehicle_type || 'Car',
              reg: veh.reg_number || '',
              service: svc.name || 'Foam Wash',
              date: b.booking_date || '',
              bookingTime: b.booking_time || null,
              slot: slot.slot_time || null,
              price: Number(b.total_amount || svc.base_price || 0),
              status: (b.status || 'CONFIRMED').toUpperCase(),
              bay: bay.name || null,
              bayId: b.bay_id || null,
              slotId: b.slot_id || null,
              source: (b.source || 'ONLINE').toUpperCase(),
              payStatus: (pay.status || 'UNPAID').toUpperCase(),
              payMethod: pay.method || 'Pending',
              checkInTime: '',
              created: b.created_at || new Date().toISOString()
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
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    
    if (sb) {
      try {
        console.log('⚡ [Supabase RPC] Invoking public.create_online_booking with 6 params:', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'STANDARD',
          p_service_name: params.service || 'Foam Wash',
          p_booking_date: params.date || new Date().toISOString().split('T')[0]
        });
        
        const { data, error } = await sb.rpc('create_online_booking', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'STANDARD',
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
          const localBooking = {
            id: data.booking_ref || ('TRI-' + String(data.booking_id || Math.random()).slice(0, 8).toUpperCase()),
            supabaseId: data.booking_id || null,
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
          `);

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
          const { error: vehErr } = await sb
            .from('vehicles')
            .upsert({
              customer_id: custData.id,
              vehicle_type: customerObj.vehicleType || 'Car',
              reg_number: customerObj.reg || 'NO REG'
            });
          if (vehErr) TrieyeDB.logError('vehicles', 'UPSERT', vehErr);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveCustomer]:', err);
      }
    }
  },

  // 3. SERVICES & PRICING
  async getServices(fallbackDefaults) {
    let localSaved = null;
    let localUpdatedTime = 0;
    try {
      const localStr = localStorage.getItem('trieye_services_matrix');
      if (localStr) {
        localSaved = JSON.parse(localStr);
        localUpdatedTime = Number(localStorage.getItem('trieye_services_last_updated') || 0);
      }
    } catch (e) {}

    // 1. Try local/server REST API if hosted with server
    try {
      const apiRes = await fetch('/api/services', { method: 'GET', cache: 'no-store' });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && typeof apiData === 'object' && Object.keys(apiData).length > 0) {
          localStorage.setItem('trieye_services_matrix', JSON.stringify(apiData));
          return apiData;
        }
      }
    } catch (e) {}

    // 2. Try Supabase
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('services').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          const map = {};
          data.forEach(s => {
            const hatch = Number(s.hatchback_price !== null && s.hatchback_price !== undefined ? s.hatchback_price : (s.base_price || 0));
            const sedan = Number(s.sedan_price !== null && s.sedan_price !== undefined ? s.sedan_price : (s.base_price || 0));
            const suv = Number(s.suv_price !== null && s.suv_price !== undefined ? s.suv_price : (s.base_price || 0));
            const bike = Number(s.bike_price !== null && s.bike_price !== undefined ? s.bike_price : (s.base_price || 0));
            const base = Number(s.base_price !== null && s.base_price !== undefined ? s.base_price : sedan);

            map[s.name] = {
              id: s.id,
              name: s.name,
              desc: s.description || '',
              base_price: base,
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

          // If local has explicit admin edits, merge to preserve latest admin prices
          if (localSaved && localUpdatedTime > 0) {
            Object.keys(localSaved).forEach(k => {
              if (map[k]) {
                // Merge in any locally saved pricing if remote row wasn't updated
                map[k] = { ...map[k], ...localSaved[k] };
              } else {
                map[k] = localSaved[k];
              }
            });
          }

          localStorage.setItem('trieye_services_matrix', JSON.stringify(map));
          return map;
        } else if (error) {
          TrieyeDB.logError('services', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getServices]:', err);
      }
    }

    if (localSaved && Object.keys(localSaved).length > 0) return localSaved;
    return fallbackDefaults || {};
  },

  async saveServices(servicesMap) {
    const timestamp = Date.now();
    localStorage.setItem('trieye_services_matrix', JSON.stringify(servicesMap));
    localStorage.setItem('trieye_services_last_updated', String(timestamp));

    // Broadcast across tabs instantly (< 5ms)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('trieye_pricing_sync');
        channel.postMessage({ type: 'PRICING_UPDATED', matrix: servicesMap, timestamp: timestamp });
      }
    } catch (e) {}

    // 1. Persist to REST Backend API if running
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicesMap)
      });
    } catch (e) {}

    // 2. Persist to Supabase
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
            description: s.desc || '',
            duration_minutes: s.duration_minutes || null,
            base_price: base,
            hatchback_price: hatch,
            sedan_price: sedan,
            suv_price: suv,
            bike_price: bike,
            active: s.active !== false
          };

          if (s.id) {
            payload.id = s.id;
          }

          const { error } = await sb.from('services').upsert(payload, { onConflict: 'name' });
          if (error) {
            TrieyeDB.logError('services', 'UPSERT', error);
            // Fallback for schemas with standard columns
            if (error.message && (error.message.includes('column') || error.code === '42703')) {
              await sb.from('services').upsert({
                name: s.name || k,
                description: s.desc || '',
                duration_minutes: s.duration_minutes || null,
                base_price: base,
                active: s.active !== false
              }, { onConflict: 'name' });
            }
          } else {
            console.log('⚡ [Supabase Services Saved]', k, payload);
          }
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on saveServices]:', err);
      }
    }
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
    if (sb) {
      try {
        const { error } = await sb.from('payments').insert({
          booking_id: paymentObj.bookingId,
          amount: Number(paymentObj.amount || 0),
          method: paymentObj.method || 'UPI / QR',
          status: (paymentObj.status || 'PAID').toUpperCase()
        });
        if (error) TrieyeDB.logError('payments', 'INSERT', error);
      } catch (err) {
        console.error('🚨 [Supabase Network Error on recordPayment]:', err);
      }
    }
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
  }
};

window.TrieyeDB = TrieyeDB;


