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

  // Status and source normalization
  normalizeStatus(status) {
    if (!status) return 'CONFIRMED';
    let s = String(status).toUpperCase().trim();
    if (s === 'IN_PROGRESS') return 'IN PROGRESS';
    if (s === 'QUALITY_CHECK') return 'QUALITY CHECK';
    if (s === 'CANCELED' || s === 'CANCEL') return 'CANCELLED';
    if (s === 'PENDING_CONFIRMATION') return 'PENDING';
    if (s === 'DONE' || s === 'FINISHED') return 'COMPLETED';
    return s;
  },

  normalizeSource(source) {
    if (!source) return 'WALK-IN';
    let s = String(source).toUpperCase().trim();
    if (s === 'WALKIN' || s === 'WALK IN' || s === 'WALK_IN' || s === 'OFFLINE' || s === 'OFFLINE / WALK-IN' || s === 'OFFLINE/WALK-IN') return 'WALK-IN';
    if (s === 'ONLINE') return 'ONLINE';
    return s;
  },

  isQueueActive(status) {
    const s = this.normalizeStatus(status);
    return s !== 'COMPLETED' && s !== 'CANCELLED';
  },

  getLocalDateIso(d = new Date()) {
    if (!d) d = new Date();
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d).trim().slice(0, 10);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // Authoritative Calculation & Billing Metrics Presentation
  // Used across Dashboard, WhatsApp bill, Print/PDF, and Customer Invoice view
  calculateBillMetrics(invOrBooking) {
    if (!invOrBooking) {
      return {
        serviceName: 'Detailing Service',
        serviceDescription: '',
        originalBillAmount: 0,
        discountAmount: 0,
        discountReason: '',
        finalBillAmount: 0,
        amountCollected: 0,
        balanceDue: 0,
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        isPaid: false,
        isPartial: false,
        isUnpaid: true
      };
    }

    const items = invOrBooking.invoice_items || invOrBooking.items || [];
    let itemsSubtotal = 0;
    if (Array.isArray(items) && items.length > 0) {
      itemsSubtotal = items.reduce((sum, item) => sum + (Number(item.total_price !== undefined ? item.total_price : (item.unit_price * (item.quantity || 1))) || 0), 0);
    }

    // 1. Authoritative Authorized Reduction / Less Amount (Discount, waiver, or authorized price adjustment)
    let authorizedAdjustment = 0;
    const recordedDiscountReason = invOrBooking.discount_reason || (invOrBooking.totals && (invOrBooking.totals.discount_reason || invOrBooking.totals.discountReason)) || invOrBooking.discountReason || '';

    if (invOrBooking.discount !== undefined && invOrBooking.discount !== null) {
      authorizedAdjustment = Number(invOrBooking.discount || 0);
    } else if (invOrBooking.totals && invOrBooking.totals.discount !== undefined) {
      authorizedAdjustment = Number(invOrBooking.totals.discount || 0);
    } else if (invOrBooking.discount_amount !== undefined && invOrBooking.discount_amount !== null) {
      authorizedAdjustment = Number(invOrBooking.discount_amount || 0);
    } else if (invOrBooking.adjustment !== undefined && invOrBooking.adjustment !== null) {
      authorizedAdjustment = Number(invOrBooking.adjustment || 0);
    }

    // 2. Authoritative Original Service Price / Subtotal and Final Bill Amount
    // Formula: Final Bill Amount = Original Service Price - Less Amount (Authorized Adjustment)
    let originalBillAmount = Number(
      invOrBooking.subtotal !== undefined && invOrBooking.subtotal !== null ? invOrBooking.subtotal : (
        invOrBooking.total_bill_amount !== undefined && invOrBooking.total_bill_amount !== null ? invOrBooking.total_bill_amount : (
          invOrBooking.original_bill_amount !== undefined && invOrBooking.original_bill_amount !== null ? invOrBooking.original_bill_amount : (
            invOrBooking.original_price || invOrBooking.originalPrice || 0
          )
        )
      )
    );
    let finalBillAmount = 0;

    const hasExplicitSubtotal = originalBillAmount > 0;
    if (hasExplicitSubtotal) {
      finalBillAmount = Math.max(0, originalBillAmount - authorizedAdjustment);
    } else if (itemsSubtotal > 0) {
      originalBillAmount = itemsSubtotal;
      finalBillAmount = Math.max(0, originalBillAmount - authorizedAdjustment);
    } else if (invOrBooking.final_bill_amount !== undefined && invOrBooking.final_bill_amount !== null && Number(invOrBooking.final_bill_amount) > 0) {
      finalBillAmount = Number(invOrBooking.final_bill_amount);
      originalBillAmount = finalBillAmount + authorizedAdjustment;
    } else if (invOrBooking.grand_total !== undefined && invOrBooking.grand_total !== null && Number(invOrBooking.grand_total) > 0) {
      finalBillAmount = Number(invOrBooking.grand_total);
      originalBillAmount = finalBillAmount + authorizedAdjustment;
    } else if (invOrBooking.total_amount !== undefined && invOrBooking.total_amount !== null && Number(invOrBooking.total_amount) > 0) {
      finalBillAmount = Number(invOrBooking.total_amount);
      originalBillAmount = finalBillAmount + authorizedAdjustment;
    } else if (invOrBooking.price !== undefined && invOrBooking.price !== null) {
      originalBillAmount = Number(invOrBooking.price);
      finalBillAmount = Math.max(0, originalBillAmount - authorizedAdjustment);
    }

    // Always strictly enforce the formula: Final Bill Amount = Original Bill Amount - Less Amount
    if (originalBillAmount > 0) {
      finalBillAmount = Math.max(0, originalBillAmount - authorizedAdjustment);
    }

    // 4. Authoritative Amount Collected (sum all valid payment transactions without double counting)
    let pays = (invOrBooking.bookings && invOrBooking.bookings.payments) ? invOrBooking.bookings.payments : (invOrBooking.payments || []);
    if (pays && !Array.isArray(pays) && typeof pays === 'object') {
      pays = [pays];
    }
    let amountCollected = 0;
    let paymentMethods = [];

    if (Array.isArray(pays) && pays.length > 0) {
      amountCollected = pays.reduce((sum, p) => {
        const pStatus = String(p.status || 'COMPLETED').toUpperCase();
        if (['VOID', 'REFUNDED', 'FAILED', 'CANCELLED'].includes(pStatus)) return sum;
        if (p.method) paymentMethods.push(String(p.method).toUpperCase());
        return sum + (Number(p.amount) || 0);
      }, 0);
    } else if (invOrBooking.amount_collected !== undefined && invOrBooking.amount_collected !== null) {
      amountCollected = Number(invOrBooking.amount_collected || 0);
    } else if (invOrBooking.amount_paid !== undefined && invOrBooking.amount_paid !== null) {
      amountCollected = Number(invOrBooking.amount_paid || 0);
    } else if (invOrBooking.paid_amount !== undefined && invOrBooking.paid_amount !== null) {
      amountCollected = Number(invOrBooking.paid_amount || 0);
    } else if (invOrBooking.balance_due !== undefined && invOrBooking.balance_due !== null) {
      amountCollected = Math.max(0, finalBillAmount - Number(invOrBooking.balance_due || 0));
    } else if ((invOrBooking.payStatus || invOrBooking.payment_status || '').toUpperCase() === 'PAID') {
      amountCollected = finalBillAmount;
    } else {
      amountCollected = 0;
    }

    // 5. Historical Data Migration & Disambiguation for "Less Amount":
    // If a legacy record had a field named `less_amount` and no explicit `balance_due`:
    // - If less_amount equals (finalBillAmount - amountCollected), it was historically logged as the unpaid balance!
    // - We preserve it as Balance Due and do not silently reinterpret it as a discount.
    if (invOrBooking.balance_due === undefined && invOrBooking.less_amount !== undefined && invOrBooking.less_amount !== null) {
      const legacyLess = Number(invOrBooking.less_amount || 0);
      if (legacyLess > 0 && Math.abs(legacyLess - (finalBillAmount - amountCollected)) < 0.01) {
        // Was used as balance due
        amountCollected = Math.max(0, finalBillAmount - legacyLess);
      } else if (legacyLess > 0 && authorizedAdjustment === 0 && (originalBillAmount - legacyLess === finalBillAmount)) {
        // Was used as authorized adjustment
        authorizedAdjustment = legacyLess;
      }
    }

    if (finalBillAmount <= 0 && amountCollected > 0) {
      finalBillAmount = amountCollected;
      if (originalBillAmount <= 0) originalBillAmount = finalBillAmount + authorizedAdjustment;
    }

    // 6. Balance Due = max(0, Final Bill Amount - Valid Payments Collected)
    const balanceDue = Math.max(0, finalBillAmount - amountCollected);

    // 7. Authoritative Payment Status (reflect actual balance and void/refund rules)
    const rawStatus = String(invOrBooking.status || invOrBooking.payment_status || invOrBooking.payStatus || '').toUpperCase();
    let paymentStatus = 'UNPAID';

    if (rawStatus === 'REFUNDED' || rawStatus === 'VOID') {
      paymentStatus = rawStatus;
    } else if (amountCollected > 0 && (finalBillAmount <= 0 || amountCollected >= finalBillAmount) && balanceDue === 0) {
      paymentStatus = 'PAID';
    } else if (amountCollected > 0 && balanceDue > 0) {
      paymentStatus = 'PARTIAL';
    } else if (finalBillAmount === 0 && amountCollected === 0) {
      paymentStatus = (rawStatus === 'PAID') ? 'PAID' : 'UNPAID';
    } else {
      paymentStatus = 'UNPAID';
    }

    // 8. Payment Method
    const payRecord = Array.isArray(pays) ? (pays[0] || {}) : (pays || {});
    let rawMethod = paymentMethods.length > 0 
      ? Array.from(new Set(paymentMethods)).join(', ')
      : (payRecord.method || invOrBooking.payMethod || invOrBooking.payment_method || 'CASH');

    const serviceName = invOrBooking.service || invOrBooking.service_name || (items[0] && items[0].service_name) || 'Detailing Service';
    const serviceDescription = invOrBooking.service_description || (items[0] && items[0].service_description) || '';

    return {
      serviceName,
      serviceDescription,
      originalBillAmount,
      originalServicePrice: originalBillAmount,
      lessAmount: authorizedAdjustment,
      discountAmount: authorizedAdjustment,
      discountReason: recordedDiscountReason,
      finalBillAmount,
      amountCollected,
      balanceDue,
      paymentStatus,
      paymentMethod: rawMethod,
      isPaid: paymentStatus === 'PAID',
      isFullyPaid: paymentStatus === 'PAID',
      isPartial: paymentStatus === 'PARTIAL',
      isUnpaid: paymentStatus === 'UNPAID',
      isRefunded: paymentStatus === 'REFUNDED',
      isVoid: paymentStatus === 'VOID'
    };
  },

  calculateFinancialMetrics(invOrBooking) {
    return this.calculateBillMetrics(invOrBooking);
  },

  formatPaymentMethod(m) {
    if (!m) return 'Cash';
    const u = String(m).toUpperCase();
    if (u === 'UPI') return 'UPI / QR';
    if (u === 'CARD') return 'Card';
    if (u === 'CASH') return 'Cash';
    if (u === 'BANK_TRANSFER') return 'Bank Transfer';
    return m;
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
            payments (id, amount, method, status, created_at)
          `)
          .order('created_at', { ascending: false })
          .limit(5000);

        if (error) {
          TrieyeDB.logError('bookings', 'SELECT', error);
          // Return array with error tag so failures are not silently converted to 0
          const errArr = [];
          errArr._hasError = true;
          errArr._error = error;
          return errArr;
        }

        if (Array.isArray(data)) {
          let existingLocalMap = new Map();
          try {
            const existingLocalList = JSON.parse(localStorage.getItem('trieye_bookings') || '[]');
            existingLocalList.forEach(item => {
              if (item.id) existingLocalMap.set(String(item.id), item);
              if (item.invoice_ref) existingLocalMap.set(String(item.invoice_ref), item);
              if (item.invoice_number) existingLocalMap.set(String(item.invoice_number), item);
            });
          } catch (e) {}

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

            let collectedAmt = 0;
            if (paymentsArr.length > 0) {
              collectedAmt = paymentsArr.reduce((sum, p) => {
                const pStatus = String(p.status || '').toUpperCase();
                if (['VOID', 'REFUNDED', 'FAILED', 'CANCELLED'].includes(pStatus)) return sum;
                return sum + (Number(p.amount) || 0);
              }, 0);
            } else if (payStatus === 'PAID') {
              collectedAmt = totalAmt;
            }

            const existingLocal = existingLocalMap.get(String(b.id)) || existingLocalMap.get(shortRef);
            if (existingLocal && existingLocal.amount_collected > 0 && collectedAmt === 0) {
              collectedAmt = Number(existingLocal.amount_collected);
            }

            // Resolve Less Amount / discount without letting Supabase omit overwrite local values
            let discountVal = 0;
            if (b.discount_amount !== undefined && b.discount_amount !== null) {
              discountVal = Number(b.discount_amount);
            } else if (b.discount !== undefined && b.discount !== null) {
              discountVal = Number(b.discount);
            } else if (existingLocal && (existingLocal.discount !== undefined || existingLocal.discount_amount !== undefined)) {
              discountVal = Number(existingLocal.discount || existingLocal.discount_amount || 0);
            }

            // Resolve subtotal (Original Service Price)
            let subtotalVal = (b.subtotal !== undefined && b.subtotal !== null && Number(b.subtotal) > 0)
              ? Number(b.subtotal)
              : (existingLocal && existingLocal.subtotal && Number(existingLocal.subtotal) > 0
                  ? Number(existingLocal.subtotal)
                  : (totalAmt + discountVal));

            const discountReasonVal = b.discount_reason || (existingLocal && existingLocal.discount_reason) || '';
            const balDue = Math.max(0, totalAmt - collectedAmt);

            let normStatus = (b.status || 'CONFIRMED').toUpperCase().trim();
            if (normStatus === 'IN_PROGRESS') normStatus = 'IN PROGRESS';
            if (normStatus === 'QUALITY_CHECK') normStatus = 'QUALITY CHECK';
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
              source: (b.source || 'ONLINE').toUpperCase().trim(),
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
              subtotal: subtotalVal,
              original_price: subtotalVal,
              discount: discountVal,
              discount_amount: discountVal,
              discount_reason: discountReasonVal,
              price: totalAmt,
              bay: bay.name || null,
              bayId: b.bay_id || null,
              slotId: b.slot_id || null,
              payStatus: (existingLocal && existingLocal.payStatus && payStatus === 'UNPAID') ? existingLocal.payStatus : payStatus,
              payMethod: (existingLocal && existingLocal.payMethod && payMethod === 'Pending') ? existingLocal.payMethod : payMethod,
              amount_collected: collectedAmt,
              amount_paid: collectedAmt,
              balance_due: balDue,
              checkInTime: '',
              created: b.created_at || null,
              created_at: b.created_at || null,
              completed_at: b.completed_at || b.completedDate || null,
              completedDate: b.completed_at || b.completedDate || null,
              customers: cust,
              vehicles: veh,
              services: svc,
              payments: paymentsArr
            };
          });
          localStorage.setItem('trieye_bookings', JSON.stringify(formatted));
          return formatted;
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on bookings SELECT]:', err);
        const errArr = [];
        errArr._hasError = true;
        errArr._error = err;
        return errArr;
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

  // Public Secure Invoice Retrieval via Token RPC with Customer-Facing Presentation
  async getPublicInvoiceByToken(token) {
    if (!token || typeof token !== 'string' || token.trim().length < 6) {
      return { success: false, error: 'Invalid or missing invoice token.' };
    }
    const cleanToken = token.trim();
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;

    let rawInvoice = null;

    if (sb) {
      try {
        console.log('⚡ [TrieyeDB] Calling RPC get_public_invoice_by_token...');
        const { data, error } = await sb.rpc('get_public_invoice_by_token', { p_token: cleanToken });
        if (!error && data && data.success && data.invoice) {
          rawInvoice = data.invoice;
        } else if (error) {
          TrieyeDB.logError('rpc:get_public_invoice_by_token', 'EXECUTE', error);
        }
      } catch (err) {
        console.error('🚨 [TrieyeDB RPC network exception]:', err);
      }
    }

    // Offline / Local cache fallback & bidirectional payment reconciliation
    try {
      const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      const localInvoices = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
      const cleanRef = rawInvoice ? String(rawInvoice.invoice_ref || '').toUpperCase() : '';
      const matchedLocal = localBookings.find(b => 
        (cleanToken && (b.share_token === cleanToken || b.id === cleanToken)) ||
        (cleanRef && (b.invoice_ref === cleanRef || b.invoice_number === cleanRef || ('TRI-' + String(b.id || '').substring(0, 8).toUpperCase()) === cleanRef)) ||
        (rawInvoice && b.phone && rawInvoice.customer_phone && String(b.phone).replace(/\D/g, '') === String(rawInvoice.customer_phone).replace(/\D/g, ''))
      ) || localInvoices.find(i => 
        (cleanToken && (i.share_token === cleanToken || i.id === cleanToken || i.invoice_number === cleanToken)) ||
        (cleanRef && i.invoice_number === cleanRef)
      );

      if (matchedLocal) {
        const localPaidStatus = String(matchedLocal.payStatus || matchedLocal.status || matchedLocal.payment_status || '').toUpperCase();
        const localAmtCollected = Number(matchedLocal.amount_collected !== undefined ? matchedLocal.amount_collected : (matchedLocal.amount_paid !== undefined ? matchedLocal.amount_paid : (matchedLocal.paid_amount !== undefined ? matchedLocal.paid_amount : (localPaidStatus === 'PAID' ? (matchedLocal.grand_total || matchedLocal.total_amount || matchedLocal.price) : 0))));

        if (!rawInvoice) {
          const cust = matchedLocal.customers || { name: matchedLocal.name, phone: matchedLocal.phone };
          const veh = matchedLocal.vehicles || { vehicle_type: matchedLocal.vehicleType, reg_number: matchedLocal.reg };
          rawInvoice = {
            invoice_ref: matchedLocal.invoice_ref || matchedLocal.invoice_number || 'TRI-INVOICE',
            share_token: cleanToken,
            invoice_date: (matchedLocal.date || matchedLocal.booking_date || matchedLocal.created_at || new Date().toISOString()).split('T')[0],
            customer_name: cust.name || 'Valued Customer',
            customer_phone: cust.phone || 'N/A',
            vehicle_type: veh.vehicle_type || 'Car',
            reg_number: veh.reg_number || 'N/A',
            service_name: matchedLocal.service || (matchedLocal.services && matchedLocal.services[0]?.name) || 'Detailing Service',
            service_description: matchedLocal.service_description || 'Precision wash and detailing package',
            invoice_items: matchedLocal.invoice_items || [],
            items: matchedLocal.invoice_items || matchedLocal.items || [],
            subtotal: matchedLocal.subtotal,
            discount: matchedLocal.discount,
            grand_total: matchedLocal.grand_total !== undefined ? matchedLocal.grand_total : matchedLocal.total_amount,
            total_amount: matchedLocal.grand_total !== undefined ? matchedLocal.grand_total : matchedLocal.total_amount,
            amount_collected: localAmtCollected,
            payments: matchedLocal.payments || (localPaidStatus ? [{ amount: localAmtCollected, status: localPaidStatus, method: matchedLocal.payMethod || 'CASH' }] : []),
            business: {
              name: 'TRIEYE DETAILING',
              tagline: 'Detail • Precision • Protection',
              address: '1st, 19, 6th Street, Main Rd, Baba Nagar, Villivakkam, Chennai, Tamil Nadu 600049',
              phone: '+91 99401 81934 / +91 93630 68836',
              email: 'care@trieyestudio.com',
              gstin: '33CKMPB5885L1ZO'
            }
          };
        } else {
          // Reconcile: If local booking has authoritative payment info that remote RPC missed:
          if (localPaidStatus === 'PAID' || localAmtCollected > (Number(rawInvoice.amount_collected) || 0)) {
            rawInvoice.amount_collected = localAmtCollected;
            rawInvoice.payment_status = localPaidStatus;
            rawInvoice.status = localPaidStatus;
            rawInvoice.payment_method = matchedLocal.payMethod || matchedLocal.payment_method || rawInvoice.payment_method || 'Cash';
            rawInvoice.paid_amount = localAmtCollected;
            const finalAmt = Number(rawInvoice.final_bill_amount || rawInvoice.grand_total || rawInvoice.total_amount || 0);
            if (finalAmt > 0) {
              rawInvoice.balance_due = Math.max(0, finalAmt - localAmtCollected);
            }
            if (matchedLocal.payments && matchedLocal.payments.length > 0) {
              rawInvoice.payments = matchedLocal.payments;
            } else {
              rawInvoice.payments = [{
                amount: localAmtCollected,
                status: localPaidStatus,
                method: rawInvoice.payment_method
              }];
            }

            // In background, auto-heal Supabase DB if booking ID is a valid UUID
            if (sb && matchedLocal.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(matchedLocal.id).trim())) {
              TrieyeDB.recordPayment({
                bookingId: String(matchedLocal.id).trim(),
                invoiceId: matchedLocal.invoice_id || null,
                invoiceNumber: matchedLocal.invoice_ref || matchedLocal.invoice_number || null,
                originalBillAmount: matchedLocal.subtotal || matchedLocal.total_amount || matchedLocal.price,
                lessAmount: matchedLocal.discount || matchedLocal.discount_amount || 0,
                finalBillAmount: matchedLocal.total_amount || matchedLocal.price,
                amount: localAmtCollected,
                method: rawInvoice.payment_method,
                status: localPaidStatus
              }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Local invoice cache lookup/reconciliation skipped:', e);
    }

    if (!rawInvoice) {
      return { success: false, error: 'This invoice link is invalid or no longer available.' };
    }

    // Apply Authoritative Billing Presentation:
    // Strictly separates customer-facing bill (Total Bill, Amount Collected, Paid Amount / Balance Due)
    // and omits discount amount and reason completely from customer presentation.
    const metrics = this.calculateBillMetrics(rawInvoice);

    const customerInvoice = {
      ...rawInvoice,
      items: rawInvoice.invoice_items || rawInvoice.items || [],
      invoice_items: rawInvoice.invoice_items || rawInvoice.items || [],
      service_name: metrics.serviceName,
      service_description: metrics.serviceDescription || rawInvoice.service_description || 'Precision vehicle detailing package',
      total_bill_amount: metrics.originalBillAmount,
      original_bill_amount: metrics.originalBillAmount,
      rate: metrics.originalBillAmount,
      subtotal: metrics.originalBillAmount,
      final_bill_amount: metrics.finalBillAmount,
      grand_total: metrics.finalBillAmount,
      total_amount: metrics.finalBillAmount,
      amount_collected: metrics.amountCollected,
      paid_amount: metrics.amountCollected,
      balance_due: metrics.balanceDue,
      payment_status: metrics.paymentStatus,
      payment_method: metrics.paymentMethod,
      business: rawInvoice.business || {
        name: 'TRIEYE DETAILING',
        tagline: 'Detail • Precision • Protection',
        address: '1st, 19, 6th Street, Main Rd, Baba Nagar, Villivakkam, Chennai, Tamil Nadu 600049',
        phone: '+91 99401 81934 / +91 93630 68836',
        email: 'care@trieyestudio.com',
        gstin: '33CKMPB5885L1ZO'
      }
    };

    // Provide Less Amount / Discount and bill metrics consistently to web bill presentation
    customerInvoice.discount = metrics.lessAmount;
    customerInvoice.discount_amount = metrics.lessAmount;
    customerInvoice.less_amount = metrics.lessAmount;
    customerInvoice.original_bill_amount = metrics.originalBillAmount;
    customerInvoice.final_bill_amount = metrics.finalBillAmount;
    delete customerInvoice.discount_reason;
    delete customerInvoice.discountReason;

    return { success: true, invoice: customerInvoice };
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
        const bookingDateVal = this.getLocalDateIso(params.date);
        console.log('⚡ [Supabase RPC] Invoking public.create_online_booking with 6 params:', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'TN 01 AB 1234',
          p_service_name: params.service || 'Foam Wash',
          p_booking_date: bookingDateVal
        });
        
        const { data, error } = await sb.rpc('create_online_booking', {
          p_customer_name: params.name || 'Valued Customer',
          p_customer_phone: params.phone || '',
          p_vehicle_type: params.vehicleType || 'Car',
          p_reg_number: params.reg || 'TN 01 AB 1234',
          p_service_name: params.service || 'Foam Wash',
          p_booking_date: bookingDateVal
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
            booking_date: bookingDateVal,
            date: bookingDateVal,
            slot: null,
            price: Number(params.price || 0),
            status: 'CONFIRMED',
            bay: null,
            source: 'ONLINE',
            payStatus: 'UNPAID',
            payMethod: 'Pending (Counter/UPI)',
            created: (data && data.created_at) || new Date().toISOString(),
            created_at: (data && data.created_at) || new Date().toISOString()
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
      booking_date: this.getLocalDateIso(params.date),
      date: this.getLocalDateIso(params.date),
      slot: null,
      price: Number(params.price || 0),
      status: 'CONFIRMED',
      bay: null,
      source: 'ONLINE',
      payStatus: 'UNPAID',
      payMethod: 'Pending (Counter/UPI)',
      created: new Date().toISOString(),
      created_at: new Date().toISOString()
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (sb && booking.id && isUuid.test(String(booking.id))) {
      try {
        const updatePayload = {
          status: booking.status
        };
        if (booking.bayId) updatePayload.bay_id = booking.bayId;
        if (booking.slotId) updatePayload.slot_id = booking.slotId;
        if (booking.price) updatePayload.total_amount = Number(booking.price);
        if (booking.completed_at) updatePayload.completed_at = booking.completed_at;

        const { error } = await sb.from('bookings').update(updatePayload).eq('id', booking.id);
        if (error) {
          if (error.code === '42703' || (error.message && error.message.includes('completed_at'))) {
            // Column completed_at not yet present in Supabase; retry without it so status update succeeds
            delete updatePayload.completed_at;
            await sb.from('bookings').update(updatePayload).eq('id', booking.id);
          } else {
            TrieyeDB.logError('bookings', 'UPDATE', error);
          }
        }
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (sb && bookingId && isUuid.test(String(bookingId))) {
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
      const apiHeaders = { 'Content-Type': 'application/json' };
      const sbSession = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
      if (sbSession && sbSession.auth) {
        try {
          const { data: sessionData } = await sbSession.auth.getSession();
          if (sessionData && sessionData.session && sessionData.session.access_token) {
            apiHeaders['Authorization'] = `Bearer ${sessionData.session.access_token}`;
          }
        } catch (authErr) {}
      }
      await fetch('/api/services', {
        method: 'POST',
        headers: apiHeaders,
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

    const originalBillAmount = paymentObj.originalBillAmount !== undefined ? Number(paymentObj.originalBillAmount) : null;
    const lessAmount = paymentObj.lessAmount !== undefined ? Number(paymentObj.lessAmount) : 0;
    const finalBillAmount = paymentObj.finalBillAmount !== undefined 
      ? Number(paymentObj.finalBillAmount) 
      : (originalBillAmount !== null ? Math.max(0, originalBillAmount - lessAmount) : amount);
    const discountReason = paymentObj.discountReason || (lessAmount > 0 ? 'Authorized Less Amount' : '');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let targetBookingUuid = null;
    let targetInvoiceUuid = null;

    if (bookingId && uuidRegex.test(String(bookingId).trim())) {
      targetBookingUuid = String(bookingId).trim();
    }

    const invoiceId = paymentObj.invoiceId;
    const invoiceNumber = paymentObj.invoiceNumber;
    if (invoiceId && uuidRegex.test(String(invoiceId).trim())) {
      targetInvoiceUuid = String(invoiceId).trim();
    }

    // Resolve UUIDs from local storage if bookingId was a reference string or invoice number
    try {
      const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      const matchB = localBookings.find(b => b.id === bookingId || b.invoice_ref === bookingId || b.invoice_number === bookingId || b.invoice_id === bookingId);
      if (matchB) {
        if (matchB.id && uuidRegex.test(String(matchB.id).trim())) targetBookingUuid = String(matchB.id).trim();
        if (matchB.invoice_id && uuidRegex.test(String(matchB.invoice_id).trim())) targetInvoiceUuid = String(matchB.invoice_id).trim();
      }
      const localInvs = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
      const matchI = localInvs.find(i => i.id === bookingId || i.invoice_number === bookingId || i.booking_id === bookingId);
      if (matchI) {
        if (matchI.booking_id && uuidRegex.test(String(matchI.booking_id).trim())) targetBookingUuid = String(matchI.booking_id).trim();
        if (matchI.id && uuidRegex.test(String(matchI.id).trim())) targetInvoiceUuid = String(matchI.id).trim();
      }
    } catch (e) {}

    // A booking ID must NEVER be treated as an invoice ID
    if (targetInvoiceUuid && targetBookingUuid && targetInvoiceUuid === targetBookingUuid) {
      targetInvoiceUuid = null;
    }

    // Helper to sync local storage caches and in-memory caches
    const syncLocalPayment = () => {
      try {
        const invStatus = (status === 'PAID' ? 'PAID' : (status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID'));

        const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
        const bIdx = localBookings.findIndex(b => 
          b.id === bookingId || 
          (targetBookingUuid && b.id === targetBookingUuid) || 
          b.invoice_ref === bookingId || 
          b.invoice_number === bookingId ||
          (targetInvoiceUuid && b.invoice_id === targetInvoiceUuid)
        );
        if (bIdx >= 0) {
          const b = localBookings[bIdx];
          b.payStatus = status;
          b.payMethod = method;
          b.amount_collected = amount;
          b.amount_paid = amount;
          if (originalBillAmount !== null && originalBillAmount > 0) b.subtotal = originalBillAmount;
          b.discount = lessAmount;
          b.discount_amount = lessAmount;
          if (discountReason) b.discount_reason = discountReason;
          b.total_amount = finalBillAmount;
          b.grand_total = finalBillAmount;
          b.price = finalBillAmount;
          b.balance_due = Math.max(0, finalBillAmount - amount);
          b.payments = [{ amount, method, status }];
          localBookings[bIdx] = b;
          localStorage.setItem('trieye_bookings', JSON.stringify(localBookings));
        }

        const localInvs = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
        const iIdx = localInvs.findIndex(i => 
          i.id === bookingId || 
          (targetInvoiceUuid && i.id === targetInvoiceUuid) || 
          i.booking_id === bookingId || 
          (targetBookingUuid && i.booking_id === targetBookingUuid) || 
          i.invoice_number === bookingId ||
          (invoiceNumber && i.invoice_number === invoiceNumber)
        );
        if (iIdx >= 0) {
          const inv = localInvs[iIdx];
          if (originalBillAmount !== null && originalBillAmount > 0) inv.subtotal = originalBillAmount;
          inv.discount = lessAmount;
          inv.discount_amount = lessAmount;
          if (discountReason) inv.discount_reason = discountReason;
          inv.grand_total = finalBillAmount;
          inv.total_amount = finalBillAmount;
          inv.payments = [{ amount, method, status }];
          inv.amount_collected = amount;
          inv.amount_paid = amount;
          inv.balance_due = Math.max(0, finalBillAmount - amount);
          inv.status = invStatus;
          localInvs[iIdx] = inv;
        } else {
          // Synthesize new invoice so it is always present in localInvs
          const matchB = bIdx >= 0 ? localBookings[bIdx] : null;
          const newInv = {
            id: targetInvoiceUuid || ('inv_' + (targetBookingUuid || bookingId)),
            booking_id: targetBookingUuid || bookingId,
            invoice_number: invoiceNumber || (matchB && (matchB.invoice_ref || matchB.invoice_number)) || ('INV-' + String(bookingId).slice(-6).toUpperCase()),
            subtotal: originalBillAmount !== null && originalBillAmount > 0 ? originalBillAmount : (finalBillAmount + lessAmount),
            discount: lessAmount,
            discount_amount: lessAmount,
            discount_reason: discountReason || '',
            grand_total: finalBillAmount,
            total_amount: finalBillAmount,
            status: invStatus,
            amount_collected: amount,
            amount_paid: amount,
            balance_due: Math.max(0, finalBillAmount - amount),
            payments: [{ amount, method, status }],
            created_at: new Date().toISOString()
          };
          localInvs.push(newInv);
        }
        localStorage.setItem('trieye_invoices', JSON.stringify(localInvs));

        if (typeof window !== 'undefined') {
          if (Array.isArray(window._invoicesCache)) {
            const inv = window._invoicesCache.find(i => 
              i.id === bookingId || 
              (targetInvoiceUuid && i.id === targetInvoiceUuid) || 
              i.booking_id === bookingId || 
              (targetBookingUuid && i.booking_id === targetBookingUuid) || 
              i.invoice_number === bookingId
            );
            if (inv) {
              if (originalBillAmount !== null && originalBillAmount > 0) inv.subtotal = originalBillAmount;
              inv.discount = lessAmount;
              if (discountReason) inv.discount_reason = discountReason;
              inv.grand_total = finalBillAmount;
              inv.total_amount = finalBillAmount;
              inv.payments = [{ amount, method, status }];
              inv.amount_collected = amount;
              inv.amount_paid = amount;
              inv.balance_due = Math.max(0, finalBillAmount - amount);
              inv.status = invStatus;
            }
          }
          if (window.currentInvoiceBooking) {
            const cur = window.currentInvoiceBooking;
            if (
              cur.id === bookingId || 
              (targetBookingUuid && cur.id === targetBookingUuid) || 
              cur.invoice_ref === bookingId || 
              cur.invoice_number === bookingId ||
              (targetInvoiceUuid && cur.invoice_id === targetInvoiceUuid)
            ) {
              cur.payStatus = status;
              cur.payMethod = method;
              cur.amount_collected = amount;
              cur.amount_paid = amount;
              if (originalBillAmount !== null && originalBillAmount > 0) cur.subtotal = originalBillAmount;
              cur.discount = lessAmount;
              cur.discount_amount = lessAmount;
              if (discountReason) cur.discount_reason = discountReason;
              cur.total_amount = finalBillAmount;
              cur.grand_total = finalBillAmount;
              cur.price = finalBillAmount;
              cur.balance_due = Math.max(0, finalBillAmount - amount);
              cur.payments = [{ amount, method, status }];
            }
          }
          if (window._historyBookingsMap) {
            Object.values(window._historyBookingsMap).forEach(cur => {
              if (
                cur.id === bookingId || 
                (targetBookingUuid && cur.id === targetBookingUuid) || 
                cur.invoice_ref === bookingId || 
                cur.invoice_number === bookingId ||
                (targetInvoiceUuid && cur.invoice_id === targetInvoiceUuid)
              ) {
                cur.payStatus = status;
                cur.payMethod = method;
                cur.amount_collected = amount;
                cur.amount_paid = amount;
                if (originalBillAmount !== null && originalBillAmount > 0) cur.subtotal = originalBillAmount;
                cur.discount = lessAmount;
                cur.discount_amount = lessAmount;
                if (discountReason) cur.discount_reason = discountReason;
                cur.total_amount = finalBillAmount;
                cur.grand_total = finalBillAmount;
                cur.price = finalBillAmount;
                cur.balance_due = Math.max(0, finalBillAmount - amount);
                cur.payments = [{ amount, method, status }];
              }
            });
          }
        }
      } catch (e) {}
    };

    if (sb && (targetBookingUuid || targetInvoiceUuid)) {
      try {
        let existingId = null;

        // 1. Check existing payment by booking_id
        if (targetBookingUuid) {
          const { data: bPayments, error: selErr } = await sb
            .from('payments')
            .select('id, created_at, booking_id, amount, method, status')
            .eq('booking_id', targetBookingUuid)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!selErr && Array.isArray(bPayments) && bPayments.length > 0) {
            existingId = bPayments[0].id;
          }
        }

        // 2. Check existing payment by invoice_id if not found by booking_id
        if (!existingId && targetInvoiceUuid) {
          const { data: iPayments } = await sb
            .from('payments')
            .select('id, created_at, invoice_id, amount, method, status')
            .eq('invoice_id', targetInvoiceUuid)
            .order('created_at', { ascending: false })
            .limit(1);

          if (Array.isArray(iPayments) && iPayments.length > 0) {
            existingId = iPayments[0].id;
          }
        }

        const invStatus = (status === 'PAID' ? 'PAID' : (status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID'));

        // Update invoices table with discount/less amount, subtotal, and grand_total
        try {
          const invUpdatePayload = {
            status: invStatus,
            discount: lessAmount,
            grand_total: finalBillAmount
          };
          if (originalBillAmount !== null && originalBillAmount > 0) {
            invUpdatePayload.subtotal = originalBillAmount;
          }
          if (discountReason) {
            invUpdatePayload.discount_reason = discountReason;
          }

          if (targetInvoiceUuid) {
            let { error: invErr } = await sb.from('invoices').update(invUpdatePayload).eq('id', targetInvoiceUuid);
            if (invErr && invErr.message && invErr.message.includes('discount_reason')) {
              delete invUpdatePayload.discount_reason;
              await sb.from('invoices').update(invUpdatePayload).eq('id', targetInvoiceUuid);
            }
          } else if (targetBookingUuid) {
            let { error: invErr } = await sb.from('invoices').update(invUpdatePayload).eq('booking_id', targetBookingUuid);
            if (invErr && invErr.message && invErr.message.includes('discount_reason')) {
              delete invUpdatePayload.discount_reason;
              await sb.from('invoices').update(invUpdatePayload).eq('booking_id', targetBookingUuid);
            }
          }
        } catch (e) {
          console.warn('⚠️ [recordPayment invoice update]:', e);
        }

        // Update bookings table with total_amount and discount_amount
        try {
          if (targetBookingUuid) {
            const bUpdatePayload = {
              total_amount: finalBillAmount
            };
            if (lessAmount !== undefined) bUpdatePayload.discount_amount = lessAmount;
            if (discountReason) bUpdatePayload.discount_reason = discountReason;

            let { error: bErr } = await sb.from('bookings').update(bUpdatePayload).eq('id', targetBookingUuid);
            if (bErr && (bErr.code === '42703' || (bErr.message && (bErr.message.includes('discount_amount') || bErr.message.includes('discount_reason'))))) {
              await sb.from('bookings').update({ total_amount: finalBillAmount }).eq('id', targetBookingUuid);
            }
          }
        } catch (e) {
          console.warn('⚠️ [recordPayment booking update]:', e);
        }

        // 3. Update existing or insert new payment record
        if (existingId) {
          const updatePayload = {
            amount: amount,
            method: method,
            status: status
          };
          if (status === 'PAID') {
            updatePayload.paid_at = new Date().toISOString();
          }

          const { data, error } = await sb
            .from('payments')
            .update(updatePayload)
            .eq('id', existingId)
            .select();

          if (error) {
            TrieyeDB.logError('payments', 'UPDATE', error);
            syncLocalPayment();
            if (error.code === '42501' || (error.message && (error.message.includes('row-level security') || error.message.includes('permission denied')))) {
              console.warn('⚠️ Supabase RLS restricted write; saved to local cache successfully.');
              return { success: true, warning: 'Saved to local cache (RLS restricted)', payment: updatePayload };
            }
            return { success: false, error: error.message };
          }

          syncLocalPayment();
          return { success: true, payment: data ? data[0] : null };
        } else {
          let insertPayload = {
            amount: amount,
            method: method,
            status: status
          };
          if (targetBookingUuid) insertPayload.booking_id = targetBookingUuid;
          if (targetInvoiceUuid && targetInvoiceUuid !== targetBookingUuid) insertPayload.invoice_id = targetInvoiceUuid;
          if (status === 'PAID') insertPayload.paid_at = new Date().toISOString();

          let { data, error } = await sb
            .from('payments')
            .insert(insertPayload)
            .select();

          // Foreign key retry: If invoice_id violates payments_invoice_id_fkey, retry with booking_id only
          if (error && (error.code === '23503' || (error.message && error.message.includes('payments_invoice_id_fkey'))) && insertPayload.invoice_id) {
            console.warn('⚠️ [recordPayment] foreign key violation on payments_invoice_id_fkey. Retrying with booking_id only...');
            delete insertPayload.invoice_id;
            const retryRes = await sb
              .from('payments')
              .insert(insertPayload)
              .select();
            data = retryRes.data;
            error = retryRes.error;
          }

          if (error) {
            TrieyeDB.logError('payments', 'INSERT', error);
            syncLocalPayment();
            if (error.code === '42501' || (error.message && (error.message.includes('row-level security') || error.message.includes('permission denied')))) {
              console.warn('⚠️ Supabase RLS restricted write; saved to local cache successfully.');
              return { success: true, warning: 'Saved to local cache (RLS restricted)', payment: insertPayload };
            }
            return { success: false, error: error.message };
          }

          syncLocalPayment();
          return { success: true, payment: data ? data[0] : null };
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on recordPayment]:', err);
        syncLocalPayment();
        return { success: true, warning: 'Saved to local cache (Network fallback)', error: err.message };
      }
    }

    syncLocalPayment();
    return { success: true, message: 'Saved to local cache' };
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

  // 8. INVOICES & BILLING (OFFLINE / ONLINE)
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
            bookings ( id, payments (id, amount, method, status, created_at) )
          `)
          .order('created_at', { ascending: false })
          .gte('created_at', '2026-09-25T00:00:00Z');

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
        if (error) {
          TrieyeDB.logError('invoices', 'SELECT', error);
        }
      } catch (err) {
        console.error('🚨 [Supabase Network Error on getInvoices]:', err);
      }
    }
    try {
      const localInvoices = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
      if (Array.isArray(localInvoices) && localInvoices.length > 0) {
        return localInvoices;
      }
    } catch (e) {}
    return [];
  },

  async createInvoice(payload) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;

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

      const cleanCustPhone = String(payload.customer.phone || '').replace(/\D/g, '').slice(-10);
      const todayIso = this.getLocalDateIso(new Date());
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const finalGrandTotal = Number(payload.totals.grand_total !== undefined ? payload.totals.grand_total : (payload.totals.grandTotal || 0));

      let primaryServiceId = (payload.services && payload.services.length > 0) ? payload.services[0].id : null;
      if (!primaryServiceId || !uuidRegex.test(String(primaryServiceId))) {
        primaryServiceId = null;
      }

      let customerId = payload.customer.id || null;
      let vehicleId = payload.vehicle.id || null;
      let bookingId = payload.booking_id || null;
      let bookingShareToken = null;

      // 1. Ensure Customer Exists (Reuse existing customer by phone to avoid duplicates)
      if (sb && !customerId && cleanCustPhone) {
        try {
          const { data: existCust, error: existCustErr } = await sb
            .from('customers')
            .select('id, name, phone')
            .eq('phone', cleanCustPhone)
            .maybeSingle();

          if (!existCustErr && existCust && existCust.id) {
            customerId = existCust.id;
          } else if (!existCustErr) {
            const { data: custData, error: custErr } = await sb
              .from('customers')
              .insert({
                name: payload.customer.name || 'Walk-In Customer',
                phone: cleanCustPhone,
                email: payload.customer.email || null
              })
              .select('id')
              .single();
            if (!custErr && custData) {
              customerId = custData.id;
            }
          }
        } catch (e) {
          console.warn('⚠️ Supabase customer lookup/create skipped:', e);
        }
      }

      // 2. Ensure Vehicle Exists (Reuse existing vehicle by registration number)
      if (sb && !vehicleId && customerId && payload.vehicle.reg_number) {
        try {
          const { data: existVeh, error: existVehErr } = await sb
            .from('vehicles')
            .select('id, vehicle_type, reg_number')
            .eq('reg_number', payload.vehicle.reg_number)
            .maybeSingle();

          if (!existVehErr && existVeh && existVeh.id) {
            vehicleId = existVeh.id;
          } else if (!existVehErr) {
            const { data: vehData, error: vehErr } = await sb
              .from('vehicles')
              .insert({
                customer_id: customerId,
                vehicle_type: payload.vehicle.vehicle_type || 'Car',
                reg_number: payload.vehicle.reg_number || 'TN 01 AB 1234'
              })
              .select('id')
              .single();
            if (!vehErr && vehData) {
              vehicleId = vehData.id;
            }
          }
        } catch (e) {
          console.warn('⚠️ Supabase vehicle lookup/create skipped:', e);
        }
      }

      // 3. Ensure Booking Record exists (Reuse existing booking or create WALK_IN)
      if (sb && !bookingId && customerId && vehicleId) {
        try {
          const { data: bookData, error: bookErr } = await sb
            .from('bookings')
            .insert({
              customer_id: customerId,
              vehicle_id: vehicleId,
              service_id: primaryServiceId,
              booking_date: todayIso,
              status: 'COMPLETED',
              source: 'WALK_IN',
              total_amount: finalGrandTotal
            })
            .select('id, share_token')
            .single();

          if (!bookErr && bookData) {
            bookingId = bookData.id;
            bookingShareToken = bookData.share_token;
          }
        } catch (e) {
          console.warn('⚠️ Supabase booking insert skipped:', e);
        }
      }

      // 4. Safe Unique Invoice Number Generation (under concurrent requests)
      // Query the database for the highest existing invoice sequence for current year
      const currentYear = new Date().getFullYear();
      const prefix = `TR-${currentYear}-`;
      let maxDbSeq = 0;

      if (sb) {
        try {
          const { data: existingInvs, error: invsErr } = await sb
            .from('invoices')
            .select('invoice_number')
            .ilike('invoice_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(100);

          if (!invsErr && Array.isArray(existingInvs)) {
            existingInvs.forEach(inv => {
              const match = (inv.invoice_number || '').match(/TR-\d{4}-(\d+)/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxDbSeq) maxDbSeq = num;
              }
            });
          }
        } catch (e) {
          console.warn('⚠️ Could not query max invoice sequence from DB:', e);
        }
      }

      const localSeq = parseInt(localStorage.getItem('trieye_new_inv_seq') || '0', 10);
      let candidateSeq = Math.max(maxDbSeq, localSeq) + 1;

      let invData = null;
      let lastInvErr = null;

      // Authoritative Payment Calculation
      const payAmountVal = Number((payload.payment && payload.payment.amount) !== undefined ? payload.payment.amount : (payload.totals && payload.totals.payAmt !== undefined ? payload.totals.payAmt : finalGrandTotal));
      let payStatusVal = 'UNPAID';
      if (finalGrandTotal > 0 && payAmountVal >= finalGrandTotal) {
        payStatusVal = 'PAID';
      } else if (payAmountVal > 0 && payAmountVal < finalGrandTotal) {
        payStatusVal = 'PARTIAL';
      } else if (finalGrandTotal === 0 && payAmountVal === 0) {
        payStatusVal = 'PAID';
      } else {
        payStatusVal = 'UNPAID';
      }
      const balanceDueVal = Math.max(0, finalGrandTotal - payAmountVal);
      const discountReasonVal = (payload.totals && (payload.totals.discount_reason || payload.totals.discountReason)) || '';

      // Concurrency retry loop if Supabase is connected and booking was created
      if (sb && bookingId) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const seqToTry = candidateSeq + attempt;
          const customInv = `${prefix}${String(seqToTry).padStart(6, '0')}`;
          const invoiceInsertObj = {
            invoice_number: customInv,
            customer_id: customerId,
            vehicle_id: vehicleId,
            booking_id: bookingId,
            subtotal: Number(payload.totals.subtotal || 0),
            discount: Number(payload.totals.discount || 0),
            grand_total: finalGrandTotal,
            status: payStatusVal
          };
          if (discountReasonVal) {
            invoiceInsertObj.discount_reason = discountReasonVal;
          }

          let { data, error } = await sb
            .from('invoices')
            .insert(invoiceInsertObj)
            .select('id, invoice_number, created_at')
            .single();

          if (error && error.message && error.message.includes('discount_reason')) {
            console.warn('⚠️ discount_reason column not yet present in Supabase, inserting without it...');
            delete invoiceInsertObj.discount_reason;
            const retryRes = await sb
              .from('invoices')
              .insert(invoiceInsertObj)
              .select('id, invoice_number, created_at')
              .single();
            data = retryRes.data;
            error = retryRes.error;
          }

          if (!error && data) {
            invData = data;
            localStorage.setItem('trieye_new_inv_seq', String(seqToTry + 1));
            break;
          }

          lastInvErr = error;
          // If unique constraint violation on invoice_number (code 23505), bump sequence and retry
          if (error && (error.code === '23505' || (error.message && error.message.includes('invoices_invoice_number_key')))) {
            console.warn(`⚠️ Invoice number ${customInv} already exists. Retrying with next sequence...`);
            continue;
          } else {
            break;
          }
        }
      }

      // Fallback local invoice creation if Supabase was unauthenticated / offline / skipped
      if (!invData) {
        const fallbackSeq = candidateSeq;
        const customInv = `${prefix}${String(fallbackSeq).padStart(6, '0')}`;
        localStorage.setItem('trieye_new_inv_seq', String(fallbackSeq + 1));
        const localInvId = 'inv-' + Date.now();
        if (!bookingId) {
          bookingId = 'wb-' + Date.now();
        }
        invData = {
          id: localInvId,
          invoice_number: customInv,
          booking_id: bookingId,
          created_at: new Date().toISOString()
        };
      }

      const invoiceId = invData.id;

      // 5. Create Invoice Items (Services + Upsell / Add-on Products)
      const itemsPayload = [];
      const localItemsPayload = [];

      (payload.services || []).forEach(s => {
        let sid = s.id || null;
        if (!sid || !uuidRegex.test(String(sid))) sid = null;
        const qty = parseInt(s.quantity, 10) || 1;
        const price = Number(s.unit_price || 0);
        const itemObj = {
          invoice_id: invoiceId,
          service_id: sid,
          service_name: s.name || 'Detailing Service',
          quantity: qty,
          unit_price: price,
          total_price: qty * price
        };
        itemsPayload.push(itemObj);
        localItemsPayload.push({
          ...itemObj,
          item_type: 'SERVICE'
        });
      });

      (payload.products || []).forEach(p => {
        const qty = parseInt(p.quantity, 10) || 1;
        const price = Number(p.unit_price || 0);
        const prodName = (p.name || '').trim() || 'Add-on Product';
        const itemObj = {
          invoice_id: invoiceId,
          service_id: null,
          service_name: prodName,
          quantity: qty,
          unit_price: price,
          total_price: qty * price
        };
        itemsPayload.push(itemObj);
        localItemsPayload.push({
          ...itemObj,
          item_type: 'PRODUCT'
        });
      });

      if (sb && !String(invoiceId).startsWith('inv-') && itemsPayload.length > 0) {
        try {
          const { error: itemsErr } = await sb.from('invoice_items').insert(itemsPayload);
          if (itemsErr) console.warn('Invoice items insert warning:', itemsErr);
        } catch (e) {}
      }

      // 6. Create Payment Record (Optional)
      if (payload.payment) {
        const payAmt = Number(payload.payment.amount || 0);
        const payStatus = payload.payment.status || payStatusVal;
        const payPayload = {
          booking_id: bookingId,
          amount: payAmt,
          method: payload.payment.method || 'CASH',
          status: payStatus,
          paid_at: payStatus === 'PAID' ? new Date().toISOString() : null
        };

        if (sb && !String(bookingId).startsWith('wb-')) {
          try {
            const { error: payErr } = await sb.from('payments').insert(payPayload);
            if (payErr) console.warn("Payment insert warning:", payErr);
          } catch (e) {}
        }
      }

      // 7. Assemble Complete Booking Record for Immediate Dashboard Display
      const svcNames = (payload.services || []).map(s => s.name).join(', ');
      const prodNames = (payload.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ');
      let combinedDesc = svcNames;
      if (svcNames && prodNames) {
        combinedDesc = `${svcNames} + ${prodNames}`;
      } else if (!svcNames && prodNames) {
        combinedDesc = prodNames;
      } else if (!combinedDesc) {
        combinedDesc = 'Walk-In Wash & Detailing';
      }

      const createdBookingRecord = {
        id: bookingId,
        share_token: bookingShareToken,
        invoice_id: invoiceId,
        invoice_ref: invData.invoice_number,
        invoice_number: invData.invoice_number,
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_id: primaryServiceId,
        booking_date: todayIso,
        date: todayIso,
        subtotal: Number(payload.totals.subtotal || 0),
        original_price: Number(payload.totals.subtotal || 0),
        originalPrice: Number(payload.totals.subtotal || 0),
        discount: Number(payload.totals.discount || 0),
        discount_reason: discountReasonVal,
        discountReason: discountReasonVal,
        total_amount: finalGrandTotal,
        grand_total: finalGrandTotal,
        price: finalGrandTotal,
        amount_collected: payAmountVal,
        amount_paid: payAmountVal,
        balance_due: balanceDueVal,
        status: 'COMPLETED',
        source: 'OFFLINE / WALK-IN',
        name: payload.customer.name || 'Walk-In Customer',
        phone: cleanCustPhone,
        vehicleType: payload.vehicle.vehicle_type || 'Car',
        vehicleModel: payload.vehicle.vehicle_type || 'Car',
        reg: payload.vehicle.reg_number,
        service: combinedDesc,
        services: payload.services || [],
        products: payload.products || [],
        totals: {
          ...payload.totals,
          discount_reason: discountReasonVal,
          discountReason: discountReasonVal,
          amount_collected: payAmountVal,
          balance_due: balanceDueVal
        },
        payStatus: payStatusVal,
        payMethod: (payload.payment && payload.payment.method) || 'Cash',
        created_at: invData.created_at || new Date().toISOString(),
        created: invData.created_at || new Date().toISOString()
      };

      // Synchronize with local storage bookings cache immediately
      try {
        const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
        const existingIdx = localBookings.findIndex(b => b.id === bookingId || b.invoice_ref === invData.invoice_number);
        if (existingIdx >= 0) {
          localBookings[existingIdx] = createdBookingRecord;
        } else {
          localBookings.unshift(createdBookingRecord);
        }
        localStorage.setItem('trieye_bookings', JSON.stringify(localBookings));
      } catch (e) {}

      // Synchronize with local storage invoices cache
      try {
        const localInvoices = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
        const invFull = {
          id: invoiceId,
          invoice_number: invData.invoice_number,
          booking_id: bookingId,
          created_at: invData.created_at,
          subtotal: Number(payload.totals.subtotal || 0),
          original_price: Number(payload.totals.subtotal || 0),
          services_subtotal: Number(payload.totals.servicesSubtotal || payload.totals.subtotal || 0),
          addon_subtotal: Number(payload.totals.addonSubtotal || 0),
          discount: Number(payload.totals.discount || 0),
          discount_reason: discountReasonVal,
          discountReason: discountReasonVal,
          grand_total: finalGrandTotal,
          amount_collected: payAmountVal,
          amount_paid: payAmountVal,
          balance_due: balanceDueVal,
          status: payStatusVal,
          customers: { name: payload.customer.name, phone: cleanCustPhone },
          vehicles: { vehicle_type: payload.vehicle.vehicle_type, reg_number: payload.vehicle.reg_number },
          invoice_items: localItemsPayload,
          items: localItemsPayload,
          payments: [{ amount: payAmountVal, method: (payload.payment && payload.payment.method) || 'Cash', status: payStatusVal }]
        };
        localInvoices.unshift(invFull);
        localStorage.setItem('trieye_invoices', JSON.stringify(localInvoices));
      } catch (e) {}

      return {
        success: true,
        invoice: invData,
        booking: createdBookingRecord
      };
    } catch (err) {
      console.error('🚨 [TrieyeDB] createInvoice error:', err);
      return { success: false, error: err.message || 'Failed to create invoice.' };
    }
  },

  async getInvoiceById(invoiceId) {
    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;
    let invRecord = null;
    if (sb) {
      try {
        const { data, error } = await sb
          .from('invoices')
          .select(`
            *,
            customers (id, name, phone, email, notes),
            vehicles (id, vehicle_type, reg_number),
            invoice_items (*),
            bookings ( id, share_token, payments (id, amount, method, status) )
          `)
          .eq('id', invoiceId)
          .single();
        if (!error && data) {
          invRecord = data;
        }
      } catch (err) {
        console.warn('⚠️ [TrieyeDB] getInvoiceById error from remote, checking local cache:', err);
      }
    }
    if (!invRecord) {
      try {
        const localInvoices = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
        const found = localInvoices.find(i => i.id === invoiceId || i.invoice_number === invoiceId);
        if (found) invRecord = found;
      } catch (e) {}
    }
    if (invRecord) {
      // Reconcile with local booking and invoice cache
      try {
        const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
        const localInvs = JSON.parse(localStorage.getItem('trieye_invoices')) || [];
        const matchedBk = localBookings.find(b => b.invoice_id === invRecord.id || b.invoice_ref === invRecord.invoice_number || b.id === invRecord.booking_id);
        const matchedInv = localInvs.find(i => i.id === invRecord.id || i.invoice_number === invRecord.invoice_number);

        if ((!invRecord.invoice_items || invRecord.invoice_items.length === 0) && matchedInv && matchedInv.invoice_items && matchedInv.invoice_items.length > 0) {
          invRecord.invoice_items = matchedInv.invoice_items;
        }
        if (!invRecord.items) {
          invRecord.items = invRecord.invoice_items || [];
        }

        if (invRecord.amount_collected === undefined || invRecord.amount_collected === null) {
          if (matchedBk && matchedBk.amount_collected !== undefined) invRecord.amount_collected = matchedBk.amount_collected;
          else if (matchedInv && matchedInv.amount_collected !== undefined) invRecord.amount_collected = matchedInv.amount_collected;
        }

        const pays = (invRecord.bookings && invRecord.bookings.payments) ? invRecord.bookings.payments : (invRecord.payments || []);
        if ((!pays || pays.length === 0) && matchedBk) {
          if (matchedBk.payments && matchedBk.payments.length > 0) {
            invRecord.payments = matchedBk.payments;
          } else if (matchedBk.payStatus || matchedBk.payment_status) {
            invRecord.payments = [{
              amount: matchedBk.amount_collected !== undefined ? matchedBk.amount_collected : (matchedBk.payStatus === 'PAID' ? invRecord.grand_total : 0),
              status: matchedBk.payStatus || matchedBk.payment_status,
              method: matchedBk.payMethod || 'CASH'
            }];
          }
        }

        const m = this.calculateBillMetrics(invRecord);
        invRecord.status = m.paymentStatus;
        invRecord.payment_status = m.paymentStatus;
        invRecord.payStatus = m.paymentStatus;
        invRecord.amount_collected = m.amountCollected;
        invRecord.balance_due = m.balanceDue;
      } catch (e) {}
      return invRecord;
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
    let formattedVeh = '';
    let cleanReg = '';
    
    if (isTriRef) {
      cleanRef = rawInput.replace(/^#/, '').replace(/^TRI-/, '');
    } else {
      formattedVeh = this.formatVehicleNumber(rawInput);
      cleanReg = formattedVeh.replace(/[^A-Z0-9]/g, '');
      if (!cleanReg) {
        return {
          success: false,
          error: "Enter vehicle number in TN 01 AB 1234 format"
        };
      }
    }

    const sb = typeof window.getTrieyeSupabase === 'function' ? window.getTrieyeSupabase() : null;

    // 1. SUPABASE SECURE RPC LOOKUP (SECURITY DEFINER)
    if (sb) {
      try {
        console.log('⚡ [TrieyeDB] Calling RPC track_vehicle_bookings...');
        const { data: rpcData, error: rpcError } = await sb.rpc('track_vehicle_bookings', {
          p_reg_number: formattedVeh || rawInput,
          p_phone: cleanPhone
        });

        if (rpcError) {
          console.warn('⚠️ [Supabase RPC track_vehicle_bookings error]:', rpcError.message);
          // If RPC returned an intentional error message, log it
        } else if (rpcData && typeof rpcData === 'object') {
          if (rpcData.success) {
            const rawHistory = Array.isArray(rpcData.history) ? rpcData.history : [];
            const formattedHistory = rawHistory.map(item => this._formatTrackBookingItem(item, rpcData));
            const latestBooking = formattedHistory.length > 0 ? formattedHistory[0] : this._formatTrackBookingItem(rpcData.booking, rpcData);

            return {
              success: true,
              customer_name: rpcData.customer_name || (latestBooking && latestBooking.customer_name) || 'Valued Customer',
              vehicle_type: rpcData.vehicle_type || (latestBooking && latestBooking.vehicleType) || 'Car',
              reg_number: rpcData.reg_number || (latestBooking && latestBooking.reg) || formattedVeh,
              total_visits: rpcData.total_visits || formattedHistory.length,
              booking: latestBooking,
              history: formattedHistory
            };
          } else if (rpcData.error) {
            return {
              success: false,
              error: rpcData.error
            };
          }
        }
      } catch (err) {
        console.warn('⚠️ [TrieyeDB RPC network exception]:', err);
      }
    }

    // 2. LOCAL CACHE FALLBACK (Supports offline mode, multi-visit history, multi-vehicle isolation)
    try {
      const localBookings = JSON.parse(localStorage.getItem('trieye_bookings')) || [];
      const localInvoices = JSON.parse(localStorage.getItem('trieye_invoices')) || [];

      // Filter bookings matching THIS customer's phone AND THIS specific vehicle
      const matchingVisits = localBookings.filter(b => {
        const custPhone = String(b.phone || (b.customers && b.customers.phone) || '').replace(/\D/g, '').slice(-10);
        const phoneMatches = custPhone === cleanPhone;
        if (!phoneMatches) return false;

        const bRef = String(b.invoice_ref || b.id || '').toUpperCase().replace(/^TRI-/, '');
        const refMatches = cleanRef && (bRef.startsWith(cleanRef) || cleanRef.startsWith(bRef) || (b.id && String(b.id).toUpperCase().replace(/^TRI-/, '').startsWith(cleanRef)));

        const vReg = String(b.reg || (b.vehicles && b.vehicles.reg_number) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const regMatches = cleanReg && vReg && (vReg === cleanReg || vReg.includes(cleanReg) || cleanReg.includes(vReg));

        return refMatches || regMatches;
      });

      if (matchingVisits.length > 0) {
        // Sort visits newest to oldest (by date then created)
        matchingVisits.sort((a, b) => {
          const dateA = a.booking_date || a.date || a.created_at || a.created || '';
          const dateB = b.booking_date || b.date || b.created_at || b.created || '';
          return dateB.localeCompare(dateA);
        });

        // Format all visits for this vehicle
        const history = matchingVisits.map(m => {
          // Check if an invoice is linked to this visit
          const linkedInv = localInvoices.find(inv => 
            (inv.booking_id && (inv.booking_id === m.id || inv.booking_id === m.booking_id)) ||
            (inv.invoice_number && inv.invoice_number === m.invoice_ref)
          );
          if (linkedInv) {
            m.has_invoice = true;
            m.invoice_status = linkedInv.status || 'ISSUED';
          }
          return this._formatTrackBookingItem(m);
        });

        const latest = history[0];

        return {
          success: true,
          customer_name: latest.customer_name || 'Valued Customer',
          vehicle_type: latest.vehicleType || 'Car',
          reg_number: latest.reg || formattedVeh,
          total_visits: history.length,
          booking: latest,
          history: history
        };
      }

      // Check if phone exists but with a different vehicle (so we give a clean informative error without leaking details)
      const phoneExists = localBookings.some(b => {
        const p = String(b.phone || (b.customers && b.customers.phone) || '').replace(/\D/g, '').slice(-10);
        return p === cleanPhone;
      });

      if (phoneExists && cleanReg) {
        return {
          success: false,
          error: `No bookings found for vehicle ${formattedVeh || cleanReg} under phone ending in ${cleanPhone.slice(-4)}.`
        };
      }
    } catch (e) {
      console.error('🚨 [Local Track Booking Error]:', e);
    }

    return {
      success: false,
      error: "We couldn't find a booking matching those details. Please check your vehicle number and registered phone number."
    };
  },

  _formatTrackBookingItem(b, parentContext = {}) {
    if (!b) return null;
    const cust = b.customers || {};
    const veh = b.vehicles || {};
    const svc = b.services || {};
    const slot = b.slots || {};

    const shortRef = b.booking_ref || (b.id && String(b.id).length > 8 ? `TRI-${String(b.id).substring(0, 8).toUpperCase()}` : (b.id || b.invoice_ref || 'TRI-BOOKING'));
    const totalAmt = Number(b.price !== undefined ? b.price : (b.total_amount !== undefined ? b.total_amount : (svc.base_price || 0)));

    let normStatus = String(b.status || 'CONFIRMED').toUpperCase().trim();
    if (normStatus === 'CANCELED' || normStatus === 'CANCEL') normStatus = 'CANCELLED';
    if (normStatus === 'DONE' || normStatus === 'FINISHED') normStatus = 'COMPLETED';

    const bDate = b.booking_date || b.date || '';
    // Do not invent booking times if no slot was assigned
    const rawTime = b.booking_time || b.slot || (slot && slot.slot_time) || null;
    const bTime = (rawTime && rawTime !== 'Standard Slot' && rawTime !== '10:00 AM') ? rawTime : (rawTime === 'Standard Slot' ? null : rawTime);

    const hasInvoice = Boolean(b.has_invoice || b.invoice_number || b.invoice_id || b.invoice_ref);
    const shareToken = b.share_token || null;

    return {
      booking_id: b.id || b.booking_id || shortRef,
      booking_ref: shortRef,
      customer_name: b.customer_name || b.name || cust.name || parentContext.customer_name || 'Valued Customer',
      phone: b.phone || cust.phone || '',
      service: b.service || svc.name || 'Detailing Service',
      vehicleType: b.vehicleType || veh.vehicle_type || parentContext.vehicle_type || 'Car',
      reg: b.reg || veh.reg_number || parentContext.reg_number || 'TN 01 AB 1234',
      booking_date: bDate,
      booking_time: bTime, // null if no slot was assigned
      price: totalAmt,
      status: normStatus,
      created_at: b.created_at || b.created || new Date().toISOString(),
      has_invoice: hasInvoice,
      invoice_status: b.invoice_status || (hasInvoice ? 'ISSUED' : 'PENDING'),
      share_token: shareToken
    };
  },

  _formatTrackBookingResult(b) {
    return this._formatTrackBookingItem(b);
  }
};

if (typeof window !== 'undefined') {
  window.TrieyeDB = TrieyeDB;
  window.formatVehicleNumber = TrieyeDB.formatVehicleNumber.bind(TrieyeDB);
  window.validateVehicleNumber = TrieyeDB.validateVehicleNumber.bind(TrieyeDB);
  window.normalizeVehicleNumber = TrieyeDB.normalizeVehicleNumber.bind(TrieyeDB);
  window.formatVehicleReg = TrieyeDB.formatVehicleReg.bind(TrieyeDB);
  window.validateVehicleReg = TrieyeDB.validateVehicleReg.bind(TrieyeDB);
  window.normalizeVehicleReg = TrieyeDB.normalizeVehicleReg.bind(TrieyeDB);
}

if (typeof globalThis !== 'undefined') {
  globalThis.TrieyeDB = TrieyeDB;
}


