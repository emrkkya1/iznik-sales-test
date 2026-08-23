-- Seed: Root auth users (dev/test only)
-- Creates one root admin and one root staff user with bcrypt-hashed passwords
-- using pgcrypto, matching Supabase Auth's verification. Idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
BEGIN
  -- auth.users rows
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@iznik.test',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      staff_id,
      'authenticated',
      'authenticated',
      'staff@iznik.test',
      crypt('staff123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- auth.identities rows (required for email/password sign-in)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
    (
      gen_random_uuid(),
      admin_id,
      admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@iznik.test'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      staff_id,
      staff_id::text,
      jsonb_build_object('sub', staff_id::text, 'email', 'staff@iznik.test'),
      'email',
      now(),
      now(),
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- public.users profile rows (business identity + role)
  INSERT INTO public.users (id, full_name, username, role, is_active) VALUES
    (admin_id, 'Yönetici', 'admin', 'admin', true),
    (staff_id, 'Personel', 'staff', 'staff', true)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
