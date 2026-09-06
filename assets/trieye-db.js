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

  // 1. BOOKINGS & JOBS
  async getBookings() {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('bookings')
          .select(`
            *,
            customers (id, name, phone, email, notes),
            vehicles (id, vehicle_type, reg_number),
            services (id, name, description, base_price),
            bays (id, name, bay_type, status),
            slots (id, slot_time, status),
            payments (id, amount, method, status)
          `)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const formatted = data.map(b => {
            const cust = b.customers || {};
            const veh = b.vehicles || {};
            const svc = b.services || {};
            const bay = b.bays || {};
            const slot = b.slots || {};
            const pay = (Array.isArray(b.payments) && b.payments[0]) || b.payments || {};

            return {
              id: b.id,
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
        } else if (error) {
          TrieyeDB.logError('bookings', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on bookings SELECT]:', err);
      }
    }
    // Fallback to LocalStorage
    try {
      return JSON.parse(localStorage.getItem('trieye_bookings')) || [];
    } catch (e) {
      return [];
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

        if (!error && Array.isArray(data)) {
          const map = {};
          data.forEach(c => {
            const clean = (c.phone || '').replace(/\D/g, '').slice(-10);
            if (clean) {
              const veh = (Array.isArray(c.vehicles) && c.vehicles[0]) || c.vehicles || {};
              map[clean] = {
                id: c.id,
                name: c.name || 'Valued Customer',
                phone: c.phone,
                email: c.email || '',
                vehicleType: veh.vehicle_type || 'Car',
                model: veh.reg_number ? `${veh.vehicle_type || 'Car'} (${veh.reg_number})` : (veh.vehicle_type || 'Car'),
                reg: veh.reg_number || '',
                visits: 1,
                spent: 0,
                lastVisit: c.created_at ? c.created_at.split('T')[0] : '',
                notes: c.notes || ''
              };
            }
          });
          localStorage.setItem('trieye_customers', JSON.stringify(map));
          return map;
        } else if (error) {
          TrieyeDB.logError('customers', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getCustomers]:', err);
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
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        const { data, error } = await sb.from('services').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const map = {};
          data.forEach(s => {
            const base = Number(s.base_price || 699);
            map[s.name] = {
              id: s.id,
              desc: s.description || '',
              pricing: {
                'Hatchback': Math.round(base * 0.8),
                'Sedan': base,
                'SUV / 4x4': Math.round(base * 1.25),
                'Superbike': Math.round(base * 0.5)
              },
              active: s.active !== false
            };
          });
          localStorage.setItem('trieye_services_matrix', JSON.stringify(map));
          return map;
        } else if (error) {
          TrieyeDB.logError('services', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getServices]:', err);
      }
    }
    try {
      const local = JSON.parse(localStorage.getItem('trieye_services_matrix'));
      if (local && Object.keys(local).length > 0) return local;
    } catch (e) {}
    return fallbackDefaults || {};
  },

  async saveServices(servicesMap) {
    localStorage.setItem('trieye_services_matrix', JSON.stringify(servicesMap));

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    if (sb) {
      try {
        for (const k of Object.keys(servicesMap)) {
          const s = servicesMap[k];
          const base = s.pricing ? (s.pricing['Sedan'] || 699) : 699;
          const { error } = await sb.from('services').upsert({
            name: k,
            description: s.desc || '',
            base_price: base,
            active: s.active !== false
          }, { onConflict: 'name' });
          if (error) TrieyeDB.logError('services', 'UPSERT', error);
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
        if (!error && Array.isArray(data)) {
          return data;
        } else if (error) {
          TrieyeDB.logError('payments', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getPayments]:', err);
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


