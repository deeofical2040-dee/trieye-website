-- ==============================================================================
-- TRIEYE STUDIO: Factory Reset Data
-- ==============================================================================

-- 1. Truncate all transaction and customer tables
-- Using CASCADE will automatically delete all related records in:
-- - vehicles
-- - bookings
-- - invoices
-- - invoice_items
-- - payments
TRUNCATE TABLE public.customers CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.payments CASCADE;

-- 2. Restart the Invoice Sequence from 1
ALTER SEQUENCE public.invoice_seq RESTART WITH 1;
