
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff');

-- user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles: add is_active
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Login activity
CREATE TABLE public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

-- Policies: user_roles
CREATE POLICY "users read own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super admin manages roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policies: profiles (add super_admin override)
CREATE POLICY "super admin select all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super admin update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policies: login_activity
CREATE POLICY "user reads own activity"
ON public.login_activity FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user inserts own activity"
ON public.login_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user trigger function: auto first user = super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, company_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'));

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'staff';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
