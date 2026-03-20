-- Quick Login seed for development/staging only.
-- Creates two fixed Supabase Auth users and matching public.users profiles.
-- Do NOT run this script in production.

DO $$
DECLARE
  admin_auth_id uuid := '7f41f4c8-7b6c-4f1f-9285-0a15de3f7e01';
  staff_auth_id uuid := '2bf454be-7d6f-48c2-a3e1-5a4c9d1e8102';
  seed_now timestamptz := timezone('utc'::text, now());
BEGIN
  UPDATE auth.users
  SET
    aud = 'authenticated',
    role = 'authenticated',
    email = 'admin@taskam.local',
    encrypted_password = '$2b$10$/WcUSwSaKxEp4g4pnidtIO45wsaEQvFqNMlfvZ.k0H1xUqeChZJi.',
    email_confirmed_at = seed_now,
    confirmed_at = seed_now,
    last_sign_in_at = seed_now,
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    raw_user_meta_data = jsonb_build_object('username', 'Admin Test', 'display_name', 'Admin Test'),
    updated_at = seed_now
  WHERE id = admin_auth_id;

  IF NOT FOUND THEN
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      admin_auth_id,
      'authenticated',
      'authenticated',
      'admin@taskam.local',
      '$2b$10$/WcUSwSaKxEp4g4pnidtIO45wsaEQvFqNMlfvZ.k0H1xUqeChZJi.',
      seed_now,
      seed_now,
      seed_now,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('username', 'Admin Test', 'display_name', 'Admin Test'),
      seed_now,
      seed_now
    );
  END IF;

  UPDATE auth.users
  SET
    aud = 'authenticated',
    role = 'authenticated',
    email = 'somchai@taskam.local',
    encrypted_password = '$2b$10$8P9Ypi2eMnULCkusKhQhS.ioSbR2OYw7N1JgZ0.ynEq6Y27GsM/CS',
    email_confirmed_at = seed_now,
    confirmed_at = seed_now,
    last_sign_in_at = seed_now,
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    raw_user_meta_data = jsonb_build_object('username', 'Somchai Test', 'display_name', 'Somchai Test'),
    updated_at = seed_now
  WHERE id = staff_auth_id;

  IF NOT FOUND THEN
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      staff_auth_id,
      'authenticated',
      'authenticated',
      'somchai@taskam.local',
      '$2b$10$8P9Ypi2eMnULCkusKhQhS.ioSbR2OYw7N1JgZ0.ynEq6Y27GsM/CS',
      seed_now,
      seed_now,
      seed_now,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('username', 'Somchai Test', 'display_name', 'Somchai Test'),
      seed_now,
      seed_now
    );
  END IF;

  UPDATE auth.identities
  SET
    identity_data = jsonb_build_object(
      'sub', admin_auth_id::text,
      'email', 'admin@taskam.local',
      'email_verified', true,
      'phone_verified', false
    ),
    updated_at = seed_now,
    last_sign_in_at = seed_now
  WHERE user_id = admin_auth_id AND provider = 'email';

  IF NOT FOUND THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      last_sign_in_at
    )
    VALUES (
      admin_auth_id::text,
      admin_auth_id,
      jsonb_build_object(
        'sub', admin_auth_id::text,
        'email', 'admin@taskam.local',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      seed_now,
      seed_now,
      seed_now
    );
  END IF;

  UPDATE auth.identities
  SET
    identity_data = jsonb_build_object(
      'sub', staff_auth_id::text,
      'email', 'somchai@taskam.local',
      'email_verified', true,
      'phone_verified', false
    ),
    updated_at = seed_now,
    last_sign_in_at = seed_now
  WHERE user_id = staff_auth_id AND provider = 'email';

  IF NOT FOUND THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      last_sign_in_at
    )
    VALUES (
      staff_auth_id::text,
      staff_auth_id,
      jsonb_build_object(
        'sub', staff_auth_id::text,
        'email', 'somchai@taskam.local',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      seed_now,
      seed_now,
      seed_now
    );
  END IF;

  UPDATE public.users
  SET
    username = 'Admin Test',
    email = 'admin@taskam.local',
    auth_id = admin_auth_id::text,
    first_name = 'Admin',
    last_name = 'Test',
    role = 'admin',
    department_id = null,
    position = 'System Administrator'
  WHERE email = 'admin@taskam.local' OR auth_id::text = admin_auth_id::text;

  IF NOT FOUND THEN
    INSERT INTO public.users (
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position
    )
    VALUES (
      'Admin Test',
      'admin@taskam.local',
      admin_auth_id::text,
      'Admin',
      'Test',
      'admin',
      null,
      'System Administrator'
    );
  END IF;

  UPDATE public.users
  SET
    username = 'Somchai Test',
    email = 'somchai@taskam.local',
    auth_id = staff_auth_id::text,
    first_name = 'Somchai',
    last_name = 'Test',
    role = 'staff',
    department_id = null,
    position = 'Staff Test Account'
  WHERE email = 'somchai@taskam.local' OR auth_id::text = staff_auth_id::text;

  IF NOT FOUND THEN
    INSERT INTO public.users (
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position
    )
    VALUES (
      'Somchai Test',
      'somchai@taskam.local',
      staff_auth_id::text,
      'Somchai',
      'Test',
      'staff',
      null,
      'Staff Test Account'
    );
  END IF;
END $$;
