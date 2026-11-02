-- ==============================================================================
-- TRIEYE STUDIO: Monthly Car Care Packages & Redemptions Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    reg_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_category VARCHAR(50) NOT NULL DEFAULT 'Medium Car',
    package_name VARCHAR(255) NOT NULL DEFAULT 'TRIEYE Monthly Car Care Pack',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 2499,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 2499,
    balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    complete_wash INT NOT NULL DEFAULT 1,
    basic_wash INT NOT NULL DEFAULT 1,
    outer_foam_wash INT NOT NULL DEFAULT 4,
    initial_complete INT NOT NULL DEFAULT 1,
    initial_basic INT NOT NULL DEFAULT 1,
    initial_outer_foam INT NOT NULL DEFAULT 4,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_number VARCHAR(50) UNIQUE NOT NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    package_code VARCHAR(50) NOT NULL,
    wash_category VARCHAR(50) NOT NULL,
    wash_type_name VARCHAR(100) NOT NULL,
    payable_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    staff_notes TEXT,
    balance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_phone ON public.packages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_packages_reg ON public.packages(reg_number);
CREATE INDEX IF NOT EXISTS idx_packages_code ON public.packages(package_id);
CREATE INDEX IF NOT EXISTS idx_package_redemptions_code ON public.package_redemptions(package_code);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_packages ON public.packages 
    FOR ALL 
    USING ( auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') );

CREATE POLICY admin_all_package_redemptions ON public.package_redemptions 
    FOR ALL 
    USING ( auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') );
