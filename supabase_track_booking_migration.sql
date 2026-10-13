-- ==============================================================================
-- TRIEYE STUDIO: Vehicle-Specific Track Booking & Multi-Visit RPC Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)
--
-- Security Rules Enforced:
-- 1. SECURITY DEFINER: Allows anonymous visitors to look up booking status
--    without granting public SELECT permissions on customers, vehicles,
--    bookings, invoices, or payments.
-- 2. Customer Phone & Vehicle Registration Dual-Match:
--    A customer must match the 10-digit registered phone AND the vehicle registration.
-- 3. Isolation (Multi-Vehicle):
--    Never reveals other vehicles owned by the same customer. Only returns
--    records for the specifically queried vehicle.
-- 4. Multi-Visit History:
--    Aggregates all visits for the matched vehicle, ordered newest to oldest.
-- 5. Bill Security:
--    Never exposes raw internal invoice UUIDs or unrestricted financial data.
--    Only returns share_token if authorized, along with invoice availability.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.track_vehicle_bookings(p_reg_number TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_phone TEXT;
  v_clean_reg TEXT;
  v_customer RECORD;
  v_vehicle RECORD;
  v_bookings JSONB;
  v_latest_booking JSONB;
BEGIN
  -- 1. Sanitize and validate inputs
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone number is required.');
  END IF;

  IF p_reg_number IS NULL OR trim(p_reg_number) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicle registration number is required.');
  END IF;

  v_clean_phone := right(regexp_replace(p_phone, '\D', '', 'g'), 10);
  v_clean_reg := upper(regexp_replace(p_reg_number, '[^A-Za-z0-9]', '', 'g'));

  IF length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid 10-digit registered phone number.');
  END IF;

  IF length(v_clean_reg) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid vehicle registration number (e.g. TN 01 AB 1234).');
  END IF;

  -- 2. Lookup Customer by Phone
  SELECT c.id, c.name, c.phone
  INTO v_customer
  FROM public.customers c
  WHERE right(regexp_replace(c.phone, '\D', '', 'g'), 10) = v_clean_phone
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'We could not find any booking matching this phone number and vehicle registration.');
  END IF;

  -- 3. Lookup Vehicle for THIS customer ONLY (Isolation: do not mix or reveal other vehicles)
  SELECT v.id, v.vehicle_type, v.reg_number
  INTO v_vehicle
  FROM public.vehicles v
  WHERE v.customer_id = v_customer.id
    AND upper(regexp_replace(v.reg_number, '[^A-Za-z0-9]', '', 'g')) = v_clean_reg
  ORDER BY v.created_at DESC
  LIMIT 1;

  IF v_vehicle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No bookings found for vehicle ' || p_reg_number || ' under the registered phone number.');
  END IF;

  -- 4. Query all bookings for this specific vehicle and customer (newest first)
  SELECT jsonb_agg(
    jsonb_build_object(
      'booking_id', b.id,
      'booking_ref', 'TRI-' || upper(substring(b.id::text from 1 for 8)),
      'booking_date', b.booking_date,
      'booking_time', COALESCE(sl.slot_time, b.booking_time, NULL),
      'status', COALESCE(b.status, 'CONFIRMED'),
      'service', COALESCE(s.name, 'Detailing Service'),
      'price', COALESCE(b.total_amount, s.base_price, 0),
      'created_at', b.created_at,
      'has_invoice', (inv.id IS NOT NULL),
      'invoice_status', inv.status,
      'share_token', b.share_token
    )
    ORDER BY b.booking_date DESC, b.created_at DESC
  )
  INTO v_bookings
  FROM public.bookings b
  LEFT JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.slots sl ON b.slot_id = sl.id
  LEFT JOIN LATERAL (
    SELECT id, invoice_number, status, grand_total
    FROM public.invoices i
    WHERE i.booking_id = b.id
    ORDER BY i.created_at DESC
    LIMIT 1
  ) inv ON true
  WHERE b.customer_id = v_customer.id
    AND b.vehicle_id = v_vehicle.id;

  IF v_bookings IS NULL OR jsonb_array_length(v_bookings) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle is registered, but no service visits or bookings were found.'
    );
  END IF;

  v_latest_booking := v_bookings->0;

  RETURN jsonb_build_object(
    'success', true,
    'customer_name', v_customer.name,
    'vehicle_type', v_vehicle.vehicle_type,
    'reg_number', v_vehicle.reg_number,
    'total_visits', jsonb_array_length(v_bookings),
    'booking', v_latest_booking,
    'history', v_bookings
  );
END;
$$;

-- 5. Grant execution permissions to anon and authenticated clients
GRANT EXECUTE ON FUNCTION public.track_vehicle_bookings(TEXT, TEXT) TO anon, authenticated;
