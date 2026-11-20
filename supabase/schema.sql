-- ============================================================================
-- DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- E-COMMERCE & ERP DASHBOARD UMKM: KERIPIK PISANG SALEE
-- PostgreSQL / Supabase
-- ============================================================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. TABEL USERS (Integrasi dengan Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 2. TABEL CATEGORIES (Kategori Produk)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'Tag',
  badge_color TEXT DEFAULT '#F5C84C',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 3. TABEL PRODUCTS (Katalog Produk)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
  weight_grams INTEGER NOT NULL DEFAULT 200,
  image_url TEXT NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.9,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 4. TABEL CUSTOMERS (Data Pelanggan)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 5. TABEL ORDERS (Pesanan Pelanggan)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  notes TEXT,
  subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Transfer Bank', 'COD', 'WhatsApp')),
  status TEXT NOT NULL DEFAULT 'Menunggu Pembayaran' CHECK (
    status IN (
      'Menunggu Pembayaran',
      'Diproses',
      'Dikemas',
      'Dikirim',
      'Selesai',
      'Dibatalkan'
    )
  ),
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 6. TABEL ORDER_ITEMS (Detail Item Pesanan)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 7. TABEL PAYMENTS (Konfirmasi & Riwayat Pembayaran)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  bank_name TEXT,
  account_sender TEXT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Failed', 'Refunded')),
  proof_url TEXT,
  paid_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 8. TABEL STOCK_MOVEMENTS (Riwayat Keluar-Masuk Persediaan)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  previous_stock INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  reference TEXT NOT NULL,
  notes TEXT,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- INDEXES UNTUK PERFORMA QUERY
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_popular ON public.products(is_popular);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- KONFIGURASI KEAMANAN OWNER ADMIN TUNGGAL & VERIFIKASI SUPABASE
-- ============================================================================
-- Tabel konfigurasi Owner (terproteksi RLS penuh, tidak bisa dibaca pelanggan/publik)
CREATE TABLE IF NOT EXISTS public.owner_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_email TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.owner_config ENABLE ROW LEVEL SECURITY;

-- Set email Owner default (dapat diubah kapan saja melalui SQL Editor Supabase)
INSERT INTO public.owner_config (id, owner_email)
VALUES (1, 'fadlirabbani55@gmail.com')
ON CONFLICT (id) DO UPDATE
SET owner_email = EXCLUDED.owner_email,
    updated_at = NOW();

-- Helper internal untuk mengambil email Owner secara aman (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_owner_email()
RETURNS TEXT AS $$
DECLARE
  v_owner_email TEXT;
BEGIN
  SELECT LOWER(owner_email) INTO v_owner_email
  FROM public.owner_config
  WHERE id = 1;
  RETURN COALESCE(v_owner_email, 'fadlirabbani55@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function untuk mengecek apakah user terautentikasi saat ini adalah Owner Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
  v_owner TEXT;
BEGIN
  SELECT LOWER(au.email)
  INTO v_email
  FROM auth.users au
  WHERE au.id = auth.uid();

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  v_owner := public.get_owner_email();

  RETURN (
    v_email = v_owner
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND LOWER(u.email) = v_owner
        AND u.role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC aman untuk memverifikasi hak akses Owner Admin dari aplikasi
CREATE OR REPLACE FUNCTION public.verify_owner_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.verify_owner_admin() TO authenticated;

-- Trigger 1: Mencegah eskalasi role menjadi admin untuk akun selain Owner
CREATE OR REPLACE FUNCTION public.enforce_single_owner_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.email) = public.get_owner_email() THEN
    NEW.role := 'admin';
  ELSE
    NEW.role := 'customer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_single_owner_admin ON public.users;
CREATE TRIGGER trg_enforce_single_owner_admin
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_owner_admin();

-- Trigger 2: Otomatis sinkronisasi user baru dari auth.users ke public.users
-- Pengguna yang mendaftar sendiri selalu mendapatkan role 'customer'
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN LOWER(NEW.email) = public.get_owner_email() THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = CASE
        WHEN LOWER(EXCLUDED.email) = public.get_owner_email() THEN 'admin'
        ELSE 'customer'
      END,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Policies untuk tabel users (Hanya user sendiri yang bisa melihat profilnya, Owner Admin bisa melihat semua)
CREATE POLICY "User lihat profil sendiri atau admin" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "User update profil sendiri tanpa ubah role" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());
-- Policies untuk categories & products (Publik bisa baca, hanya Admin yang bisa tulis)
CREATE POLICY "Categories dapat dilihat publik" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin kelola categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Produk aktif dapat dilihat publik" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin kelola products" ON public.products FOR ALL USING (public.is_admin());
-- Policies untuk customers, orders, order_items, payments (Publik bisa membuat saat checkout, Admin kelola penuh)
CREATE POLICY "Pelanggan dapat membuat profil saat checkout" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Pelanggan dan Admin lihat customer" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Admin update customer" ON public.customers FOR UPDATE USING (public.is_admin());
CREATE POLICY "Pelanggan dapat membuat pesanan" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Pelanggan dan Admin lihat pesanan" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admin kelola pesanan" ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "Pelanggan dapat membuat item pesanan" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Lihat item pesanan" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Pelanggan buat pembayaran" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Lihat pembayaran" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Admin verifikasi pembayaran" ON public.payments FOR UPDATE USING (public.is_admin());
-- Policies untuk stock_movements (Hanya Admin & sistem checkout)
CREATE POLICY "Lihat riwayat stok" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Catat perubahan stok" ON public.stock_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin kelola stok" ON public.stock_movements FOR ALL USING (public.is_admin());
