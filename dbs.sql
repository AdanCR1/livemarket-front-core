-- AUTENTICACION

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.b2b_stores (
  profile_id uuid NOT NULL,
  store_name text NOT NULL UNIQUE,
  business_model USER-DEFINED NOT NULL,
  city_id smallint NOT NULL,
  local_address text,
  logo_url text,
  is_live boolean DEFAULT false,
  CONSTRAINT b2b_stores_pkey PRIMARY KEY (profile_id),
  CONSTRAINT b2b_stores_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT b2b_stores_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.b2c_customers (
  profile_id uuid NOT NULL,
  display_name text,
  CONSTRAINT b2c_customers_pkey PRIMARY KEY (profile_id),
  CONSTRAINT b2c_customers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.departments (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cities (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  department_id smallint NOT NULL,
  name text NOT NULL,
  CONSTRAINT cities_pkey PRIMARY KEY (id),
  CONSTRAINT cities_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- INVENTARIO

CREATE TABLE public.business_model_schemas (
  business_model USER-DEFINED NOT NULL,
  schema jsonb NOT NULL,
  CONSTRAINT business_model_schemas_pkey PRIMARY KEY (business_model)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  business_model USER-DEFINED NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image'::text,
  variant_tag text,
  angle_tag text,
  order smallint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_media_pkey PRIMARY KEY (id),
  CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  is_pinned boolean DEFAULT false,
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT live_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT live_sessions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);