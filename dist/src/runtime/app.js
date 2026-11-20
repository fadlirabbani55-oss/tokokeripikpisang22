(function () {
    const state = {
        db: window.SaleeDB.loadDB(),
        cart: window.SaleeDB.loadCart(),
        currentUser: window.SaleeDB.loadAuthUser(),
        viewMode: 'store', // 'store' | 'owner-login' | 'admin'
        adminTab: 'dashboard', // 'dashboard' | 'products' | 'categories' | 'stock' | 'orders' | 'customers' | 'reports' | 'settings'
        mobileMenuOpen: false,
        adminSidebarOpen: false,
        selectedCategory: 'ALL',
        searchQuery: '',
        sortBy: 'popular', // 'popular' | 'price_asc' | 'price_desc' | 'stock_desc'
        cartDrawerOpen: false,
        detailProductId: null,
        detailQty: 1,
        checkoutOpen: false,
        isSubmittingOrder: false,
        checkoutForm: {
            customerName: '',
            customerWhatsapp: '',
            province: '',
            city: '',
            district: '',
            village: '',
            streetAddress: '',
            postalCode: '',
            notes: '',
            paymentMethod: 'Transfer Bank',
        },
        orderSuccessData: null,
        customerOrderDetailId: null,
        authModalOpen: false,
        authMode: 'login', // 'login' | 'register'
        showOwnerPassword: false,
        adminLoginLoading: false,
        adminLoginError: '',
        chartPeriod: 'daily', // 'daily' | 'monthly'
        adminProductSearch: '',
        adminProductCatFilter: 'ALL',
        productModalOpen: false,
        editingProduct: null,
        categoryModalOpen: false,
        editingCategory: null,
        stockModalOpen: false,
        stockFormPresetProductId: '',
        stockFilterType: 'ALL',
        adminOrderStatusFilter: 'ALL',
        adminOrderSearch: '',
        selectedOrderDetailId: null,
        selectedCustomerHistoryId: null,
        reportStartDate: '2026-11-01',
        reportEndDate: '2026-11-30',
        sqlModalOpen: false,
    };
    const INDONESIA_PROVINCES = [
        'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
        'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung',
        'DKI Jakarta', 'Banten', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
        'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
        'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
        'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
        'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan', 'Papua Barat Daya',
    ];
    const PRESET_PRODUCT_PHOTOS = [
        { label: 'Pisang Salee Klasik', url: './assets/images/salee-klasik-gurih.jpg' },
        { label: 'Pisang Karamel Madu', url: './assets/images/salee-madu-karamel.jpg' },
        { label: 'Choco Melt Belgia', url: './assets/images/salee-choco-melt.jpg' },
        { label: 'Matcha Uji Glaze', url: './assets/images/salee-matcha-uji.jpg' },
        { label: 'Gula Aren Tradisional', url: './assets/images/salee-gula-aren.jpg' },
        { label: 'Tiramisu Crunch', url: './assets/images/salee-tiramisu-espresso.jpg' },
        { label: 'Keju Cheddar Susu', url: './assets/images/salee-keju-cheddar.jpg' },
        { label: 'Daun Jeruk Gurih', url: './assets/images/salee-bawang-daun-jeruk.jpg' },
    ];
    function formatRp(num) {
        const n = Number(num) || 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(n);
    }
    function formatDateID(isoString, includeTime = true) {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            const opts = {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            };
            if (includeTime) {
                opts.hour = '2-digit';
                opts.minute = '2-digit';
            }
            return d.toLocaleDateString('id-ID', opts);
        } catch (e) {
            return isoString;
        }
    }
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function getCategoryById(catId) {
        return (
            state.db.categories.find((c) => c.id === catId) || {
                id: 'unknown',
                name: 'Umum',
                badge_color: '#F5C84C',
            }
        );
    }
    function getProductById(prodId) {
        return state.db.products.find((p) => p.id === prodId) || null;
    }
    function getShippingInfo(province, subtotal) {
        const freeThreshold = Number(state.db.settings.free_shipping_threshold) || 150000;
        const rates = (state.db.settings && state.db.settings.shipping_rates) || {};
        if (!province) {
            return {
                status: 'unselected',
                cost: 0,
                label: 'Pilih provinsi tujuan',
                freeThreshold,
            };
        }
        if (Object.prototype.hasOwnProperty.call(rates, province)) {
            const rate = Number(rates[province]) || 0;
            if (subtotal >= freeThreshold && subtotal > 0) {
                return {
                    status: 'free',
                    cost: 0,
                    label: 'GRATIS',
                    freeThreshold,
                };
            }
            return {
                status: 'calculated',
                cost: rate,
                label: formatRp(rate),
                freeThreshold,
            };
        }
        return {
            status: 'unavailable',
            cost: 0,
            label: 'Tarif belum tersedia (Konfirmasi Admin)',
            freeThreshold,
        };
    }
    function getCartSummary() {
        const items = [];
        let totalQty = 0;
        let subtotal = 0;
        state.cart.forEach((ci) => {
            const product = getProductById(ci.product_id);
            if (product) {
                const validQty = Math.min(Math.max(1, ci.quantity), Math.max(1, product.stock));
                const lineSubtotal = product.price * validQty;
                totalQty += validQty;
                subtotal += lineSubtotal;
                items.push({
                    product_id: product.id,
                    quantity: validQty,
                    product,
                    subtotal: lineSubtotal,
                });
            }
        });
        const shipInfo = getShippingInfo(state.checkoutForm ? state.checkoutForm.province : '', subtotal);
        const shipping = items.length === 0 ? 0 : shipInfo.cost;
        const discount = 0;
        const total = Math.max(0, subtotal + shipping - discount);
        return {
            items,
            totalQty,
            subtotal,
            shipping,
            shippingStatus: shipInfo.status,
            shippingLabel: items.length === 0 ? formatRp(0) : shipInfo.label,
            discount,
            freeThreshold: shipInfo.freeThreshold,
            amountToFreeShipping: Math.max(0, shipInfo.freeThreshold - subtotal),
            total,
        };
    }
    function persistAll() {
        const saved = window.SaleeDB.saveDB(state.db);
        window.SaleeDB.saveCart(state.cart);
        window.SaleeDB.saveAuthUser(state.currentUser);
        return saved !== false;
    }
    function getBasePath() {
        const pathname = (window.location && window.location.pathname) || '/';
        const stripped = pathname
            .replace(/\/(owner-login|admin)(\/.*)?$/i, '')
            .replace(/\/index\.html$/i, '')
            .replace(/\/+$/, '');
        return stripped;
    }
    function buildFullRoutePath(routePath) {
        const base = getBasePath();
        if (!routePath || routePath === '/') return base ? `${base}/` : '/';
        return `${base}${routePath.startsWith('/') ? routePath : '/' + routePath}`;
    }
    function navigateToRoute(path) {
        try {
            if (window.location.protocol.startsWith('http')) {
                const targetPath = buildFullRoutePath(path);
                if (window.location.pathname !== targetPath) {
                    window.history.pushState({}, '', targetPath);
                }
            } else {
                window.location.hash = path === '/' ? '' : `#${path}`;
            }
        } catch {
            // Ignore history pushState errors on file:// protocol
        }
        syncRouteFromLocation(path);
    }
    function syncRouteFromLocation(explicitPath) {
        const hashPath = (window.location && window.location.hash || '').replace(/^#/, '');
        const rawPath = explicitPath || (hashPath.startsWith('/') ? hashPath : '') || (window.location && window.location.pathname) || '/';
        const cleanPath = rawPath.replace(/\/+$/, '') || '/';
        const isAdminPath = cleanPath === '/admin' || cleanPath.endsWith('/admin') || cleanPath.includes('/admin/');
        const isOwnerLoginPath = cleanPath === '/owner-login' || cleanPath.endsWith('/owner-login');
        const isOwnerVerified =
            window.SaleeDB && typeof window.SaleeDB.checkLocalAdminSession === 'function'
                ? window.SaleeDB.checkLocalAdminSession()
                : false;

        if (isAdminPath) {
            if (!isOwnerVerified) {
                state.viewMode = 'owner-login';
                try {
                    if (window.location.protocol.startsWith('http')) {
                        window.history.replaceState({}, '', buildFullRoutePath('/owner-login'));
                    }
                } catch { }
            } else {
                state.viewMode = 'admin';
            }
        } else if (isOwnerLoginPath) {
            if (isOwnerVerified) {
                state.viewMode = 'admin';
                try {
                    if (window.location.protocol.startsWith('http')) {
                        window.history.replaceState({}, '', buildFullRoutePath('/admin'));
                    }
                } catch { }
            } else {
                state.viewMode = 'owner-login';
            }
        } else {
            state.viewMode = 'store';
        }
        renderApp();
    }
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const bgClass =
            type === 'error'
                ? 'bg-red-700 text-white border-red-500'
                : type === 'warning'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-[#633D25] text-white border-[#F5C84C]';
        const iconName =
            type === 'error' ? 'alert-circle' : type === 'warning' ? 'alert-triangle' : 'check-circle-2';
        const toastEl = document.createElement('div');
        toastEl.className = `flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border-l-4 ${bgClass} transform transition-all duration-300 translate-y-2 opacity-0 max-w-md`;
        toastEl.innerHTML = `
<i data-lucide="${iconName}" class="w-5 h-5 text-[#F5C84C] shrink-0"></i><div class="text-xs sm:text-sm font-semibold leading-snug">${escapeHtml(message)}</div>
`;
        container.appendChild(toastEl);
        if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2.2 } });
        requestAnimationFrame(() => {
            toastEl.classList.remove('translate-y-2', 'opacity-0');
        });
        setTimeout(() => {
            toastEl.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toastEl.remove(), 300);
        }, 3400);
    }
    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons({
                attrs: {
                    'stroke-width': 2,
                },
            });
        }
    }
    function addToCart(productId, qty = 1) {
        const product = getProductById(productId);
        if (!product) return;
        if (product.stock <= 0) {
            showToast(`Maaf, stok "${product.name}" sedang habis.`, 'error');
            return;
        }
        const existing = state.cart.find((c) => c.product_id === productId);
        if (existing) {
            if (existing.quantity + qty > product.stock) {
                existing.quantity = product.stock;
                showToast(`Jumlah "${product.name}" disesuaikan dengan sisa stok (${product.stock} pouch).`, 'warning');
            } else {
                existing.quantity += qty;
                showToast(`+${qty} "${product.name}" ditambahkan ke keranjang!`);
            }
        } else {
            state.cart.push({
                product_id: productId,
                quantity: Math.min(qty, product.stock),
            });
            showToast(`"${product.name}" berhasil masuk keranjang!`);
        }
        persistAll();
        renderApp();
    }
    function updateCartQuantity(productId, deltaOrExact, isExact = false) {
        const product = getProductById(productId);
        if (!product) return;
        const idx = state.cart.findIndex((c) => c.product_id === productId);
        if (idx === -1) return;
        const nextQty = isExact ? Number(deltaOrExact) : state.cart[idx].quantity + Number(deltaOrExact);
        if (nextQty <= 0) {
            const removedName = product.name;
            state.cart.splice(idx, 1);
            showToast(`"${removedName}" dihapus dari keranjang.`, 'warning');
        } else if (nextQty > product.stock) {
            state.cart[idx].quantity = product.stock;
            showToast(`Maksimal pembelian sesuai stok tersedia (${product.stock} pouch).`, 'warning');
        } else {
            state.cart[idx].quantity = nextQty;
        }
        persistAll();
        renderApp();
    }
    function removeFromCart(productId) {
        const product = getProductById(productId);
        state.cart = state.cart.filter((c) => c.product_id !== productId);
        persistAll();
        if (product) showToast(`"${product.name}" dihapus dari keranjang.`, 'warning');
        renderApp();
    }
    function openProductDetail(productId) {
        const product = getProductById(productId);
        if (!product) return;
        state.detailProductId = productId;
        state.detailQty = 1;
        renderApp();
    }
    function closeProductDetail() {
        state.detailProductId = null;
        renderApp();
    }
    function openCheckoutModal() {
        const summary = getCartSummary();
        if (summary.items.length === 0) {
            showToast('Keranjang belanja Anda masih kosong.', 'warning');
            return;
        }
        const isCustomerLoggedIn = state.currentUser && state.currentUser.role === 'customer';
        state.checkoutForm = {
            customerName: isCustomerLoggedIn ? (state.currentUser.full_name || '') : '',
            customerWhatsapp: isCustomerLoggedIn ? (state.currentUser.phone || '') : '',
            province: '',
            city: '',
            district: '',
            village: '',
            streetAddress: '',
            postalCode: '',
            notes: '',
            paymentMethod: 'Transfer Bank',
        };
        state.isSubmittingOrder = false;
        state.cartDrawerOpen = false;
        state.checkoutOpen = true;
        renderApp();
    }
    function updateCheckoutField(field, value, shouldRender = false) {
        if (!state.checkoutForm) state.checkoutForm = {};
        state.checkoutForm[field] = value;
        if (shouldRender) renderApp();
    }
    function copyBankAccount() {
        const acct = (state.db.settings && state.db.settings.bank_account) || '';
        if (!acct) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(acct).then(() => {
                showToast(`Nomor rekening ${acct} berhasil disalin!`);
            }).catch(() => {
                showToast(`Nomor rekening: ${acct}`, 'info');
            });
        } else {
            showToast(`Nomor rekening: ${acct}`, 'info');
        }
    }
    function handleCheckoutSubmit(event) {
        event.preventDefault();
        if (state.isSubmittingOrder) {
            showToast('Pesanan Anda sedang diproses, mohon tunggu sebentar...', 'warning');
            return;
        }
        const form = event.target;
        const customerName = (form.customerName ? form.customerName.value : state.checkoutForm.customerName || '').trim();
        const customerWhatsapp = (form.customerWhatsapp ? form.customerWhatsapp.value : state.checkoutForm.customerWhatsapp || '').trim();
        const province = (form.province ? form.province.value : state.checkoutForm.province || '').trim();
        const city = (form.city ? form.city.value : state.checkoutForm.city || '').trim();
        const district = (form.district ? form.district.value : state.checkoutForm.district || '').trim();
        const village = (form.village ? form.village.value : state.checkoutForm.village || '').trim();
        const streetAddress = (form.streetAddress ? form.streetAddress.value : state.checkoutForm.streetAddress || '').trim();
        const postalCode = (form.postalCode ? form.postalCode.value : state.checkoutForm.postalCode || '').trim();
        const notes = (form.notes ? form.notes.value : state.checkoutForm.notes || '').trim();
        const paymentMethod = (form.paymentMethod ? form.paymentMethod.value : state.checkoutForm.paymentMethod || 'Transfer Bank');

        state.checkoutForm = {
            customerName, customerWhatsapp, province, city, district, village, streetAddress, postalCode, notes, paymentMethod,
        };

        if (customerName.length < 2) {
            showToast('Mohon isi nama lengkap penerima (minimal 2 karakter).', 'error');
            return;
        }
        const digitsWA = customerWhatsapp.replace(/\D/g, '');
        if (!/^(08|628)[0-9]{8,13}$/.test(digitsWA)) {
            showToast('Format nomor WhatsApp tidak valid. Gunakan format 08... atau 628... (10-15 digit).', 'error');
            return;
        }
        if (!province || !city || !district || !village || streetAddress.length < 5 || !/^[0-9]{5}$/.test(postalCode)) {
            showToast('Mohon lengkapi seluruh kolom alamat pengiriman (Provinsi, Kab/Kota, Kecamatan, Desa/Kelurahan, Jalan/No. Rumah, dan Kode Pos 5 digit).', 'error');
            return;
        }

        const summary = getCartSummary();
        if (summary.items.length === 0) {
            showToast('Keranjang belanja kosong. Tambahkan produk terlebih dahulu.', 'error');
            return;
        }

        // Validasi ulang harga & stok langsung dari database sebelum disimpan
        let verifiedSubtotal = 0;
        const verifiedItems = [];
        for (const item of summary.items) {
            const dbProd = getProductById(item.product_id);
            if (!dbProd) {
                showToast(`Produk "${item.product.name}" tidak ditemukan di katalog.`, 'error');
                return;
            }
            if (dbProd.stock < item.quantity) {
                showToast(`Stok "${dbProd.name}" tidak mencukupi (tersisa ${dbProd.stock} pouch).`, 'error');
                return;
            }
            const lineSub = Number(dbProd.price) * Number(item.quantity);
            verifiedSubtotal += lineSub;
            verifiedItems.push({
                product_id: dbProd.id,
                quantity: item.quantity,
                product: dbProd,
                subtotal: lineSub,
            });
        }

        state.isSubmittingOrder = true;
        renderApp();

        const shipInfo = getShippingInfo(province, verifiedSubtotal);
        const verifiedShipping = shipInfo.cost;
        const verifiedTotal = verifiedSubtotal + verifiedShipping;
        const shippingAddress = `${streetAddress}, Desa/Kel. ${village}, Kec. ${district}, ${city}, ${province} ${postalCode}`;
        const addressDetail = { province, city, district, village, streetAddress, postalCode };

        const now = new Date().toISOString();
        const datePart = now.slice(2, 10).replace(/-/g, '');
        const randSuffix = String(Math.floor(100 + Math.random() * 900));
        const orderSeq = String(state.db.orders.length + 1).padStart(3, '0');
        const orderNumber = `INV-SALEE-${datePart}-${orderSeq}-${randSuffix}`;
        const orderId = `ord-${Date.now()}`;
        const cleanWA = digitsWA;
        let customer = state.db.customers.find(
            (c) => c.whatsapp.replace(/\D/g, '') === cleanWA
        );
        if (customer) {
            customer.name = customerName;
            customer.address = shippingAddress;
            customer.city = city;
            customer.total_orders += 1;
            customer.total_spent += verifiedTotal;
            customer.last_order_at = now;
        } else {
            customer = {
                id: `cst-${Date.now()}`,
                user_id: (state.currentUser && state.currentUser.role === 'customer') ? state.currentUser.id : null,
                name: customerName,
                whatsapp: customerWhatsapp,
                email: (state.currentUser && state.currentUser.role === 'customer') ? state.currentUser.email : '',
                address: shippingAddress,
                city: city,
                total_orders: 1,
                total_spent: verifiedTotal,
                last_order_at: now,
                created_at: now,
            };
            state.db.customers.unshift(customer);
        }
        const initialStatus =
            paymentMethod === 'Transfer Bank'
                ? 'Menunggu Pembayaran'
                : paymentMethod === 'WhatsApp'
                    ? 'Menunggu Konfirmasi'
                    : 'Diproses';
        const deductImmediately = initialStatus === 'Diproses';
        const newOrder = {
            id: orderId,
            order_number: orderNumber,
            customer_id: customer.id,
            customer_name: customerName,
            customer_whatsapp: customerWhatsapp,
            shipping_address: shippingAddress,
            shipping_address_detail: addressDetail,
            shipping_status: shipInfo.status,
            notes: notes || '-',
            subtotal: verifiedSubtotal,
            shipping_cost: verifiedShipping,
            discount_amount: 0,
            total_amount: verifiedTotal,
            payment_method: paymentMethod,
            status: initialStatus,
            stock_deducted: deductImmediately,
            created_at: now,
            updated_at: now,
        };
        state.db.orders.unshift(newOrder);
        verifiedItems.forEach((item, index) => {
            state.db.order_items.push({
                id: `oi-${Date.now()}-${index}`,
                order_id: orderId,
                product_id: item.product.id,
                product_name: item.product.name,
                product_image: item.product.image_url,
                unit_price: item.product.price,
                quantity: item.quantity,
                subtotal: item.subtotal,
                created_at: now,
            });
            if (deductImmediately) {
                const prod = getProductById(item.product.id);
                if (prod) {
                    const prevStock = prod.stock;
                    const currStock = Math.max(0, prevStock - item.quantity);
                    prod.stock = currStock;
                    prod.sold_count = (prod.sold_count || 0) + item.quantity;
                    state.db.stock_movements.unshift({
                        id: `stm-${Date.now()}-${index}`,
                        product_id: prod.id,
                        order_id: orderId,
                        type: 'out',
                        quantity: item.quantity,
                        previous_stock: prevStock,
                        current_stock: currStock,
                        reference: orderNumber,
                        notes: `Stok keluar otomatis dari checkout (${customerName})`,
                        created_by: 'Sistem Checkout',
                        created_at: now,
                    });
                }
            }
        });
        const newPayment = {
            id: `pay-${Date.now()}`,
            order_id: orderId,
            payment_method: paymentMethod,
            bank_name: paymentMethod === 'Transfer Bank' ? state.db.settings.bank_name : paymentMethod,
            account_sender: customerName,
            amount: verifiedTotal,
            status: deductImmediately ? 'Verified' : 'Pending',
            paid_at: deductImmediately ? now : null,
            verified_by: null,
            created_at: now,
        };
        state.db.payments.unshift(newPayment);

        const savedOk = persistAll();
        state.isSubmittingOrder = false;
        if (!savedOk) {
            showToast('Gagal menyimpan pesanan ke penyimpanan lokal. Mohon coba lagi.', 'error');
            renderApp();
            return;
        }

        state.cart = [];
        window.SaleeDB.saveCart([]);
        state.checkoutOpen = false;
        state.orderSuccessData = {
            orderNumber,
            orderId,
            subtotal: verifiedSubtotal,
            shippingCost: verifiedShipping,
            shippingStatus: shipInfo.status,
            totalAmount: verifiedTotal,
            paymentMethod,
            status: initialStatus,
            customerName,
            customerWhatsapp,
            shippingAddress,
            items: verifiedItems,
        };
        showToast(`Pesanan ${orderNumber} berhasil dibuat!`);
        renderApp();
    }
    function openSkipOrSwitchToAdmin() {
        if (state.currentUser && state.currentUser.role === 'admin' && state.currentUser.localAdminVerified) {
            navigateToRoute('/admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigateToRoute('/owner-login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    function loginAsDemoCustomer() {
        const custUser = state.db.users.find((u) => u.role === 'customer') || {
            id: 'usr-cust-01',
            email: 'nadia.putri@gmail.com',
            full_name: 'Nadia Putri Maharani',
            phone: '081345678901',
            role: 'customer',
        };
        state.currentUser = custUser;
        state.authModalOpen = false;
        persistAll();
        showToast(`Berhasil masuk sebagai pelanggan: ${custUser.full_name}`);
        renderApp();
    }
    function handleAuthSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value.trim();
        const fullName = form.fullName ? form.fullName.value.trim() : '';
        if (!email) {
            showToast('Masukkan alamat email.', 'error');
            return;
        }
        let user = state.db.users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === 'customer'
        );
        if (!user) {
            user = {
                id: `usr-${Date.now()}`,
                email,
                full_name: fullName || email.split('@')[0],
                phone: '081234567890',
                role: 'customer',
                created_at: new Date().toISOString(),
            };
            state.db.users.push(user);
        }
        state.currentUser = { ...user, role: 'customer', supabaseVerified: false };
        state.authModalOpen = false;
        state.viewMode = 'store';
        persistAll();
        showToast(`Berhasil masuk sebagai pelanggan: ${user.full_name}`);
        renderApp();
    }
    async function handleAdminAuthSubmit(e) {
        e.preventDefault();
        if (state.adminLoginLoading) return;
        const form = e.target;
        const email = form.email.value.trim();
        const password = form.password ? form.password.value : '';
        if (!email || !password) {
            state.adminLoginError = 'Masukkan email dan password akun Owner.';
            renderApp();
            return;
        }
        state.adminLoginLoading = true;
        state.adminLoginError = '';
        renderApp();

        const res = await window.SaleeDB.verifyLocalAdminLogin(email, password);
        state.adminLoginLoading = false;
        if (!res || !res.ok) {
            state.adminLoginError = (res && res.error) || 'Email atau password Owner salah.';
            showToast(state.adminLoginError, 'error');
            renderApp();
            return;
        }
        state.currentUser = res.user;
        state.authModalOpen = false;
        state.adminLoginError = '';
        state.showOwnerPassword = false;
        persistAll();
        showToast(`Login berhasil! Selamat datang, ${res.user.full_name}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navigateToRoute('/admin');
    }
    function handleLogout() {
        const wasAdmin = state.viewMode === 'admin' || (state.currentUser && state.currentUser.role === 'admin');
        state.currentUser = null;
        state.adminLoginError = '';
        state.showOwnerPassword = false;
        persistAll();
        showToast('Anda telah keluar dari sesi akun.', 'info');
        if (wasAdmin) {
            navigateToRoute('/owner-login');
        } else {
            navigateToRoute('/');
        }
    }
    function openProductModal(productId = null) {
        if (productId) {
            const existing = getProductById(productId);
            state.editingProduct = existing ? JSON.parse(JSON.stringify(existing)) : null;
        } else {
            state.editingProduct = null;
        }
        state.productModalOpen = true;
        renderApp();
    }
    function handleSaveProduct(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value.trim();
        const sku = form.sku.value.trim();
        const category_id = form.category_id.value;
        const price = Number(form.price.value);
        const cost_price = Number(form.cost_price.value) || Math.round(price * 0.6);
        const stock = Number(form.stock.value);
        const min_stock = Number(form.min_stock.value) || 10;
        const weight_grams = Number(form.weight_grams.value) || 200;
        const image_url = form.image_url.value.trim() || PRESET_PRODUCT_PHOTOS[0].url;
        const description = form.description.value.trim();
        const is_popular = form.is_popular.checked;
        if (!name || price <= 0) {
            showToast('Mohon isi nama produk dan harga jual yang valid.', 'error');
            return;
        }
        const now = new Date().toISOString();
        if (state.editingProduct) {
            const idx = state.db.products.findIndex((p) => p.id === state.editingProduct.id);
            if (idx !== -1) {
                const prevStock = state.db.products[idx].stock;
                state.db.products[idx] = {
                    ...state.db.products[idx],
                    name,
                    sku: sku || state.db.products[idx].sku,
                    category_id,
                    price,
                    cost_price,
                    stock,
                    min_stock,
                    weight_grams,
                    image_url,
                    description,
                    is_popular,
                };
                if (prevStock !== stock) {
                    state.db.stock_movements.unshift({
                        id: `stm-${Date.now()}`,
                        product_id: state.editingProduct.id,
                        order_id: null,
                        type: stock > prevStock ? 'in' : 'out',
                        quantity: Math.abs(stock - prevStock),
                        previous_stock: prevStock,
                        current_stock: stock,
                        reference: 'EDIT-PRODUK',
                        notes: `Penyesuaian stok via form Edit Produk`,
                        created_by: state.currentUser ? state.currentUser.full_name : 'Admin',
                        created_at: now,
                    });
                }
                showToast(`Produk "${name}" berhasil diperbarui!`);
            }
        } else {
            const newId = `prd-${Date.now()}`;
            const newProd = {
                id: newId,
                category_id,
                sku: sku || `SALEE-${Date.now().toString().slice(-4)}`,
                name,
                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                description,
                price,
                cost_price,
                stock,
                min_stock,
                weight_grams,
                image_url,
                is_popular,
                is_active: true,
                rating: 4.9,
                sold_count: 0,
                created_at: now,
            };
            state.db.products.unshift(newProd);
            if (stock > 0) {
                state.db.stock_movements.unshift({
                    id: `stm-${Date.now()}`,
                    product_id: newId,
                    order_id: null,
                    type: 'in',
                    quantity: stock,
                    previous_stock: 0,
                    current_stock: stock,
                    reference: 'STOK-AWAL',
                    notes: `Stok awal penambahan produk baru "${name}"`,
                    created_by: state.currentUser ? state.currentUser.full_name : 'Admin',
                    created_at: now,
                });
            }
            showToast(`Produk baru "${name}" berhasil ditambahkan!`);
        }
        state.productModalOpen = false;
        state.editingProduct = null;
        persistAll();
        renderApp();
    }
    function handleDeleteProduct(productId) {
        const prod = getProductById(productId);
        if (!prod) return;
        state.db.products = state.db.products.filter((p) => p.id !== productId);
        state.cart = state.cart.filter((c) => c.product_id !== productId);
        persistAll();
        showToast(`Produk "${prod.name}" telah dihapus.`, 'warning');
        renderApp();
    }
    function openCategoryModal(catId = null) {
        if (catId) {
            const cat = state.db.categories.find((c) => c.id === catId);
            state.editingCategory = cat ? JSON.parse(JSON.stringify(cat)) : null;
        } else {
            state.editingCategory = null;
        }
        state.categoryModalOpen = true;
        renderApp();
    }
    function handleSaveCategory(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value.trim();
        const description = form.description.value.trim();
        const badge_color = form.badge_color.value || '#F5C84C';
        if (!name) {
            showToast('Nama kategori wajib diisi.', 'error');
            return;
        }
        if (state.editingCategory) {
            const idx = state.db.categories.findIndex((c) => c.id === state.editingCategory.id);
            if (idx !== -1) {
                state.db.categories[idx] = {
                    ...state.db.categories[idx],
                    name,
                    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    description,
                    badge_color,
                };
                showToast(`Kategori "${name}" berhasil diperbarui!`);
            }
        } else {
            state.db.categories.push({
                id: `cat-${Date.now()}`,
                name,
                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                description,
                icon: 'tag',
                badge_color,
                created_at: new Date().toISOString(),
            });
            showToast(`Kategori "${name}" berhasil ditambahkan!`);
        }
        state.categoryModalOpen = false;
        state.editingCategory = null;
        persistAll();
        renderApp();
    }
    function handleDeleteCategory(catId) {
        const usedCount = state.db.products.filter((p) => p.category_id === catId).length;
        if (usedCount > 0) {
            showToast(`Tidak dapat menghapus kategori karena masih memiliki ${usedCount} produk aktif.`, 'error');
            return;
        }
        const cat = state.db.categories.find((c) => c.id === catId);
        state.db.categories = state.db.categories.filter((c) => c.id !== catId);
        persistAll();
        showToast(`Kategori "${cat ? cat.name : ''}" berhasil dihapus.`, 'warning');
        renderApp();
    }
    function openStockModal(productId = '') {
        state.stockFormPresetProductId = productId || (state.db.products[0] ? state.db.products[0].id : '');
        state.stockModalOpen = true;
        renderApp();
    }
    function handleSaveStockMovement(e) {
        e.preventDefault();
        const form = e.target;
        const product_id = form.product_id.value;
        const type = form.type.value; // 'in' | 'out'
        const quantity = Number(form.quantity.value);
        const reference = form.reference.value.trim() || `BATCH-${Date.now().toString().slice(-5)}`;
        const notes = form.notes.value.trim() || 'Pencatatan stok manual gudang';
        const product = getProductById(product_id);
        if (!product || quantity <= 0) {
            showToast('Pilih produk dan masukkan jumlah stok yang valid (> 0).', 'error');
            return;
        }
        if (type === 'out' && product.stock < quantity) {
            showToast(`Stok "${product.name}" tidak mencukupi (tersedia ${product.stock} pouch).`, 'error');
            return;
        }
        const prevStock = product.stock;
        const currStock = type === 'in' ? prevStock + quantity : Math.max(0, prevStock - quantity);
        product.stock = currStock;
        state.db.stock_movements.unshift({
            id: `stm-${Date.now()}`,
            product_id: product.id,
            order_id: null,
            type,
            quantity,
            previous_stock: prevStock,
            current_stock: currStock,
            reference,
            notes,
            created_by: state.currentUser ? state.currentUser.full_name : 'Admin Gudang',
            created_at: new Date().toISOString(),
        });
        state.stockModalOpen = false;
        persistAll();
        showToast(
            `Stok ${type === 'in' ? 'Masuk (+' : 'Keluar (-'}${quantity}) untuk "${product.name}" berhasil dicatat! Sisa stok: ${currStock} pouch.`
        );
        renderApp();
    }
    function handleUpdateOrderStatus(orderId, newStatus) {
        const order = state.db.orders.find((o) => o.id === orderId);
        if (!order) return;
        const oldStatus = order.status;
        if (oldStatus === newStatus) return;
        const now = new Date().toISOString();
        const items = state.db.order_items.filter((oi) => oi.order_id === orderId);
        if (
            !order.stock_deducted &&
            ['Diproses', 'Dikemas', 'Dikirim', 'Selesai'].includes(newStatus)
        ) {
            items.forEach((oi, idx) => {
                const prod = getProductById(oi.product_id);
                if (prod) {
                    const prevStock = prod.stock;
                    const currStock = Math.max(0, prevStock - oi.quantity);
                    prod.stock = currStock;
                    prod.sold_count = (prod.sold_count || 0) + oi.quantity;
                    state.db.stock_movements.unshift({
                        id: `stm-${Date.now()}-${idx}`,
                        product_id: prod.id,
                        order_id: order.id,
                        type: 'out',
                        quantity: oi.quantity,
                        previous_stock: prevStock,
                        current_stock: currStock,
                        reference: order.order_number,
                        notes: `Stok berkurang otomatis saat pesanan dikonfirmasi (${newStatus})`,
                        created_by: state.currentUser ? state.currentUser.full_name : 'Admin',
                        created_at: now,
                    });
                }
            });
            order.stock_deducted = true;
        }
        if (order.stock_deducted && newStatus === 'Dibatalkan') {
            items.forEach((oi, idx) => {
                const prod = getProductById(oi.product_id);
                if (prod) {
                    const prevStock = prod.stock;
                    const currStock = prevStock + oi.quantity;
                    prod.stock = currStock;
                    prod.sold_count = Math.max(0, (prod.sold_count || 0) - oi.quantity);
                    state.db.stock_movements.unshift({
                        id: `stm-${Date.now()}-${idx}`,
                        product_id: prod.id,
                        order_id: order.id,
                        type: 'in',
                        quantity: oi.quantity,
                        previous_stock: prevStock,
                        current_stock: currStock,
                        reference: order.order_number,
                        notes: `Pengembalian stok otomatis karena pesanan dibatalkan`,
                        created_by: state.currentUser ? state.currentUser.full_name : 'Admin',
                        created_at: now,
                    });
                }
            });
            order.stock_deducted = false;
        }
        order.status = newStatus;
        order.updated_at = now;
        const payment = state.db.payments.find((p) => p.order_id === orderId);
        if (payment) {
            if (['Diproses', 'Dikemas', 'Dikirim', 'Selesai'].includes(newStatus)) {
                payment.status = 'Verified';
                payment.paid_at = payment.paid_at || now;
            } else if (newStatus === 'Dibatalkan') {
                payment.status = 'Failed';
            }
        }
        persistAll();
        showToast(`Status pesanan ${order.order_number} diubah menjadi "${newStatus}".`);
        renderApp();
    }
    function handleExportCSV() {
        const start = state.reportStartDate ? new Date(state.reportStartDate + 'T00:00:00Z') : new Date('2020-01-01');
        const end = state.reportEndDate ? new Date(state.reportEndDate + 'T23:59:59Z') : new Date('2030-12-31');
        const filteredOrders = state.db.orders.filter((o) => {
            const d = new Date(o.created_at);
            return d >= start && d <= end;
        });
        const headers = [
            'No Pesanan',
            'Tanggal',
            'Nama Pelanggan',
            'No WhatsApp',
            'Metode Pembayaran',
            'Status Pesanan',
            'Subtotal (Rp)',
            'Ongkir (Rp)',
            'Total Pembayaran (Rp)',
            'Detail Item',
        ];
        const rows = filteredOrders.map((o) => {
            const items = state.db.order_items
                .filter((oi) => oi.order_id === o.id)
                .map((oi) => `${oi.product_name} (${oi.quantity}x)`)
                .join('; ');
            return [
                o.order_number,
                formatDateID(o.created_at),
                `"${o.customer_name.replace(/"/g, '""')}"`,
                o.customer_whatsapp,
                o.payment_method,
                o.status,
                o.subtotal,
                o.shipping_cost,
                o.total_amount,
                `"${items.replace(/"/g, '""')}"`,
            ].join(',');
        });
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `Laporan_Penjualan_KeripikPisangSalee_${state.reportStartDate}_sd_${state.reportEndDate}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Laporan CSV (${filteredOrders.length} transaksi) berhasil diunduh!`);
    }
    function handleContactSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value.trim();
        const whatsapp = form.whatsapp.value.trim();
        const subject = form.subject.value.trim();
        const message = form.message.value.trim();
        if (!name || !whatsapp || !message) {
            showToast('Mohon lengkapi nama, WhatsApp, dan isi pesan Anda.', 'error');
            return;
        }
        if (!state.db.contact_messages) state.db.contact_messages = [];
        state.db.contact_messages.unshift({
            id: `msg-${Date.now()}`,
            name,
            whatsapp,
            subject: subject || 'Pertanyaan Umum Pelanggan',
            message,
            created_at: new Date().toISOString(),
        });
        persistAll();
        form.reset();
        showToast('Pesan Anda telah terkirim! Tim Keripik Pisang Salee akan segera menghubungi Anda.');
    }
    function handleSaveSettings(e) {
        e.preventDefault();
        const form = e.target;
        state.db.settings = {
            ...state.db.settings,
            store_name: form.store_name.value.trim() || 'Keripik Pisang Salee',
            tagline: form.tagline.value.trim(),
            whatsapp: form.whatsapp.value.trim(),
            email: form.email.value.trim(),
            address: form.address.value.trim(),
            instagram: form.instagram.value.trim(),
            tiktok: form.tiktok.value.trim(),
            bank_name: form.bank_name.value.trim(),
            bank_account: form.bank_account.value.trim(),
            bank_holder: form.bank_holder.value.trim(),
            default_shipping: Number(form.default_shipping.value) || 12000,
            free_shipping_threshold: Number(form.free_shipping_threshold.value) || 150000,
            default_min_stock: Number(form.default_min_stock.value) || 12,
            cod_enabled: form.cod_enabled.checked,
        };
        const sbUrl = form.supabase_url ? form.supabase_url.value.trim() : '';
        const sbKey = form.supabase_anon_key ? form.supabase_anon_key.value.trim() : '';
        if (sbUrl) localStorage.setItem('SALEE_SUPABASE_URL', sbUrl);
        if (sbKey) localStorage.setItem('SALEE_SUPABASE_ANON_KEY', sbKey);
        persistAll();
        showToast('Pengaturan toko & konfigurasi berhasil disimpan!');
        renderApp();
    }
    function handleImageUploadChange(inputEl) {
        if (!inputEl.files || !inputEl.files[0]) return;
        const file = inputEl.files[0];
        const reader = new FileReader();
        reader.onload = function (evt) {
            const urlInput = document.getElementById('productImageUrlInput');
            const previewImg = document.getElementById('productImagePreview');
            if (urlInput && evt.target && evt.target.result) {
                urlInput.value = evt.target.result;
                if (previewImg) previewImg.src = evt.target.result;
                showToast('Foto produk berhasil diunggah!');
            }
        };
        reader.readAsDataURL(file);
    }
    function renderNavbar() {
        const cartSummary = getCartSummary();
        const isCustomer = state.currentUser && state.currentUser.role === 'customer';
        return `
<!-- Top Tropical Bar --><div class="bg-[#633D25] text-[#FFF5DF] text-xs py-2 px-4 border-b border-[#F5C84C]/20"><div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5C84C] text-[#633D25]"><i data-lucide="sparkles" class="w-3 h-3"></i> TROPICAL CRAFT SNACK
</span><span class="font-medium">Gratis Ongkir Otomatis untuk belanja di atas <strong>${formatRp(state.db.settings.free_shipping_threshold)}</strong>!</span></div><div class="flex items-center gap-4"><span class="hidden sm:inline-flex items-center gap-1 text-[#FFF5DF]/85"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-[#F5C84C]"></i> 100% Halal & Tanpa Pengawet
</span></div></div></div><!-- Sticky Main Navbar --><header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#633D25]/10 shadow-sm"><nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4"><!-- Brand Logo --><a href="#beranda" class="flex items-center gap-3 group"><div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5C84C] to-[#eab308] border-2 border-[#633D25] flex items-center justify-center text-[#633D25] shadow-md group-hover:rotate-6 transition-transform"><svg class="w-7 h-7 text-[#633D25]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" /><path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z" /></svg></div><div><span class="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#633D25] block leading-none">
Keripik Pisang <span class="text-[#557447]">Salee</span></span><span class="text-[11px] font-semibold text-[#633D25]/65 tracking-wide uppercase mt-1 block">
Modern Tropical Food UMKM
</span></div></a><!-- Navigation Links --><div class="hidden md:flex items-center gap-1 lg:gap-2"><a href="#beranda" class="px-4 py-2 rounded-xl text-sm font-bold text-[#633D25] hover:bg-[#FFF5DF] transition">Beranda</a><a href="#produk" class="px-4 py-2 rounded-xl text-sm font-bold text-[#633D25] hover:bg-[#FFF5DF] transition">Produk</a><a href="#tentang-kami" class="px-4 py-2 rounded-xl text-sm font-bold text-[#633D25] hover:bg-[#FFF5DF] transition">Tentang Kami</a><a href="#kontak" class="px-4 py-2 rounded-xl text-sm font-bold text-[#633D25] hover:bg-[#FFF5DF] transition">Kontak</a></div><!-- Right Actions: Cart + Login/Register --><div class="flex items-center gap-2.5"><!-- Cart Button --><button
type="button"
onclick="window.SaleeApp.toggleCart(true)"
class="relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#FFF5DF] hover:bg-[#F5C84C]/40 text-[#633D25] border border-[#633D25]/15 font-bold text-sm transition-all cursor-pointer active:scale-95"
aria-label="Keranjang Belanja"
><i data-lucide="shopping-bag" class="w-4 h-4 text-[#633D25]"></i><span class="hidden sm:inline">Keranjang</span><span class="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-extrabold bg-[#633D25] text-[#F5C84C]">
${cartSummary.totalQty}
</span></button><!-- Auth / Login Button -->
${isCustomer
                ? `
<div class="hidden sm:flex items-center gap-2"><button
type="button"
onclick="window.SaleeApp.openAuthModal()"
class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#557447] hover:bg-[#466039] text-white text-xs font-bold transition cursor-pointer"
><i data-lucide="user-check" class="w-4 h-4 text-[#F5C84C]"></i><span>${escapeHtml(state.currentUser.full_name.split(' ')[0])}</span></button><button
type="button"
onclick="window.SaleeApp.logout()"
title="Logout"
class="p-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 transition cursor-pointer"
><i data-lucide="log-out" class="w-4 h-4"></i></button></div>
`
                : `
<button
type="button"
onclick="window.SaleeApp.openAuthModal()"
class="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-bold text-sm shadow-sm transition cursor-pointer"
><i data-lucide="user" class="w-4 h-4 text-[#F5C84C]"></i><span>Login / Register</span></button>
`
            }
<!-- Mobile Hamburger --><button
type="button"
onclick="window.SaleeApp.toggleMobileMenu()"
class="md:hidden p-2.5 rounded-2xl bg-[#FFF5DF] text-[#633D25] border border-[#633D25]/15"
aria-label="Menu Mobile"
><i data-lucide="${state.mobileMenuOpen ? 'x' : 'menu'}" class="w-5 h-5"></i></button></div></nav><!-- Mobile Menu Dropdown -->
${state.mobileMenuOpen
                ? `
<div class="md:hidden bg-white border-t border-[#633D25]/10 px-4 pt-3 pb-5 space-y-2 shadow-xl"><a href="#beranda" onclick="window.SaleeApp.toggleMobileMenu(false)" class="block px-4 py-2.5 rounded-xl font-bold text-[#633D25] hover:bg-[#FFF5DF]">Beranda</a><a href="#produk" onclick="window.SaleeApp.toggleMobileMenu(false)" class="block px-4 py-2.5 rounded-xl font-bold text-[#633D25] hover:bg-[#FFF5DF]">Produk</a><a href="#tentang-kami" onclick="window.SaleeApp.toggleMobileMenu(false)" class="block px-4 py-2.5 rounded-xl font-bold text-[#633D25] hover:bg-[#FFF5DF]">Tentang Kami</a><a href="#kontak" onclick="window.SaleeApp.toggleMobileMenu(false)" class="block px-4 py-2.5 rounded-xl font-bold text-[#633D25] hover:bg-[#FFF5DF]">Kontak</a><div class="pt-2 border-t border-[#633D25]/10 flex flex-col gap-2"><button
type="button"
onclick="window.SaleeApp.openAuthModal()"
class="w-full py-2.5 rounded-xl bg-[#633D25] text-white font-bold text-sm flex items-center justify-center gap-2"
><i data-lucide="user" class="w-4 h-4 text-[#F5C84C]"></i><span>${isCustomer ? escapeHtml(state.currentUser.full_name) : 'Login / Register'}</span></button></div></div>
`
                : ''
            }
</header>
`;
    }
    function renderHeroSection() {
        return `
<section id="beranda" class="relative overflow-hidden bg-gradient-to-br from-[#FFF5DF] via-[#FFF5DF] to-[#F5C84C]/45 pt-10 pb-20 lg:py-24 border-b border-[#633D25]/10"><!-- Tropical Leaf & Sunburst Ornaments --><div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#F5C84C]/35 blur-3xl pointer-events-none"></div><div class="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-[#557447]/10 blur-3xl pointer-events-none"></div><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"><div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"><!-- Left Column: Copywriting & CTA --><div class="lg:col-span-7 space-y-6 text-center lg:text-left"><div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#557447]/15 border border-[#557447]/30 text-[#557447] text-xs sm:text-sm font-extrabold"><i data-lucide="leaf" class="w-4 h-4"></i><span>100% Pisang Kepok Kuning Pilihan â€¢ Tanpa Pemanis Buatan</span></div><h1 class="font-display text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#633D25] leading-[1.12] tracking-tight">
Nikmati Renyahnya <span class="underline decoration-[#F5C84C] decoration-8 underline-offset-4">Keripik Pisang Salee!</span></h1><p class="text-[#633D25]/80 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
Perpaduan sempurna irisan pisang kepok matang pohon yang disalai hingga berkaramel alami, digoreng renyah keemasan, dan dibalut varian rasa autentik tropis Nusantara. Camilan premium untuk keluarga dan oleh-oleh istimewa.
</p><!-- CTA Buttons --><div class="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2"><a
href="#produk"
class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#633D25] hover:bg-[#4d2f1c] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-[#633D25]/20 transition-all hover:-translate-y-0.5"
><i data-lucide="shopping-bag" class="w-5 h-5 text-[#F5C84C]"></i><span>Belanja Sekarang</span></a><a
href="#tentang-kami"
class="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white hover:bg-[#F5C84C]/25 text-[#633D25] border-2 border-[#633D25]/20 font-extrabold text-sm sm:text-base transition-all hover:-translate-y-0.5"
><span>Kenali Produk Kami</span><i data-lucide="arrow-right" class="w-4 h-4 text-[#557447]"></i></a></div><!-- Trust Metrics --><div class="pt-6 grid grid-cols-3 gap-4 border-t border-[#633D25]/15 max-w-lg mx-auto lg:mx-0"><div class="bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-[#633D25]/10"><div class="text-xl sm:text-2xl font-extrabold text-[#633D25]">2.300+</div><div class="text-xs font-semibold text-[#557447]">Pouch Terjual</div></div><div class="bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-[#633D25]/10"><div class="text-xl sm:text-2xl font-extrabold text-[#633D25]">4.9 / 5.0</div><div class="text-xs font-semibold text-[#557447]">Rating Pelanggan</div></div><div class="bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-[#633D25]/10"><div class="text-xl sm:text-2xl font-extrabold text-[#633D25]">100%</div><div class="text-xs font-semibold text-[#557447]">Fresh Setiap Hari</div></div></div></div><!-- Right Column: Large Hero Product Visual --><div class="lg:col-span-5"><div class="relative mx-auto max-w-lg"><div class="absolute -inset-3 rounded-[36px] bg-gradient-to-tr from-[#F5C84C] via-[#557447]/40 to-[#633D25]/30 blur-xl opacity-70"></div><div class="relative bg-white rounded-[32px] p-4 shadow-2xl border-4 border-white"><div class="relative rounded-3xl overflow-hidden aspect-square bg-[#FFF5DF]"><img
src="./assets/images/salee-madu-karamel.jpg"
alt="Salee Madu Karamel & Choco Melt"
class="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
/><div class="absolute inset-0 bg-gradient-to-t from-[#633D25]/80 via-transparent to-transparent"></div><div class="absolute top-4 left-4"><span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F5C84C] text-[#633D25] text-xs font-extrabold shadow-md"><i data-lucide="award" class="w-3.5 h-3.5"></i> Best Seller UMKM
</span></div><div class="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between"><div><p class="text-xs uppercase tracking-wider text-[#F5C84C] font-bold">Varian Terfavorit</p><h3 class="text-lg font-extrabold">Salee Madu Karamel & Choco Melt</h3></div><span class="px-3 py-1.5 rounded-xl bg-white text-[#633D25] font-extrabold text-sm shadow">
Mulai Rp 18.000
</span></div></div><!-- Bottom Floating Feature Strip inside Card --><div class="mt-4 grid grid-cols-2 gap-3"><div class="flex items-center gap-3 p-3 rounded-2xl bg-[#FFF5DF] border border-[#F5C84C]/50"><div class="w-10 h-10 rounded-xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center shrink-0"><i data-lucide="flame" class="w-5 h-5"></i></div><div><div class="text-xs font-extrabold text-[#633D25]">Karamel Alami</div><div class="text-[11px] text-[#633D25]/70">Disalai higienis</div></div></div><div class="flex items-center gap-3 p-3 rounded-2xl bg-[#557447]/10 border border-[#557447]/20"><div class="w-10 h-10 rounded-xl bg-[#557447] text-white flex items-center justify-center shrink-0"><i data-lucide="package-check" class="w-5 h-5"></i></div><div><div class="text-xs font-extrabold text-[#633D25]">Kemasan Ziplock</div><div class="text-[11px] text-[#633D25]/70">Awet renyah 3 bulan</div></div></div></div></div></div></div></div></div></section>
`;
    }
    function renderCategorySection() {
        const categories = state.db.categories;
        return `
<section class="py-14 bg-white border-b border-[#633D25]/10"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"><div><span class="text-xs font-extrabold uppercase tracking-widest text-[#557447] block mb-1">Koleksi Rasa Pilihan</span><h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#633D25]">Kategori Produk Keripik Pisang Salee</h2></div><button
type="button"
onclick="window.SaleeApp.selectCategory('ALL')"
class="self-start md:self-auto text-sm font-bold text-[#557447] hover:text-[#633D25] inline-flex items-center gap-1.5 cursor-pointer"
><span>Tampilkan Semua Varian (${state.db.products.length})</span><i data-lucide="arrow-right" class="w-4 h-4"></i></button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
${categories
                .map((cat) => {
                    const count = state.db.products.filter((p) => p.category_id === cat.id).length;
                    const isSelected = state.selectedCategory === cat.id;
                    return `
<div
onclick="window.SaleeApp.selectCategory('${cat.id}')"
class="group cursor-pointer rounded-3xl p-6 transition-all duration-300 border-2 ${isSelected
                            ? 'bg-[#633D25] text-white border-[#633D25] shadow-xl -translate-y-1'
                            : 'bg-[#FFF5DF]/70 hover:bg-[#FFF5DF] text-[#633D25] border-[#633D25]/10 hover:border-[#F5C84C] hover:-translate-y-1'
                        }"
