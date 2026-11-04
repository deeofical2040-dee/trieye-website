-- ==============================================================================
-- TRIEYE STUDIO: Monthly Bike Wash Packages & Redemptions Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)

-- 1. Ensure package_type and bike_wash balance columns exist on public.packages
ALTER TABLE public.packages 
    ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) NOT NULL DEFAULT 'CAR',
    ADD COLUMN IF NOT EXISTS bike_wash INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS initial_bike_wash INT NOT NULL DEFAULT 0;

-- 2. Add helpful indexes for bike package queries
CREATE INDEX IF NOT EXISTS idx_packages_type ON public.packages(package_type);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);

-- 3. Package Redemptions table support for bike washes
-- Ensures balance_snapshot and wash_category support 'bike_wash'
COMMENT ON COLUMN public.packages.package_type IS 'Type of package: CAR (6 washes total) or BIKE (3 washes total)';
COMMENT ON COLUMN public.packages.bike_wash IS 'Remaining bike washes for TRIEYE Monthly Bike Wash Pack';
COMMENT ON COLUMN public.packages.initial_bike_wash IS 'Initial allocation of bike washes (default: 3)';
