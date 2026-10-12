-- ==============================================================================
-- TRIEYE STUDIO: Add completed_at Timestamp to Bookings Table
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)
--
-- PURPOSE:
-- Establishes a true, authoritative physical completion timestamp for wash & detailing
-- jobs in the Completed Jobs Archives.
-- ==============================================================================

-- 1. Add completed_at TIMESTAMPTZ column if it does not already exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Create index for fast completed job queries and chronological sorting
CREATE INDEX IF NOT EXISTS idx_bookings_status_completed_at 
ON public.bookings(status, completed_at DESC);

-- 3. Historical Record Backfill Policy & Limitation:
-- Legacy jobs completed prior to this migration do NOT have recorded completion times.
-- In accordance with business rules, we do NOT invent or fabricate completion times.
-- In the TRIEYE Dashboard, legacy records are preserved and mapped to their service
-- month while showing "—" with a "Legacy Record" indicator for completion timestamp.
--
-- OPTIONAL ONE-TIME MIGRATION:
-- If studio management explicitly wishes to approximate legacy records by backfilling
-- them with their booking creation timestamps, uncomment and run:
--
-- UPDATE public.bookings 
-- SET completed_at = created_at 
-- WHERE status = 'COMPLETED' AND completed_at IS NULL;
