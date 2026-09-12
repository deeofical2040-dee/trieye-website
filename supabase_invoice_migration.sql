-- ==============================================================================
-- TRIEYE STUDIO: Secure Public Invoice Sharing Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)

-- 1. Ensure pgcrypto extension is available for secure random bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add share_token column with automatic cryptographic 48-char random hex generation
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex');

-- 3. Create index for fast O(1) token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_share_token ON public.bookings(share_token);

-- 4. Backfill any existing bookings that do not have a share_token
UPDATE public.bookings 
SET share_token = encode(gen_random_bytes(24), 'hex') 
WHERE share_token IS NULL;

-- 5. Create Secure DEFINER RPC for public invoice retrieval
CREATE OR REPLACE FUNCTION public.get_public_invoice_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Strict validation on input token
  IF p_token IS NULL OR length(trim(p_token)) < 24 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or missing invoice token.');
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object(
      'invoice_ref', b.id,
      'share_token', b.share_token,
      'invoice_date', COALESCE(b.booking_date::text, to_char(b.created_at, 'YYYY-MM-DD')),
      'booking_time', COALESCE(sl.slot_time, b.booking_time, 'Standard'),
      'customer_name', COALESCE(c.name, 'Valued Customer'),
      'customer_phone', COALESCE(c.phone, 'N/A'),
      'vehicle_type', COALESCE(v.vehicle_type, 'Car'),
      'reg_number', COALESCE(v.reg_number, 'N/A'),
      'service_name', COALESCE(s.name, 'Detailing Service'),
      'service_description', COALESCE(s.description, 'Complete detailing & wash package'),
      'bay_name', COALESCE(by.name, 'Detailing Bay 01'),
      'quantity', 1,
      'rate', COALESCE(b.total_amount, s.base_price, 0),
      'total_amount', COALESCE(b.total_amount, s.base_price, 0),
      'payment_method', COALESCE(p.method, 'Counter / UPI'),
      'payment_status', COALESCE(p.status, b.status, 'PAID'),
      'business', jsonb_build_object(
        'name', 'TRIEYE WATERWASH & DETAILING',
        'tagline', 'Premium Car Spa, Ceramic Coating & Paint Protection Studio',
        'address', 'OMR Road, Sholinganallur, Chennai — 600119',
        'phone', '+91 98765 43210',
        'email', 'care@trieyestudio.com',
        'gstin', '33AAAAA0000A1Z5'
      )
    )
  ) INTO v_result
  FROM public.bookings b
  LEFT JOIN public.customers c ON b.customer_id = c.id
  LEFT JOIN public.vehicles v ON b.vehicle_id = v.id
  LEFT JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.bays by ON b.bay_id = by.id
  LEFT JOIN public.slots sl ON b.slot_id = sl.id
  LEFT JOIN public.payments p ON p.booking_id = b.id
  WHERE b.share_token = trim(p_token);

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found or link has expired.');
  END IF;

  RETURN v_result;
END;
$$;

-- 6. Grant execution permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_invoice_by_token(TEXT) TO anon, authenticated;
