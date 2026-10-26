-- ==============================================================================
-- TRIEYE STUDIO: Admin Discount & Audit Data Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)

-- 1. Add discount_reason to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- 2. Add discount audit fields to bookings table (preserves auditability without modifying service masters)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- 3. Update public RPC get_public_invoice_by_token to sanitize customer presentation:
--    - Returns total_bill_amount, final_bill_amount, amount_collected, balance_due
--    - Omits discount_amount and discount_reason from the customer-facing payload
--    - Calculates accurate payment status (never shows false PAID when balance_due > 0)
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
      'invoice_ref', COALESCE(inv.invoice_number, 'TRI-' || upper(substr(b.id::text, 1, 8))),
      'share_token', b.share_token,
      'invoice_date', COALESCE(inv.created_at::date::text, b.booking_date::text, to_char(b.created_at, 'YYYY-MM-DD')),
      'booking_time', COALESCE(sl.slot_time, b.booking_time, 'Standard'),
      'customer_name', COALESCE(c.name, 'Valued Customer'),
      'customer_phone', COALESCE(c.phone, 'N/A'),
      'vehicle_type', COALESCE(v.vehicle_type, 'Car'),
      'reg_number', COALESCE(v.reg_number, 'N/A'),
      'service_name', COALESCE(s.name, 'Detailing Service'),
      'service_description', COALESCE(s.description, 'Complete detailing & wash package'),
      'bay_name', COALESCE(by.name, 'Detailing Bay 01'),
      'quantity', 1,
      
      -- Customer-facing Bill Fields (No discount amount or reason exposed)
      'total_bill_amount', COALESCE(inv.subtotal, s.base_price, b.total_amount, 0),
      'final_bill_amount', COALESCE(inv.grand_total, b.total_amount, s.base_price, 0),
      'amount_collected', COALESCE(pmt.total_paid, CASE WHEN pmt.latest_status = 'PAID' THEN COALESCE(inv.grand_total, b.total_amount) ELSE 0 END, 0),
      'balance_due', GREATEST(0, COALESCE(inv.grand_total, b.total_amount, s.base_price, 0) - COALESCE(pmt.total_paid, CASE WHEN pmt.latest_status = 'PAID' THEN COALESCE(inv.grand_total, b.total_amount) ELSE 0 END, 0)),
      
      -- Compatibility aliases
      'rate', COALESCE(inv.subtotal, s.base_price, b.total_amount, 0),
      'subtotal', COALESCE(inv.subtotal, s.base_price, b.total_amount, 0),
      'total_amount', COALESCE(inv.grand_total, b.total_amount, s.base_price, 0),
      'payment_method', COALESCE(pmt.latest_method, 'Cash'),
      'payment_status', CASE 
        WHEN GREATEST(0, COALESCE(inv.grand_total, b.total_amount, s.base_price, 0) - COALESCE(pmt.total_paid, CASE WHEN pmt.latest_status = 'PAID' THEN COALESCE(inv.grand_total, b.total_amount) ELSE 0 END, 0)) = 0 
             AND COALESCE(pmt.total_paid, CASE WHEN pmt.latest_status = 'PAID' THEN COALESCE(inv.grand_total, b.total_amount) ELSE 0 END, 0) > 0 THEN 'PAID'
        WHEN COALESCE(pmt.total_paid, 0) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
      END,
      
      'business', jsonb_build_object(
        'name', 'TRIEYE DETAILING',
        'tagline', 'Detail • Precision • Protection',
        'address', '1st, 19, 6th Street, Main Rd, Baba Nagar, Villivakkam, Chennai, Tamil Nadu 600049',
        'phone', '+91 99401 81934 / +91 93630 68836',
        'email', 'care@trieyestudio.com',
        'gstin', '33CKMPB5885L1ZO'
      )
    )
  ) INTO v_result
  FROM public.bookings b
  LEFT JOIN public.customers c ON b.customer_id = c.id
  LEFT JOIN public.vehicles v ON b.vehicle_id = v.id
  LEFT JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.bays by ON b.bay_id = by.id
  LEFT JOIN public.slots sl ON b.slot_id = sl.id
  LEFT JOIN public.invoices inv ON inv.booking_id = b.id
  LEFT JOIN (
    SELECT 
      booking_id, 
      SUM(amount) AS total_paid,
      (ARRAY_AGG(method ORDER BY created_at DESC))[1] AS latest_method,
      (ARRAY_AGG(status ORDER BY created_at DESC))[1] AS latest_status
    FROM public.payments
    GROUP BY booking_id
  ) pmt ON pmt.booking_id = b.id
  WHERE b.share_token = trim(p_token);

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found or link has expired.');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_invoice_by_token(TEXT) TO anon, authenticated;
