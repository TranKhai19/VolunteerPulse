-- =============================================================================
-- VolunteerPulse — Phase 2 Operational Stability Migration (Idempotent & Safe)
-- Adds:
--   1. Soft-delete columns (deleted_at) across operational tables
--   2. Audit Log table (vp_audit_logs) tracking who created/updated/deleted what
-- =============================================================================

ALTER TABLE public.vp_villages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vp_commitments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vp_volunteers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vp_field_reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vp_transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.vp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('create', 'update', 'soft_delete', 'approve', 'confirm', 'sync')),
  entity text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vp_audit_logs_created_at ON public.vp_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vp_audit_logs_entity ON public.vp_audit_logs (entity, entity_id);

ALTER TABLE public.vp_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vp_audit_logs_admin_read" ON public.vp_audit_logs;
CREATE POLICY "vp_audit_logs_admin_read" ON public.vp_audit_logs
  FOR SELECT USING (public.vp_current_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "vp_audit_logs_auth_insert" ON public.vp_audit_logs;
CREATE POLICY "vp_audit_logs_auth_insert" ON public.vp_audit_logs
  FOR INSERT WITH CHECK (
    public.vp_current_role() IN ('volunteer', 'dtu_unit', 'commune_youth', 'coordinator', 'admin')
  );
