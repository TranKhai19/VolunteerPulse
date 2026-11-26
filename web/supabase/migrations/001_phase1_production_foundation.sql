-- =============================================================================
-- VolunteerPulse — Phase 1 Production Foundation Migration (Idempotent & Safe)
-- Preserves all existing data while adding:
--   1. Multi-campaign / Multi-year support (vp_campaigns + campaign_id)
--   2. Missing columns synced with app code (vp_villages, vp_field_reports)
--   3. Real Auth Profiles & RBAC (vp_profiles + trigger on auth.users)
--   4. Production Row Level Security (public read for Map/Transparency, role-gated writes)
--   5. Supabase Storage bucket (field-evidence) for real evidence photos
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Campaigns table (Multi-year / Multi-season support)
CREATE TABLE IF NOT EXISTS public.vp_campaigns (
  id text PRIMARY KEY,
  name text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  province text NOT NULL DEFAULT 'Quảng Nam',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.vp_campaigns (id, name, year, province, status, is_default)
VALUES ('camp-xtn-2026', 'Xuân Tình Nguyện Quảng Nam 2026', 2026, 'Quảng Nam', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Sync missing columns on vp_villages
ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS commune_org_id text NOT NULL DEFAULT '';
ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS commune_org_name text NOT NULL DEFAULT '';
ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS commune_leader text NOT NULL DEFAULT '';
ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS coverage_status text NOT NULL DEFAULT 'unclaimed';
ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.vp_campaigns(id) ON DELETE SET NULL;

-- 3. Sync missing columns on vp_field_reports (including real photo URL & GPS source)
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS dtu_org_name text NOT NULL DEFAULT '';
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS commune_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS commune_confirm_note text NOT NULL DEFAULT '';
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS commune_confirmed_at text NOT NULL DEFAULT '';
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS gps_source text NOT NULL DEFAULT 'device_gps';
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.vp_campaigns(id) ON DELETE SET NULL;

-- 4. Add campaign_id to remaining campaign-scoped tables
ALTER TABLE public.vp_commitments ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.vp_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.vp_volunteers ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.vp_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.vp_transactions ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES public.vp_campaigns(id) ON DELETE SET NULL;

-- Backfill existing rows to default 2026 campaign
UPDATE public.vp_villages SET campaign_id = 'camp-xtn-2026' WHERE campaign_id IS NULL;
UPDATE public.vp_commitments SET campaign_id = 'camp-xtn-2026' WHERE campaign_id IS NULL;
UPDATE public.vp_volunteers SET campaign_id = 'camp-xtn-2026' WHERE campaign_id IS NULL;
UPDATE public.vp_field_reports SET campaign_id = 'camp-xtn-2026' WHERE campaign_id IS NULL;
UPDATE public.vp_transactions SET campaign_id = 'camp-xtn-2026' WHERE campaign_id IS NULL;

-- 5. User Profiles & Role-Based Access Control (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.vp_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'pending'
    CHECK (role IN ('pending', 'volunteer', 'dtu_unit', 'commune_youth', 'coordinator', 'admin')),
  org_name text NOT NULL DEFAULT '',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_vp_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vp_profiles (id, email, full_name, role, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_vp ON auth.users;
CREATE TRIGGER on_auth_user_created_vp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vp_user();

-- Helper function to read current authenticated user's approved role
CREATE OR REPLACE FUNCTION public.vp_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN approved THEN role ELSE 'pending' END
  FROM public.vp_profiles
  WHERE id = auth.uid();
$$;

-- 6. Replace wide-open demo RLS policies with Production RLS
ALTER TABLE public.vp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_commitments ENABLE ROW LEVEL SECURITY;

-- Drop old wide-open demo policies
DROP POLICY IF EXISTS "vp_villages_all" ON public.vp_villages;
DROP POLICY IF EXISTS "vp_volunteers_all" ON public.vp_volunteers;
DROP POLICY IF EXISTS "vp_field_reports_all" ON public.vp_field_reports;
DROP POLICY IF EXISTS "vp_transactions_all" ON public.vp_transactions;
DROP POLICY IF EXISTS "vp_organizations_all" ON public.vp_organizations;
DROP POLICY IF EXISTS "vp_commitments_all" ON public.vp_commitments;

-- Public read policies (for Donors / Guests viewing Map & Transparency Report)
DROP POLICY IF EXISTS "vp_campaigns_public_read" ON public.vp_campaigns;
CREATE POLICY "vp_campaigns_public_read" ON public.vp_campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "vp_organizations_public_read" ON public.vp_organizations;
CREATE POLICY "vp_organizations_public_read" ON public.vp_organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "vp_villages_public_read" ON public.vp_villages;
CREATE POLICY "vp_villages_public_read" ON public.vp_villages FOR SELECT USING (true);

DROP POLICY IF EXISTS "vp_commitments_public_read" ON public.vp_commitments;
CREATE POLICY "vp_commitments_public_read" ON public.vp_commitments FOR SELECT USING (true);

DROP POLICY IF EXISTS "vp_field_reports_public_read" ON public.vp_field_reports;
CREATE POLICY "vp_field_reports_public_read" ON public.vp_field_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "vp_transactions_public_read" ON public.vp_transactions;
CREATE POLICY "vp_transactions_public_read" ON public.vp_transactions FOR SELECT USING (true);

-- Volunteers PII: only approved authenticated users can read/write
DROP POLICY IF EXISTS "vp_volunteers_auth_read" ON public.vp_volunteers;
CREATE POLICY "vp_volunteers_auth_read" ON public.vp_volunteers
  FOR SELECT USING (public.vp_current_role() IN ('volunteer', 'dtu_unit', 'commune_youth', 'coordinator', 'admin'));

DROP POLICY IF EXISTS "vp_volunteers_auth_write" ON public.vp_volunteers;
CREATE POLICY "vp_volunteers_auth_write" ON public.vp_volunteers
  FOR ALL USING (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'));

-- Profiles: users read own profile; admin/coordinator read & update all
DROP POLICY IF EXISTS "vp_profiles_read" ON public.vp_profiles;
CREATE POLICY "vp_profiles_read" ON public.vp_profiles
  FOR SELECT USING (id = auth.uid() OR public.vp_current_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "vp_profiles_admin_update" ON public.vp_profiles;
CREATE POLICY "vp_profiles_admin_update" ON public.vp_profiles
  FOR UPDATE USING (public.vp_current_role() IN ('admin', 'coordinator'))
  WITH CHECK (public.vp_current_role() IN ('admin', 'coordinator'));

-- Campaigns: admin/coordinator manage
DROP POLICY IF EXISTS "vp_campaigns_admin_write" ON public.vp_campaigns;
CREATE POLICY "vp_campaigns_admin_write" ON public.vp_campaigns
  FOR ALL USING (public.vp_current_role() IN ('admin', 'coordinator'))
  WITH CHECK (public.vp_current_role() IN ('admin', 'coordinator'));

-- Organizations & Villages: commune_youth, dtu_unit, coordinator, admin
DROP POLICY IF EXISTS "vp_organizations_role_write" ON public.vp_organizations;
CREATE POLICY "vp_organizations_role_write" ON public.vp_organizations
  FOR ALL USING (public.vp_current_role() IN ('commune_youth', 'dtu_unit', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('commune_youth', 'dtu_unit', 'coordinator', 'admin'));

DROP POLICY IF EXISTS "vp_villages_role_write" ON public.vp_villages;
CREATE POLICY "vp_villages_role_write" ON public.vp_villages
  FOR ALL USING (public.vp_current_role() IN ('commune_youth', 'dtu_unit', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('commune_youth', 'dtu_unit', 'coordinator', 'admin'));

-- Commitments: dtu_unit, coordinator, admin
DROP POLICY IF EXISTS "vp_commitments_role_write" ON public.vp_commitments;
CREATE POLICY "vp_commitments_role_write" ON public.vp_commitments
  FOR ALL USING (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'));

-- Field reports: volunteer/dtu_unit insert; commune_youth/coordinator/admin update
DROP POLICY IF EXISTS "vp_field_reports_role_write" ON public.vp_field_reports;
CREATE POLICY "vp_field_reports_role_write" ON public.vp_field_reports
  FOR ALL USING (public.vp_current_role() IN ('volunteer', 'dtu_unit', 'commune_youth', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('volunteer', 'dtu_unit', 'commune_youth', 'coordinator', 'admin'));

-- Transactions: coordinator, admin, dtu_unit
DROP POLICY IF EXISTS "vp_transactions_role_write" ON public.vp_transactions;
CREATE POLICY "vp_transactions_role_write" ON public.vp_transactions
  FOR ALL USING (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'))
  WITH CHECK (public.vp_current_role() IN ('dtu_unit', 'coordinator', 'admin'));

-- 7. Supabase Storage bucket for field evidence photos & receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-evidence', 'field-evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "field_evidence_public_read" ON storage.objects;
CREATE POLICY "field_evidence_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'field-evidence');

DROP POLICY IF EXISTS "field_evidence_auth_upload" ON storage.objects;
CREATE POLICY "field_evidence_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'field-evidence'
    AND auth.role() = 'authenticated'
  );
