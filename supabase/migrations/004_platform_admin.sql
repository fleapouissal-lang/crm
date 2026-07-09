-- Platform administrator role enum value (must be committed before use in policies)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_admin';
