import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DatabaseState,
  ProductRecord,
  CategoryRecord,
  OrderStatus,
  PaymentMethod,
  StockMovementType,
  CartItem,
  UserRecord,
  StoreSettings,
} from '../types/database';
import { INITIAL_DATABASE_STATE } from '../data/seedData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'SALEE_FULLSTACK_DB_V2';
const CART_STORAGE_KEY = 'SALEE_CART_V2';
const AUTH_STORAGE_KEY = 'SALEE_AUTH_USER_V2';

interface CheckoutPayload {
  customerName: string;
  customerWhatsapp: string;
  shippingAddress: string;
  notes: string;
  paymentMethod: PaymentMethod;
}

interface StoreContextValue {
  db: DatabaseState;
  cart: CartItem[];
  currentUser: UserRecord | null;
  isSupabaseConnected: boolean;
  addToCart: (productId: string, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  submitCheckout: (payload: CheckoutPayload) => { orderNumber: string; orderId: string } | null;
  loginDemo: (email: string, role?: 'admin' | 'customer') => void;
  logout: () => void;
  saveProduct: (product: Partial<ProductRecord> & { id?: string }) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (category: Partial<CategoryRecord> & { id?: string }) => void;
  deleteCategory: (id: string) => boolean;
  recordStockMovement: (
    productId: string,
    type: StockMovementType,
    quantity: number,
    reference: string,
    notes: string
  ) => boolean;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  updateSettings: (settings: StoreSettings) => void;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to read local DB:', e);
    }
    return INITIAL_DATABASE_STATE;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const addToCart = (productId: string, qty = 1) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === productId);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((item) =>
          item.product_id === productId ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { product_id: productId, quantity: Math.min(product.stock, qty) }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product) return;
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const clamped = Math.min(product.stock, qty);
    setCart((prev) =>
      prev.map((item) => (item.product_id === productId ? { ...item, quantity: clamped } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => setCart([]);

  const submitCheckout = (payload: CheckoutPayload) => {
    if (cart.length === 0) return null;

    const now = new Date().toISOString();
    const dateCode = now.slice(2, 10).replace(/-/g, '');
    const seq = String(db.orders.length + 1).padStart(3, '0');
    const orderNumber = `INV-SALEE-${dateCode}-${seq}`;
    const orderId = `ord-${Date.now()}`;

    let subtotal = 0;
    const newOrderItems = cart.map((item, idx) => {
      const product = db.products.find((p) => p.id === item.product_id)!;
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return {
        id: `oi-${Date.now()}-${idx}`,
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        unit_price: product.price,
        quantity: item.quantity,
        subtotal: lineTotal,
        created_at: now,
      };
    });

    const shippingCost =
      subtotal >= db.settings.free_shipping_threshold ? 0 : db.settings.default_shipping;
    const totalAmount = subtotal + shippingCost;

    // Deduct stock immediately if COD or WhatsApp, or keep Menunggu Pembayaran for Transfer Bank
    const initialStatus: OrderStatus =
      payload.paymentMethod === 'COD' ? 'Diproses' : 'Menunggu Pembayaran';
    const shouldDeductNow = initialStatus !== 'Menunggu Pembayaran';

    setDb((prev) => {
      // Find or create customer
      let customer = prev.customers.find(
        (c) => c.whatsapp.replace(/\D/g, '') === payload.customerWhatsapp.replace(/\D/g, '')
      );
      let updatedCustomers = [...prev.customers];
      if (customer) {
        customer = {
          ...customer,
          name: payload.customerName,
          address: payload.shippingAddress,
          total_orders: customer.total_orders + 1,
          total_spent: customer.total_spent + totalAmount,
          last_order_at: now,
        };
        updatedCustomers = updatedCustomers.map((c) => (c.id === customer!.id ? customer! : c));
      } else {
        customer = {
          id: `cst-${Date.now()}`,
          user_id: currentUser?.id || null,
          name: payload.customerName,
          whatsapp: payload.customerWhatsapp,
          address: payload.shippingAddress,
          total_orders: 1,
          total_spent: totalAmount,
          last_order_at: now,
          created_at: now,
        };
        updatedCustomers = [customer, ...updatedCustomers];
      }

      let updatedProducts = [...prev.products];
      let updatedMovements = [...prev.stock_movements];

      if (shouldDeductNow) {
        newOrderItems.forEach((oi) => {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id !== oi.product_id) return p;
            const prevStock = p.stock;
            const currStock = Math.max(0, prevStock - oi.quantity);
            updatedMovements.unshift({
              id: `stm-${Date.now()}-${oi.product_id}`,
              product_id: p.id,
              order_id: orderId,
              type: 'out',
              quantity: oi.quantity,
              previous_stock: prevStock,
              current_stock: currStock,
              reference: orderNumber,
              notes: `Pesanan pelanggan (${payload.customerName})`,
              created_by: 'Sistem Checkout',
              created_at: now,
            });
            return {
              ...p,
              stock: currStock,
              sold_count: p.sold_count + oi.quantity,
            };
          });
        });
      }

      const newOrder = {
        id: orderId,
        order_number: orderNumber,
        customer_id: customer.id,
        customer_name: payload.customerName,
        customer_whatsapp: payload.customerWhatsapp,
        shipping_address: payload.shippingAddress,
        notes: payload.notes,
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: 0,
        total_amount: totalAmount,
        payment_method: payload.paymentMethod,
        status: initialStatus,
        stock_deducted: shouldDeductNow,
        created_at: now,
        updated_at: now,
      };

      const newPayment = {
        id: `pay-${Date.now()}`,
        order_id: orderId,
        payment_method: payload.paymentMethod,
        bank_name: payload.paymentMethod === 'Transfer Bank' ? prev.settings.bank_name : undefined,
        amount: totalAmount,
        status: shouldDeductNow ? ('Verified' as const) : ('Pending' as const),
        paid_at: shouldDeductNow ? now : null,
        created_at: now,
      };

      return {
        ...prev,
        customers: updatedCustomers,
        products: updatedProducts,
        orders: [newOrder, ...prev.orders],
        order_items: [...newOrderItems, ...prev.order_items],
        payments: [newPayment, ...prev.payments],
        stock_movements: updatedMovements,
      };
    });

    clearCart();
    return { orderNumber, orderId };
  };

  const loginDemo = (email: string, role: 'admin' | 'customer' = 'admin') => {
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setCurrentUser(existing);
      return;
    }
    const newUser: UserRecord = {
      id: `usr-${Date.now()}`,
      email,
      full_name: role === 'admin' ? 'Owner Keripik Pisang Salee' : email.split('@')[0],
      phone: '081234567890',
      role,
      created_at: new Date().toISOString(),
    };
    setDb((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    setCurrentUser(newUser);
  };

  const logout = () => setCurrentUser(null);

  const saveProduct = (productInput: Partial<ProductRecord> & { id?: string }) => {
    const now = new Date().toISOString();
    setDb((prev) => {
      if (productInput.id) {
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productInput.id ? ({ ...p, ...productInput } as ProductRecord) : p
          ),
        };
      }
      const newProduct: ProductRecord = {
        id: `prd-${Date.now()}`,
        category_id: productInput.category_id || prev.categories[0]?.id || 'cat-original',
        sku: productInput.sku || `SALEE-${Date.now().toString().slice(-4)}`,
        name: productInput.name || 'Produk Baru Salee',
        slug: (productInput.name || 'produk-baru').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: productInput.description || '',
        price: Number(productInput.price) || 20000,
        cost_price: Number(productInput.cost_price) || 12000,
        stock: Number(productInput.stock) ?? 25,
        min_stock: Number(productInput.min_stock) ?? 10,
        weight_grams: Number(productInput.weight_grams) || 200,
        image_url:
          productInput.image_url ||
          './assets/images/salee-klasik-gurih.jpg',
        is_popular: Boolean(productInput.is_popular),
        is_active: productInput.is_active ?? true,
        rating: 4.9,
        sold_count: 0,
        created_at: now,
      };
      return { ...prev, products: [newProduct, ...prev.products] };
    });
  };

  const deleteProduct = (id: string) => {
    setDb((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const saveCategory = (categoryInput: Partial<CategoryRecord> & { id?: string }) => {
    const now = new Date().toISOString();
    setDb((prev) => {
      if (categoryInput.id) {
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === categoryInput.id ? ({ ...c, ...categoryInput } as CategoryRecord) : c
          ),
        };
      }
      const newCat: CategoryRecord = {
        id: `cat-${Date.now()}`,
        name: categoryInput.name || 'Kategori Baru',
        slug: (categoryInput.name || 'kategori-baru').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: categoryInput.description || '',
        icon: categoryInput.icon || 'Tag',
        badge_color: categoryInput.badge_color || '#F5C84C',
        created_at: now,
      };
      return { ...prev, categories: [...prev.categories, newCat] };
    });
  };

  const deleteCategory = (id: string) => {
    const hasProducts = db.products.some((p) => p.category_id === id);
    if (hasProducts) return false;
    setDb((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    return true;
  };

  const recordStockMovement = (
    productId: string,
    type: StockMovementType,
    quantity: number,
    reference: string,
    notes: string
  ) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product || quantity <= 0) return false;
    if (type === 'out' && product.stock < quantity) return false;

    const prevStock = product.stock;
    const currStock =
      type === 'in'
        ? prevStock + quantity
        : type === 'out'
        ? Math.max(0, prevStock - quantity)
        : quantity;

    const movement = {
      id: `stm-${Date.now()}`,
      product_id: productId,
      order_id: null,
      type,
      quantity,
      previous_stock: prevStock,
      current_stock: currStock,
      reference: reference || `ADJ-${Date.now().toString().slice(-5)}`,
      notes,
      created_by: currentUser?.full_name || 'Admin Operasional',
      created_at: new Date().toISOString(),
    };

    setDb((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, stock: currStock } : p
      ),
      stock_movements: [movement, ...prev.stock_movements],
    }));
    return true;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    const now = new Date().toISOString();
    setDb((prev) => {
      const order = prev.orders.find((o) => o.id === orderId);
      if (!order) return prev;

      const items = prev.order_items.filter((oi) => oi.order_id === orderId);
      let updatedProducts = [...prev.products];
      let updatedMovements = [...prev.stock_movements];
      let stockDeducted = order.stock_deducted;

      // Deduct stock when moving from Menunggu Pembayaran to Diproses/Dikemas/Dikirim/Selesai
      if (
        !order.stock_deducted &&
        ['Diproses', 'Dikemas', 'Dikirim', 'Selesai'].includes(newStatus)
      ) {
        items.forEach((oi) => {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id !== oi.product_id) return p;
            const prevStock = p.stock;
            const currStock = Math.max(0, prevStock - oi.quantity);
            updatedMovements.unshift({
              id: `stm-${Date.now()}-${p.id}`,
              product_id: p.id,
              order_id: order.id,
              type: 'out',
              quantity: oi.quantity,
              previous_stock: prevStock,
              current_stock: currStock,
              reference: order.order_number,
              notes: `Stok keluar otomatis saat status pesanan menjadi ${newStatus}`,
              created_by: currentUser?.full_name || 'Admin Operasional',
              created_at: now,
            });
            return {
              ...p,
              stock: currStock,
              sold_count: p.sold_count + oi.quantity,
            };
          });
        });
        stockDeducted = true;
      }

      // Restore stock if order was deducted and now Dibatalkan
      if (order.stock_deducted && newStatus === 'Dibatalkan') {
        items.forEach((oi) => {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id !== oi.product_id) return p;
            const prevStock = p.stock;
            const currStock = prevStock + oi.quantity;
            updatedMovements.unshift({
              id: `stm-${Date.now()}-${p.id}`,
              product_id: p.id,
              order_id: order.id,
              type: 'in',
              quantity: oi.quantity,
              previous_stock: prevStock,
              current_stock: currStock,
              reference: order.order_number,
              notes: `Pengembalian stok otomatis karena pesanan dibatalkan`,
              created_by: currentUser?.full_name || 'Admin Operasional',
              created_at: now,
            });
            return {
              ...p,
              stock: currStock,
              sold_count: Math.max(0, p.sold_count - oi.quantity),
            };
          });
        });
        stockDeducted = false;
      }

      const updatedPayments = prev.payments.map((pay) => {
        if (pay.order_id !== orderId) return pay;
        if (['Diproses', 'Dikemas', 'Dikirim', 'Selesai'].includes(newStatus)) {
          return { ...pay, status: 'Verified' as const, paid_at: pay.paid_at || now };
        }
        if (newStatus === 'Dibatalkan') {
          return { ...pay, status: 'Failed' as const };
        }
        return pay;
      });

      return {
        ...prev,
        products: updatedProducts,
        stock_movements: updatedMovements,
        payments: updatedPayments,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, stock_deducted: stockDeducted, updated_at: now }
            : o
        ),
      };
    });
  };

  const updateSettings = (settings: StoreSettings) => {
    setDb((prev) => ({ ...prev, settings }));
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CART_STORAGE_KEY);
    setDb(INITIAL_DATABASE_STATE);
    setCart([]);
  };

  return (
    <StoreContext.Provider
      value={{
        db,
        cart,
        currentUser,
        isSupabaseConnected: isSupabaseConfigured && Boolean(supabase),
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        submitCheckout,
        loginDemo,
        logout,
        saveProduct,
        deleteProduct,
        saveCategory,
        deleteCategory,
        recordStockMovement,
        updateOrderStatus,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
