// ============================================================================
// LAYER DATABASE & STATE ENGINE (SUPABASE + LOCALSTORAGE FALLBACK)
// UMKM Keripik Pisang Salee — 8 Tabel Relasional Konsisten
// Tabel: users, categories, products, customers, orders, order_items, payments, stock_movements
// ============================================================================
(function () {
  const STORAGE_KEY = 'SALEE_FULLSTACK_DB_V2';
  const CART_KEY = 'SALEE_CART_V2';
  const AUTH_KEY = 'SALEE_AUTH_USER_V2';
  const DEFAULT_SUPABASE_URL = 'https://vltzvbcwhbdamixrlfwe.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_1J23UKmozKZK4XYMcXfLzg_e0Uchf1D';
  const DEFAULT_SUPABASE_JWKS_URL = 'https://vltzvbcwhbdamixrlfwe.supabase.co/auth/v1/.well-known/jwks.json';
  if (!localStorage.getItem('SALEE_SUPABASE_URL')) {
    localStorage.setItem('SALEE_SUPABASE_URL', DEFAULT_SUPABASE_URL);
  }
  if (!localStorage.getItem('SALEE_SUPABASE_ANON_KEY')) {
    localStorage.setItem('SALEE_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_KEY);
  }
  let supabaseClient = null;
  try {
    const sbUrl = localStorage.getItem('SALEE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
    const sbKey = localStorage.getItem('SALEE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_KEY;
    if (window.supabase && window.supabase.createClient && sbUrl && sbKey) {
      supabaseClient = window.supabase.createClient(sbUrl, sbKey);
    }
  } catch (err) {
    console.warn('Supabase init warning:', err);
  }
  const SEED_DB = {
    users: [
      {
        id: 'usr-admin-01',
        email: 'admin@pisangsalee.id',
        full_name: 'Budi Santoso (Owner Salee)',
        phone: '081234567890',
        role: 'admin',
        created_at: '2026-01-10T08:00:00Z',
      },
      {
        id: 'usr-staff-02',
        email: 'gudang@pisangsalee.id',
        full_name: 'Siti Rahmawati (Admin Operasional)',
        phone: '081298765432',
        role: 'admin',
        created_at: '2026-02-14T09:00:00Z',
      },
      {
        id: 'usr-cust-01',
        email: 'nadia.putri@gmail.com',
        full_name: 'Nadia Putri Maharani',
        phone: '081345678901',
        role: 'customer',
        created_at: '2026-06-01T10:15:00Z',
      },
    ],
    categories: [
      {
        id: 'cat-original',
        name: 'Keripik Pisang Original',
        slug: 'keripik-pisang-original',
        description: 'Irisan pisang kepok kuning pilihan dengan cita rasa gurih klasik, renyah alami, dan aroma daun jeruk segar.',
        icon: 'sparkles',
        badge_color: '#F5C84C',
        created_at: '2026-01-10T08:00:00Z',
      },
      {
        id: 'cat-manis',
        name: 'Keripik Pisang Manis',
        slug: 'keripik-pisang-manis',
        description: 'Keripik pisang salee dengan karamelisasi madu hutan & gula aren murni yang manis legit khas Nusantara.',
        icon: 'flame',
        badge_color: '#D97706',
        created_at: '2026-01-10T08:00:00Z',
      },
      {
        id: 'cat-cokelat',
        name: 'Keripik Pisang Cokelat',
        slug: 'keripik-pisang-cokelat',
        description: 'Balutan cokelat Belgia lumer dan taburan bubuk kakao premium tebal yang memanjakan pecinta cokelat.',
        icon: 'cookie',
        badge_color: '#633D25',
        created_at: '2026-01-10T08:00:00Z',
      },
      {
        id: 'cat-aneka',
        name: 'Keripik Pisang Aneka Rasa',
        slug: 'keripik-pisang-aneka-rasa',
        description: 'Kreasi rasa modern favorit keluarga: Matcha Uji Jepang, Keju Cheddar Lumer, hingga Balado Daun Jeruk.',
        icon: 'leaf',
        badge_color: '#557447',
        created_at: '2026-01-10T08:00:00Z',
      },
    ],
    products: [
      {
        id: 'prd-01',
        category_id: 'cat-original',
        sku: 'SALEE-ORG-001',
        name: 'Salee Klasik Gurih Mentega',
        slug: 'salee-klasik-gurih-mentega',
        description: 'Irisan tipis pisang kepok kuning matang pohon yang digoreng dengan minyak kelapa murni dan sentuhan mentega premium. Gurih, renyah, dan bebas kolesterol.',
        price: 18000,
        cost_price: 11000,
        stock: 48,
        min_stock: 15,
        weight_grams: 200,
        image_url: './assets/images/salee-klasik-gurih.jpg',
        is_popular: true,
        is_active: true,
        rating: 4.9,
        sold_count: 342,
        created_at: '2026-01-12T08:00:00Z',
      },
      {
        id: 'prd-02',
        category_id: 'cat-manis',
        sku: 'SALEE-MNS-002',
        name: 'Salee Madu Karamel Panggang',
        slug: 'salee-madu-karamel-panggang',
        description: 'Best seller sepanjang masa! Pisang disalai terlebih dahulu hingga berkaramel alami, lalu dibalut madu hutan asli Nusantara yang manis harum menggoda.',
        price: 22000,
        cost_price: 13500,
        stock: 36,
        min_stock: 15,
        weight_grams: 220,
        image_url: './assets/images/salee-madu-karamel.jpg',
        is_popular: true,
        is_active: true,
        rating: 5.0,
        sold_count: 518,
        created_at: '2026-01-12T08:30:00Z',
      },
      {
        id: 'prd-03',
        category_id: 'cat-cokelat',
        sku: 'SALEE-COK-003',
        name: 'Salee Choco Melt Belgia',
        slug: 'salee-choco-melt-belgia',
        description: 'Keripik pisang bergelombang ekstra renyah dengan siraman saus dark chocolate Belgia lumer yang tebal dan tidak pahit. Favorit anak muda & keluarga!',
        price: 26000,
        cost_price: 16000,
        stock: 8,
        min_stock: 15,
        weight_grams: 250,
        image_url: './assets/images/salee-choco-melt.jpg',
        is_popular: true,
        is_active: true,
        rating: 4.9,
        sold_count: 465,
        created_at: '2026-01-15T10:00:00Z',
      },
      {
        id: 'prd-04',
        category_id: 'cat-aneka',
        sku: 'SALEE-ANK-004',
        name: 'Salee Matcha Uji Glaze',
        slug: 'salee-matcha-uji-glaze',
        description: 'Perpaduan unik renyahnya keripik pisang tropis dengan lapisan krim teh hijau Matcha Uji Jepang asli yang creamy, wangi, dan lembut di mulut.',
        price: 27000,
        cost_price: 16500,
        stock: 29,
        min_stock: 12,
        weight_grams: 250,
        image_url: './assets/images/salee-matcha-uji.jpg',
        is_popular: true,
        is_active: true,
        rating: 4.8,
        sold_count: 275,
        created_at: '2026-02-01T08:00:00Z',
      },
      {
        id: 'prd-05',
        category_id: 'cat-manis',
        sku: 'SALEE-MNS-005',
        name: 'Salee Gula Aren Asap Tradisional',
        slug: 'salee-gula-aren-asap-tradisional',
        description: 'Diolah dengan resep warisan keluarga menggunakan gula aren organik pilihan dan proses pengasapan alami yang menghasilkan aroma smoky manis khas.',
        price: 20000,
        cost_price: 12000,
        stock: 42,
        min_stock: 15,
        weight_grams: 200,
        image_url: './assets/images/salee-gula-aren.jpg',
        is_popular: false,
        is_active: true,
        rating: 4.8,
        sold_count: 198,
        created_at: '2026-02-10T08:00:00Z',
      },
      {
        id: 'prd-06',
        category_id: 'cat-cokelat',
        sku: 'SALEE-COK-006',
        name: 'Salee Tiramisu Espresso Crunch',
        slug: 'salee-tiramisu-espresso-crunch',
        description: 'Sensasi mewah taburan bubuk cokelat tiramisu Italia dan aroma kopi arabika Nusantara di setiap gigitan keripik pisang salee.',
        price: 28000,
        cost_price: 17000,
        stock: 6,
        min_stock: 12,
        weight_grams: 250,
        image_url: './assets/images/salee-tiramisu-espresso.jpg',
        is_popular: true,
        is_active: true,
        rating: 4.9,
        sold_count: 230,
        created_at: '2026-02-18T08:00:00Z',
      },
      {
        id: 'prd-07',
        category_id: 'cat-aneka',
        sku: 'SALEE-ANK-007',
        name: 'Salee Keju Cheddar Susu Lumer',
        slug: 'salee-keju-cheddar-susu-lumer',
        description: 'Taburan bumbu keju cheddar asli berpadu dengan krim susu full cream yang gurih manis. Cocok untuk teman minum teh dan hampers oleh-oleh.',
        price: 25000,
        cost_price: 15000,
        stock: 31,
        min_stock: 12,
        weight_grams: 220,
        image_url: './assets/images/salee-keju-cheddar.jpg',
        is_popular: false,
        is_active: true,
        rating: 4.8,
        sold_count: 184,
        created_at: '2026-03-01T08:00:00Z',
      },
      {
        id: 'prd-08',
        category_id: 'cat-original',
        sku: 'SALEE-ORG-008',
        name: 'Salee Bawang Daun Jeruk Wangi',
        slug: 'salee-bawang-daun-jeruk-wangi',
        description: 'Varian asin gurih dengan irisan daun jeruk purut segar dan bawang putih goreng renyah. Harum semerbak saat kemasan dibuka!',
        price: 19000,
        cost_price: 11500,
        stock: 24,
        min_stock: 10,
        weight_grams: 200,
        image_url: './assets/images/salee-bawang-daun-jeruk.jpg',
        is_popular: false,
        is_active: true,
        rating: 4.7,
        sold_count: 156,
        created_at: '2026-03-12T08:00:00Z',
      },
    ],
    customers: [
      {
        id: 'cst-01',
        user_id: 'usr-cust-01',
        name: 'Nadia Putri Maharani',
        whatsapp: '081345678901',
        email: 'nadia.putri@gmail.com',
        address: 'Jl. Dago Asri No. 42, Kec. Coblong, Kota Bandung, Jawa Barat 40135',
        city: 'Bandung',
        total_orders: 2,
        total_spent: 286000,
        last_order_at: '2026-11-17T14:20:00Z',
        created_at: '2026-08-12T09:00:00Z',
      },
      {
        id: 'cst-02',
        user_id: null,
        name: 'Rizky Pratama Wijaya',
        whatsapp: '081287654321',
        email: 'rizky.wijaya@yahoo.com',
        address: 'Perumahan Griya Melati Blok C4 No. 12, Sleman, DI Yogyakarta 55281',
        city: 'Yogyakarta',
        total_orders: 1,
        total_spent: 194000,
        last_order_at: '2026-11-15T13:40:00Z',
        created_at: '2026-09-04T11:30:00Z',
      },
      {
        id: 'cst-03',
        user_id: null,
        name: 'Dewi Lestari Anggraini',
        whatsapp: '085712349876',
        email: 'dewi.lestari@gmail.com',
        address: 'Jl. Kemang Raya No. 88B, Mampang Prapatan, Jakarta Selatan 12730',
        city: 'Jakarta Selatan',
        total_orders: 2,
        total_spent: 317000,
        last_order_at: '2026-11-18T08:45:00Z',
        created_at: '2026-09-19T15:20:00Z',
      },
      {
        id: 'cst-04',
        user_id: null,
        name: 'Hendra Gunawan',
        whatsapp: '082133445566',
        email: 'hendra.g@gmail.com',
        address: 'Jl. Diponegoro No. 115, Tegalsari, Kota Surabaya, Jawa Timur 60264',
        city: 'Surabaya',
        total_orders: 1,
        total_spent: 152000,
        last_order_at: '2026-11-14T16:05:00Z',
        created_at: '2026-10-02T13:10:00Z',
      },
      {
        id: 'cst-05',
        user_id: null,
        name: 'Amelia Kusuma Wardhani',
        whatsapp: '081908765432',
        email: 'amelia.kw@gmail.com',
        address: 'Jl. Pandanaran No. 56, Semarang Tengah, Kota Semarang 50134',
        city: 'Semarang',
        total_orders: 1,
        total_spent: 119000,
        last_order_at: '2026-11-18T09:30:00Z',
        created_at: '2026-11-01T10:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord-01',
        order_number: 'INV-SALEE-261112-001',
        customer_id: 'cst-01',
        customer_name: 'Nadia Putri Maharani',
        customer_whatsapp: '081345678901',
        shipping_address: 'Jl. Dago Asri No. 42, Kec. Coblong, Kota Bandung, Jawa Barat 40135',
        notes: 'Tolong bubble wrap agak tebal ya kak untuk oleh-oleh.',
        subtotal: 120000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 132000,
        payment_method: 'Transfer Bank',
        status: 'Selesai',
        stock_deducted: true,
        created_at: '2026-11-12T10:15:00Z',
        updated_at: '2026-11-13T16:30:00Z',
      },
      {
        id: 'ord-02',
        order_number: 'INV-SALEE-261114-002',
        customer_id: 'cst-04',
        customer_name: 'Hendra Gunawan',
        customer_whatsapp: '082133445566',
        shipping_address: 'Jl. Diponegoro No. 115, Tegalsari, Kota Surabaya, Jawa Timur 60264',
        notes: 'Kirim jam kerja kantor.',
        subtotal: 140000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 152000,
        payment_method: 'Transfer Bank',
        status: 'Selesai',
        stock_deducted: true,
        created_at: '2026-11-14T16:05:00Z',
        updated_at: '2026-11-16T11:00:00Z',
      },
      {
        id: 'ord-03',
        order_number: 'INV-SALEE-261115-003',
        customer_id: 'cst-02',
        customer_name: 'Rizky Pratama Wijaya',
        customer_whatsapp: '081287654321',
        shipping_address: 'Perumahan Griya Melati Blok C4 No. 12, Sleman, DI Yogyakarta 55281',
        notes: 'Titip di pos satpam jika rumah kosong.',
        subtotal: 182000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 194000,
        payment_method: 'COD',
        status: 'Selesai',
        stock_deducted: true,
        created_at: '2026-11-15T13:40:00Z',
        updated_at: '2026-11-17T09:20:00Z',
      },
      {
        id: 'ord-04',
        order_number: 'INV-SALEE-261116-004',
        customer_id: 'cst-03',
        customer_name: 'Dewi Lestari Anggraini',
        customer_whatsapp: '085712349876',
        shipping_address: 'Jl. Kemang Raya No. 88B, Mampang Prapatan, Jakarta Selatan 12730',
        notes: 'Sertakan kartu ucapan selamat ulang tahun.',
        subtotal: 198000,
        shipping_cost: 0,
        discount_amount: 0,
        total_amount: 198000,
        payment_method: 'Transfer Bank',
        status: 'Dikirim',
        stock_deducted: true,
        created_at: '2026-11-16T14:20:00Z',
        updated_at: '2026-11-17T10:00:00Z',
      },
      {
        id: 'ord-05',
        order_number: 'INV-SALEE-261117-005',
        customer_id: 'cst-01',
        customer_name: 'Nadia Putri Maharani',
        customer_whatsapp: '081345678901',
        shipping_address: 'Jl. Dago Asri No. 42, Kec. Coblong, Kota Bandung, Jawa Barat 40135',
        notes: 'Repeat order karena anak-anak suka banget yang Choco Melt!',
        subtotal: 142000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 154000,
        payment_method: 'Transfer Bank',
        status: 'Dikemas',
        stock_deducted: true,
        created_at: '2026-11-17T14:20:00Z',
        updated_at: '2026-11-17T17:10:00Z',
      },
      {
        id: 'ord-06',
        order_number: 'INV-SALEE-261118-006',
        customer_id: 'cst-03',
        customer_name: 'Dewi Lestari Anggraini',
        customer_whatsapp: '085712349876',
        shipping_address: 'Jl. Kemang Raya No. 88B, Mampang Prapatan, Jakarta Selatan 12730',
        notes: 'Pesanan tambahan untuk acara arisan.',
        subtotal: 107000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 119000,
        payment_method: 'WhatsApp',
        status: 'Diproses',
        stock_deducted: true,
        created_at: '2026-11-18T08:45:00Z',
        updated_at: '2026-11-18T09:00:00Z',
      },
      {
        id: 'ord-07',
        order_number: 'INV-SALEE-261118-007',
        customer_id: 'cst-05',
        customer_name: 'Amelia Kusuma Wardhani',
        customer_whatsapp: '081908765432',
        shipping_address: 'Jl. Pandanaran No. 56, Semarang Tengah, Kota Semarang 50134',
        notes: 'Mohon segera diproses ya kak, siap transfer BCA.',
        subtotal: 107000,
        shipping_cost: 12000,
        discount_amount: 0,
        total_amount: 119000,
        payment_method: 'Transfer Bank',
        status: 'Menunggu Pembayaran',
        stock_deducted: false,
        created_at: '2026-11-18T09:30:00Z',
        updated_at: '2026-11-18T09:30:00Z',
      },
    ],
    order_items: [
      { id: 'oi-01', order_id: 'ord-01', product_id: 'prd-02', product_name: 'Salee Madu Karamel Panggang', product_image: './assets/images/salee-madu-karamel.jpg', unit_price: 22000, quantity: 3, subtotal: 66000, created_at: '2026-11-12T10:15:00Z' },
      { id: 'oi-02', order_id: 'ord-01', product_id: 'prd-04', product_name: 'Salee Matcha Uji Glaze', product_image: './assets/images/salee-matcha-uji.jpg', unit_price: 27000, quantity: 2, subtotal: 54000, created_at: '2026-11-12T10:15:00Z' },
      { id: 'oi-03', order_id: 'ord-02', product_id: 'prd-03', product_name: 'Salee Choco Melt Belgia', product_image: './assets/images/salee-choco-melt.jpg', unit_price: 26000, quantity: 4, subtotal: 104000, created_at: '2026-11-14T16:05:00Z' },
      { id: 'oi-04', order_id: 'ord-02', product_id: 'prd-01', product_name: 'Salee Klasik Gurih Mentega', product_image: './assets/images/salee-klasik-gurih.jpg', unit_price: 18000, quantity: 2, subtotal: 36000, created_at: '2026-11-14T16:05:00Z' },
      { id: 'oi-05', order_id: 'ord-03', product_id: 'prd-02', product_name: 'Salee Madu Karamel Panggang', product_image: './assets/images/salee-madu-karamel.jpg', unit_price: 22000, quantity: 4, subtotal: 88000, created_at: '2026-11-15T13:40:00Z' },
      { id: 'oi-06', order_id: 'ord-03', product_id: 'prd-06', product_name: 'Salee Tiramisu Espresso Crunch', product_image: './assets/images/salee-tiramisu-espresso.jpg', unit_price: 28000, quantity: 2, subtotal: 56000, created_at: '2026-11-15T13:40:00Z' },
      { id: 'oi-07', order_id: 'ord-03', product_id: 'prd-08', product_name: 'Salee Bawang Daun Jeruk Wangi', product_image: './assets/images/salee-bawang-daun-jeruk.jpg', unit_price: 19000, quantity: 2, subtotal: 38000, created_at: '2026-11-15T13:40:00Z' },
      { id: 'oi-08', order_id: 'ord-04', product_id: 'prd-03', product_name: 'Salee Choco Melt Belgia', product_image: './assets/images/salee-choco-melt.jpg', unit_price: 26000, quantity: 3, subtotal: 78000, created_at: '2026-11-16T14:20:00Z' },
      { id: 'oi-09', order_id: 'ord-04', product_id: 'prd-05', product_name: 'Salee Gula Aren Asap Tradisional', product_image: './assets/images/salee-gula-aren.jpg', unit_price: 20000, quantity: 3, subtotal: 60000, created_at: '2026-11-16T14:20:00Z' },
      { id: 'oi-10', order_id: 'ord-04', product_id: 'prd-07', product_name: 'Salee Keju Cheddar Susu Lumer', product_image: './assets/images/salee-keju-cheddar.jpg', unit_price: 25000, quantity: 2, subtotal: 50000, created_at: '2026-11-16T14:20:00Z' },
      { id: 'oi-11', order_id: 'ord-05', product_id: 'prd-03', product_name: 'Salee Choco Melt Belgia', product_image: './assets/images/salee-choco-melt.jpg', unit_price: 26000, quantity: 3, subtotal: 78000, created_at: '2026-11-17T14:20:00Z' },
      { id: 'oi-12', order_id: 'ord-05', product_id: 'prd-01', product_name: 'Salee Klasik Gurih Mentega', product_image: './assets/images/salee-klasik-gurih.jpg', unit_price: 18000, quantity: 2, subtotal: 36000, created_at: '2026-11-17T14:20:00Z' },
      { id: 'oi-13', order_id: 'ord-05', product_id: 'prd-06', product_name: 'Salee Tiramisu Espresso Crunch', product_image: './assets/images/salee-tiramisu-espresso.jpg', unit_price: 28000, quantity: 1, subtotal: 28000, created_at: '2026-11-17T14:20:00Z' },
      { id: 'oi-14', order_id: 'ord-06', product_id: 'prd-02', product_name: 'Salee Madu Karamel Panggang', product_image: './assets/images/salee-madu-karamel.jpg', unit_price: 22000, quantity: 2, subtotal: 44000, created_at: '2026-11-18T08:45:00Z' },
      { id: 'oi-15', order_id: 'ord-06', product_id: 'prd-04', product_name: 'Salee Matcha Uji Glaze', product_image: './assets/images/salee-matcha-uji.jpg', unit_price: 27000, quantity: 1, subtotal: 27000, created_at: '2026-11-18T08:45:00Z' },
      { id: 'oi-16', order_id: 'ord-06', product_id: 'prd-01', product_name: 'Salee Klasik Gurih Mentega', product_image: './assets/images/salee-klasik-gurih.jpg', unit_price: 18000, quantity: 2, subtotal: 36000, created_at: '2026-11-18T08:45:00Z' },
      { id: 'oi-17', order_id: 'ord-07', product_id: 'prd-04', product_name: 'Salee Matcha Uji Glaze', product_image: './assets/images/salee-matcha-uji.jpg', unit_price: 27000, quantity: 2, subtotal: 54000, created_at: '2026-11-18T09:30:00Z' },
      { id: 'oi-18', order_id: 'ord-07', product_id: 'prd-06', product_name: 'Salee Tiramisu Espresso Crunch', product_image: './assets/images/salee-tiramisu-espresso.jpg', unit_price: 28000, quantity: 1, subtotal: 28000, created_at: '2026-11-18T09:30:00Z' },
      { id: 'oi-19', order_id: 'ord-07', product_id: 'prd-07', product_name: 'Salee Keju Cheddar Susu Lumer', product_image: './assets/images/salee-keju-cheddar.jpg', unit_price: 25000, quantity: 1, subtotal: 25000, created_at: '2026-11-18T09:30:00Z' },
    ],
    payments: [
      { id: 'pay-01', order_id: 'ord-01', payment_method: 'Transfer Bank', bank_name: 'Bank BCA', account_sender: 'Nadia Putri M', amount: 132000, status: 'Verified', paid_at: '2026-11-12T10:30:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-12T10:15:00Z' },
      { id: 'pay-02', order_id: 'ord-02', payment_method: 'Transfer Bank', bank_name: 'Bank Mandiri', account_sender: 'Hendra Gunawan', amount: 152000, status: 'Verified', paid_at: '2026-11-14T16:25:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-14T16:05:00Z' },
      { id: 'pay-03', order_id: 'ord-03', payment_method: 'COD', bank_name: '-', account_sender: 'Rizky Pratama', amount: 194000, status: 'Verified', paid_at: '2026-11-17T09:20:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-15T13:40:00Z' },
      { id: 'pay-04', order_id: 'ord-04', payment_method: 'Transfer Bank', bank_name: 'Bank BCA', account_sender: 'Dewi Lestari', amount: 198000, status: 'Verified', paid_at: '2026-11-16T14:50:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-16T14:20:00Z' },
      { id: 'pay-05', order_id: 'ord-05', payment_method: 'Transfer Bank', bank_name: 'Bank BRI', account_sender: 'Nadia Putri M', amount: 154000, status: 'Verified', paid_at: '2026-11-17T14:40:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-17T14:20:00Z' },
      { id: 'pay-06', order_id: 'ord-06', payment_method: 'WhatsApp', bank_name: 'QRIS / WA', account_sender: 'Dewi Lestari', amount: 119000, status: 'Verified', paid_at: '2026-11-18T09:00:00Z', verified_by: 'usr-admin-01', created_at: '2026-11-18T08:45:00Z' },
      { id: 'pay-07', order_id: 'ord-07', payment_method: 'Transfer Bank', bank_name: 'Bank BCA', account_sender: 'Amelia Kusuma', amount: 119000, status: 'Pending', paid_at: null, verified_by: null, created_at: '2026-11-18T09:30:00Z' },
    ],
    stock_movements: [
      { id: 'stm-01', product_id: 'prd-02', order_id: null, type: 'in', quantity: 50, previous_stock: 10, current_stock: 60, reference: 'BATCH-PROD-261110', notes: 'Produksi dapur utama batch pagi (50 pouch)', created_by: 'Siti Rahmawati (Admin Operasional)', created_at: '2026-11-10T08:00:00Z' },
      { id: 'stm-02', product_id: 'prd-03', order_id: 'ord-04', type: 'out', quantity: 3, previous_stock: 14, current_stock: 11, reference: 'INV-SALEE-261116-004', notes: 'Pengurangan stok otomatis dari pesanan Dewi Lestari', created_by: 'Sistem Otomatis', created_at: '2026-11-16T14:50:00Z' },
      { id: 'stm-03', product_id: 'prd-03', order_id: 'ord-05', type: 'out', quantity: 3, previous_stock: 11, current_stock: 8, reference: 'INV-SALEE-261117-005', notes: 'Pengurangan stok otomatis dari pesanan Nadia Putri', created_by: 'Sistem Otomatis', created_at: '2026-11-17T14:40:00Z' },
      { id: 'stm-04', product_id: 'prd-06', order_id: 'ord-05', type: 'out', quantity: 1, previous_stock: 7, current_stock: 6, reference: 'INV-SALEE-261117-005', notes: 'Pengurangan stok otomatis dari pesanan Nadia Putri', created_by: 'Sistem Otomatis', created_at: '2026-11-17T14:40:00Z' },
      { id: 'stm-05', product_id: 'prd-01', order_id: null, type: 'in', quantity: 30, previous_stock: 20, current_stock: 50, reference: 'BATCH-PROD-261117', notes: 'Restock produksi Salee Klasik Gurih Mentega', created_by: 'Budi Santoso (Owner Salee)', created_at: '2026-11-17T16:00:00Z' },
      { id: 'stm-06', product_id: 'prd-02', order_id: 'ord-06', type: 'out', quantity: 2, previous_stock: 38, current_stock: 36, reference: 'INV-SALEE-261118-006', notes: 'Pengurangan stok otomatis saat pesanan diproses', created_by: 'Sistem Otomatis', created_at: '2026-11-18T09:00:00Z' },
    ],
    contact_messages: [
      { id: 'msg-01', name: 'Andi Saputra', whatsapp: '081299887766', subject: 'Kemitraan Reseller Bandung', message: 'Halo kak, apakah bisa daftar jadi reseller resmi Keripik Pisang Salee untuk area Bandung?', created_at: '2026-11-17T11:20:00Z' },
    ],
    settings: {
      store_name: 'Keripik Pisang Salee',
      tagline: 'Renyah Tropis Nusantara, Manis Alami Tanpa Pengawet',
      whatsapp: '6281234567890',
      email: 'halo@pisangsalee.id',
      address: 'Jl. Raya Kebun Pisang No. 88, Kec. Natar, Lampung Selatan, Indonesia 35362',
      instagram: '@keripikpisangsalee.id',
      tiktok: '@pisangsalee.official',
      bank_name: 'Bank BCA',
      bank_account: '8420-9918-27',
      bank_holder: 'CV Keripik Pisang Salee Nusantara',
      default_shipping: 12000,
      free_shipping_threshold: 150000,
      default_min_stock: 12,
      cod_enabled: true,
    },
  };
  const PRODUCT_IMAGE_MAP = {
    'prd-01': './assets/images/salee-klasik-gurih.jpg',
    'prd-02': './assets/images/salee-madu-karamel.jpg',
    'prd-03': './assets/images/salee-choco-melt.jpg',
    'prd-04': './assets/images/salee-matcha-uji.jpg',
    'prd-05': './assets/images/salee-gula-aren.jpg',
    'prd-06': './assets/images/salee-tiramisu-espresso.jpg',
    'prd-07': './assets/images/salee-keju-cheddar.jpg',
    'prd-08': './assets/images/salee-bawang-daun-jeruk.jpg',
  };
  function cloneSeed() {
    return JSON.parse(JSON.stringify(SEED_DB));
  }
  function loadDB() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
          let migrated = false;
          parsed.products.forEach((p) => {
            if (PRODUCT_IMAGE_MAP[p.id] && (!p.image_url || p.image_url.includes('unsplash.com'))) {
              p.image_url = PRODUCT_IMAGE_MAP[p.id];
              migrated = true;
            }
          });
          if (Array.isArray(parsed.order_items)) {
            parsed.order_items.forEach((oi) => {
              if (
                PRODUCT_IMAGE_MAP[oi.product_id] &&
                (!oi.product_image || oi.product_image.includes('unsplash.com'))
              ) {
                oi.product_image = PRODUCT_IMAGE_MAP[oi.product_id];
                migrated = true;
              }
            });
          }
          if (migrated) {
            saveDB(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gagal memuat localStorage DB, menggunakan seed data:', err);
    }
    const fresh = cloneSeed();
    saveDB(fresh);
    return fresh;
  }
  function saveDB(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('Gagal menyimpan DB ke localStorage:', err);
    }
  }
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn(err);
    }
    return [];
  }
  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn(err);
    }
  }
  function loadAuthUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn(err);
    }
    return null;
  }
  function saveAuthUser(user) {
    try {
      if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_KEY);
    } catch (err) {
      console.warn(err);
    }
  }
  async function syncCheckoutToSupabase(payload) {
    if (!supabaseClient) {
      return { ok: false, error: 'Klien Supabase belum terinisialisasi.' };
    }
    try {
      const { customer, order, items, payment } = payload;

      // 1. Cari atau buat data pembeli di tabel customers
      let sbCustomerId = null;
      const { data: existingCust } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('whatsapp', customer.whatsapp)
        .limit(1);

      if (existingCust && existingCust.length > 0) {
        sbCustomerId = existingCust[0].id;
      } else {
        const { data: insertedCust, error: custErr } = await supabaseClient
          .from('customers')
          .insert({
            name: customer.name,
            whatsapp: customer.whatsapp,
            email: customer.email || null,
            address: customer.address,
            city: customer.city || null,
            total_orders: customer.total_orders || 1,
            total_spent: customer.total_spent || order.total_amount,
            last_order_at: order.created_at,
          })
          .select('id')
          .single();

        if (custErr) {
          return { ok: false, error: 'customers: ' + custErr.message };
        }
        sbCustomerId = insertedCust.id;
      }

      // 2. Simpan pesanan utama ke tabel orders
      const { data: insertedOrder, error: orderErr } = await supabaseClient
        .from('orders')
        .insert({
          order_number: order.order_number,
          customer_id: sbCustomerId,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
          shipping_address: order.shipping_address,
          notes: order.notes || null,
          subtotal: order.subtotal,
          shipping_cost: order.shipping_cost,
          discount_amount: order.discount_amount || 0,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          status: order.status,
          stock_deducted: Boolean(order.stock_deducted),
        })
        .select('id, order_number')
        .single();

      if (orderErr) {
        return { ok: false, error: 'orders: ' + orderErr.message };
      }

      // 3. Cocokkan SKU produk dengan UUID di tabel products Supabase (jika sudah di-seed)
      const skuToUuid = {};
      const skus = items.map((i) => i.product && i.product.sku).filter(Boolean);
      if (skus.length > 0) {
        const { data: sbProds } = await supabaseClient
          .from('products')
          .select('id, sku')
          .in('sku', skus);
        if (Array.isArray(sbProds)) {
          sbProds.forEach((sp) => {
            skuToUuid[sp.sku] = sp.id;
          });
        }
      }

      // 4. Simpan seluruh daftar produk yang dibeli ke tabel order_items
      const orderItemsRows = items.map((item) => ({
        order_id: insertedOrder.id,
        product_id: (item.product && skuToUuid[item.product.sku]) || null,
        product_name: item.product ? item.product.name : item.product_name,
        product_image: item.product ? item.product.image_url : item.product_image || null,
        unit_price: item.product ? item.product.price : item.unit_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      const { error: itemsErr } = await supabaseClient
        .from('order_items')
        .insert(orderItemsRows);

      if (itemsErr) {
        return { ok: false, error: 'order_items: ' + itemsErr.message };
      }

      // 5. Simpan data pembayaran ke tabel payments (opsional / non-blocking)
      if (payment) {
        await supabaseClient.from('payments').insert({
          order_id: insertedOrder.id,
          payment_method: payment.payment_method,
          bank_name: payment.bank_name || null,
          account_sender: payment.account_sender || order.customer_name,
          amount: payment.amount,
          status: payment.status || 'Pending',
          paid_at: payment.paid_at || null,
        });
      }

      return { ok: true, orderId: insertedOrder.id, orderNumber: insertedOrder.order_number };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  }
  async function verifyOwnerAdminViaSupabase(email, password) {
    if (!supabaseClient) {
      return { ok: false, error: 'Klien Supabase belum terinisialisasi.' };
    }
    try {
      const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || ''),
      });
      if (authErr || !authData || !authData.user) {
        return {
          ok: false,
          error: (authErr && authErr.message) || 'Email atau password tidak valid.',
        };
      }
      const { data: isOwnerAdmin, error: rpcErr } = await supabaseClient.rpc('verify_owner_admin');
      if (rpcErr) {
        await supabaseClient.auth.signOut();
        return {
          ok: false,
          error: 'Verifikasi admin gagal di Supabase: ' + rpcErr.message,
        };
      }
      if (!isOwnerAdmin) {
        await supabaseClient.auth.signOut();
        return {
          ok: false,
          error: 'Akses ditolak. Akun ini tidak memiliki hak akses Admin.',
        };
      }
      return {
        ok: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name:
            (authData.user.user_metadata && authData.user.user_metadata.full_name) ||
            'Owner Keripik Pisang Salee',
          phone: (authData.user.user_metadata && authData.user.user_metadata.phone) || '',
          role: 'admin',
          supabaseVerified: true,
        },
      };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  }
  async function checkCurrentAdminSession() {
    if (!supabaseClient) return false;
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      if (!sessionData || !sessionData.session) return false;
      const { data: isOwnerAdmin, error } = await supabaseClient.rpc('verify_owner_admin');
      return !error && isOwnerAdmin === true;
    } catch {
      return false;
    }
  }
  async function signOutSupabase() {
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut warning:', err);
    }
  }
  window.SaleeDB = {
    STORAGE_KEY,
    DEFAULT_SUPABASE_URL,
    DEFAULT_SUPABASE_KEY,
    DEFAULT_SUPABASE_JWKS_URL,
    supabaseClient,
    SEED_DB,
    loadDB,
    saveDB,
    loadCart,
    saveCart,
    loadAuthUser,
    saveAuthUser,
    syncCheckoutToSupabase,
    verifyOwnerAdminViaSupabase,
    checkCurrentAdminSession,
    signOutSupabase,
    resetToSeed: function () {
      const fresh = cloneSeed();
      saveDB(fresh);
      saveCart([]);
      return fresh;
    },
  };
})();
