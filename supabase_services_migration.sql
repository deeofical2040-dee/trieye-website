-- ==============================================================================
-- TRIEYE STUDIO — ATOMIC TRANSACTIONAL PRICING PERSISTENCE MIGRATION
-- File: supabase_services_migration.sql
--
-- Purpose:
-- Provides an atomic, transactional PostgreSQL RPC function 'save_services_matrix'
-- that guarantees multi-service pricing updates either commit completely or roll
-- back completely. Eliminates silent partial-write states.
--
-- Security:
-- Uses SECURITY INVOKER so the function runs with the privileges of the calling
-- authenticated user, respecting Row Level Security (RLS) on public.services.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_services_matrix(p_services JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_key TEXT;
  v_val JSONB;
  v_hatch NUMERIC;
  v_sedan NUMERIC;
  v_suv NUMERIC;
  v_bike NUMERIC;
  v_base NUMERIC;
  v_name TEXT;
  v_desc TEXT;
  v_duration INT;
  v_active BOOLEAN;
  v_id UUID;
  v_count INT := 0;
BEGIN
  IF p_services IS NULL OR jsonb_typeof(p_services) != 'object' THEN
    RAISE EXCEPTION 'Payload must be a non-null JSON object mapping service names to package data.';
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_services) LOOP
    v_name := COALESCE(v_val->>'name', v_key);
    v_desc := COALESCE(v_val->>'desc', v_val->>'description', '');
    
    -- Extract prices with fallback resolution
    v_sedan := COALESCE((v_val->>'sedan_price')::NUMERIC, (v_val->'pricing'->>'Sedan')::NUMERIC, (v_val->>'base_price')::NUMERIC, 0);
    v_hatch := COALESCE((v_val->>'hatchback_price')::NUMERIC, (v_val->'pricing'->>'Hatchback')::NUMERIC, v_sedan);
    v_suv := COALESCE((v_val->>'suv_price')::NUMERIC, (v_val->'pricing'->>'SUV / 4x4')::NUMERIC, v_sedan);
    v_bike := COALESCE((v_val->>'bike_price')::NUMERIC, (v_val->'pricing'->>'Superbike')::NUMERIC, v_sedan);
    v_base := COALESCE((v_val->>'base_price')::NUMERIC, v_sedan);
    
    v_duration := NULLIF(v_val->>'duration_minutes', '')::INT;
    v_active := COALESCE((v_val->>'active')::BOOLEAN, true);

    -- If UUID is provided and valid, update by ID
    IF v_val->>'id' IS NOT NULL AND (v_val->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_id := (v_val->>'id')::UUID;
      UPDATE public.services
      SET name = v_name,
          description = v_desc,
          duration_minutes = v_duration,
          base_price = v_base,
          hatchback_price = v_hatch,
          sedan_price = v_sedan,
          suv_price = v_suv,
          bike_price = v_bike,
          active = v_active
      WHERE id = v_id;
    ELSE
      -- Otherwise update by unique name
      UPDATE public.services
      SET description = v_desc,
          duration_minutes = v_duration,
          base_price = v_base,
          hatchback_price = v_hatch,
          sedan_price = v_sedan,
          suv_price = v_suv,
          bike_price = v_bike,
          active = v_active
      WHERE name = v_name;
    END IF;

    -- If no existing row was updated, insert new service record
    IF NOT FOUND THEN
      INSERT INTO public.services (
        name,
        description,
        duration_minutes,
        base_price,
        hatchback_price,
        sedan_price,
        suv_price,
        bike_price,
        active
      ) VALUES (
        v_name,
        v_desc,
        v_duration,
        v_base,
        v_hatch,
        v_sedan,
        v_suv,
        v_bike,
        v_active
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'committed_at', now()
  );
END;
$$;

-- Grant execution permission to authenticated users (admin checks are enforced via RLS/app)
GRANT EXECUTE ON FUNCTION public.save_services_matrix(JSONB) TO authenticated;