><div class="flex items-center justify-between mb-4"><div
class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm"
style="background-color: ${cat.badge_color}; color: ${cat.badge_color === '#633D25' || cat.badge_color === '#557447' ? '#FFFFFF' : '#633D25'}"
><i data-lucide="${cat.icon || 'tag'}" class="w-6 h-6"></i></div><span class="px-3 py-1 rounded-full text-xs font-extrabold ${isSelected ? 'bg-[#F5C84C] text-[#633D25]' : 'bg-white text-[#633D25]'
                        }">
${count} Produk
</span></div><h3 class="font-display font-extrabold text-lg mb-1.5">${escapeHtml(cat.name)}</h3><p class="text-xs leading-relaxed ${isSelected ? 'text-[#FFF5DF]/85' : 'text-[#633D25]/75'} line-clamp-2">
${escapeHtml(cat.description)}
</p></div>
`;
                })
                .join('')}
</div></div></section>
`;
    }
    function renderCatalogSection() {
        let filtered = state.db.products.filter((p) => {
            const matchCat = state.selectedCategory === 'ALL' || p.category_id === state.selectedCategory;
            const q = state.searchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
        if (state.sortBy === 'popular') {
            filtered.sort((a, b) => Number(b.is_popular) - Number(a.is_popular) || b.sold_count - a.sold_count);
        } else if (state.sortBy === 'price_asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (state.sortBy === 'price_desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (state.sortBy === 'stock_desc') {
            filtered.sort((a, b) => b.stock - a.stock);
        }
        return `
<section id="produk" class="py-16 bg-[#FFF5DF]"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><!-- Section Title & Filter Bar --><div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8"><div><span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#557447] mb-1"><i data-lucide="flame" class="w-3.5 h-3.5"></i> Katalog Resmi UMKM
</span><h2 class="font-display text-3xl font-extrabold text-[#633D25]">Pilih Varian Favoritmu</h2></div><!-- Search & Sort Controls --><div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto"><div class="relative flex-1 sm:w-72"><i data-lucide="search" class="w-4 h-4 text-[#633D25]/50 absolute left-4 top-1/2 -translate-y-1/2"></i><input
type="text"
value="${escapeHtml(state.searchQuery)}"
oninput="window.SaleeApp.setSearchQuery(this.value)"
placeholder="Cari rasa keripik pisang..."
class="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#633D25]/15 text-sm font-medium text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><select
onchange="window.SaleeApp.setSortBy(this.value)"
class="px-4 py-3 rounded-2xl bg-white border border-[#633D25]/15 text-sm font-bold text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
><option value="popular" ${state.sortBy === 'popular' ? 'selected' : ''}>Urutkan: Terpopuler</option><option value="price_asc" ${state.sortBy === 'price_asc' ? 'selected' : ''}>Harga: Terendah ke Tinggi</option><option value="price_desc" ${state.sortBy === 'price_desc' ? 'selected' : ''}>Harga: Tertinggi ke Rendah</option><option value="stock_desc" ${state.sortBy === 'stock_desc' ? 'selected' : ''}>Stok Terbanyak</option></select></div></div><!-- Category Filter Pills --><div class="flex items-center gap-2 overflow-x-auto pb-4 mb-6"><button
type="button"
onclick="window.SaleeApp.selectCategory('ALL')"
class="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer ${state.selectedCategory === 'ALL'
                ? 'bg-[#633D25] text-[#F5C84C] shadow-md'
                : 'bg-white text-[#633D25] hover:bg-[#F5C84C]/30 border border-[#633D25]/10'
            }"
>
Semua Kategori (${state.db.products.length})
</button>
${state.db.categories
                .map((cat) => {
                    const active = state.selectedCategory === cat.id;
                    return `
<button
type="button"
onclick="window.SaleeApp.selectCategory('${cat.id}')"
class="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition cursor-pointer ${active
                            ? 'bg-[#633D25] text-[#F5C84C] shadow-md'
                            : 'bg-white text-[#633D25] hover:bg-[#F5C84C]/30 border border-[#633D25]/10'
                        }"
>
${escapeHtml(cat.name)}
</button>
`;
                })
                .join('')}
</div><!-- Product Grid -->
${filtered.length === 0
                ? `
<div class="bg-white rounded-3xl p-12 text-center border border-[#633D25]/10"><div class="w-16 h-16 rounded-2xl bg-[#FFF5DF] text-[#633D25] flex items-center justify-center mx-auto mb-4"><i data-lucide="package-search" class="w-8 h-8"></i></div><h3 class="text-lg font-extrabold text-[#633D25]">Produk Tidak Ditemukan</h3><p class="text-sm text-[#633D25]/70 mt-1 mb-5">Coba kata kunci lain atau tampilkan semua kategori produk kami.</p><button
type="button"
onclick="window.SaleeApp.resetCatalogFilter()"
class="px-5 py-2.5 rounded-xl bg-[#633D25] text-white text-sm font-bold"
>
Reset Filter Pencarian
</button></div>
`
                : `
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
${filtered
                    .map((product) => {
                        const cat = getCategoryById(product.category_id);
                        const isOut = product.stock <= 0;
                        const isLow = product.stock > 0 && product.stock <= product.min_stock;
                        return `
<div class="bg-white rounded-3xl overflow-hidden border border-[#633D25]/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1.5"><!-- Image Wrapper --><div class="relative aspect-square bg-[#FFF5DF] overflow-hidden"><img
src="${escapeHtml(product.image_url)}"
alt="${escapeHtml(product.name)}"
class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
onerror="this.src='./assets/images/salee-klasik-gurih.jpg'"
/><!-- Top Badges --><div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
${product.is_popular
                                ? `
<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#F5C84C] text-[#633D25] shadow"><i data-lucide="flame" class="w-3 h-3"></i> Populer
</span>
`
                                : ''
                            }
<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-[#633D25] backdrop-blur-sm">
${escapeHtml(cat.name.replace('Keripik Pisang ', ''))}
</span></div><!-- Weight & Rating Badge --><div class="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-[#633D25]/85 text-white text-[11px] font-bold backdrop-blur-sm flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 text-[#F5C84C] fill-[#F5C84C]"></i><span>${product.rating || '4.9'}</span><span class="opacity-60">â€¢</span><span>${product.weight_grams}g</span></div></div><!-- Card Body --><div class="p-5 flex-1 flex flex-col justify-between space-y-4"><div><h3
onclick="window.SaleeApp.openProductDetail('${product.id}')"
class="font-display font-extrabold text-base sm:text-lg text-[#633D25] hover:text-[#557447] cursor-pointer leading-snug line-clamp-1"
>
${escapeHtml(product.name)}
</h3><p class="text-xs text-[#633D25]/70 mt-1.5 line-clamp-2 leading-relaxed">
${escapeHtml(product.description)}
</p></div><div class="space-y-3 pt-2 border-t border-[#633D25]/10"><div class="flex items-center justify-between"><div><span class="text-[11px] text-[#633D25]/60 font-semibold block">Harga Kemasan</span><span class="font-display font-extrabold text-xl text-[#633D25]">${formatRp(product.price)}</span></div><div class="text-right"><span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-[#557447]/15 text-[#557447]'
                            }"><span class="w-1.5 h-1.5 rounded-full ${isOut ? 'bg-red-600' : isLow ? 'bg-amber-600' : 'bg-[#557447]'
                            }"></span>
${isOut ? 'Stok Habis' : `Stok: ${product.stock}`}
</span></div></div><!-- Action Buttons: Detail Produk & Tambah ke Keranjang --><div class="grid grid-cols-5 gap-2"><button
type="button"
onclick="window.SaleeApp.openProductDetail('${product.id}')"
class="col-span-2 py-2.5 px-3 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C]/40 text-[#633D25] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
><i data-lucide="eye" class="w-3.5 h-3.5"></i><span>Detail</span></button><button
type="button"
${isOut ? 'disabled' : `onclick="window.SaleeApp.addToCart('${product.id}', 1)"`}
class="col-span-3 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${isOut
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#633D25] hover:bg-[#4e2f1c] text-white shadow-sm active:scale-95'
                            }"
><i data-lucide="shopping-cart" class="w-3.5 h-3.5 text-[#F5C84C]"></i><span>+ Keranjang</span></button></div></div></div></div>
`;
                    })
                    .join('')}
</div>
`
            }
</div></section>
`;
    }
    function renderAboutSection() {
        return `
<section id="tentang-kami" class="py-20 bg-white border-t border-[#633D25]/10"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"><!-- Visual Collage --><div class="lg:col-span-5 space-y-4"><div class="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl border-4 border-[#FFF5DF] bg-[#FFF5DF]"><img
src="./assets/images/tentang-kebun-pisang-salee.jpg"
alt="Perkebunan Pisang Kepok Tropis Keripik Pisang Salee"
class="w-full h-full object-cover object-[center_30%]"
/><div class="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-[#633D25]/90 backdrop-blur-md text-white"><div class="text-xs font-bold text-[#F5C84C] uppercase">Warisan Rasa Nusantara</div><div class="text-sm font-semibold mt-0.5">Kemitraan langsung bersama 45+ petani pisang kepok lokal Lampung & Jawa Barat.</div></div></div><div class="grid grid-cols-2 gap-4"><div class="p-5 rounded-3xl bg-[#FFF5DF] border border-[#F5C84C]/50"><div class="text-2xl font-extrabold text-[#633D25]">100% Alami</div><p class="text-xs text-[#633D25]/75 mt-1">Tanpa pemanis buatan, tanpa pengawet, dan bebas MSG berlebih.</p></div><div class="p-5 rounded-3xl bg-[#557447] text-white"><div class="text-2xl font-extrabold text-[#F5C84C]">Higienis</div><p class="text-xs text-white/85 mt-1">Menggunakan mesin spinner peniris minyak modern sehingga keripik kering & renyah.</p></div></div></div><!-- Story & Production Process --><div class="lg:col-span-7 space-y-6"><span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5C84C]/30 text-[#633D25] text-xs font-extrabold"><i data-lucide="sprout" class="w-4 h-4 text-[#557447]"></i> TENTANG KERIPIK PISANG SALEE
</span><h2 class="font-display text-3xl sm:text-4xl font-extrabold text-[#633D25] leading-tight">
Dari Kebun Tropis Pilihan Menuju Camilan Kelas Premium
</h2><p class="text-sm sm:text-base text-[#633D25]/80 leading-relaxed"><strong>Keripik Pisang Salee</strong> berawal dari dapur UMKM keluarga yang ingin mengangkat cita rasa pisang sale tradisional menjadi camilan modern berkualitas ekspor. Kami memadukan teknik penyalaian (karamelisasi alami) dengan penggorengan vakum bersuhu terkontrol agar menghasilkan tekstur super renyah tanpa menghilangkan nutrisi alami buah pisang.
</p><!-- 4 Pillars --><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 border border-[#633D25]/10 flex items-start gap-3.5"><div class="w-10 h-10 rounded-xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center shrink-0 font-bold"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div><div><h4 class="font-extrabold text-sm text-[#633D25]">Sortir Bahan Baku Ketat</h4><p class="text-xs text-[#633D25]/75 mt-1">Hanya menggunakan pisang kepok kuning dengan tingkat kematangan 85% agar manis legit alami.</p></div></div><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 border border-[#633D25]/10 flex items-start gap-3.5"><div class="w-10 h-10 rounded-xl bg-[#557447] text-white flex items-center justify-center shrink-0 font-bold"><i data-lucide="sparkles" class="w-5 h-5"></i></div><div><h4 class="font-extrabold text-sm text-[#633D25]">Bumbu & Cokelat Asli</h4><p class="text-xs text-[#633D25]/75 mt-1">Menggunakan cokelat couverture, madu hutan murni, dan bubuk matcha Uji Jepang pilihan.</p></div></div><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 border border-[#633D25]/10 flex items-start gap-3.5"><div class="w-10 h-10 rounded-xl bg-[#633D25] text-[#F5C84C] flex items-center justify-center shrink-0 font-bold"><i data-lucide="shield-check" class="w-5 h-5"></i></div><div><h4 class="font-extrabold text-sm text-[#633D25]">Kemasan Aluminium Foil</h4><p class="text-xs text-[#633D25]/75 mt-1">Dilengkapi ziplock kedap udara yang menjaga kerenyahan hingga 90 hari di suhu ruang.</p></div></div><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 border border-[#633D25]/10 flex items-start gap-3.5"><div class="w-10 h-10 rounded-xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center shrink-0 font-bold"><i data-lucide="heart-handshake" class="w-5 h-5"></i></div><div><h4 class="font-extrabold text-sm text-[#633D25]">Garansi Kepuasan Pelanggan</h4><p class="text-xs text-[#633D25]/75 mt-1">Garansi ganti baru 100% apabila kemasan diterima dalam keadaan rusak atau melempem.</p></div></div></div></div></div></div></section>
`;
    }
    function renderContactSection() {
        const s = state.db.settings;
        return `
<section id="kontak" class="py-20 bg-[#FFF5DF] border-t border-[#633D25]/10"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 lg:grid-cols-12 gap-10"><!-- Contact Info --><div class="lg:col-span-5 space-y-6"><div><span class="text-xs font-extrabold uppercase tracking-widest text-[#557447] block mb-1">Hubungi Kami</span><h2 class="font-display text-3xl font-extrabold text-[#633D25]">Siap Melayani Pesanan Eceran, Hampers & Reseller</h2><p class="text-sm text-[#633D25]/75 mt-2 leading-relaxed">
Punya pertanyaan seputar stok grosir, paket hampers hari raya, atau pengiriman luar pulau? Tim layanan pelanggan kami siap membantu Anda.
</p></div><div class="space-y-4"><div class="p-4 rounded-2xl bg-white border border-[#633D25]/10 flex items-center gap-4"><div class="w-12 h-12 rounded-2xl bg-[#557447] text-white flex items-center justify-center shrink-0"><i data-lucide="phone-call" class="w-5 h-5"></i></div><div><div class="text-xs font-bold text-[#633D25]/60">WhatsApp Layanan Pelanggan</div><div class="font-extrabold text-base text-[#633D25]">+${escapeHtml(s.whatsapp)}</div></div></div><div class="p-4 rounded-2xl bg-white border border-[#633D25]/10 flex items-center gap-4"><div class="w-12 h-12 rounded-2xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center shrink-0"><i data-lucide="map-pin" class="w-5 h-5"></i></div><div><div class="text-xs font-bold text-[#633D25]/60">Alamat Rumah Produksi & Galeri UMKM</div><div class="font-bold text-sm text-[#633D25]">${escapeHtml(s.address)}</div></div></div><div class="p-4 rounded-2xl bg-white border border-[#633D25]/10 flex items-center gap-4"><div class="w-12 h-12 rounded-2xl bg-[#633D25] text-[#F5C84C] flex items-center justify-center shrink-0"><i data-lucide="share-2" class="w-5 h-5"></i></div><div><div class="text-xs font-bold text-[#633D25]/60">Media Sosial Resmi</div><div class="font-bold text-sm text-[#633D25]">Instagram: ${escapeHtml(s.instagram)} â€¢ TikTok: ${escapeHtml(s.tiktok)}</div></div></div></div></div><!-- Customer Message Form --><div class="lg:col-span-7"><div class="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-[#633D25]/10"><h3 class="font-display text-xl font-extrabold text-[#633D25] mb-1">Formulir Pesan Pelanggan</h3><p class="text-xs text-[#633D25]/70 mb-6">Kirimkan pertanyaan, saran, atau pengajuan kemitraan reseller melalui formulir di bawah ini.</p><form onsubmit="window.SaleeApp.submitContact(event)" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Nama Lengkap *</label><input
type="text"
name="name"
required
placeholder="Contoh: Rina Kartika"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Nomor WhatsApp *</label><input
type="tel"
name="whatsapp"
required
placeholder="Contoh: 081234567890"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Topik Pesan</label><input
type="text"
name="subject"
placeholder="Contoh: Pemesanan Hampers / Info Reseller"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Isi Pesan *</label><textarea
name="message"
rows="4"
required
placeholder="Tuliskan pesan atau pertanyaan Anda..."
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
></textarea></div><button
type="submit"
class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
><i data-lucide="send" class="w-4 h-4 text-[#F5C84C]"></i><span>Kirim Pesan Sekarang</span></button></form></div></div></div></div></section>
`;
    }
    function renderFooter() {
        const s = state.db.settings;
        return `
<footer class="bg-[#633D25] text-[#FFF5DF] pt-14 pb-10 border-t-4 border-[#F5C84C]"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/15"><div class="md:col-span-2 space-y-3"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center font-extrabold"><i data-lucide="sparkles" class="w-5 h-5"></i></div><span class="font-display font-extrabold text-xl text-white">Keripik Pisang <span class="text-[#F5C84C]">Salee</span></span></div><p class="text-xs sm:text-sm text-[#FFF5DF]/80 max-w-md leading-relaxed">
${escapeHtml(s.tagline)}. Diproduksi setiap hari dengan bahan baku lokal berkualitas tinggi dari petani Nusantara.
</p><div class="text-xs text-[#F5C84C] font-semibold">
Rekening Resmi: ${escapeHtml(s.bank_name)} ${escapeHtml(s.bank_account)} a.n ${escapeHtml(s.bank_holder)}
</div></div><div><h4 class="font-extrabold text-sm text-[#F5C84C] uppercase tracking-wider mb-3">Navigasi Cepat</h4><ul class="space-y-2 text-xs sm:text-sm text-[#FFF5DF]/80"><li><a href="#beranda" class="hover:text-[#F5C84C]">Beranda</a></li><li><a href="#produk" class="hover:text-[#F5C84C]">Katalog Produk</a></li><li><a href="#tentang-kami" class="hover:text-[#F5C84C]">Tentang Kami</a></li><li><a href="#kontak" class="hover:text-[#F5C84C]">Hubungi Kami</a></li></ul></div><div><h4 class="font-extrabold text-sm text-[#F5C84C] uppercase tracking-wider mb-3">Layanan Pelanggan</h4><p class="text-xs text-[#FFF5DF]/75 mb-3">Butuh bantuan pemesanan eceran, hampers, atau kemitraan reseller?</p><a
href="#kontak"
class="px-4 py-2.5 rounded-xl bg-[#F5C84C] text-[#633D25] font-extrabold text-xs inline-flex items-center gap-2 hover:bg-amber-300 transition cursor-pointer"
><i data-lucide="message-circle" class="w-4 h-4"></i><span>Hubungi Kami</span></a></div></div><div class="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FFF5DF]/65 gap-2"><div>&copy; ${new Date().getFullYear()} ${escapeHtml(s.store_name)}. Seluruh hak cipta dilindungi.</div><div>Modern Tropical Food Branding â€¢ Fullstack E-Commerce & ERP UMKM</div></div></div></footer>
`;
    }
    function renderProductDetailModal() {
        if (!state.detailProductId) return '';
        const product = getProductById(state.detailProductId);
        if (!product) return '';
        const cat = getCategoryById(product.category_id);
        const recommendations = state.db.products
            .filter((p) => p.id !== product.id)
            .slice(0, 3);
        return `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border-2 border-[#633D25]/15 my-8"><!-- Top Bar --><div class="flex items-center justify-between px-6 py-4 bg-[#FFF5DF] border-b border-[#633D25]/10"><div class="flex items-center gap-2 text-xs font-extrabold text-[#557447]"><i data-lucide="tag" class="w-4 h-4"></i><span>${escapeHtml(cat.name)}</span><span>â€¢</span><span>SKU: ${escapeHtml(product.sku)}</span></div><button
type="button"
onclick="window.SaleeApp.closeProductDetail()"
class="p-2 rounded-xl bg-white hover:bg-red-50 text-[#633D25] hover:text-red-600 transition cursor-pointer"
><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 max-h-[82vh] overflow-y-auto"><!-- Product Photo --><div class="md:col-span-5"><div class="rounded-2xl overflow-hidden bg-[#FFF5DF] aspect-square border border-[#633D25]/10"><img
src="${escapeHtml(product.image_url)}"
alt="${escapeHtml(product.name)}"
class="w-full h-full object-cover"
/></div></div><!-- Product Info --><div class="md:col-span-7 flex flex-col justify-between space-y-5"><div class="space-y-3"><div class="flex flex-wrap items-center gap-2">
${product.is_popular
                ? `<span class="px-3 py-1 rounded-full bg-[#F5C84C] text-[#633D25] text-xs font-extrabold">ðŸ”¥ Produk Populer</span>`
                : ''
            }
<span class="px-3 py-1 rounded-full bg-[#557447]/15 text-[#557447] text-xs font-bold">
Berat Bersih: ${product.weight_grams} gram
</span><span class="px-3 py-1 rounded-full bg-[#FFF5DF] text-[#633D25] text-xs font-bold">
Terjual ${product.sold_count}+ pouch
</span></div><h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#633D25]">${escapeHtml(product.name)}</h2><div class="text-3xl font-extrabold text-[#557447]">${formatRp(product.price)}</div><p class="text-sm text-[#633D25]/80 leading-relaxed">${escapeHtml(product.description)}</p><div class="p-3.5 rounded-2xl bg-[#FFF5DF] border border-[#633D25]/10 flex items-center justify-between"><span class="text-xs font-bold text-[#633D25]">Ketersediaan Stok Gudang:</span><span class="text-xs font-extrabold ${product.stock > 0 ? 'text-[#557447]' : 'text-red-600'}">
${product.stock > 0 ? `${product.stock} Pouch Tersedia` : 'Stok Habis'}
</span></div></div><!-- Quantity Selector & Add to Cart --><div class="space-y-4 pt-3 border-t border-[#633D25]/10"><div class="flex items-center justify-between"><span class="text-xs font-extrabold text-[#633D25]">Jumlah Pembelian:</span><div class="flex items-center gap-3 bg-[#FFF5DF] px-3 py-1.5 rounded-xl border border-[#633D25]/15"><button
type="button"
onclick="window.SaleeApp.changeDetailQty(-1)"
class="w-7 h-7 rounded-lg bg-white text-[#633D25] font-extrabold flex items-center justify-center shadow-sm cursor-pointer"
>-</button><span class="font-extrabold text-sm w-8 text-center text-[#633D25]">${state.detailQty}</span><button
type="button"
onclick="window.SaleeApp.changeDetailQty(1)"
class="w-7 h-7 rounded-lg bg-white text-[#633D25] font-extrabold flex items-center justify-center shadow-sm cursor-pointer"
>+</button></div></div><div class="flex flex-wrap gap-3"><button
type="button"
${product.stock <= 0 ? 'disabled' : `onclick="window.SaleeApp.addDetailToCart(false)"`}
class="flex-1 py-3.5 px-5 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
><i data-lucide="shopping-cart" class="w-4 h-4 text-[#F5C84C]"></i><span>Tambah ke Keranjang (${formatRp(product.price * state.detailQty)})</span></button><button
type="button"
${product.stock <= 0 ? 'disabled' : `onclick="window.SaleeApp.addDetailToCart(true)"`}
class="py-3.5 px-5 rounded-2xl bg-[#F5C84C] hover:bg-amber-300 text-[#633D25] font-extrabold text-sm transition cursor-pointer"
>
Beli Sekarang
</button></div></div><!-- Rekomendasi Produk Lainnya --><div class="pt-4 border-t border-[#633D25]/10"><h4 class="text-xs font-extrabold uppercase tracking-wider text-[#633D25]/70 mb-3">Rekomendasi Produk Lainnya</h4><div class="grid grid-cols-3 gap-3">
${recommendations
                .map(
                    (rec) => `
<div
onclick="window.SaleeApp.openProductDetail('${rec.id}')"
class="p-2.5 rounded-2xl bg-[#FFF5DF]/60 hover:bg-[#FFF5DF] border border-[#633D25]/10 cursor-pointer transition flex items-center gap-2.5"
><img src="${escapeHtml(rec.image_url)}" class="w-11 h-11 rounded-xl object-cover shrink-0" /><div class="min-w-0"><div class="text-xs font-extrabold text-[#633D25] truncate">${escapeHtml(rec.name)}</div><div class="text-[11px] font-bold text-[#557447]">${formatRp(rec.price)}</div></div></div>
`
                )
                .join('')}
</div></div></div></div></div></div>
`;
    }
    function renderCartDrawer() {
        if (!state.cartDrawerOpen) return '';
        const summary = getCartSummary();
        return `
<div class="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"><div class="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl"><!-- Drawer Header --><div class="p-5 bg-[#633D25] text-white flex items-center justify-between"><div class="flex items-center gap-2.5"><i data-lucide="shopping-bag" class="w-5 h-5 text-[#F5C84C]"></i><div><h3 class="font-display font-extrabold text-lg">Keranjang Belanja</h3><p class="text-xs text-[#FFF5DF]/75">${summary.totalQty} produk dipilih</p></div></div><button
type="button"
onclick="window.SaleeApp.toggleCart(false)"
class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
><i data-lucide="x" class="w-5 h-5"></i></button></div><!-- Free Shipping Progress --><div class="px-5 py-3 bg-[#FFF5DF] border-b border-[#633D25]/10 text-xs font-bold text-[#633D25]">
${summary.amountToFreeShipping === 0 && summary.items.length > 0
                ? `<span class="text-[#557447] flex items-center gap-1.5"><i data-lucide="party-popper" class="w-4 h-4"></i> Selamat! Pesanan Anda mendapat Gratis Ongkos Kirim!</span>`
                : `Tambah belanja <strong>${formatRp(summary.amountToFreeShipping)}</strong> lagi untuk mendapatkan <strong>Gratis Ongkir!</strong>`
            }
</div><!-- Cart Items List --><div class="flex-1 overflow-y-auto p-5 space-y-4">
${summary.items.length === 0
                ? `
<div class="text-center py-16 space-y-3"><div class="w-16 h-16 rounded-3xl bg-[#FFF5DF] text-[#633D25] flex items-center justify-center mx-auto"><i data-lucide="shopping-cart" class="w-8 h-8"></i></div><h4 class="font-display font-extrabold text-base text-[#633D25]">Keranjang Masih Kosong</h4><p class="text-xs text-[#633D25]/70 max-w-xs mx-auto">Yuk pilih varian Keripik Pisang Salee favoritmu di katalog produk!</p></div>
`
                : summary.items
                    .map(
                        (item) => `
<div class="p-3.5 rounded-2xl bg-[#FFF5DF]/50 border border-[#633D25]/10 flex gap-3.5 items-center"><img
src="${escapeHtml(item.product.image_url)}"
alt="${escapeHtml(item.product.name)}"
class="w-16 h-16 rounded-xl object-cover shrink-0 border border-white"
/><div class="flex-1 min-w-0"><h4 class="font-extrabold text-sm text-[#633D25] truncate">${escapeHtml(item.product.name)}</h4><div class="text-xs text-[#633D25]/70">${formatRp(item.product.price)} / pouch</div><div class="text-xs font-extrabold text-[#557447] mt-0.5">Subtotal: ${formatRp(item.subtotal)}</div></div><div class="flex flex-col items-end gap-2"><button
type="button"
onclick="window.SaleeApp.removeFromCart('${item.product_id}')"
class="text-red-500 hover:text-red-700 p-1 cursor-pointer"
title="Hapus produk"
><i data-lucide="trash-2" class="w-4 h-4"></i></button><div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-[#633D25]/15"><button
type="button"
onclick="window.SaleeApp.updateCartQty('${item.product_id}', -1)"
class="w-6 h-6 rounded-lg bg-[#FFF5DF] text-[#633D25] font-extrabold text-xs flex items-center justify-center cursor-pointer"
>-</button><span class="text-xs font-extrabold w-6 text-center text-[#633D25]">${item.quantity}</span><button
type="button"
onclick="window.SaleeApp.updateCartQty('${item.product_id}', 1)"
class="w-6 h-6 rounded-lg bg-[#FFF5DF] text-[#633D25] font-extrabold text-xs flex items-center justify-center cursor-pointer"
>+</button></div></div></div>
`
                    )
                    .join('')
            }
</div><!-- Cart Footer Totals & Checkout CTA --><div class="p-5 bg-[#FFF5DF] border-t border-[#633D25]/15 space-y-3"><div class="space-y-1.5 text-xs sm:text-sm"><div class="flex justify-between text-[#633D25]/80"><span>Subtotal Produk (${summary.totalQty} pouch)</span><span class="font-bold">${formatRp(summary.subtotal)}</span></div><div class="flex justify-between text-[#633D25]/80"><span>Estimasi Ongkos Kirim</span><span class="font-bold">${summary.shipping === 0 && summary.items.length > 0 ? 'GRATIS' : formatRp(summary.shipping)}</span></div><div class="flex justify-between text-base font-extrabold text-[#633D25] pt-2 border-t border-[#633D25]/10"><span>Total Belanja</span><span class="text-[#557447]">${formatRp(summary.total)}</span></div></div><button
type="button"
${summary.items.length === 0 ? 'disabled' : 'onclick="window.SaleeApp.openCheckout()"'}
class="w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${summary.items.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#633D25] hover:bg-[#4e2f1c] text-white shadow-lg'
            }"
><i data-lucide="credit-card" class="w-4 h-4 text-[#F5C84C]"></i><span>Lanjut ke Checkout</span></button></div></div></div>
`;
    }
    function renderCheckoutModal() {
        if (!state.checkoutOpen) return '';
        const summary = getCartSummary();
        const s = state.db.settings;
        const f = state.checkoutForm || {};
        const pm = f.paymentMethod || 'Transfer Bank';
        return `
<div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border-2 border-[#633D25]/15 my-4 sm:my-8"><div class="px-5 sm:px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><div class="flex items-center gap-2.5"><i data-lucide="shield-check" class="w-5 h-5 text-[#F5C84C]"></i><h3 class="font-display font-extrabold text-base sm:text-lg">Formulir Checkout & Pengiriman</h3></div><button
type="button"
onclick="window.SaleeApp.closeCheckout()"
class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
><i data-lucide="x" class="w-5 h-5"></i></button></div><form onsubmit="window.SaleeApp.submitCheckout(event)" class="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 max-h-[85vh] overflow-y-auto"><!-- Left: Customer Form --><div class="lg:col-span-7 space-y-4"><h4 class="font-display font-extrabold text-base text-[#633D25] border-b border-[#633D25]/10 pb-2">1. Informasi Penerima</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Lengkap Penerima *</label><input
type="text"
name="customerName"
required
value="${escapeHtml(f.customerName || '')}"
oninput="window.SaleeApp.updateCheckoutField('customerName', this.value, false)"
placeholder="Masukkan nama lengkap Anda"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nomor WhatsApp Aktif *</label><input
type="tel"
name="customerWhatsapp"
required
value="${escapeHtml(f.customerWhatsapp || '')}"
oninput="window.SaleeApp.updateCheckoutField('customerWhatsapp', this.value, false)"
placeholder="Contoh: 081234567890"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div></div><h4 class="font-display font-extrabold text-base text-[#633D25] border-b border-[#633D25]/10 pb-2 pt-2">2. Alamat Pengiriman Terstruktur</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Provinsi *</label><select
name="province"
required
onchange="window.SaleeApp.updateCheckoutField('province', this.value, true)"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-semibold text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
><option value="">-- Pilih Provinsi --</option>
${INDONESIA_PROVINCES.map((prov) => `<option value="${escapeHtml(prov)}" ${f.province === prov ? 'selected' : ''}>${escapeHtml(prov)}</option>`).join('')}
</select></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Kabupaten / Kota *</label><input
type="text"
name="city"
required
value="${escapeHtml(f.city || '')}"
oninput="window.SaleeApp.updateCheckoutField('city', this.value, false)"
placeholder="Contoh: Kota Bandung"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Kecamatan *</label><input
type="text"
name="district"
required
value="${escapeHtml(f.district || '')}"
oninput="window.SaleeApp.updateCheckoutField('district', this.value, false)"
placeholder="Contoh: Coblong"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Desa / Kelurahan *</label><input
type="text"
name="village"
required
value="${escapeHtml(f.village || '')}"
oninput="window.SaleeApp.updateCheckoutField('village', this.value, false)"
placeholder="Contoh: Dago"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3.5"><div class="sm:col-span-2"><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Jalan & Nomor Rumah *</label><input
type="text"
name="streetAddress"
required
value="${escapeHtml(f.streetAddress || '')}"
oninput="window.SaleeApp.updateCheckoutField('streetAddress', this.value, false)"
placeholder="Contoh: Jl. Dago Asri No. 42, RT 02 / RW 05"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Kode Pos (5 Digit) *</label><input
type="text"
name="postalCode"
required
maxlength="5"
pattern="[0-9]{5}"
value="${escapeHtml(f.postalCode || '')}"
oninput="window.SaleeApp.updateCheckoutField('postalCode', this.value, false)"
placeholder="Contoh: 40135"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div></div></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Catatan Pesanan (Opsional)</label><input
type="text"
name="notes"
value="${escapeHtml(f.notes || '')}"
oninput="window.SaleeApp.updateCheckoutField('notes', this.value, false)"
placeholder="Contoh: Tolong bungkus bubble wrap tebal untuk oleh-oleh"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><h4 class="font-display font-extrabold text-base text-[#633D25] border-b border-[#633D25]/10 pb-2 pt-2">3. Pilih Metode Pembayaran</h4><div class="space-y-2.5"><label class="flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${pm === 'Transfer Bank' ? 'bg-[#FFF5DF] border-[#633D25]' : 'bg-[#FFF5DF]/50 border-[#633D25]/15 hover:border-[#633D25]/50'}"><input type="radio" name="paymentMethod" value="Transfer Bank" ${pm === 'Transfer Bank' ? 'checked' : ''} onchange="window.SaleeApp.updateCheckoutField('paymentMethod', 'Transfer Bank', true)" class="mt-1 accent-[#633D25]" /><div class="text-xs flex-1 space-y-1.5"><div class="font-extrabold text-sm text-[#633D25]">Transfer ${escapeHtml(s.bank_name)}</div><div class="text-[#633D25]/80">Atas Nama: <strong>${escapeHtml(s.bank_holder)}</strong></div><div class="flex flex-wrap items-center gap-2"><span class="font-mono font-extrabold text-sm bg-white px-2.5 py-1 rounded-lg border border-[#633D25]/20 text-[#633D25]">${escapeHtml(s.bank_account)}</span><button type="button" onclick="window.SaleeApp.copyBankAccount()" class="px-2.5 py-1 rounded-lg bg-[#633D25] text-[#F5C84C] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"><i data-lucide="copy" class="w-3 h-3"></i> Salin No. Rekening</button></div><p class="text-[11px] text-[#633D25]/75">Instruksi: Lakukan transfer sesuai total pembayaran, lalu kirim bukti transfer ke Admin. Status pesanan akan tercatat sebagai <strong>Menunggu Pembayaran</strong>.</p></div></label>
${s.cod_enabled
                ? `
<label class="flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${pm === 'COD' ? 'bg-[#FFF5DF] border-[#633D25]' : 'bg-[#FFF5DF]/50 border-[#633D25]/15 hover:border-[#633D25]/50'}"><input type="radio" name="paymentMethod" value="COD" ${pm === 'COD' ? 'checked' : ''} onchange="window.SaleeApp.updateCheckoutField('paymentMethod', 'COD', true)" class="mt-1 accent-[#633D25]" /><div class="text-xs space-y-1"><div class="font-extrabold text-sm text-[#633D25]">COD (Bayar di Tempat)</div><p class="text-[#633D25]/75">Instruksi: Pembayaran dilakukan secara tunai langsung kepada kurir saat paket Keripik Pisang Salee diterima di alamat Anda. Pastikan nomor WhatsApp aktif untuk koordinasi kurir.</p></div></label>
`
                : ''
            }
<label class="flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${pm === 'WhatsApp' ? 'bg-[#FFF5DF] border-[#633D25]' : 'bg-[#FFF5DF]/50 border-[#633D25]/15 hover:border-[#633D25]/50'}"><input type="radio" name="paymentMethod" value="WhatsApp" ${pm === 'WhatsApp' ? 'checked' : ''} onchange="window.SaleeApp.updateCheckoutField('paymentMethod', 'WhatsApp', true)" class="mt-1 accent-[#633D25]" /><div class="text-xs space-y-1"><div class="font-extrabold text-sm text-[#633D25]">Konfirmasi Pesanan melalui WhatsApp</div><p class="text-[#633D25]/75">Instruksi: Setelah menekan tombol buat pesanan, Anda dapat langsung mengirimkan ringkasan pesanan otomatis (nama, alamat, daftar produk, & total) ke WhatsApp Admin resmi kami.</p></div></label></div></div><!-- Right: Order Summary --><div class="lg:col-span-5 flex flex-col justify-between bg-[#FFF5DF] rounded-3xl p-5 sm:p-6 border border-[#633D25]/15 space-y-5 h-fit lg:sticky lg:top-0"><div class="space-y-4"><h4 class="font-display font-extrabold text-base text-[#633D25]">Ringkasan Pesanan (${summary.totalQty} Pouch)</h4><div class="space-y-3 max-h-64 overflow-y-auto pr-1">
${summary.items
                .map(
                    (i) => `
<div class="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#633D25]/10"><div class="flex items-center gap-2.5 min-w-0"><img src="${escapeHtml(i.product.image_url)}" class="w-12 h-12 rounded-xl object-cover shrink-0" /><div class="min-w-0"><div class="text-xs font-extrabold text-[#633D25] truncate">${escapeHtml(i.product.name)}</div><div class="text-[11px] text-[#633D25]/65">${i.product.weight_grams}g • ${formatRp(i.product.price)}/pouch</div><div class="flex items-center gap-1.5 mt-1"><button type="button" onclick="window.SaleeApp.updateCartQty('${i.product_id}', -1)" class="w-5 h-5 rounded bg-[#FFF5DF] text-[#633D25] font-extrabold text-xs cursor-pointer">-</button><span class="text-xs font-extrabold px-1">${i.quantity}</span><button type="button" onclick="window.SaleeApp.updateCartQty('${i.product_id}', 1)" class="w-5 h-5 rounded bg-[#FFF5DF] text-[#633D25] font-extrabold text-xs cursor-pointer">+</button></div></div></div><div class="text-xs font-extrabold text-[#633D25] shrink-0">${formatRp(i.subtotal)}</div></div>
`
                )
                .join('')}
</div>
${summary.shippingStatus === 'unavailable'
                ? `<div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-semibold">Tarif pengiriman untuk provinsi <strong>${escapeHtml(f.province)}</strong> belum tersedia di sistem. Ongkos kirim akan dikonfirmasi oleh Admin sebelum pengiriman.</div>`
                : ''
            }
<div class="space-y-2 pt-3 border-t border-[#633D25]/15 text-xs sm:text-sm"><div class="flex justify-between text-[#633D25]/80"><span>Subtotal Produk</span><span class="font-bold">${formatRp(summary.subtotal)}</span></div><div class="flex justify-between text-[#633D25]/80"><span>Biaya Pengiriman ${f.province ? `(${escapeHtml(f.province)})` : ''}</span><span class="font-bold text-right">${escapeHtml(summary.shippingLabel)}</span></div>${summary.discount > 0 ? `<div class="flex justify-between text-[#557447]"><span>Diskon</span><span class="font-bold">-${formatRp(summary.discount)}</span></div>` : ''}<div class="flex justify-between text-lg font-extrabold text-[#633D25] pt-2 border-t border-[#633D25]/15"><span>Total Pembayaran</span><span class="text-[#557447]">${formatRp(summary.total)}</span></div></div></div><button
type="submit"
${state.isSubmittingOrder ? 'disabled' : ''}
class="w-full py-4 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer"
><i data-lucide="${state.isSubmittingOrder ? 'loader-2' : 'check-circle-2'}" class="w-5 h-5 text-[#F5C84C] ${state.isSubmittingOrder ? 'animate-spin' : ''}"></i><span>${state.isSubmittingOrder ? 'Memproses Pesanan...' : 'Buat Pesanan Sekarang'}</span></button></div></form></div></div>
`;
    }
    function renderOrderSuccessModal() {
        if (!state.orderSuccessData) return '';
        const d = state.orderSuccessData;
        const s = state.db.settings;
        const itemsText = (d.items || [])
            .map((i) => `  - ${i.product.name} (${i.quantity}x) = ${formatRp(i.subtotal)}`)
            .join('\n');
        const waText = encodeURIComponent(
            `Halo Admin *${s.store_name}*! Saya ingin mengonfirmasi pesanan saya:\n\n` +
            `• No. Pesanan: *${d.orderNumber}*\n` +
            `• Nama: ${d.customerName}\n` +
            `• No. WhatsApp: ${d.customerWhatsapp}\n` +
            `• Alamat: ${d.shippingAddress}\n` +
            `• Daftar Produk:\n${itemsText}\n` +
            `• Metode Bayar: ${d.paymentMethod}\n` +
            `• Total Pembayaran: *${formatRp(d.totalAmount)}*\n\nMohon segera diproses ya kak, terima kasih!`
        );
        const waUrl = `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${waText}`;
        return `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 text-center shadow-2xl border-4 border-[#F5C84C] space-y-5 my-6"><div class="w-16 h-16 rounded-full bg-[#557447]/15 text-[#557447] flex items-center justify-center mx-auto"><i data-lucide="check-circle-2" class="w-10 h-10"></i></div><div class="space-y-1"><span class="px-3 py-1 rounded-full bg-[#F5C84C] text-[#633D25] text-xs font-extrabold uppercase">Pesanan Berhasil Dibuat</span><h3 class="font-display text-2xl font-extrabold text-[#633D25] pt-1">Terima Kasih, ${escapeHtml(d.customerName)}!</h3><p class="text-xs sm:text-sm text-[#633D25]/75">Pesanan Anda telah tersimpan dan siap diproses.</p></div><div class="p-4 rounded-2xl bg-[#FFF5DF] border border-[#633D25]/15 text-left space-y-2 text-xs sm:text-sm"><div class="flex justify-between gap-2"><span class="text-[#633D25]/70">Nomor Pesanan:</span><span class="font-extrabold text-[#633D25] font-mono">${escapeHtml(d.orderNumber)}</span></div><div class="flex justify-between gap-2"><span class="text-[#633D25]/70">Status Pesanan:</span><span>${renderOrderStatusBadge(d.status || 'Menunggu Pembayaran')}</span></div><div class="flex justify-between gap-2"><span class="text-[#633D25]/70">Metode Pembayaran:</span><span class="font-bold text-[#633D25]">${escapeHtml(d.paymentMethod)}</span></div><div class="pt-2 border-t border-[#633D25]/10"><div class="text-[11px] font-bold text-[#633D25]/70 mb-1">Alamat Pengiriman:</div><div class="text-xs text-[#633D25] font-semibold">${escapeHtml(d.shippingAddress)}</div></div><div class="pt-2 border-t border-[#633D25]/10 space-y-1"><div class="text-[11px] font-bold text-[#633D25]/70">Produk Dipesan:</div>${(d.items || []).map((i) => `<div class="flex justify-between text-xs"><span>${escapeHtml(i.product.name)} (${i.quantity}x)</span><span class="font-bold">${formatRp(i.subtotal)}</span></div>`).join('')}</div><div class="flex justify-between pt-2 border-t border-[#633D25]/15"><span class="font-bold text-[#633D25]">Total Pembayaran:</span><span class="font-extrabold text-[#557447] text-base">${formatRp(d.totalAmount)}</span></div>
${d.paymentMethod === 'Transfer Bank'
                ? `
<div class="pt-2 mt-1 border-t border-[#633D25]/10 text-xs text-[#633D25] flex flex-wrap items-center justify-between gap-2">
<span>Transfer ke <strong>${escapeHtml(s.bank_name)} ${escapeHtml(s.bank_account)}</strong> a.n ${escapeHtml(s.bank_holder)}.</span>
<button type="button" onclick="window.SaleeApp.copyBankAccount()" class="px-2.5 py-1 rounded-lg bg-[#633D25] text-[#F5C84C] font-bold text-[11px] cursor-pointer">Salin Rek</button>
</div>
`
                : ''
            }
</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1"><button
type="button"
onclick="window.SaleeApp.openCustomerOrderDetail('${d.orderId}')"
class="py-3 px-3 rounded-2xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] border border-[#633D25]/20 font-extrabold text-xs cursor-pointer"
>Lihat Detail Pesanan</button><a
href="${waUrl}"
target="_blank"
rel="noopener noreferrer"
class="py-3 px-3 rounded-2xl bg-[#557447] hover:bg-[#445e38] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md"
><i data-lucide="message-circle" class="w-4 h-4"></i><span>WhatsApp Admin</span></a><button
type="button"
onclick="window.SaleeApp.closeOrderSuccess()"
class="py-3 px-3 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-xs cursor-pointer"
>Halaman Utama</button></div></div></div>
`;
    }
    function renderCustomerOrderDetailModal() {
        if (!state.customerOrderDetailId) return '';
        const order = state.db.orders.find((o) => o.id === state.customerOrderDetailId);
        if (!order) return '';
        const items = state.db.order_items.filter((oi) => oi.order_id === order.id);
        return `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border-2 border-[#633D25]/15 my-8"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><div><span class="text-[11px] text-[#F5C84C] font-mono font-bold">${escapeHtml(order.order_number)}</span><h3 class="font-display font-extrabold text-lg">Detail & Status Pesanan</h3></div><button type="button" onclick="window.SaleeApp.closeCustomerOrderDetail()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm"><div class="p-4 rounded-2xl bg-[#FFF5DF] space-y-1.5"><div class="flex justify-between"><span class="text-[#633D25]/70">Status Saat Ini:</span>${renderOrderStatusBadge(order.status)}</div><div class="flex justify-between"><span class="text-[#633D25]/70">Tanggal Pesan:</span><span class="font-bold">${formatDateID(order.created_at)}</span></div><div class="flex justify-between"><span class="text-[#633D25]/70">Penerima:</span><span class="font-extrabold">${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_whatsapp)})</span></div><div class="pt-1 text-xs text-[#633D25]/85"><strong>Alamat:</strong> ${escapeHtml(order.shipping_address)}</div></div><div class="divide-y divide-[#633D25]/10 border border-[#633D25]/10 rounded-2xl overflow-hidden">${items.map((oi) => `<div class="p-3 flex items-center justify-between bg-white"><div class="flex items-center gap-3"><img src="${escapeHtml(oi.product_image)}" class="w-11 h-11 rounded-xl object-cover" /><div><div class="font-extrabold text-[#633D25]">${escapeHtml(oi.product_name)}</div><div class="text-xs text-[#633D25]/65">${oi.quantity} x ${formatRp(oi.unit_price)}</div></div></div><div class="font-extrabold text-[#557447]">${formatRp(oi.subtotal)}</div></div>`).join('')}</div><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 space-y-1.5"><div class="flex justify-between"><span>Subtotal</span><span class="font-bold">${formatRp(order.subtotal)}</span></div><div class="flex justify-between"><span>Ongkos Kirim</span><span class="font-bold">${order.shipping_status === 'unavailable' ? 'Konfirmasi Admin' : formatRp(order.shipping_cost)}</span></div><div class="flex justify-between text-base font-extrabold text-[#633D25] pt-2 border-t border-[#633D25]/10"><span>Total Pembayaran</span><span class="text-[#557447]">${formatRp(order.total_amount)}</span></div></div><button type="button" onclick="window.SaleeApp.closeCustomerOrderDetail()" class="w-full py-3 rounded-2xl bg-[#633D25] text-white font-extrabold text-sm cursor-pointer">Tutup Detail Pesanan</button></div></div></div>
`;
    }
    function renderAuthModal() {
        if (!state.authModalOpen) return '';
        return `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div class="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-[#633D25]/15"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="user" class="w-5 h-5 text-[#F5C84C]"></i><h3 class="font-display font-extrabold text-lg">Akun Pelanggan Salee</h3></div><button
type="button"
onclick="window.SaleeApp.closeAuthModal()"
class="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 space-y-5"><div class="p-4 rounded-2xl bg-[#FFF5DF] border border-[#F5C84C] space-y-2.5"><div class="text-xs font-extrabold text-[#633D25] uppercase tracking-wider">Login Cepat Pelanggan:</div><button
type="button"
onclick="window.SaleeApp.loginDemoCustomer()"
class="w-full py-2.5 px-3 rounded-xl bg-[#557447] hover:bg-[#445e38] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
><i data-lucide="user" class="w-4 h-4"></i><span>Masuk sebagai Pelanggan Demo</span></button></div><form onsubmit="window.SaleeApp.submitAuth(event)" class="space-y-3.5"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Lengkap</label><input
type="text"
name="fullName"
placeholder="Contoh: Nadia Putri"
class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/50 border border-[#633D25]/20 text-sm"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Email Pelanggan *</label><input
type="email"
name="email"
required
placeholder="nama@email.com"
class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/50 border border-[#633D25]/20 text-sm"
/></div><button
type="submit"
class="w-full py-3 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-sm cursor-pointer"
>Masuk / Daftar Pelanggan</button></form></div></div></div>
`;
    }
    function renderOwnerLoginPage() {
        return `
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF5DF] via-[#FFF5DF] to-[#F5C84C]/35 p-4"><div class="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-[#633D25]/15 overflow-hidden"><div class="px-6 py-6 bg-[#633D25] text-white text-center space-y-2"><div class="w-14 h-14 rounded-2xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center mx-auto shadow-lg"><i data-lucide="shield-check" class="w-7 h-7"></i></div><h1 class="font-display text-xl font-extrabold">Login Owner / Admin</h1><p class="text-xs text-[#FFF5DF]/80">Portal Khusus Pengelola UMKM Keripik Pisang Salee</p></div><form onsubmit="window.SaleeApp.submitAdminAuth(event)" class="p-6 sm:p-8 space-y-4">
${state.adminLoginError
                ? `<div class="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"><i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i><span>${escapeHtml(state.adminLoginError)}</span></div>`
                : ''
            }
<div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Email Owner *</label><input
type="email"
name="email"
required
autocomplete="email"
placeholder="Masukkan email Owner"
class="w-full px-4 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1.5">Password *</label><div class="relative"><input
type="${state.showOwnerPassword ? 'text' : 'password'}"
name="password"
required
autocomplete="current-password"
placeholder="Masukkan password Owner"
class="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm text-[#633D25] focus:outline-none focus:ring-2 focus:ring-[#F5C84C]"
/><button
type="button"
onclick="window.SaleeApp.toggleOwnerPassword()"
aria-label="Tampilkan atau sembunyikan password"
class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#633D25]/70 hover:text-[#633D25] cursor-pointer"
><i data-lucide="${state.showOwnerPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i></button></div></div><button
type="submit"
${state.adminLoginLoading ? 'disabled' : ''}
class="w-full py-3.5 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
><i data-lucide="${state.adminLoginLoading ? 'loader-2' : 'log-in'}" class="w-4 h-4 text-[#F5C84C] ${state.adminLoginLoading ? 'animate-spin' : ''}"></i><span>${state.adminLoginLoading ? 'Memverifikasi...' : 'Masuk Dashboard Admin'}</span></button><div class="pt-3 border-t border-[#633D25]/10 text-center"><button
type="button"
onclick="window.SaleeApp.switchToStore()"
class="text-xs font-bold text-[#633D25]/70 hover:text-[#633D25] inline-flex items-center gap-1 cursor-pointer"
><i data-lucide="arrow-left" class="w-3.5 h-3.5"></i><span>Kembali ke Website Toko</span></button></div></form></div></div>
`;
    }
    function getAdminStats() {
        const validOrders = state.db.orders.filter((o) => o.status !== 'Dibatalkan');
        const completedOrders = state.db.orders.filter((o) => o.status === 'Selesai');
        const pendingOrders = state.db.orders.filter((o) => o.status === 'Menunggu Pembayaran');
        const totalSales = validOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
        const completedRevenue = completedOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
        const lowStockProducts = state.db.products.filter((p) => p.stock <= p.min_stock);
        const outOfStockProducts = state.db.products.filter((p) => p.stock <= 0);
        let totalUnitsSold = 0;
        validOrders.forEach((o) => {
            const items = state.db.order_items.filter((oi) => oi.order_id === o.id);
            items.forEach((i) => {
                totalUnitsSold += Number(i.quantity) || 0;
            });
        });
        return {
            totalSales,
            completedRevenue,
            totalOrders: state.db.orders.length,
            validOrdersCount: validOrders.length,
            pendingOrdersCount: pendingOrders.length,
            totalProducts: state.db.products.length,
            totalCustomers: state.db.customers.length,
            lowStockProducts,
            outOfStockProducts,
            totalUnitsSold,
            avgOrderValue: validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0,
        };
    }
    function renderInteractiveSalesChart() {
        const isDaily = state.chartPeriod === 'daily';
        const dataPoints = isDaily
            ? [
                { label: '12 Nov', value: 132000, orders: 1 },
                { label: '13 Nov', value: 95000, orders: 1 },
                { label: '14 Nov', value: 152000, orders: 1 },
                { label: '15 Nov', value: 194000, orders: 1 },
                { label: '16 Nov', value: 198000, orders: 1 },
                { label: '17 Nov', value: 154000, orders: 1 },
                {
                    label: '18 Nov',
                    value: state.db.orders
                        .filter((o) => o.created_at.startsWith('2026-11-18') && o.status !== 'Dibatalkan')
                        .reduce((a, b) => a + b.total_amount, 0),
                    orders: state.db.orders.filter((o) => o.created_at.startsWith('2026-11-18')).length,
                },
            ]
            : [
                { label: 'Jun', value: 2450000, orders: 18 },
                { label: 'Jul', value: 3120000, orders: 24 },
                { label: 'Agu', value: 3890000, orders: 29 },
                { label: 'Sep', value: 4250000, orders: 33 },
                { label: 'Okt', value: 5180000, orders: 41 },
                {
                    label: 'Nov',
                    value:
                        4850000 +
                        state.db.orders
                            .filter((o) => o.status !== 'Dibatalkan')
                            .reduce((a, b) => a + b.total_amount, 0),
                    orders: 35 + state.db.orders.length,
                },
            ];
        const maxVal = Math.max(...dataPoints.map((d) => d.value), 100000);
        const chartWidth = 640;
        const chartHeight = 210;
        const padX = 42;
        const padY = 24;
        const usableW = chartWidth - padX * 2;
        const usableH = chartHeight - padY * 2;
        const coords = dataPoints.map((d, idx) => {
            const x = padX + (idx / Math.max(1, dataPoints.length - 1)) * usableW;
            const y = padY + usableH - (d.value / maxVal) * usableH;
            return { x, y, ...d };
        });
        const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
        const areaPoints = `${coords[0].x},${padY + usableH} ${polylinePoints} ${coords[coords.length - 1].x},${padY + usableH}`;
        return `
<div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm"><div class="flex flex-wrap items-center justify-between gap-3 mb-5"><div><h3 class="font-display font-extrabold text-base sm:text-lg text-[#633D25]">Grafik Penjualan ${isDaily ? 'Harian (7 Hari Terakhir)' : 'Bulanan (6 Bulan Terakhir)'}</h3><p class="text-xs text-[#633D25]/65">Tren omzet pendapatan Keripik Pisang Salee secara real-time</p></div><div class="inline-flex rounded-xl bg-[#FFF5DF] p-1 border border-[#633D25]/10"><button
type="button"
onclick="window.SaleeApp.setChartPeriod('daily')"
class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${isDaily ? 'bg-[#633D25] text-[#F5C84C]' : 'text-[#633D25]'
            }"
>Harian</button><button
type="button"
onclick="window.SaleeApp.setChartPeriod('monthly')"
class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${!isDaily ? 'bg-[#633D25] text-[#F5C84C]' : 'text-[#633D25]'
            }"
>Bulanan</button></div></div><div class="w-full overflow-x-auto"><svg viewBox="0 0 ${chartWidth} ${chartHeight + 25}" class="w-full h-60 overflow-visible"><defs><linearGradient id="saleeAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5C84C" stop-opacity="0.65" /><stop offset="100%" stop-color="#F5C84C" stop-opacity="0.02" /></linearGradient></defs><!-- Grid lines -->
${[0, 0.25, 0.5, 0.75, 1]
                .map((ratio) => {
                    const y = padY + ratio * usableH;
                    return `<line x1="${padX}" y1="${y}" x2="${chartWidth - padX}" y2="${y}" stroke="#633D25" stroke-opacity="0.08" stroke-dasharray="4 4" />`;
                })
                .join('')}
<!-- Polygon Area --><polygon points="${areaPoints}" fill="url(#saleeAreaGrad)" /><!-- Line --><polyline fill="none" stroke="#633D25" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" /><!-- Data Nodes & Labels -->
${coords
                .map(
                    (c) => `
<g class="group"><circle cx="${c.x}" cy="${c.y}" r="6" fill="#F5C84C" stroke="#633D25" stroke-width="2.5" /><text x="${c.x}" y="${c.y - 12}" text-anchor="middle" font-size="10" font-weight="700" fill="#633D25">
${formatRp(c.value).replace('Rp', '').trim()}
</text><text x="${c.x}" y="${padY + usableH + 20}" text-anchor="middle" font-size="11" font-weight="700" fill="#633D25">
${c.label}
</text></g>
`
                )
                .join('')}
</svg></div></div>
`;
    }
    function renderBestSellerChart() {
        const sorted = [...state.db.products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 5);
        const maxSold = Math.max(...sorted.map((p) => p.sold_count || 1), 10);
        return `
<div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm flex flex-col justify-between"><div><div class="flex items-center justify-between mb-4"><div><h3 class="font-display font-extrabold text-base sm:text-lg text-[#633D25]">Grafik Produk Terlaris</h3><p class="text-xs text-[#633D25]/65">Top 5 varian berdasarkan jumlah pouch terjual</p></div><span class="p-2 rounded-xl bg-[#F5C84C]/30 text-[#633D25]"><i data-lucide="bar-chart-3" class="w-5 h-5"></i></span></div><div class="space-y-3.5 mt-2">
${sorted
                .map((p, idx) => {
                    const pct = Math.min(100, Math.round(((p.sold_count || 0) / maxSold) * 100));
                    const barColors = ['bg-[#633D25]', 'bg-[#557447]', 'bg-[#d97706]', 'bg-[#8f4526]', 'bg-[#633D25]/80'];
                    return `
<div class="space-y-1"><div class="flex items-center justify-between text-xs"><span class="font-extrabold text-[#633D25] truncate pr-2">${idx + 1}. ${escapeHtml(p.name)}</span><span class="font-extrabold text-[#557447] shrink-0">${p.sold_count} pouch</span></div><div class="w-full h-3 rounded-full bg-[#FFF5DF] overflow-hidden"><div class="h-full rounded-full ${barColors[idx % barColors.length]}" style="width: ${pct}%"></div></div></div>
`;
                })
                .join('')}
</div></div><div class="mt-5 pt-4 border-t border-[#633D25]/10 flex items-center justify-between text-xs text-[#633D25]/75"><span>Varian Unggulan Utama:</span><span class="font-extrabold text-[#633D25]">${sorted[0] ? escapeHtml(sorted[0].name) : '-'}</span></div></div>
`;
    }
    function renderAdminDashboardOverview() {
        const stats = getAdminStats();
        const recentOrders = state.db.orders.slice(0, 5);
        return `
<div class="space-y-6"><!-- 4 Kartu Statistik Utama --><div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"><div class="bg-white rounded-3xl p-5 border border-[#633D25]/10 shadow-sm flex items-center justify-between"><div><span class="text-xs font-bold text-[#633D25]/60 uppercase">Total Penjualan</span><div class="font-display text-2xl font-extrabold text-[#633D25] mt-1">${formatRp(stats.totalSales)}</div><span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#557447] mt-1"><i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +18.4% bulan ini
</span></div><div class="w-12 h-12 rounded-2xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center"><i data-lucide="wallet" class="w-6 h-6"></i></div></div><div class="bg-white rounded-3xl p-5 border border-[#633D25]/10 shadow-sm flex items-center justify-between"><div><span class="text-xs font-bold text-[#633D25]/60 uppercase">Total Pesanan</span><div class="font-display text-2xl font-extrabold text-[#633D25] mt-1">${stats.totalOrders} Transaksi</div><span class="text-[11px] font-bold text-amber-700 mt-1 block">
${stats.pendingOrdersCount} menunggu konfirmasi
</span></div><div class="w-12 h-12 rounded-2xl bg-[#633D25] text-[#F5C84C] flex items-center justify-center"><i data-lucide="shopping-cart" class="w-6 h-6"></i></div></div><div class="bg-white rounded-3xl p-5 border border-[#633D25]/10 shadow-sm flex items-center justify-between"><div><span class="text-xs font-bold text-[#633D25]/60 uppercase">Total Produk</span><div class="font-display text-2xl font-extrabold text-[#633D25] mt-1">${stats.totalProducts} Varian</div><span class="text-[11px] font-bold text-[#557447] mt-1 block">
${state.db.categories.length} kategori aktif
</span></div><div class="w-12 h-12 rounded-2xl bg-[#557447] text-white flex items-center justify-center"><i data-lucide="package" class="w-6 h-6"></i></div></div><div class="bg-white rounded-3xl p-5 border border-[#633D25]/10 shadow-sm flex items-center justify-between"><div><span class="text-xs font-bold text-[#633D25]/60 uppercase">Total Pelanggan</span><div class="font-display text-2xl font-extrabold text-[#633D25] mt-1">${stats.totalCustomers} Pelanggan</div><span class="text-[11px] font-bold text-[#557447] mt-1 block">
AOV: ${formatRp(stats.avgOrderValue)}
</span></div><div class="w-12 h-12 rounded-2xl bg-[#FFF5DF] text-[#633D25] border border-[#633D25]/15 flex items-center justify-center"><i data-lucide="users" class="w-6 h-6"></i></div></div></div><!-- Grafik Penjualan & Grafik Produk Terlaris --><div class="grid grid-cols-1 lg:grid-cols-12 gap-6"><div class="lg:col-span-7">
${renderInteractiveSalesChart()}
</div><div class="lg:col-span-5">
${renderBestSellerChart()}
</div></div><!-- Ringkasan Pendapatan, Daftar Stok Hampir Habis, dan Aktivitas Pesanan Terbaru --><div class="grid grid-cols-1 lg:grid-cols-12 gap-6"><!-- Aktivitas Pesanan Terbaru --><div class="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm"><div class="flex items-center justify-between mb-4"><div><h3 class="font-display font-extrabold text-base sm:text-lg text-[#633D25]">Aktivitas Pesanan Terbaru</h3><p class="text-xs text-[#633D25]/65">Pantau transaksi masuk dan ubah status secara cepat</p></div><button
type="button"
onclick="window.SaleeApp.setAdminTab('orders')"
class="text-xs font-extrabold text-[#557447] hover:underline cursor-pointer"
>Lihat Semua</button></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="border-b border-[#633D25]/10 text-[11px] uppercase text-[#633D25]/60"><th class="py-2.5 pr-3">No. Invoice</th><th class="py-2.5 px-3">Pelanggan</th><th class="py-2.5 px-3">Total</th><th class="py-2.5 px-3">Status</th><th class="py-2.5 pl-3 text-right">Aksi</th></tr></thead><tbody class="divide-y divide-[#633D25]/10 text-xs">
${recentOrders
                .map(
                    (o) => `
<tr class="hover:bg-[#FFF5DF]/40"><td class="py-3 pr-3 font-mono font-bold text-[#633D25]">${escapeHtml(o.order_number)}</td><td class="py-3 px-3"><div class="font-bold text-[#633D25]">${escapeHtml(o.customer_name)}</div><div class="text-[11px] text-[#633D25]/60">${escapeHtml(o.payment_method)}</div></td><td class="py-3 px-3 font-extrabold text-[#557447]">${formatRp(o.total_amount)}</td><td class="py-3 px-3">${renderOrderStatusBadge(o.status)}</td><td class="py-3 pl-3 text-right"><button
type="button"
onclick="window.SaleeApp.openOrderDetail('${o.id}')"
class="px-2.5 py-1 rounded-lg bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] font-bold text-[11px] cursor-pointer"
>Detail</button></td></tr>
`
                )
                .join('')}
</tbody></table></div></div><!-- Daftar Stok Hampir Habis & Ringkasan Pendapatan --><div class="lg:col-span-5 space-y-6"><!-- Daftar Stok Hampir Habis --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-2"><i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600"></i><h3 class="font-display font-extrabold text-base text-[#633D25]">Daftar Stok Hampir Habis</h3></div><span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
${stats.lowStockProducts.length} Produk
</span></div>
${stats.lowStockProducts.length === 0
                ? `<p class="text-xs text-[#557447] font-bold py-4">Semua stok produk berada di atas batas minimum aman.</p>`
                : `
<div class="space-y-3">
${stats.lowStockProducts
                    .map(
                        (p) => `
<div class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><img src="${escapeHtml(p.image_url)}" class="w-10 h-10 rounded-xl object-cover shrink-0" /><div class="min-w-0"><div class="text-xs font-extrabold text-[#633D25] truncate">${escapeHtml(p.name)}</div><div class="text-[11px] text-amber-800 font-semibold">Sisa: <strong>${p.stock} pouch</strong> (Min: ${p.min_stock})</div></div></div><button
type="button"
onclick="window.SaleeApp.openQuickRestock('${p.id}')"
class="px-3 py-1.5 rounded-xl bg-[#633D25] hover:bg-[#4e2f1c] text-[#F5C84C] font-extrabold text-xs shrink-0 cursor-pointer"
>+ Restock</button></div>
`
                    )
                    .join('')}
</div>
`
            }
</div><!-- Ringkasan Pendapatan --><div class="bg-[#633D25] text-white rounded-3xl p-6 shadow-md space-y-4"><div class="flex items-center justify-between"><div><span class="text-[11px] uppercase tracking-wider text-[#F5C84C] font-extrabold">Ringkasan Pendapatan</span><h4 class="font-display text-xl font-extrabold mt-0.5">${formatRp(stats.totalSales)}</h4></div><span class="p-2.5 rounded-2xl bg-white/10 text-[#F5C84C]"><i data-lucide="coins" class="w-6 h-6"></i></span></div><div class="grid grid-cols-2 gap-3 pt-2 border-t border-white/15 text-xs"><div><div class="text-white/70">Pesanan Selesai</div><div class="font-extrabold text-sm text-[#F5C84C] mt-0.5">${formatRp(stats.completedRevenue)}</div></div><div><div class="text-white/70">Total Pouch Terjual</div><div class="font-extrabold text-sm text-white mt-0.5">${stats.totalUnitsSold} Pouch</div></div></div></div></div></div></div>
`;
    }
    function renderOrderStatusBadge(status) {
        const map = {
            'Menunggu Pembayaran': 'bg-amber-100 text-amber-800 border-amber-300',
            'Menunggu Konfirmasi': 'bg-orange-100 text-orange-800 border-orange-300',
            Diproses: 'bg-blue-100 text-blue-800 border-blue-300',
            Dikemas: 'bg-purple-100 text-purple-800 border-purple-300',
            Dikirim: 'bg-indigo-100 text-indigo-800 border-indigo-300',
            Selesai: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            Dibatalkan: 'bg-red-100 text-red-800 border-red-300',
        };
        const cls = map[status] || 'bg-gray-100 text-gray-800';
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${cls}">${escapeHtml(status)}</span>`;
    }
    function renderAdminProductsTab() {
        const filtered = state.db.products.filter((p) => {
            const matchCat = state.adminProductCatFilter === 'ALL' || p.category_id === state.adminProductCatFilter;
            const q = state.adminProductSearch.trim().toLowerCase();
            const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
            return matchCat && matchQ;
        });
        return `
<div class="space-y-6"><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div class="flex flex-col sm:flex-row gap-3 flex-1"><div class="relative flex-1 max-w-md"><i data-lucide="search" class="w-4 h-4 text-[#633D25]/50 absolute left-3.5 top-1/2 -translate-y-1/2"></i><input
type="text"
value="${escapeHtml(state.adminProductSearch)}"
oninput="window.SaleeApp.setAdminProductSearch(this.value)"
placeholder="Cari nama produk atau SKU..."
class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm"
/></div><select
onchange="window.SaleeApp.setAdminProductCatFilter(this.value)"
class="px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-sm font-bold text-[#633D25]"
><option value="ALL" ${state.adminProductCatFilter === 'ALL' ? 'selected' : ''}>Semua Kategori</option>
${state.db.categories
                .map(
                    (c) =>
                        `<option value="${c.id}" ${state.adminProductCatFilter === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
                )
                .join('')}
</select></div><button
type="button"
onclick="window.SaleeApp.openProductModal()"
class="px-5 py-3 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow cursor-pointer"
><i data-lucide="plus-circle" class="w-4 h-4 text-[#F5C84C]"></i><span>Tambah Produk Baru</span></button></div><div class="bg-white rounded-3xl border border-[#633D25]/10 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#FFF5DF] border-b border-[#633D25]/10 text-[11px] font-extrabold uppercase text-[#633D25]"><th class="py-3.5 px-4">Produk</th><th class="py-3.5 px-4">Kategori</th><th class="py-3.5 px-4">Harga Jual</th><th class="py-3.5 px-4">Stok Tersedia</th><th class="py-3.5 px-4">Label</th><th class="py-3.5 px-4 text-right">Aksi CRUD</th></tr></thead><tbody class="divide-y divide-[#633D25]/10 text-xs sm:text-sm">
${filtered
                .map((p) => {
                    const cat = getCategoryById(p.category_id);
                    const isLow = p.stock <= p.min_stock;
                    return `
<tr class="hover:bg-[#FFF5DF]/40"><td class="py-3.5 px-4"><div class="flex items-center gap-3"><img src="${escapeHtml(p.image_url)}" class="w-12 h-12 rounded-xl object-cover border border-[#633D25]/10 shrink-0" /><div><div class="font-extrabold text-[#633D25]">${escapeHtml(p.name)}</div><div class="text-xs text-[#633D25]/60 font-mono">${escapeHtml(p.sku)} â€¢ ${p.weight_grams}g</div></div></div></td><td class="py-3.5 px-4 font-bold text-xs text-[#633D25]">${escapeHtml(cat.name)}</td><td class="py-3.5 px-4"><div class="font-extrabold text-[#557447]">${formatRp(p.price)}</div><div class="text-[11px] text-[#633D25]/55">HPP: ${formatRp(p.cost_price)}</div></td><td class="py-3.5 px-4"><span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${p.stock <= 0
                            ? 'bg-red-100 text-red-700'
                            : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                        }">
${p.stock} pouch ${isLow ? 'âš ï¸' : ''}
</span></td><td class="py-3.5 px-4">
${p.is_popular
                            ? `<span class="px-2.5 py-1 rounded-full bg-[#F5C84C] text-[#633D25] text-[11px] font-extrabold">Populer</span>`
                            : `<span class="text-xs text-[#633D25]/50">Standar</span>`
                        }
</td><td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap"><button
type="button"
onclick="window.SaleeApp.openProductModal('${p.id}')"
class="px-3 py-1.5 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
</button><button
type="button"
onclick="window.SaleeApp.deleteProduct('${p.id}')"
class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
</button></td></tr>
`;
                })
                .join('')}
</tbody></table></div></div></div>
`;
    }
    function renderAdminCategoriesTab() {
        return `
<div class="space-y-6"><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm flex items-center justify-between"><div><h3 class="font-display font-extrabold text-lg text-[#633D25]">Manajemen Kategori Produk</h3><p class="text-xs text-[#633D25]/65">Kelola pengelompokan varian rasa Keripik Pisang Salee</p></div><button
type="button"
onclick="window.SaleeApp.openCategoryModal()"
class="px-5 py-3 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
><i data-lucide="plus-circle" class="w-4 h-4 text-[#F5C84C]"></i><span>Tambah Kategori</span></button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-5">
${state.db.categories
                .map((cat) => {
                    const count = state.db.products.filter((p) => p.category_id === cat.id).length;
                    return `
<div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 shadow-sm flex flex-col justify-between space-y-4"><div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3"><div
class="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold shadow-sm"
style="background-color: ${cat.badge_color}; color: #fff"
><i data-lucide="tags" class="w-5 h-5"></i></div><div><h4 class="font-display font-extrabold text-base text-[#633D25]">${escapeHtml(cat.name)}</h4><span class="text-xs text-[#557447] font-bold">${count} Produk Terhubung</span></div></div><div class="flex items-center gap-1.5"><button
type="button"
onclick="window.SaleeApp.openCategoryModal('${cat.id}')"
class="p-2 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] cursor-pointer"
title="Edit Kategori"
><i data-lucide="pencil" class="w-4 h-4"></i></button><button
type="button"
onclick="window.SaleeApp.deleteCategory('${cat.id}')"
class="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
title="Hapus Kategori"
><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div><p class="text-xs text-[#633D25]/75 leading-relaxed">${escapeHtml(cat.description)}</p></div>
`;
                })
                .join('')}
</div></div>
`;
    }
    function renderAdminStockTab() {
        const totalAvailable = state.db.products.reduce((acc, p) => acc + p.stock, 0);
        const totalIn = state.db.stock_movements
            .filter((m) => m.type === 'in')
            .reduce((acc, m) => acc + m.quantity, 0);
        const totalOut = state.db.stock_movements
            .filter((m) => m.type === 'out')
            .reduce((acc, m) => acc + m.quantity, 0);
        const lowProducts = state.db.products.filter((p) => p.stock <= p.min_stock);
        const movements = state.db.stock_movements.filter((m) => {
            if (state.stockFilterType === 'ALL') return true;
            return m.type === state.stockFilterType;
        });
        return `
<div class="space-y-6"><!-- Ringkasan Persediaan --><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#633D25]/60">Total Stok Tersedia</span><div class="text-2xl font-extrabold text-[#633D25] mt-1">${totalAvailable} Pouch</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#557447]">Total Stok Masuk (In)</span><div class="text-2xl font-extrabold text-[#557447] mt-1">+${totalIn} Pouch</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-amber-700">Total Stok Keluar (Out)</span><div class="text-2xl font-extrabold text-amber-700 mt-1">-${totalOut} Pouch</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-red-600">Peringatan Stok Minimum</span><div class="text-2xl font-extrabold text-red-600 mt-1">${lowProducts.length} Produk</div></div></div><!-- Baris Tombol Catat Stok Masuk / Keluar --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h3 class="font-display font-extrabold text-lg text-[#633D25]">Kontrol Persediaan & Mutasi Gudang</h3><p class="text-xs text-[#633D25]/70">Stok otomatis berkurang ketika pesanan dikonfirmasi/diproses, atau catat stok masuk/keluar manual di sini.</p></div><button
type="button"
onclick="window.SaleeApp.openStockModal()"
class="px-5 py-3 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer shrink-0"
><i data-lucide="boxes" class="w-4 h-4 text-[#F5C84C]"></i><span>+ Catat Stok Masuk / Keluar</span></button></div><!-- Tabel Status Persediaan per Produk --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10"><h4 class="font-display font-extrabold text-base text-[#633D25] mb-4">Status Stok Produk Real-Time</h4><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
${state.db.products
                .map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= p.min_stock;
                    return `
<div class="p-4 rounded-2xl border ${isOut ? 'bg-red-50 border-red-300' : isLow ? 'bg-amber-50 border-amber-300' : 'bg-[#FFF5DF]/50 border-[#633D25]/10'
                        } flex flex-col justify-between gap-3"><div><div class="flex items-center justify-between gap-2"><span class="text-[10px] font-mono font-bold text-[#633D25]/60">${escapeHtml(p.sku)}</span><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isOut ? 'bg-red-600 text-white' : isLow ? 'bg-amber-500 text-white' : 'bg-[#557447] text-white'
                        }">${isOut ? 'HABIS' : isLow ? 'HAMPIR HABIS' : 'AMAN'}</span></div><h5 class="font-extrabold text-sm text-[#633D25] mt-1">${escapeHtml(p.name)}</h5></div><div class="flex items-end justify-between pt-2 border-t border-[#633D25]/10"><div><span class="text-[11px] text-[#633D25]/60 block">Tersedia / Min</span><span class="text-lg font-extrabold text-[#633D25]">${p.stock} <span class="text-xs font-normal">/ ${p.min_stock}</span></span></div><button
type="button"
onclick="window.SaleeApp.openQuickRestock('${p.id}')"
class="px-3 py-1.5 rounded-xl bg-[#633D25] text-[#F5C84C] text-xs font-extrabold cursor-pointer"
>Update</button></div></div>
`;
                })
                .join('')}
</div></div><!-- Riwayat Perubahan Stok (stock_movements) --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10"><div class="flex flex-wrap items-center justify-between gap-4 mb-4"><h4 class="font-display font-extrabold text-base text-[#633D25]">Riwayat Perubahan Stok (Tabel stock_movements)</h4><select
onchange="window.SaleeApp.setStockFilterType(this.value)"
class="px-3.5 py-2 rounded-xl bg-[#FFF5DF] border border-[#633D25]/15 text-xs font-extrabold text-[#633D25]"
><option value="ALL" ${state.stockFilterType === 'ALL' ? 'selected' : ''}>Semua Mutasi</option><option value="in" ${state.stockFilterType === 'in' ? 'selected' : ''}>Stok Masuk (In)</option><option value="out" ${state.stockFilterType === 'out' ? 'selected' : ''}>Stok Keluar (Out)</option></select></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="border-b border-[#633D25]/10 text-[11px] uppercase text-[#633D25]/60"><th class="py-3 pr-3">Waktu</th><th class="py-3 px-3">Produk</th><th class="py-3 px-3">Tipe</th><th class="py-3 px-3">Jumlah</th><th class="py-3 px-3">Stok (Sebelum â†’ Sesudah)</th><th class="py-3 px-3">Referensi & Catatan</th></tr></thead><tbody class="divide-y divide-[#633D25]/10 text-xs">
${movements
                .map((m) => {
                    const prod = getProductById(m.product_id);
                    const isIn = m.type === 'in';
                    return `
<tr class="hover:bg-[#FFF5DF]/40"><td class="py-3 pr-3 text-[#633D25]/70 whitespace-nowrap">${formatDateID(m.created_at)}</td><td class="py-3 px-3 font-extrabold text-[#633D25]">${prod ? escapeHtml(prod.name) : m.product_id}</td><td class="py-3 px-3"><span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold ${isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }">
${isIn ? 'STOK MASUK' : 'STOK KELUAR'}
</span></td><td class="py-3 px-3 font-extrabold ${isIn ? 'text-emerald-700' : 'text-amber-700'}">
${isIn ? '+' : '-'}${m.quantity} pouch
</td><td class="py-3 px-3 font-mono font-bold text-[#633D25]">
${m.previous_stock} â†’ ${m.current_stock}
</td><td class="py-3 px-3"><div class="font-bold text-[#633D25]">${escapeHtml(m.reference)}</div><div class="text-[11px] text-[#633D25]/65">${escapeHtml(m.notes)} (${escapeHtml(m.created_by)})</div></td></tr>
`;
                })
                .join('')}
</tbody></table></div></div></div>
`;
    }
    function renderAdminOrdersTab() {
        const statuses = [
            'ALL',
            'Menunggu Pembayaran',
            'Menunggu Konfirmasi',
            'Diproses',
            'Dikemas',
            'Dikirim',
            'Selesai',
            'Dibatalkan',
        ];
        const filtered = state.db.orders.filter((o) => {
            const matchStatus = state.adminOrderStatusFilter === 'ALL' || o.status === state.adminOrderStatusFilter;
            const q = state.adminOrderSearch.trim().toLowerCase();
            const matchQ =
                !q ||
                o.order_number.toLowerCase().includes(q) ||
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_whatsapp.toLowerCase().includes(q);
            return matchStatus && matchQ;
        });
        return `
<div class="space-y-6"><!-- Filter Bar --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 space-y-4"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h3 class="font-display font-extrabold text-lg text-[#633D25]">Manajemen Pesanan Pelanggan</h3><p class="text-xs text-[#633D25]/65">Konfirmasi pembayaran, proses pengemasan, pengiriman, hingga pesanan selesai</p></div><div class="relative sm:w-72"><i data-lucide="search" class="w-4 h-4 text-[#633D25]/50 absolute left-3.5 top-1/2 -translate-y-1/2"></i><input
type="text"
value="${escapeHtml(state.adminOrderSearch)}"
oninput="window.SaleeApp.setAdminOrderSearch(this.value)"
placeholder="Cari No. Invoice / Pelanggan..."
class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/15 text-xs sm:text-sm"
/></div></div><div class="flex items-center gap-2 overflow-x-auto pb-1">
${statuses
                .map((st) => {
                    const active = state.adminOrderStatusFilter === st;
                    const count =
                        st === 'ALL'
                            ? state.db.orders.length
                            : state.db.orders.filter((o) => o.status === st).length;
                    return `
<button
type="button"
onclick="window.SaleeApp.setAdminOrderStatusFilter('${st}')"
class="px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${active ? 'bg-[#633D25] text-[#F5C84C]' : 'bg-[#FFF5DF] text-[#633D25] hover:bg-[#F5C84C]/30'
                        }"
>
${st === 'ALL' ? 'Semua Pesanan' : st} (${count})
</button>
`;
                })
                .join('')}
</div></div><!-- Orders Table --><div class="bg-white rounded-3xl border border-[#633D25]/10 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#FFF5DF] border-b border-[#633D25]/10 text-[11px] font-extrabold uppercase text-[#633D25]"><th class="py-3.5 px-4">No. Pesanan & Waktu</th><th class="py-3.5 px-4">Pelanggan</th><th class="py-3.5 px-4">Metode & Total</th><th class="py-3.5 px-4">Status Saat Ini</th><th class="py-3.5 px-4">Ubah Status Pesanan</th><th class="py-3.5 px-4 text-right">Detail</th></tr></thead><tbody class="divide-y divide-[#633D25]/10 text-xs">
${filtered
                .map(
                    (o) => `
<tr class="hover:bg-[#FFF5DF]/40"><td class="py-3.5 px-4"><div class="font-mono font-extrabold text-[#633D25]">${escapeHtml(o.order_number)}</div><div class="text-[11px] text-[#633D25]/60">${formatDateID(o.created_at)}</div></td><td class="py-3.5 px-4"><div class="font-extrabold text-[#633D25]">${escapeHtml(o.customer_name)}</div><div class="text-[11px] text-[#633D25]/70">${escapeHtml(o.customer_whatsapp)}</div></td><td class="py-3.5 px-4"><div class="font-extrabold text-sm text-[#557447]">${formatRp(o.total_amount)}</div><div class="text-[11px] text-[#633D25]/65">${escapeHtml(o.payment_method)}</div></td><td class="py-3.5 px-4">${renderOrderStatusBadge(o.status)}</td><td class="py-3.5 px-4"><select
onchange="window.SaleeApp.updateOrderStatus('${o.id}', this.value)"
class="px-3 py-1.5 rounded-xl bg-[#FFF5DF] border border-[#633D25]/20 text-xs font-extrabold text-[#633D25] cursor-pointer"
>
${[
                            'Menunggu Pembayaran',
                            'Menunggu Konfirmasi',
                            'Diproses',
                            'Dikemas',
                            'Dikirim',
                            'Selesai',
                            'Dibatalkan',
                        ]
                            .map(
                                (st) =>
                                    `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`
                            )
                            .join('')}
</select></td><td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
${o.status === 'Menunggu Pembayaran'
                            ? `
<button
type="button"
onclick="window.SaleeApp.updateOrderStatus('${o.id}', 'Diproses')"
class="px-2.5 py-1.5 rounded-xl bg-[#557447] text-white font-extrabold text-[11px] cursor-pointer"
>Konfirmasi Bayar</button>
`
                            : ''
                        }
<button
type="button"
onclick="window.SaleeApp.openOrderDetail('${o.id}')"
class="px-3 py-1.5 rounded-xl bg-[#633D25] text-[#F5C84C] font-extrabold text-[11px] cursor-pointer"
>Rincian</button></td></tr>
`
                )
                .join('')}
</tbody></table></div></div></div>
`;
    }
    function renderAdminCustomersTab() {
        return `
<div class="space-y-6"><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10"><h3 class="font-display font-extrabold text-lg text-[#633D25]">Database Pelanggan UMKM (CRM)</h3><p class="text-xs text-[#633D25]/65">Daftar pelanggan yang pernah berbelanja beserta total transaksi dan riwayat pembeliannya</p></div><div class="bg-white rounded-3xl border border-[#633D25]/10 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#FFF5DF] border-b border-[#633D25]/10 text-[11px] font-extrabold uppercase text-[#633D25]"><th class="py-3.5 px-4">Nama Pelanggan</th><th class="py-3.5 px-4">Nomor WhatsApp</th><th class="py-3.5 px-4">Alamat Pengiriman</th><th class="py-3.5 px-4">Total Transaksi</th><th class="py-3.5 px-4">Total Belanja</th><th class="py-3.5 px-4 text-right">Riwayat Pembelian</th></tr></thead><tbody class="divide-y divide-[#633D25]/10 text-xs sm:text-sm">
${state.db.customers
                .map(
                    (c) => `
<tr class="hover:bg-[#FFF5DF]/40"><td class="py-3.5 px-4 font-extrabold text-[#633D25]">${escapeHtml(c.name)}</td><td class="py-3.5 px-4 font-mono text-xs text-[#557447] font-bold">${escapeHtml(c.whatsapp)}</td><td class="py-3.5 px-4 text-xs text-[#633D25]/75 max-w-xs truncate">${escapeHtml(c.address)}</td><td class="py-3.5 px-4 font-extrabold text-[#633D25]">${c.total_orders} Pesanan</td><td class="py-3.5 px-4 font-extrabold text-[#557447]">${formatRp(c.total_spent)}</td><td class="py-3.5 px-4 text-right"><button
type="button"
onclick="window.SaleeApp.openCustomerHistory('${c.id}')"
class="px-3.5 py-1.5 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] font-extrabold text-xs cursor-pointer"
>
Lihat Riwayat
</button></td></tr>
`
                )
                .join('')}
</tbody></table></div></div></div>
`;
    }
    function renderAdminReportsTab() {
        const start = state.reportStartDate ? new Date(state.reportStartDate + 'T00:00:00Z') : new Date('2020-01-01');
        const end = state.reportEndDate ? new Date(state.reportEndDate + 'T23:59:59Z') : new Date('2030-12-31');
        const ordersInRange = state.db.orders.filter((o) => {
            const d = new Date(o.created_at);
            return d >= start && d <= end && o.status !== 'Dibatalkan';
        });
        const totalRevenue = ordersInRange.reduce((acc, o) => acc + o.total_amount, 0);
        const orderIds = new Set(ordersInRange.map((o) => o.id));
        let totalProductsSold = 0;
        const productSalesMap = {};
        state.db.order_items.forEach((oi) => {
            if (orderIds.has(oi.order_id)) {
                totalProductsSold += oi.quantity;
                if (!productSalesMap[oi.product_id]) {
                    productSalesMap[oi.product_id] = {
                        name: oi.product_name,
                        qty: 0,
                        revenue: 0,
                    };
                }
                productSalesMap[oi.product_id].qty += oi.quantity;
                productSalesMap[oi.product_id].revenue += oi.subtotal;
            }
        });
        const productPerformance = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);
        const topProduct = productPerformance[0] || { name: 'Salee Madu Karamel Panggang', qty: 0 };
        return `
<div class="space-y-6"><!-- Filter Tanggal & Tombol Export CSV --><div class="bg-white rounded-3xl p-6 border border-[#633D25]/10 flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div class="space-y-3"><div><h3 class="font-display font-extrabold text-lg text-[#633D25]">Laporan Penjualan & Rekap Keuangan</h3><p class="text-xs text-[#633D25]/65">Filter laporan berdasarkan tanggal dan unduh laporan ke format CSV (Excel)</p></div><div class="flex flex-wrap items-center gap-3"><div><label class="block text-[11px] font-bold text-[#633D25]/70 mb-1">Dari Tanggal</label><input
type="date"
value="${state.reportStartDate}"
onchange="window.SaleeApp.setReportDates(this.value, null)"
class="px-3.5 py-2 rounded-xl bg-[#FFF5DF] border border-[#633D25]/15 text-xs font-bold text-[#633D25]"
/></div><div><label class="block text-[11px] font-bold text-[#633D25]/70 mb-1">Sampai Tanggal</label><input
type="date"
value="${state.reportEndDate}"
onchange="window.SaleeApp.setReportDates(null, this.value)"
class="px-3.5 py-2 rounded-xl bg-[#FFF5DF] border border-[#633D25]/15 text-xs font-bold text-[#633D25]"
/></div></div></div><button
type="button"
onclick="window.SaleeApp.exportCSV()"
class="px-6 py-3.5 rounded-2xl bg-[#557447] hover:bg-[#445e38] text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md cursor-pointer"
><i data-lucide="download" class="w-4 h-4 text-[#F5C84C]"></i><span>Export Laporan ke CSV</span></button></div><!-- 4 Kartu Metrik Laporan --><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#633D25]/60">Total Pendapatan</span><div class="text-2xl font-extrabold text-[#557447] mt-1">${formatRp(totalRevenue)}</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#633D25]/60">Jumlah Produk Terjual</span><div class="text-2xl font-extrabold text-[#633D25] mt-1">${totalProductsSold} Pouch</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#633D25]/60">Jumlah Transaksi</span><div class="text-2xl font-extrabold text-[#633D25] mt-1">${ordersInRange.length} Pesanan</div></div><div class="bg-white p-5 rounded-3xl border border-[#633D25]/10"><span class="text-xs font-bold text-[#633D25]/60">Produk Paling Laris</span><div class="text-sm font-extrabold text-[#633D25] mt-1 truncate">${escapeHtml(topProduct.name)}</div><span class="text-xs font-bold text-[#557447]">${topProduct.qty} pouch terjual</span></div></div><!-- Grafik Penjualan & Tabel Performa Produk --><div class="grid grid-cols-1 lg:grid-cols-12 gap-6"><div class="lg:col-span-7">
${renderInteractiveSalesChart()}
</div><div class="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#633D25]/10"><h4 class="font-display font-extrabold text-base text-[#633D25] mb-4">Rincian Penjualan per Varian</h4><div class="space-y-3">
${productPerformance
                .map(
                    (item, i) => `
<div class="p-3 rounded-2xl bg-[#FFF5DF]/60 flex items-center justify-between"><div><div class="text-xs font-extrabold text-[#633D25]">${i + 1}. ${escapeHtml(item.name)}</div><div class="text-[11px] text-[#633D25]/70">${item.qty} pouch terjual</div></div><div class="text-xs font-extrabold text-[#557447]">${formatRp(item.revenue)}</div></div>
`
                )
                .join('')}
</div></div></div></div>
`;
    }
    function renderAdminSettingsTab() {
        const s = state.db.settings;
        const savedSbUrl = localStorage.getItem('SALEE_SUPABASE_URL') || window.SaleeDB.DEFAULT_SUPABASE_URL || '';
        const savedSbKey = localStorage.getItem('SALEE_SUPABASE_ANON_KEY') || window.SaleeDB.DEFAULT_SUPABASE_KEY || '';
        return `
<div class="space-y-6"><form onsubmit="window.SaleeApp.saveSettings(event)" class="bg-white rounded-3xl p-6 sm:p-8 border border-[#633D25]/10 space-y-6"><div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#633D25]/10 pb-4"><div><h3 class="font-display font-extrabold text-lg text-[#633D25]">Pengaturan Operasional & Database Supabase</h3><p class="text-xs text-[#633D25]/65">Kelola identitas toko, rekening pembayaran, ongkos kirim, dan kredensial Supabase</p></div><button
type="button"
onclick="window.SaleeApp.openSqlModal(true)"
class="px-4 py-2.5 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
><i data-lucide="database" class="w-4 h-4"></i><span>Lihat Skema SQL PostgreSQL (8 Tabel)</span></button></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Brand UMKM</label><input type="text" name="store_name" value="${escapeHtml(s.store_name)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Tagline</label><input type="text" name="tagline" value="${escapeHtml(s.tagline)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nomor WhatsApp Admin (Format 628...)</label><input type="text" name="whatsapp" value="${escapeHtml(s.whatsapp)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Email Resmi</label><input type="email" name="email" value="${escapeHtml(s.email)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div class="sm:col-span-2"><label class="block text-xs font-extrabold text-[#633D25] mb-1">Alamat Rumah Produksi</label><input type="text" name="address" value="${escapeHtml(s.address)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Bank</label><input type="text" name="bank_name" value="${escapeHtml(s.bank_name)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nomor Rekening</label><input type="text" name="bank_account" value="${escapeHtml(s.bank_account)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Atas Nama Rekening</label><input type="text" name="bank_holder" value="${escapeHtml(s.bank_holder)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Ongkos Kirim Standar (Rp)</label><input type="number" name="default_shipping" value="${s.default_shipping}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Batas Gratis Ongkir (Rp)</label><input type="number" name="free_shipping_threshold" value="${s.free_shipping_threshold}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Batas Minimum Stok Default</label><input type="number" name="default_min_stock" value="${s.default_min_stock}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Instagram</label><input type="text" name="instagram" value="${escapeHtml(s.instagram)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">TikTok</label><input type="text" name="tiktok" value="${escapeHtml(s.tiktok)}" class="w-full px-4 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div></div><label class="flex items-center gap-2.5 text-sm font-bold text-[#633D25]"><input type="checkbox" name="cod_enabled" ${s.cod_enabled ? 'checked' : ''} class="w-4 h-4 accent-[#633D25]" /><span>Aktifkan Opsi Pembayaran COD (Bayar di Tempat)</span></label><!-- Koneksi Supabase --><div class="p-5 rounded-2xl bg-[#FFF5DF] border border-[#633D25]/15 space-y-3"><div class="flex flex-wrap items-center justify-between gap-2"><div class="text-xs font-extrabold uppercase text-[#633D25]">Integrasi Supabase PostgreSQL & Auth (NEXT_PUBLIC_SUPABASE_URL)</div><div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#557447] text-white">
${savedSbUrl ? 'Terhubung: vltzvbcwhbdamixrlfwe.supabase.co' : 'Mode Demo Interaktif (LocalStorage Aktif)'}
</span><button
type="button"
onclick="window.SaleeApp.testSupabaseConnection()"
class="px-3 py-1 rounded-xl bg-[#633D25] hover:bg-[#4e2f1c] text-[#F5C84C] text-[11px] font-extrabold cursor-pointer"
>
Tes Koneksi Cloud
</button></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="block text-[11px] font-bold text-[#633D25] mb-1">SUPABASE_URL</label><input type="text" name="supabase_url" value="${escapeHtml(savedSbUrl)}" placeholder="https://xxxx.supabase.co" class="w-full px-3.5 py-2 rounded-xl bg-white border border-[#633D25]/15 text-xs font-mono" /></div><div><label class="block text-[11px] font-bold text-[#633D25] mb-1">SUPABASE_PUBLISHABLE_KEY</label><input type="text" name="supabase_anon_key" value="${escapeHtml(savedSbKey)}" placeholder="sb_publishable_..." class="w-full px-3.5 py-2 rounded-xl bg-white border border-[#633D25]/15 text-xs font-mono" /></div><div class="sm:col-span-2"><label class="block text-[11px] font-bold text-[#633D25] mb-1">SUPABASE_JWKS_URL (@supabase/server Verification)</label><input type="text" readonly value="${escapeHtml(window.SaleeDB.DEFAULT_SUPABASE_JWKS_URL || 'https://vltzvbcwhbdamixrlfwe.supabase.co/auth/v1/.well-known/jwks.json')}" class="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-[#633D25]/15 text-xs font-mono text-[#633D25]/80" /></div></div></div><div class="flex flex-wrap items-center justify-between gap-4 pt-2"><button
type="button"
onclick="window.SaleeApp.resetDemoData()"
class="px-5 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs sm:text-sm cursor-pointer"
>
Reset Data Demo ke Awal
</button><button
type="submit"
class="px-8 py-3.5 rounded-2xl bg-[#633D25] hover:bg-[#4e2f1c] text-white font-extrabold text-xs sm:text-sm shadow-lg cursor-pointer"
>
Simpan Perubahan Pengaturan
</button></div></form></div>
`;
    }
    function renderAdminModals() {
        let html = '';
        if (state.productModalOpen) {
            const p = state.editingProduct || {
                name: '',
                sku: `SALEE-${Date.now().toString().slice(-4)}`,
                category_id: state.db.categories[0]?.id || 'cat-original',
                price: 22000,
                cost_price: 13000,
                stock: 30,
                min_stock: 12,
                weight_grams: 200,
                image_url: PRESET_PRODUCT_PHOTOS[0].url,
                description: '',
                is_popular: false,
            };
            html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#633D25]/15 my-8"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><h3 class="font-display font-extrabold text-lg">${state.editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3><button type="button" onclick="window.SaleeApp.closeProductModal()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><form onsubmit="window.SaleeApp.saveProduct(event)" class="p-6 space-y-4 max-h-[82vh] overflow-y-auto"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Produk *</label><input type="text" name="name" required value="${escapeHtml(p.name)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Kode SKU</label><input type="text" name="sku" value="${escapeHtml(p.sku)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-mono" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Kategori Produk *</label><select name="category_id" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-bold">
${state.db.categories
                    .map(
                        (c) =>
                            `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
                    )
                    .join('')}
</select></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Berat Kemasan (gram)</label><input type="number" name="weight_grams" value="${p.weight_grams}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Harga Jual (Rp) *</label><input type="number" name="price" required value="${p.price}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-extrabold" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Harga Modal / HPP (Rp)</label><input type="number" name="cost_price" value="${p.cost_price}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Jumlah Stok (Pouch) *</label><input type="number" name="stock" required value="${p.stock}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-extrabold" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Batas Stok Minimum</label><input type="number" name="min_stock" value="${p.min_stock}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div></div><!-- Unggah Foto Produk --><div class="space-y-2"><label class="block text-xs font-extrabold text-[#633D25]">Foto Produk (Unggah File atau URL)</label><div class="flex items-center gap-3"><img id="productImagePreview" src="${escapeHtml(p.image_url)}" class="w-16 h-16 rounded-2xl object-cover border border-[#633D25]/20 shrink-0" /><div class="flex-1 space-y-2"><input
id="productImageUrlInput"
type="text"
name="image_url"
value="${escapeHtml(p.image_url)}"
placeholder="https://..."
class="w-full px-3.5 py-2 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-xs"
/><input
type="file"
accept="image/*"
onchange="window.SaleeApp.handleImageUpload(this)"
class="text-xs text-[#633D25]"
/></div></div></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Deskripsi Produk *</label><textarea name="description" rows="3" required class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm">${escapeHtml(p.description)}</textarea></div><label class="flex items-center gap-2 text-xs font-extrabold text-[#633D25]"><input type="checkbox" name="is_popular" ${p.is_popular ? 'checked' : ''} class="w-4 h-4 accent-[#633D25]" /><span>Tandai sebagai Produk Populer (Best Seller Badge)</span></label><div class="flex justify-end gap-3 pt-3 border-t border-[#633D25]/10"><button type="button" onclick="window.SaleeApp.closeProductModal()" class="px-5 py-2.5 rounded-xl bg-gray-100 text-[#633D25] font-bold text-xs cursor-pointer">Batal</button><button type="submit" class="px-6 py-2.5 rounded-xl bg-[#633D25] text-white font-extrabold text-xs cursor-pointer">Simpan Produk</button></div></form></div></div>
`;
        }
        if (state.categoryModalOpen) {
            const c = state.editingCategory || {
                name: '',
                description: '',
                badge_color: '#F5C84C',
            };
            html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div class="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><h3 class="font-display font-extrabold text-lg">${state.editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3><button type="button" onclick="window.SaleeApp.closeCategoryModal()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><form onsubmit="window.SaleeApp.saveCategory(event)" class="p-6 space-y-4"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nama Kategori *</label><input type="text" name="name" required value="${escapeHtml(c.name)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Warna Identitas Badge</label><input type="color" name="badge_color" value="${escapeHtml(c.badge_color)}" class="w-full h-10 rounded-xl cursor-pointer" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Deskripsi Kategori</label><textarea name="description" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm">${escapeHtml(c.description)}</textarea></div><div class="flex justify-end gap-3 pt-2"><button type="button" onclick="window.SaleeApp.closeCategoryModal()" class="px-4 py-2 rounded-xl bg-gray-100 text-xs font-bold">Batal</button><button type="submit" class="px-6 py-2 rounded-xl bg-[#633D25] text-white text-xs font-extrabold">Simpan Kategori</button></div></form></div></div>
`;
        }
        if (state.stockModalOpen) {
            html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div class="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><h3 class="font-display font-extrabold text-lg">Catat Mutasi Persediaan Stok</h3><button type="button" onclick="window.SaleeApp.closeStockModal()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><form onsubmit="window.SaleeApp.saveStockMovement(event)" class="p-6 space-y-4"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Pilih Produk *</label><select name="product_id" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-bold">
${state.db.products
                    .map(
                        (p) =>
                            `<option value="${p.id}" ${state.stockFormPresetProductId === p.id ? 'selected' : ''}>${escapeHtml(p.name)} (Stok: ${p.stock})</option>`
                    )
                    .join('')}
</select></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Jenis Mutasi *</label><select name="type" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-bold"><option value="in">Stok Masuk (+ Restock)</option><option value="out">Stok Keluar (- Kurangi)</option></select></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Jumlah (Pouch) *</label><input type="number" name="quantity" min="1" value="20" required class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm font-extrabold" /></div></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Nomor Referensi Batch</label><input type="text" name="reference" placeholder="Contoh: BATCH-PROD-261118" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div><label class="block text-xs font-extrabold text-[#633D25] mb-1">Catatan Gudang</label><input type="text" name="notes" placeholder="Contoh: Produksi sore dapur utama" class="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5DF]/60 border border-[#633D25]/20 text-sm" /></div><div class="flex justify-end gap-3 pt-2"><button type="button" onclick="window.SaleeApp.closeStockModal()" class="px-4 py-2 rounded-xl bg-gray-100 text-xs font-bold">Batal</button><button type="submit" class="px-6 py-2.5 rounded-xl bg-[#633D25] text-white text-xs font-extrabold cursor-pointer">Simpan Mutasi Stok</button></div></form></div></div>
`;
        }
        if (state.selectedOrderDetailId) {
            const order = state.db.orders.find((o) => o.id === state.selectedOrderDetailId);
            if (order) {
                const items = state.db.order_items.filter((oi) => oi.order_id === order.id);
                const payment = state.db.payments.find((p) => p.order_id === order.id);
                html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"><div class="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-8"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><div><span class="text-[11px] text-[#F5C84C] font-mono font-bold">${escapeHtml(order.order_number)}</span><h3 class="font-display font-extrabold text-lg">Detail Pesanan Pelanggan</h3></div><button type="button" onclick="window.SaleeApp.closeOrderDetail()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs sm:text-sm"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FFF5DF]"><div><div class="text-[#633D25]/60 font-bold text-xs">Penerima:</div><div class="font-extrabold text-[#633D25] text-base">${escapeHtml(order.customer_name)}</div><div class="font-semibold text-[#557447]">WA: ${escapeHtml(order.customer_whatsapp)}</div><div class="text-xs text-[#633D25]/80 mt-1">${escapeHtml(order.shipping_address)}</div></div><div class="space-y-1.5"><div class="flex justify-between"><span class="text-[#633D25]/60">Status Pesanan:</span>
${renderOrderStatusBadge(order.status)}
</div><div class="flex justify-between"><span class="text-[#633D25]/60">Metode Bayar:</span><span class="font-extrabold">${escapeHtml(order.payment_method)} (${payment ? payment.status : 'Pending'})</span></div><div class="flex justify-between"><span class="text-[#633D25]/60">Stok Terpotong:</span><span class="font-bold">${order.stock_deducted ? 'Sudah Dipotong Otomatis' : 'Menunggu Konfirmasi'}</span></div><div class="text-xs text-[#633D25]/70 pt-1">Catatan: "${escapeHtml(order.notes || '-')}"</div></div></div><div><h4 class="font-extrabold text-xs uppercase text-[#633D25]/60 mb-2">Daftar Item Dibeli</h4><div class="divide-y divide-[#633D25]/10 border border-[#633D25]/10 rounded-2xl overflow-hidden">
${items
                        .map(
                            (oi) => `
<div class="p-3 flex items-center justify-between bg-white"><div class="flex items-center gap-3"><img src="${escapeHtml(oi.product_image)}" class="w-11 h-11 rounded-xl object-cover" /><div><div class="font-extrabold text-[#633D25]">${escapeHtml(oi.product_name)}</div><div class="text-xs text-[#633D25]/65">${oi.quantity} pouch x ${formatRp(oi.unit_price)}</div></div></div><div class="font-extrabold text-[#557447]">${formatRp(oi.subtotal)}</div></div>
`
                        )
                        .join('')}
</div></div><div class="p-4 rounded-2xl bg-[#FFF5DF]/60 space-y-1.5"><div class="flex justify-between"><span>Subtotal Produk</span><span class="font-bold">${formatRp(order.subtotal)}</span></div><div class="flex justify-between"><span>Ongkos Kirim</span><span class="font-bold">${formatRp(order.shipping_cost)}</span></div><div class="flex justify-between text-base font-extrabold text-[#633D25] pt-2 border-t border-[#633D25]/10"><span>Total Pembayaran</span><span class="text-[#557447]">${formatRp(order.total_amount)}</span></div></div><div class="flex flex-wrap items-center justify-between gap-2 pt-2"><div class="flex flex-wrap gap-2"><button type="button" onclick="window.SaleeApp.updateOrderStatus('${order.id}', 'Diproses')" class="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer">Proses Pesanan</button><button type="button" onclick="window.SaleeApp.updateOrderStatus('${order.id}', 'Dikemas')" class="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer">Kemas</button><button type="button" onclick="window.SaleeApp.updateOrderStatus('${order.id}', 'Dikirim')" class="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer">Kirim</button><button type="button" onclick="window.SaleeApp.updateOrderStatus('${order.id}', 'Selesai')" class="px-3.5 py-2 rounded-xl bg-[#557447] text-white font-bold text-xs cursor-pointer">Tandai Selesai</button><button type="button" onclick="window.SaleeApp.updateOrderStatus('${order.id}', 'Dibatalkan')" class="px-3.5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer">Batalkan</button></div><button type="button" onclick="window.SaleeApp.closeOrderDetail()" class="px-4 py-2 rounded-xl bg-gray-200 text-[#633D25] font-bold text-xs cursor-pointer">Tutup</button></div></div></div></div>
`;
            }
        }
        if (state.selectedCustomerHistoryId) {
            const cust = state.db.customers.find((c) => c.id === state.selectedCustomerHistoryId);
            if (cust) {
                const custOrders = state.db.orders.filter(
                    (o) =>
                        o.customer_id === cust.id ||
                        o.customer_whatsapp.replace(/\D/g, '') === cust.whatsapp.replace(/\D/g, '')
                );
                html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div class="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><div><h3 class="font-display font-extrabold text-lg">Riwayat Pembelian: ${escapeHtml(cust.name)}</h3><p class="text-xs text-[#F5C84C]">WhatsApp: ${escapeHtml(cust.whatsapp)}</p></div><button type="button" onclick="window.SaleeApp.closeCustomerHistory()" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
${custOrders.length === 0
                        ? `<p class="text-sm text-[#633D25]/70">Belum ada riwayat pesanan.</p>`
                        : custOrders
                            .map(
                                (o) => `
<div class="p-4 rounded-2xl bg-[#FFF5DF]/70 border border-[#633D25]/15 flex items-center justify-between"><div><div class="font-mono font-extrabold text-xs text-[#633D25]">${escapeHtml(o.order_number)}</div><div class="text-xs text-[#633D25]/70">${formatDateID(o.created_at)} â€¢ ${escapeHtml(o.payment_method)}</div><div class="mt-1">${renderOrderStatusBadge(o.status)}</div></div><div class="text-right"><div class="font-extrabold text-base text-[#557447]">${formatRp(o.total_amount)}</div><button
type="button"
onclick="window.SaleeApp.closeCustomerHistory(); window.SaleeApp.openOrderDetail('${o.id}')"
class="text-xs font-bold text-[#633D25] underline mt-1 cursor-pointer"
>Lihat Invoice</button></div></div>
`
                            )
                            .join('')
                    }
</div></div></div>
`;
            }
        }
        if (state.sqlModalOpen) {
            html += `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"><div class="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl"><div class="px-6 py-4 bg-[#633D25] text-white flex items-center justify-between"><h3 class="font-display font-extrabold text-base sm:text-lg">Arsitektur Database PostgreSQL / Supabase (8 Tabel + RLS)</h3><button type="button" onclick="window.SaleeApp.openSqlModal(false)" class="p-1.5 rounded-xl bg-white/10 text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="p-6 space-y-3 max-h-[78vh] overflow-y-auto text-xs"><p class="text-[#633D25]/80 font-medium">File lengkap tersedia di <code>supabase/schema.sql</code>. Mencakup 8 tabel utama: <strong>users, categories, products, customers, orders, order_items, payments, stock_movements</strong> beserta kebijakan Row Level Security (RLS).</p><pre class="p-4 rounded-2xl bg-[#2d140c] text-[#FFF5DF] font-mono text-[11px] overflow-x-auto leading-relaxed">
-- 1. users (id, email, full_name, phone, role, created_at)
-- 2. categories (id, name, slug, description, icon, badge_color)
-- 3. products (id, category_id REFERENCES categories, sku, name, price, stock, min_stock, image_url, is_popular)
-- 4. customers (id, user_id REFERENCES users, name, whatsapp, address, total_orders, total_spent)
-- 5. orders (id, order_number, customer_id REFERENCES customers, subtotal, shipping_cost, total_amount, payment_method, status)
-- 6. order_items (id, order_id REFERENCES orders, product_id REFERENCES products, unit_price, quantity, subtotal)
-- 7. payments (id, order_id REFERENCES orders, payment_method, bank_name, amount, status, paid_at)
-- 8. stock_movements (id, product_id REFERENCES products, order_id REFERENCES orders, type, quantity, previous_stock, current_stock)
</pre></div></div></div>
`;
        }
        return html;
    }
    function renderAdminFullView() {
        const menus = [
            { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
            { id: 'products', label: 'Manajemen Produk', icon: 'package' },
            { id: 'categories', label: 'Kategori Produk', icon: 'tags' },
            { id: 'stock', label: 'Manajemen Stok', icon: 'boxes' },
            { id: 'orders', label: 'Pesanan', icon: 'shopping-cart', badge: state.db.orders.filter((o) => o.status === 'Menunggu Pembayaran').length },
            { id: 'customers', label: 'Pelanggan', icon: 'users' },
            { id: 'reports', label: 'Laporan Penjualan', icon: 'bar-chart-3' },
            { id: 'settings', label: 'Pengaturan', icon: 'settings' },
        ];
        let activeContent = '';
        if (state.adminTab === 'dashboard') activeContent = renderAdminDashboardOverview();
        else if (state.adminTab === 'products') activeContent = renderAdminProductsTab();
        else if (state.adminTab === 'categories') activeContent = renderAdminCategoriesTab();
        else if (state.adminTab === 'stock') activeContent = renderAdminStockTab();
        else if (state.adminTab === 'orders') activeContent = renderAdminOrdersTab();
        else if (state.adminTab === 'customers') activeContent = renderAdminCustomersTab();
        else if (state.adminTab === 'reports') activeContent = renderAdminReportsTab();
        else if (state.adminTab === 'settings') activeContent = renderAdminSettingsTab();
        const activeMenuTitle = (menus.find((m) => m.id === state.adminTab) || menus[0]).label;
        return `
<div class="min-h-screen flex bg-[#FFF5DF]/60 text-[#633D25]"><!-- Sidebar Desktop & Mobile --><aside class="w-72 bg-[#633D25] text-white flex-col justify-between p-6 shrink-0 hidden lg:flex sticky top-0 h-screen"><div class="space-y-6"><!-- Brand Header --><div class="flex items-center gap-3 pb-5 border-b border-white/15"><div class="w-11 h-11 rounded-2xl bg-[#F5C84C] text-[#633D25] flex items-center justify-center font-extrabold shadow"><i data-lucide="shield-check" class="w-6 h-6"></i></div><div><div class="font-display font-extrabold text-base text-white leading-tight">Keripik Pisang <span class="text-[#F5C84C]">Salee</span></div><div class="text-[11px] text-[#FFF5DF]/70 font-semibold">Dashboard Manajemen UMKM</div></div></div><!-- 8 Menu Items --><nav class="space-y-1.5">
${menus
                .map((m) => {
                    const isActive = state.adminTab === m.id;
                    return `
<button
type="button"
onclick="window.SaleeApp.setAdminTab('${m.id}')"
class="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${isActive
                            ? 'bg-[#F5C84C] text-[#633D25] shadow-lg'
                            : 'text-[#FFF5DF]/80 hover:bg-white/10 hover:text-white'
                        }"
><span class="flex items-center gap-3"><i data-lucide="${m.icon}" class="w-4 h-4"></i><span>${m.label}</span></span>
${m.badge
                            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-[#633D25] text-[#F5C84C]' : 'bg-[#F5C84C] text-[#633D25]'
                            }">${m.badge}</span>`
                            : ''
                        }
</button>
`;
                })
                .join('')}
</nav></div><!-- Bottom Sidebar: Back to Store & 9. Logout --><div class="space-y-2 pt-4 border-t border-white/15"><button
type="button"
onclick="window.SaleeApp.switchToStore()"
class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#557447] hover:bg-[#466039] text-white text-xs font-extrabold transition cursor-pointer"
><i data-lucide="store" class="w-4 h-4 text-[#F5C84C]"></i><span>Lihat Website Pelanggan</span></button><button
type="button"
onclick="window.SaleeApp.logout()"
class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-extrabold transition cursor-pointer"
><i data-lucide="log-out" class="w-4 h-4"></i><span>9. Logout Sesi Admin</span></button></div></aside><!-- Main Content Area --><div class="flex-1 flex flex-col min-w-0"><!-- Admin Topbar --><header class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#633D25]/10 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4"><div class="flex items-center gap-3"><div><span class="text-[11px] font-extrabold uppercase tracking-wider text-[#557447] block">Sistem ERP & E-Commerce Terpadu</span><h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#633D25]">${activeMenuTitle}</h1></div></div><div class="flex items-center gap-3"><button
type="button"
onclick="window.SaleeApp.switchToStore()"
class="px-4 py-2.5 rounded-xl bg-[#FFF5DF] hover:bg-[#F5C84C] text-[#633D25] font-extrabold text-xs inline-flex items-center gap-2 border border-[#633D25]/15 cursor-pointer"
><i data-lucide="external-link" class="w-4 h-4"></i><span>Website Toko</span></button><div class="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[#633D25]/15"><div class="w-9 h-9 rounded-xl bg-[#633D25] text-[#F5C84C] flex items-center justify-center font-extrabold text-xs">
AD
</div><div class="text-xs"><div class="font-extrabold text-[#633D25]">${state.currentUser ? escapeHtml(state.currentUser.full_name) : 'Owner Salee'}</div><div class="text-[10px] text-[#557447] font-bold">Role: Administrator</div></div></div></div><!-- Mobile Admin Navigation Pills --><div class="w-full flex lg:hidden items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#633D25]/10">
${menus
                .map(
                    (m) => `
<button
type="button"
onclick="window.SaleeApp.setAdminTab('${m.id}')"
class="px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap ${state.adminTab === m.id ? 'bg-[#633D25] text-[#F5C84C]' : 'bg-[#FFF5DF] text-[#633D25]'
                        }"
>${m.label}</button>
`
                )
                .join('')}
<button
type="button"
onclick="window.SaleeApp.logout()"
class="px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap bg-red-100 text-red-700"
>Logout</button></div></header><!-- Main Body --><main class="p-4 sm:p-8 flex-1">
${activeContent}
</main></div>
${renderAdminModals()}
</div>
`;
    }
    function renderApp() {
        const root = document.getElementById('appRoot');
        if (!root) return;
        const isOwnerVerified =
            window.SaleeDB && typeof window.SaleeDB.checkLocalAdminSession === 'function'
                ? window.SaleeDB.checkLocalAdminSession()
                : false;
        if (state.viewMode === 'admin') {
            if (!isOwnerVerified) {
                state.viewMode = 'owner-login';
                root.innerHTML = renderOwnerLoginPage();
            } else {
                root.innerHTML = renderAdminFullView();
            }
        } else if (state.viewMode === 'owner-login') {
            root.innerHTML = renderOwnerLoginPage();
        } else {
            root.innerHTML = `
<div class="min-h-screen flex flex-col bg-[#FFF5DF] text-[#633D25]">
${renderNavbar()}
<main class="flex-1">
${renderHeroSection()}
${renderCategorySection()}
${renderCatalogSection()}
${renderAboutSection()}
${renderContactSection()}
</main>
${renderFooter()}
${renderProductDetailModal()}
${renderCartDrawer()}
${renderCheckoutModal()}
${renderOrderSuccessModal()}
${renderCustomerOrderDetailModal()}
${renderAuthModal()}
</div>
`;
        }
        refreshIcons();
    }
    window.SaleeApp = {
        render: renderApp,
        addToCart,
        updateCartQty: function (productId, delta) {
            updateCartQuantity(productId, delta, false);
        },
        removeFromCart,
        toggleCart: function (open) {
            state.cartDrawerOpen = Boolean(open);
            renderApp();
        },
        toggleMobileMenu: function (force) {
            state.mobileMenuOpen = typeof force === 'boolean' ? force : !state.mobileMenuOpen;
            renderApp();
        },
        selectCategory: function (catId) {
            state.selectedCategory = catId;
            renderApp();
            const el = document.getElementById('produk');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        },
        setSearchQuery: function (q) {
            state.searchQuery = q;
            renderApp();
            const inputs = document.querySelectorAll('input[placeholder="Cari rasa keripik pisang..."]');
            if (inputs.length > 0) {
                const input = inputs[0];
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        },
        setSortBy: function (val) {
            state.sortBy = val;
            renderApp();
        },
        resetCatalogFilter: function () {
            state.selectedCategory = 'ALL';
            state.searchQuery = '';
            state.sortBy = 'popular';
            renderApp();
        },
        openProductDetail,
        closeProductDetail,
        changeDetailQty: function (delta) {
            const product = getProductById(state.detailProductId);
            if (!product) return;
            const next = state.detailQty + delta;
            state.detailQty = Math.max(1, Math.min(product.stock || 1, next));
            renderApp();
        },
        addDetailToCart: function (openCheckoutImmediately) {
            if (!state.detailProductId) return;
            const pid = state.detailProductId;
            const qty = state.detailQty;
            state.detailProductId = null;
            addToCart(pid, qty);
            if (openCheckoutImmediately) {
                state.checkoutOpen = true;
                renderApp();
            }
        },
        openCheckout: openCheckoutModal,
        closeCheckout: function () {
            state.checkoutOpen = false;
            state.isSubmittingOrder = false;
            renderApp();
        },
        updateCheckoutField,
        copyBankAccount,
        submitCheckout: handleCheckoutSubmit,
        closeOrderSuccess: function () {
            state.orderSuccessData = null;
            renderApp();
        },
        openCustomerOrderDetail: function (orderId) {
            state.orderSuccessData = null;
            state.customerOrderDetailId = orderId;
            renderApp();
        },
        closeCustomerOrderDetail: function () {
            state.customerOrderDetailId = null;
            renderApp();
        },
        toggleOwnerPassword: function () {
            state.showOwnerPassword = !state.showOwnerPassword;
            renderApp();
        },
        navigateToRoute,
        submitContact: handleContactSubmit,
        openAuthModal: function () {
            state.authModalOpen = true;
            renderApp();
        },
        closeAuthModal: function () {
            state.authModalOpen = false;
            renderApp();
        },
        loginDemoCustomer: loginAsDemoCustomer,
        submitAuth: handleAuthSubmit,
        submitAdminAuth: handleAdminAuthSubmit,
        setAuthMode: function (mode) {
            state.authMode = mode;
            renderApp();
        },
        logout: handleLogout,
        openAdmin: function () {
            navigateToRoute('/admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        switchToStore: function () {
            navigateToRoute('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        setAdminTab: function (tabId) {
            state.adminTab = tabId;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            renderApp();
        },
        setChartPeriod: function (period) {
            state.chartPeriod = period;
            renderApp();
        },
        setAdminProductSearch: function (q) {
            state.adminProductSearch = q;
            renderApp();
            const inputs = document.querySelectorAll('input[placeholder="Cari nama produk atau SKU..."]');
            if (inputs.length > 0) {
                const input = inputs[0];
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        },
        setAdminProductCatFilter: function (catId) {
            state.adminProductCatFilter = catId;
            renderApp();
        },
        openProductModal,
        closeProductModal: function () {
            state.productModalOpen = false;
            state.editingProduct = null;
            renderApp();
        },
        saveProduct: handleSaveProduct,
        deleteProduct: handleDeleteProduct,
        handleImageUpload: handleImageUploadChange,
        openCategoryModal,
        closeCategoryModal: function () {
            state.categoryModalOpen = false;
            state.editingCategory = null;
            renderApp();
        },
        saveCategory: handleSaveCategory,
        deleteCategory: handleDeleteCategory,
        openStockModal,
        openQuickRestock: function (productId) {
            state.adminTab = 'stock';
            openStockModal(productId);
        },
        closeStockModal: function () {
            state.stockModalOpen = false;
            renderApp();
        },
        saveStockMovement: handleSaveStockMovement,
        setStockFilterType: function (t) {
            state.stockFilterType = t;
            renderApp();
        },
        setAdminOrderStatusFilter: function (st) {
            state.adminOrderStatusFilter = st;
            renderApp();
        },
        setAdminOrderSearch: function (q) {
            state.adminOrderSearch = q;
            renderApp();
            const inputs = document.querySelectorAll('input[placeholder="Cari No. Invoice / Pelanggan..."]');
            if (inputs.length > 0) {
                const input = inputs[0];
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        },
        updateOrderStatus: handleUpdateOrderStatus,
        openOrderDetail: function (orderId) {
            state.selectedOrderDetailId = orderId;
            renderApp();
        },
        closeOrderDetail: function () {
            state.selectedOrderDetailId = null;
            renderApp();
        },
        openCustomerHistory: function (custId) {
            state.selectedCustomerHistoryId = custId;
            renderApp();
        },
        closeCustomerHistory: function () {
            state.selectedCustomerHistoryId = null;
            renderApp();
        },
        setReportDates: function (start, end) {
            if (start !== null) state.reportStartDate = start;
            if (end !== null) state.reportEndDate = end;
            renderApp();
        },
        exportCSV: handleExportCSV,
        saveSettings: handleSaveSettings,
        openSqlModal: function (open) {
            state.sqlModalOpen = Boolean(open);
            renderApp();
        },
        testSupabaseConnection: async function () {
            const sb = window.SaleeDB.supabaseClient;
            if (!sb) {
                showToast('Klien Supabase belum terinisialisasi.', 'error');
                return;
            }
            showToast('Menghubungi https://vltzvbcwhbdamixrlfwe.supabase.co ...');
            try {
                const { data, error } = await sb.from('products').select('id, name').limit(5);
                if (error) {
                    showToast(
                        `Terhubung ke Supabase! Catatan: Jalankan supabase/schema.sql di SQL Editor Supabase (${error.message}).`,
                        'warning'
                    );
                } else {
                    showToast(
                        `Koneksi Supabase Aktif! Berhasil membaca tabel products (${data ? data.length : 0} baris).`,
                        'success'
                    );
                }
            } catch (err) {
                showToast('Gagal menghubungi endpoint Supabase: ' + err.message, 'error');
            }
        },
        resetDemoData: function () {
            state.db = window.SaleeDB.resetToSeed();
            state.cart = [];
            showToast('Data demo berhasil di-reset ke kondisi awal!');
            renderApp();
        },
    };
    window.addEventListener('popstate', function () {
        syncRouteFromLocation();
    });
    window.addEventListener('hashchange', function () {
        syncRouteFromLocation();
    });
    document.addEventListener('DOMContentLoaded', function () {
        syncRouteFromLocation();
    });
})();
